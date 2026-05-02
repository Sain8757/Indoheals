const mongoose = require("mongoose");

const newsletterSubscriptionSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    source: {
      type: String,
      default: "website"
    },
    status: {
      type: String,
      enum: ["subscribed", "unsubscribed"],
      default: "subscribed"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("NewsletterSubscription", newsletterSubscriptionSchema);
