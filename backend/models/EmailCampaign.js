const mongoose = require("mongoose");

const emailCampaignSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: true,
      trim: true
    },
    audience: {
      type: String,
      enum: ["newsletter", "customers", "all"],
      default: "newsletter"
    },
    body: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ["draft", "sent"],
      default: "draft"
    },
    recipientCount: {
      type: Number,
      default: 0
    },
    sentAt: Date
  },
  { timestamps: true }
);

module.exports = mongoose.model("EmailCampaign", emailCampaignSchema);
