const crypto = require("crypto");
const Razorpay = require("razorpay");

function razorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function getRazorpay() {
  if (!razorpayConfigured()) return null;

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

function verifyRazorpayPayment({ orderId, paymentId, signature }) {
  if (!process.env.RAZORPAY_KEY_SECRET) return false;

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return (
    expected.length === String(signature || "").length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature || "")))
  );
}

function verifyWebhookSignature(rawBody, signature) {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET || !rawBody || !signature) return false;

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  return (
    expected.length === String(signature).length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature)))
  );
}

module.exports = {
  getRazorpay,
  razorpayConfigured,
  verifyRazorpayPayment,
  verifyWebhookSignature
};
