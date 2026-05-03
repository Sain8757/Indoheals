const express = require("express");
const mongoose = require("mongoose");
const { body } = require("express-validator");
const router = express.Router();
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const requireAuth = require("../middleware/auth");
const { requireAdmin } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { createOpaqueToken } = require("../utils/auth");
const {
  sendOrderConfirmationEmail,
  sendOrderConfirmedEmail,
  sendOrderShippedEmail,
  sendOrderDeliveredEmail
} = require("../utils/email");
const { findFallbackProduct } = require("../utils/products");
const {
  getRazorpay,
  razorpayConfigured,
  verifyRazorpayPayment,
  verifyWebhookSignature
} = require("../utils/payments");

const memoryOrders = [];

const orderValidators = [
  body("items").isArray({ min: 1 }).withMessage("Cart must contain at least one product."),
  body("items.*.productId").notEmpty().withMessage("Product ID is required."),
  body("items.*.quantity").optional().isInt({ min: 1 }).withMessage("Quantity must be at least 1."),
  body("shippingAddress.fullName").trim().notEmpty().withMessage("Full name is required."),
  body("shippingAddress.phone").trim().isLength({ min: 7 }).withMessage("Phone number is required."),
  body("shippingAddress.addressLine1").trim().notEmpty().withMessage("Address is required."),
  body("shippingAddress.city").trim().notEmpty().withMessage("City is required."),
  body("shippingAddress.state").trim().notEmpty().withMessage("State is required."),
  body("shippingAddress.postalCode").trim().notEmpty().withMessage("PIN code is required."),
  body("shippingAddress.country").optional().trim().notEmpty().withMessage("Country cannot be empty."),
  body("paymentMethod").optional().trim().isIn(["UPI", "Card", "COD", "Razorpay", "Manual"]).withMessage("Invalid payment method."),
  body("notes").optional().trim(),
  validate
];

function getUserId(req) {
  return String(req.user._id || req.user.id);
}

function absoluteUrl(req, path) {
  const base = process.env.BACKEND_PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
  return `${base}${path}`;
}

function normalizeShippingAddress(req) {
  const address = req.body.shippingAddress || {};

  return {
    fullName: String(address.fullName || req.user.name || "").trim(),
    phone: String(address.phone || req.body.customerPhone || req.user.phone || "").trim(),
    addressLine1: String(address.addressLine1 || "").trim(),
    addressLine2: String(address.addressLine2 || "").trim(),
    city: String(address.city || "").trim(),
    state: String(address.state || "").trim(),
    postalCode: String(address.postalCode || "").trim(),
    country: String(address.country || "India").trim()
  };
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
        image: product.image,
        hasDigitalFile: Boolean(product.digitalFile?.storagePath)
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
        image: product.image,
        hasDigitalFile: false
      });
    });
  }

  return orderItems;
}

async function createDownloadLinks(req, order) {
  const links = [];
  order.items.forEach(item => {
    if (!item.hasDigitalFile) return;

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
  order.paymentStatus = "Paid";
  order.paymentId = payment.paymentId || order.paymentId;
  order.paymentSignature = payment.signature || order.paymentSignature;
  order.paidAt = new Date();

  const links = await createDownloadLinks(req, order);
  await sendOrderConfirmationEmail(order, links).catch(error => {
    console.warn("Order confirmation email failed:", error.message);
  });
  return order;
}

router.post("/", requireAuth, orderValidators, async (req, res, next) => {
  try {
    const orderItems = await resolveItems(req, req.body.items);
    if (!orderItems.length) {
      return res.status(400).json({ message: "No valid products found in cart." });
    }

    const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingAddress = normalizeShippingAddress(req);
    const customerPhone = shippingAddress.phone;
    const paymentMethod = String(req.body.paymentMethod || "Card").trim();
    const paymentStatus = paymentMethod === "COD" ? "COD" : "Pending";

    if (!req.app.locals.dbReady) {
      const order = {
        _id: `dev-order-${Date.now()}`,
        user: getUserId(req),
        customerName: req.user.name,
        customerEmail: req.user.email,
        customerPhone,
        shippingAddress,
        items: orderItems,
        total,
        status: paymentMethod === "COD" ? "paid" : "pending",
        paymentStatus,
        paymentMethod,
        orderStatus: "Pending",
        fulfillmentStatus: "new",
        paymentOrderId: `dev-pay-order-${Date.now()}`,
        notes: String(req.body.notes || "").trim(),
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
      customerPhone,
      shippingAddress,
      items: orderItems,
      total,
      status: paymentMethod === "COD" ? "paid" : "pending",
      paymentStatus,
      paymentMethod,
      orderStatus: "Pending",
      paymentProvider: razorpayConfigured() ? "razorpay" : "manual",
      paymentOrderId,
      notes: String(req.body.notes || "").trim()
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
        order.paymentStatus = "Failed";
        return res.status(400).json({ message: "Payment verification failed." });
      }
      await markOrderPaid(req, order, {
        paymentId: razorpay_payment_id || `dev-payment-${Date.now()}`,
        signature: razorpay_signature
      });
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
      order.paymentStatus = "Failed";
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
      const orders = memoryOrders
        .filter(order => order.user === getUserId(req))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.json(orders);
    }

    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    return res.json(orders);
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    if (!req.app.locals.dbReady) {
      const order = memoryOrders.find(entry => entry._id === req.params.id);
      if (!order) return res.status(404).json({ message: "Order not found." });
      if (req.user.role !== "admin" && order.user !== getUserId(req)) {
        return res.status(403).json({ message: "Access denied." });
      }
      return res.json(order);
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found." });
    if (req.user.role !== "admin" && String(order.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "Access denied." });
    }
    return res.json(order);
  } catch (error) {
    return next(error);
  }
});

router.put(
  "/:id/status",
  requireAuth,
  requireAdmin,
  [
    body("orderStatus")
      .trim()
      .isIn(["Pending", "Confirmed", "Shipped", "Out for Delivery", "Delivered", "Cancelled"])
      .withMessage("Enter a valid order status.")
  ],
  validate,
  async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).json({ message: "Order not found." });

      order.orderStatus = req.body.orderStatus;
      await order.save();

      if (order.orderStatus === "Confirmed") {
        await sendOrderConfirmedEmail(order).catch(error => {
          console.warn("Order confirmed email failed:", error.message);
        });
      }
      if (order.orderStatus === "Delivered") {
        await sendOrderDeliveredEmail(order).catch(error => {
          console.warn("Order delivered email failed:", error.message);
        });
      }

      return res.json(order);
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/:id/track",
  requireAuth,
  requireAdmin,
  [body("trackingNumber").trim().notEmpty().withMessage("Tracking number is required.")],
  validate,
  async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).json({ message: "Order not found." });

      order.trackingNumber = String(req.body.trackingNumber).trim();
      order.trackingLink = String(req.body.trackingLink || "").trim();
      order.orderStatus = "Shipped";
      await order.save();

      await sendOrderShippedEmail(order).catch(error => {
        console.warn("Order shipped email failed:", error.message);
      });

      return res.json(order);
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/:id/support",
  requireAuth,
  [body("message").trim().notEmpty().withMessage("Support message is required.")],
  validate,
  async (req, res, next) => {
    try {
      if (!req.app.locals.dbReady) {
        const order = memoryOrders.find(entry => entry._id === req.params.id && entry.user === getUserId(req));
        if (!order) return res.status(404).json({ message: "Order not found." });
        order.supportRequests = order.supportRequests || [];
        order.supportRequests.push({ message: String(req.body.message).trim() });
        return res.json({ message: "Support request created.", order });
      }

      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).json({ message: "Order not found." });
      if (req.user.role !== "admin" && String(order.user) !== String(req.user._id)) {
        return res.status(403).json({ message: "Access denied." });
      }

      order.supportRequests = order.supportRequests || [];
      order.supportRequests.push({ message: String(req.body.message).trim() });
      await order.save();

      return res.json({ message: "Support request created.", order });
    } catch (error) {
      return next(error);
    }
  }
);

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
