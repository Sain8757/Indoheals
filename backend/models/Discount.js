const mongoose = require("mongoose");

const discountSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    description: String,
    type: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "percentage"
    },
    value: {
      type: Number,
      required: true,
      min: 0
    },
    minOrderValue: {
      type: Number,
      default: 0,
      min: 0
    },
    maxUses: {
      type: Number,
      default: 0,
      min: 0
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0
    },
    startsAt: Date,
    endsAt: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Discount", discountSchema);
