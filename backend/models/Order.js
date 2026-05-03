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
    hasDigitalFile: {
      type: Boolean,
      default: false
    },
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
    customerPhone: String,
    shippingAddress: {
      fullName: String,
      phone: String,
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      postalCode: String,
      country: {
        type: String,
        default: "India"
      }
    },
    items: [orderItemSchema],
    total: Number,
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending"
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "COD", "Failed"],
      default: "Pending"
    },
    paymentMethod: {
      type: String,
      enum: ["UPI", "Card", "COD", "Razorpay", "Manual"],
      default: "Card"
    },
    trackingNumber: String,
    trackingLink: String,
    orderStatus: {
      type: String,
      enum: ["Pending", "Confirmed", "Shipped", "Out for Delivery", "Delivered", "Cancelled"],
      default: "Pending"
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
    fulfillmentStatus: {
      type: String,
      enum: ["new", "processing", "packed", "shipped", "delivered", "cancelled", "returned"],
      default: "new"
    },
    notes: String,
    supportRequests: [
      {
        message: String,
        status: {
          type: String,
          enum: ["Open", "Resolved", "Closed"],
          default: "Open"
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    paidAt: Date
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
