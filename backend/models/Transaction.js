const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    provider: {
      type: String,
      enum: ["razorpay", "cashfree", "cod", "manual"],
      required: true
    },
    providerPaymentId: String,
    providerOrderId: String,
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: "INR"
    },
    status: {
      type: String,
      enum: ["created", "captured", "failed", "refunded", "cancelled"],
      default: "created"
    },
    method: String, // card, upi, netbanking, cod
    errorDescription: String,
    errorCode: String,
    metadata: mongoose.Schema.Types.Mixed,
    settlementStatus: {
      type: String,
      enum: ["pending", "settled"],
      default: "pending"
    },
    settlementId: String,
    payoutId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payout"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
