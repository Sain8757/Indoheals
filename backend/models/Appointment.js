const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    reference: {
      type: String,
      required: true,
      unique: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
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
    interest: {
      type: String,
      required: true,
      trim: true
    },
    date: {
      type: String,
      required: true
    },
    time: {
      type: String,
      required: true
    },
    message: String,
    status: {
      type: String,
      enum: ["new", "contacted", "confirmed", "completed", "cancelled"],
      default: "new"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Appointment", appointmentSchema);
