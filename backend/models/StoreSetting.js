const mongoose = require("mongoose");

const storeSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "default",
      unique: true
    },
    storeName: {
      type: String,
      default: "Indo Heals"
    },
    supportEmail: String,
    supportPhone: String,
    currency: {
      type: String,
      default: "INR"
    },
    measurementSystem: {
      type: String,
      enum: ["metric", "imperial"],
      default: "metric"
    },
    company: {
      name: String,
      legalName: String,
      gstin: String,
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
    payments: {
      razorpayEnabled: {
        type: Boolean,
        default: true
      },
      manualEnabled: {
        type: Boolean,
        default: true
      },
      codEnabled: {
        type: Boolean,
        default: false
      }
    },
    shipping: {
      standardFee: {
        type: Number,
        default: 0,
        min: 0
      },
      freeShippingThreshold: {
        type: Number,
        default: 0,
        min: 0
      },
      processingDays: {
        type: Number,
        default: 2,
        min: 0
      },
      shippingZones: {
        type: String,
        default: "India"
      }
    },
    checkout: {
      requirePhone: {
        type: Boolean,
        default: true
      },
      notesEnabled: {
        type: Boolean,
        default: true
      },
      allowGuestCheckout: {
        type: Boolean,
        default: false
      }
    },
    taxes: {
      gstRate: {
        type: Number,
        default: 0,
        min: 0
      },
      pricesIncludeTax: {
        type: Boolean,
        default: true
      }
    },
    invoices: {
      prefix: {
        type: String,
        default: "IH"
      },
      nextNumber: {
        type: Number,
        default: 1,
        min: 1
      },
      footerNote: String
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("StoreSetting", storeSettingSchema);
