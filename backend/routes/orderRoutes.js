const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const requireAuth = require("../middleware/auth");
const { requireAdmin } = require("../middleware/auth");
const { createOpaqueToken } = require("../utils/auth");
const { sendOrderConfirmationEmail } = require("../utils/email");
const { findFallbackProduct } = require("../utils/products");
const {
  getRazorpay,
  razorpayConfigured,
  verifyRazorpayPayment,
  verifyWebhookSignature
} = require("../utils/payments");

const memoryOrders = [];

function getUserId(req) {
  return String(req.user._id || req.user.id);
}

function absoluteUrl(req, path) {
  const base = process.env.BACKEND_PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
  return `${base}${path}`;
}

async function resolveItems(req, submittedItems) {
  const cleanItems = (Array.isArray(submittedItems) ? submittedItems : [])
    .map(item => ({
      productId: String(item.productId || item.id || ""),
      quantity: Math.max(1, Number.parseInt(item.quantity, 10) || 1)
    }))
    .filter(item => item.productId);

  const orderItems = [];

  if (req.app.locals.dbReady) {
    const ids = cleanItems.map(item => item.productId);
    const objectIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
    const products = await Product.find({
      isActive: { $ne: false },
      $or: [{ _id: { $in: objectIds } }, { slug: { $in: ids } }]
    });

    cleanItems.forEach(item => {
      const product = products.find(
        p => String(p._id) === item.productId || p.slug === item.productId
      );
      if (!product) return;
      orderItems.push({
        productId: product._id,
        productSlug: product.slug,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: product.image
      });
    });
  } else {
    cleanItems.forEach(item => {
      const product = findFallbackProduct(item.productId);
      if (!product) return;
      orderItems.push({
        productId: product.slug,
        productSlug: product.slug,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: product.image
      });
    });
  }

  return orderItems;
}

async function createDownloadLinks(req, order) {
  const links = [];
  order.items.forEach(item => {
    const { token, hash } = createOpaqueToken();
    item.downloadTokenHash = hash;
    item.downloadTokenExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);
    links.push(absoluteUrl(req, `/api/downloads/${order._id}/${item.productId}?token=${token}`));
  });

  if (order.save) await order.save();
  return links;
}

async function markOrderPaid(req, order, payment) {
  if (!order || order.status === "paid") return order;

  order.status = "paid";
  order.paymentId = payment.paymentId || order.paymentId;
  order.paymentSignature = payment.signature || order.paymentSignature;
  order.paidAt = new Date();

  const links = await createDownloadLinks(req, order);
  await sendOrderConfirmationEmail(order, links);
  return order;
}

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const orderItems = await resolveItems(req, req.body.items);
    if (!orderItems.length) {
      return res.status(400).json({ message: "No valid products found in cart." });
    }

    const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (!req.app.locals.dbReady) {
      const order = {
        _id: `dev-order-${Date.now()}`,
        user: getUserId(req),
        customerName: req.user.name,
        customerEmail: req.user.email,
        items: orderItems,
        total,
        status: "pending",
        paymentOrderId: `dev-pay-order-${Date.now()}`,
        createdAt: new Date()
      };
      memoryOrders.push(order);
      return res.status(201).json({
        orderId: order._id,
        paymentOrderId: order.paymentOrderId,
        amount: total * 100,
        currency: "INR",
        keyId: process.env.RAZORPAY_KEY_ID || "",
        total,
        items: orderItems,
        devMode: true
      });
    }

    let paymentOrderId = `manual-${Date.now()}`;
    const razorpay = getRazorpay();

    if (razorpayConfigured() && razorpay) {
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(total * 100),
        currency: "INR",
        receipt: `order_${Date.now()}`
      });
      paymentOrderId = razorpayOrder.id;
    }

    const order = await Order.create({
      user: req.user._id,
      customerName: req.user.name,
      customerEmail: req.user.email,
      items: orderItems,
      total,
      status: "pending",
      paymentProvider: "razorpay",
      paymentOrderId
    });

    return res.status(201).json({
      orderId: order._id,
      paymentOrderId,
      amount: Math.round(total * 100),
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID || "",
      total,
      items: orderItems,
      devMode: !razorpayConfigured()
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/confirm-payment", requireAuth, async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!req.app.locals.dbReady) {
      const order = memoryOrders.find(item => item._id === req.params.id && item.user === getUserId(req));
      if (!order) return res.status(404).json({ message: "Order not found." });
      if (!order.paymentOrderId.startsWith("dev") && !verifyRazorpayPayment({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature
      })) {
        order.status = "failed";
        return res.status(400).json({ message: "Payment verification failed." });
      }
      order.status = "paid";
      order.paymentId = razorpay_payment_id || `dev-payment-${Date.now()}`;
      return res.json({ message: "Payment confirmed.", order });
    }

    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ message: "Order not found." });

    const devPayment = !razorpayConfigured() && order.paymentOrderId.startsWith("manual-");
    const verified = devPayment || verifyRazorpayPayment({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature
    });

    if (!verified || (razorpay_order_id && razorpay_order_id !== order.paymentOrderId)) {
      order.status = "failed";
      order.failureReason = "Payment signature verification failed.";
      await order.save();
      return res.status(400).json({ message: "Payment verification failed." });
    }

    await markOrderPaid(req, order, {
      paymentId: razorpay_payment_id || `manual-payment-${Date.now()}`,
      signature: razorpay_signature
    });

    if (req.app.locals.dbReady) {
      await User.findByIdAndUpdate(req.user._id, { $set: { cart: [] } });
    }

    return res.json({ message: "Payment confirmed.", order });
  } catch (error) {
    return next(error);
  }
});

router.post("/webhook/razorpay", async (req, res, next) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const rawBody = req.rawBody;

    if (!verifyWebhookSignature(rawBody, signature)) {
      return res.status(400).json({ message: "Invalid webhook signature." });
    }

    const event = req.body;
    const payment = event.payload?.payment?.entity;
    const paymentOrderId = payment?.order_id;
    if (!paymentOrderId) return res.json({ received: true });

    const order = await Order.findOne({ paymentOrderId });
    if (!order) return res.json({ received: true });

    if (event.event === "payment.captured") {
      await markOrderPaid(req, order, { paymentId: payment.id });
    }

    if (event.event === "payment.failed") {
      order.status = "failed";
      order.paymentId = payment.id;
      order.failureReason = payment.error_description || "Payment failed.";
      await order.save();
    }

    return res.json({ received: true });
  } catch (error) {
    return next(error);
  }
});

router.get("/my", requireAuth, async (req, res, next) => {
  try {
    if (!req.app.locals.dbReady) {
      const orders = memoryOrders.filter(order => order.user === getUserId(req));
      return res.json(orders);
    }

    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    return res.json(orders);
  } catch (error) {
    return next(error);
  }
});

router.get("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!req.app.locals.dbReady) return res.json(memoryOrders);

    const orders = await Order.find().populate("user", "name email role").sort({ createdAt: -1 });
    return res.json(orders);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
