const express = require("express");
const crypto = require("crypto");
const { body } = require("express-validator");
const router = express.Router();
const User = require("../models/User");
const SignupVerification = require("../models/SignupVerification");
const requireAuth = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  createOpaqueToken,
  createToken,
  hashPassword,
  hashToken,
  publicUser,
  verifyPassword
} = require("../utils/auth");
const { sendPasswordResetEmail, sendSignupOtpEmail, sendWelcomeEmail } = require("../utils/email");

const memoryUsers = new Map();
const memorySignupVerifications = new Map();
const OTP_TTL_MS = 1000 * 60 * 10;
const MAX_OTP_ATTEMPTS = 5;

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function createSignupOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function otpResponse(email, mailResult, otp) {
  const response = {
    email,
    otpRequired: true,
    message: "OTP sent to your email. Please verify it to create your account."
  };

  if (mailResult?.skipped && process.env.NODE_ENV !== "production") {
    response.devOtp = otp;
    response.message = "Email is not configured. Use the development OTP shown here.";
  }

  return response;
}

async function sendOtpOrFail(user, otp) {
  const mailResult = await sendSignupOtpEmail(user, otp);
  if (mailResult?.skipped && process.env.NODE_ENV === "production") {
    const error = new Error("Email OTP service is not configured. Please contact Indo Heals support.");
    error.status = 503;
    throw error;
  }
  return mailResult;
}

function authResponse(user) {
  return {
    user: publicUser(user),
    token: createToken(user)
  };
}

router.post(
  "/signup",
  [
    body("name").trim().notEmpty().withMessage("Name is required."),
    body("email").isEmail().withMessage("Valid email is required.").normalizeEmail(),
    body("phone").optional({ checkFalsy: true }).trim().isLength({ min: 7 }).withMessage("Phone number is too short."),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters."),
    validate
  ],
  async (req, res, next) => {
    try {
      const name = String(req.body.name).trim();
      const email = normalizeEmail(req.body.email);
      const phone = String(req.body.phone || "").trim();
      const passwordHash = await hashPassword(String(req.body.password));
      const otp = createSignupOtp();
      const otpHash = hashToken(otp);
      const otpExpires = new Date(Date.now() + OTP_TTL_MS);

      if (!req.app.locals.dbReady) {
        if (memoryUsers.has(email)) {
          return res.status(409).json({ message: "Account already exists. Please login." });
        }

        memorySignupVerifications.set(email, {
          name,
          email,
          phone,
          passwordHash,
          otpHash,
          otpExpires,
          attempts: 0
        });

        const mailResult = await sendOtpOrFail({ name, email }, otp);
        return res.status(202).json(otpResponse(email, mailResult, otp));
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ message: "Account already exists. Please login." });
      }

      await SignupVerification.findOneAndUpdate(
        { email },
        {
          name,
          email,
          phone,
          passwordHash,
          otpHash,
          otpExpires,
          attempts: 0
        },
        { upsert: true, runValidators: true, setDefaultsOnInsert: true }
      );

      const mailResult = await sendOtpOrFail({ name, email }, otp);
      return res.status(202).json(otpResponse(email, mailResult, otp));
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ message: "Account already exists. Please login." });
      }
      return next(error);
    }
  }
);

router.post(
  "/verify-signup-otp",
  [
    body("email").isEmail().withMessage("Valid email is required.").normalizeEmail(),
    body("otp").trim().isLength({ min: 6, max: 6 }).withMessage("Enter the 6 digit OTP."),
    validate
  ],
  async (req, res, next) => {
    try {
      const email = normalizeEmail(req.body.email);
      const otpHash = hashToken(String(req.body.otp || "").trim());

      if (!req.app.locals.dbReady) {
        const pending = memorySignupVerifications.get(email);
        if (!pending || pending.otpExpires < new Date()) {
          return res.status(400).json({ message: "OTP is invalid or expired. Please sign up again." });
        }

        if (pending.attempts >= MAX_OTP_ATTEMPTS) {
          memorySignupVerifications.delete(email);
          return res.status(400).json({ message: "Too many OTP attempts. Please request a new OTP." });
        }

        if (pending.otpHash !== otpHash) {
          pending.attempts += 1;
          return res.status(400).json({ message: "Invalid OTP. Please check your email and try again." });
        }

        const user = {
          id: `dev-${Date.now()}`,
          name: pending.name,
          email: pending.email,
          phone: pending.phone,
          passwordHash: pending.passwordHash,
          role: email === process.env.ADMIN_EMAIL ? "admin" : "user",
          emailVerified: true,
          emailVerifiedAt: new Date(),
          cart: []
        };
        memoryUsers.set(email, user);
        memorySignupVerifications.delete(email);
        sendWelcomeEmail(user).catch(error => {
          console.warn("Welcome email failed:", error.message);
        });
        return res.status(201).json({
          ...authResponse(user),
          message: "Account created successfully. Confirmation email sent."
        });
      }

      const pending = await SignupVerification.findOne({ email, otpExpires: { $gt: new Date() } });
      if (!pending) {
        return res.status(400).json({ message: "OTP is invalid or expired. Please sign up again." });
      }

      if (pending.attempts >= MAX_OTP_ATTEMPTS) {
        await SignupVerification.deleteOne({ _id: pending._id });
        return res.status(400).json({ message: "Too many OTP attempts. Please request a new OTP." });
      }

      if (pending.otpHash !== otpHash) {
        pending.attempts += 1;
        await pending.save();
        return res.status(400).json({ message: "Invalid OTP. Please check your email and try again." });
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        await SignupVerification.deleteOne({ _id: pending._id });
        return res.status(409).json({ message: "Account already exists. Please login." });
      }

      const user = await User.create({
        name: pending.name,
        email,
        phone: pending.phone,
        passwordHash: pending.passwordHash,
        role: email === process.env.ADMIN_EMAIL ? "admin" : "user",
        emailVerified: true,
        emailVerifiedAt: new Date()
      });

      await SignupVerification.deleteOne({ _id: pending._id });
      sendWelcomeEmail(user).catch(error => {
        console.warn("Welcome email failed:", error.message);
      });

      return res.status(201).json({
        ...authResponse(user),
        message: "Account created successfully. Confirmation email sent."
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ message: "Account already exists. Please login." });
      }
      return next(error);
    }
  }
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required.").normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required."),
    validate
  ],
  async (req, res, next) => {
    try {
      const email = normalizeEmail(req.body.email);
      const password = String(req.body.password || "");

      if (!req.app.locals.dbReady) {
        const user = memoryUsers.get(email);
        if (!user || !(await verifyPassword(password, user.passwordHash))) {
          return res.status(401).json({ message: "Invalid email or password." });
        }
        return res.json(authResponse(user));
      }

      const user = await User.findOne({ email });
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      return res.json(authResponse(user));
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/forgot-password",
  [body("email").isEmail().withMessage("Valid email is required.").normalizeEmail(), validate],
  async (req, res, next) => {
    try {
      const email = normalizeEmail(req.body.email);
      const genericResponse = {
        message: "If an account exists, a password reset link has been sent."
      };

      if (!req.app.locals.dbReady) {
        return res.json(genericResponse);
      }

      const user = await User.findOne({ email });
      if (!user) return res.json(genericResponse);

      const { token, hash } = createOpaqueToken();
      user.passwordResetTokenHash = hash;
      user.passwordResetExpires = new Date(Date.now() + 1000 * 60 * 30);
      await user.save();

      const baseUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get("host")}`;
      await sendPasswordResetEmail(user, `${baseUrl}/?resetToken=${token}&email=${encodeURIComponent(email)}`);

      return res.json(genericResponse);
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/reset-password",
  [
    body("email").isEmail().withMessage("Valid email is required.").normalizeEmail(),
    body("token").notEmpty().withMessage("Reset token is required."),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters."),
    validate
  ],
  async (req, res, next) => {
    try {
      if (!req.app.locals.dbReady) {
        return res.status(503).json({ message: "Password reset requires database connection." });
      }

      const user = await User.findOne({
        email: normalizeEmail(req.body.email),
        passwordResetTokenHash: hashToken(req.body.token),
        passwordResetExpires: { $gt: new Date() }
      });

      if (!user) {
        return res.status(400).json({ message: "Reset link is invalid or expired." });
      }

      user.passwordHash = await hashPassword(String(req.body.password));
      user.passwordResetTokenHash = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      return res.json({ message: "Password reset successful." });
    } catch (error) {
      return next(error);
    }
  }
);

router.get("/me", requireAuth, (req, res) => {
  return res.json({ user: publicUser(req.user) });
});

router.put(
  "/me",
  requireAuth,
  [
    body("name").optional().trim().notEmpty().withMessage("Name cannot be empty."),
    body("email").optional().isEmail().withMessage("Valid email is required.").normalizeEmail(),
    body("phone").optional({ checkFalsy: true }).trim().isLength({ min: 7 }).withMessage("Phone number is too short."),
    body("currentPassword").optional().isString(),
    body("newPassword").optional().isLength({ min: 8 }).withMessage("New password must be at least 8 characters."),
    validate
  ],
  async (req, res, next) => {
    try {
      if (!req.app.locals.dbReady) {
        return res.status(503).json({ message: "Profile updates require database connection." });
      }

      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: "User not found." });

      if (req.body.name) user.name = String(req.body.name).trim();
      if (req.body.email) user.email = normalizeEmail(req.body.email);
      if (req.body.phone !== undefined) user.phone = String(req.body.phone || "").trim();

      if (req.body.newPassword) {
        if (!req.body.currentPassword || !(await verifyPassword(req.body.currentPassword, user.passwordHash))) {
          return res.status(400).json({ message: "Current password is incorrect." });
        }
        user.passwordHash = await hashPassword(String(req.body.newPassword));
      }

      await user.save();
      return res.json(authResponse(user));
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ message: "Email is already in use." });
      }
      return next(error);
    }
  }
);

module.exports = router;
