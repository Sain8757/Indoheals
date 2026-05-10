const mongoose = require("mongoose");

const webhookLogSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ["razorpay", "cashfree", "shiprocket"],
      required: true
    },
    event: {
      type: String,
      required: true
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    headers: mongoose.Schema.Types.Mixed,
    status: {
      type: String,
      enum: ["received", "processed", "failed"],
      default: "received"
    },
    error: String,
    processedAt: Date
  },
  { timestamps: true }
);

module.exports = mongoose.model("WebhookLog", webhookLogSchema);
