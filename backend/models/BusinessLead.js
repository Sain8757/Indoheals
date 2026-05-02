const mongoose = require("mongoose");

const businessLeadSchema = new mongoose.Schema(
  {
    reference: {
      type: String,
      required: true,
      unique: true
    },
    company: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      required: true,
      trim: true
    },
    website: String,
    contactPerson: {
      type: String,
      required: true,
      trim: true
    },
    mobile: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    currentProducts: String,
    message: String,
    status: {
      type: String,
      enum: ["new", "contacted", "qualified", "closed"],
      default: "new"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("BusinessLead", businessLeadSchema);
