const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product"
    },
    productSlug: String,
    name: String,
    price: Number,
    quantity: Number,
    image: String,
    downloadTokenHash: String,
    downloadTokenExpires: Date
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    customerName: String,
    customerEmail: String,
    items: [orderItemSchema],
    total: Number,
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending"
    },
    paymentProvider: {
      type: String,
      enum: ["razorpay", "stripe", "manual"],
      default: "razorpay"
    },
    paymentOrderId: String,
    paymentId: String,
    paymentSignature: String,
    failureReason: String,
    paidAt: Date
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
