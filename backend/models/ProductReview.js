const mongoose = require("mongoose");

const productReviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product"
    },
    productName: String,
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    customerName: String,
    customerEmail: String,
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    comment: String,
    images: [String],
    video: String,
    status: {
      type: String,
      enum: ["new", "published", "hidden", "archived"],
      default: "published" // Default to published for now as requested
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProductReview", productReviewSchema);
