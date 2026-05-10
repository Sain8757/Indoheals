const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Order = require("../models/Order");
const Transaction = require("../models/Transaction");
const WebhookLog = require("../models/WebhookLog");

// ── RAZORPAY WEBHOOK ──
router.post("/razorpay", express.raw({ type: 'application/json' }), async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers["x-razorpay-signature"];

  const shasum = crypto.createHmac("sha256", secret);
  shasum.update(req.body);
  const digest = shasum.digest("hex");

  if (digest !== signature) {
    return res.status(400).send("Invalid signature");
  }

  const event = JSON.parse(req.body);
  
  // Log webhook
  await WebhookLog.create({
    provider: "razorpay",
    event: event.event,
    payload: event,
    status: "received"
  });

  try {
    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;
      const orderId = payment.notes.orderId;

      const order = await Order.findById(orderId);
      if (order) {
        order.paymentStatus = "Paid";
        order.status = "paid";
        order.paymentId = payment.id;
        order.paidAt = new Date();
        await order.save();

        await Transaction.create({
          orderId: order._id,
          userId: order.user,
          provider: "razorpay",
          providerPaymentId: payment.id,
          providerOrderId: payment.order_id,
          amount: payment.amount / 100,
          status: "captured",
          method: payment.method,
          metadata: payment
        });
      }
    }
    
    // Handle other events like refund.processed, etc.
    
    res.json({ status: "ok" });
  } catch (error) {
    console.error("Razorpay webhook processing failed:", error);
    res.status(500).send("Internal server error");
  }
});

// ── CASHFREE WEBHOOK ──
router.post("/cashfree", async (req, res) => {
  const event = req.body;
  
  await WebhookLog.create({
    provider: "cashfree",
    event: event.type,
    payload: event,
    status: "received"
  });

  try {
    if (event.type === "PAYMENT_SUCCESS_WEBHOOK") {
      const { order, payment } = event.data;
      const dbOrder = await Order.findOne({ paymentOrderId: order.order_id });
      
      if (dbOrder) {
        dbOrder.paymentStatus = "Paid";
        dbOrder.status = "paid";
        dbOrder.paymentId = payment.cf_payment_id;
        dbOrder.paidAt = new Date();
        await dbOrder.save();

        await Transaction.create({
          orderId: dbOrder._id,
          userId: dbOrder.user,
          provider: "cashfree",
          providerPaymentId: payment.cf_payment_id,
          providerOrderId: order.order_id,
          amount: payment.payment_amount,
          status: "captured",
          method: payment.payment_group,
          metadata: payment
        });
      }
    }
    
    res.json({ status: "ok" });
  } catch (error) {
    console.error("Cashfree webhook processing failed:", error);
    res.status(500).send("Internal server error");
  }
});

module.exports = router;
