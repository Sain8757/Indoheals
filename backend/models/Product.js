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
    mrp: {
      type: Number,
      min: 0
    },
    description: String,
    wellnessNote: String,
    image: String,
    galleryImages: [String],
    videoUrl: String,
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
    benefits: [String],
    avgRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    soldCount: { type: Number, default: 0 },
    attributes: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
