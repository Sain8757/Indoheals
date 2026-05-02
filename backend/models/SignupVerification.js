const mongoose = require("mongoose");

const signupVerificationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    otpHash: {
      type: String,
      required: true
    },
    otpExpires: {
      type: Date,
      required: true
    },
    attempts: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

signupVerificationSchema.index({ otpExpires: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("SignupVerification", signupVerificationSchema);
