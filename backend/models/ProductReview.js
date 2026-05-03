const mongoose = require("mongoose");

const productReviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product"
    },
    productName: String,
    customerName: String,
    customerEmail: String,
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    status: {
      type: String,
      enum: ["new", "published", "hidden", "archived"],
      default: "new"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProductReview", productReviewSchema);
