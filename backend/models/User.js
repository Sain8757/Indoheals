const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
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
    passwordHash: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      trim: true
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    emailVerifiedAt: Date,
    passwordResetTokenHash: String,
    passwordResetExpires: Date,
    cart: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product"
        },
        productId: String,
        name: String,
        price: Number,
        image: String,
        quantity: {
          type: Number,
          default: 1,
          min: 1
        }
      }
    ],
    addresses: [
      {
        label: {
          type: String,
          trim: true,
          default: "Home"
        },
        fullName: String,
        phone: String,
        addressLine1: String,
        addressLine2: String,
        city: String,
        state: String,
        postalCode: String,
        country: {
          type: String,
          default: "India"
        }
      }
    ]
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.passwordHash;
        delete ret.passwordResetTokenHash;
        return ret;
      }
    }
  }
);

module.exports = mongoose.model("User", userSchema);
