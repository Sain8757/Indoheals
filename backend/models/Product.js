const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    description: String,
    wellnessNote: String,
    image: String,
    category: String,
    badge: String,
    weight: String,
    cocoa: String,
    stock: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    digitalFile: {
      originalName: String,
      storagePath: String,
      mimeType: String,
      size: Number
    },
    ingredients: [String],
    benefits: [String]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
