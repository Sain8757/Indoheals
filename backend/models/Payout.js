const mongoose = require("mongoose");

const payoutSchema = new mongoose.Schema(
  {
    payoutId: {
      type: String,
      required: true,
      unique: true
    },
    provider: {
      type: String,
      enum: ["razorpay", "cashfree"],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: "INR"
    },
    fees: {
      type: Number,
      default: 0
    },
    tax: {
      type: Number,
      default: 0
    },
    netAmount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "processed", "failed", "reversed"],
      default: "pending"
    },
    arrivalDate: Date,
    bankReference: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payout", payoutSchema);
