const express = require("express");
const { body } = require("express-validator");
const router = express.Router();
const User = require("../models/User");
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
const { sendPasswordResetEmail } = require("../utils/email");

const memoryUsers = new Map();

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
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
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters."),
    validate
  ],
  async (req, res, next) => {
    try {
      const name = String(req.body.name).trim();
      const email = normalizeEmail(req.body.email);
      const passwordHash = await hashPassword(String(req.body.password));

      if (!req.app.locals.dbReady) {
        if (memoryUsers.has(email)) {
          return res.status(409).json({ message: "Account already exists. Please login." });
        }

        const user = {
          id: `dev-${Date.now()}`,
          name,
          email,
          passwordHash,
          role: email === process.env.ADMIN_EMAIL ? "admin" : "user",
          cart: []
        };
        memoryUsers.set(email, user);
        return res.status(201).json(authResponse(user));
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ message: "Account already exists. Please login." });
      }

      const user = await User.create({
        name,
        email,
        passwordHash,
        role: email === process.env.ADMIN_EMAIL ? "admin" : "user"
      });

      return res.status(201).json(authResponse(user));
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
