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
const { verifyFirebaseToken } = require("../utils/firebase");

const memoryUsers = new Map();
const memorySignupVerifications = new Map();
const OTP_TTL_MS = 1000 * 60 * 10;
const MAX_OTP_ATTEMPTS = 5;

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function resolveLoginEmail(login = "") {
  const value = String(login).trim();
  const adminUsername = String(process.env.ADMIN_USERNAME || "").trim().toLowerCase();

  if (adminUsername && value.toLowerCase() === adminUsername) {
    return normalizeEmail(process.env.ADMIN_EMAIL);
  }

  return normalizeEmail(value);
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

function normalizeAddresses(addresses = []) {
  if (!Array.isArray(addresses)) return [];

  return addresses.slice(0, 20).map(address => ({
    label: String(address.label || "Home").trim(),
    fullName: String(address.fullName || "").trim(),
    phone: String(address.phone || "").trim(),
    addressLine1: String(address.addressLine1 || "").trim(),
    addressLine2: String(address.addressLine2 || "").trim(),
    city: String(address.city || "").trim(),
    state: String(address.state || "").trim(),
    postalCode: String(address.postalCode || "").trim(),
    country: String(address.country || "India").trim()
  }));
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
  "/firebase-auth",
  [body("idToken").notEmpty().withMessage("ID Token is required."), validate],
  async (req, res, next) => {
    try {
      const { idToken, name } = req.body;

      // Verify Firebase token — throws specific errors for expired/revoked/invalid
      let decodedToken;
      try {
        decodedToken = await verifyFirebaseToken(idToken);
      } catch (firebaseError) {
        return res.status(firebaseError.status || 401).json({
          message: firebaseError.message || "Firebase token verification failed."
        });
      }

      if (!decodedToken) {
        return res.status(401).json({
          message: "Invalid or expired Firebase token. Please request a new OTP."
        });
      }

      const email = normalizeEmail(decodedToken.email || "");
      const rawPhone = String(decodedToken.phone_number || "").trim();
      const firebaseId = decodedToken.uid;

      // Normalize phone: remove spaces, dashes — keep + prefix
      const phone = rawPhone.replace(/[\s\-().]/g, "");

      if (!phone && !email) {
        return res.status(400).json({
          message: "Phone number or email is required from Firebase token."
        });
      }

      if (!req.app.locals.dbReady) {
        // Dev mode fallback
        const key = email || phone;
        let user = memoryUsers.get(key);
        if (!user) {
          user = {
            id: `dev-fb-${Date.now()}`,
            name: name || decodedToken.name || "Firebase User",
            email,
            phone,
            firebaseId,
            role: "user",
            emailVerified: !!email,
            phoneVerified: !!phone,
            cart: []
          };
          memoryUsers.set(key, user);
        }
        return res.json(authResponse(user));
      }

      // Find user by firebaseId, phone, or email
      let user = await User.findOne({
        $or: [
          { firebaseId },
          ...(phone ? [{ phone }] : []),
          ...(email ? [{ email }] : [])
        ]
      });

      if (!user) {
        // Create new user
        user = await User.create({
          name: name || decodedToken.name || "Indo Heals User",
          email: email || undefined,
          phone: phone || undefined,
          firebaseId,
          role: "user",
          emailVerified: !!email,
          passwordHash: "FIREBASE_AUTH" // Placeholder — not used for login
        });

        sendWelcomeEmail(user).catch(err =>
          console.warn("Firebase welcome email failed:", err.message)
        );
      } else {
        // Update missing fields
        let changed = false;
        if (!user.firebaseId) { user.firebaseId = firebaseId; changed = true; }
        if (phone && !user.phone) { user.phone = phone; changed = true; }
        if (changed) await user.save();
      }

      return res.json(authResponse(user));
    } catch (error) {
      next(error);
    }
  }
);


router.post(
  "/login",
  [
    body("email").trim().notEmpty().withMessage("Username or email is required."),
    body("password").notEmpty().withMessage("Password is required."),
    validate
  ],
  async (req, res, next) => {
    try {
      const email = resolveLoginEmail(req.body.email);
      const password = String(req.body.password || "");

      if (!req.app.locals.dbReady) {
        const user = memoryUsers.get(email);
        if (!user || !(await verifyPassword(password, user.passwordHash))) {
          return res.status(401).json({ message: "Invalid email or password." });
        }
        return res.json(authResponse(user));
      }

      const user = await User.findOne({ email });
      
      // Master Admin Check (using .env credentials)
      const isAdminEmail = email === normalizeEmail(process.env.ADMIN_EMAIL);
      const masterPassword = process.env.ADMIN_PASSWORD;
      
      if (isAdminEmail && masterPassword && password === masterPassword) {
        // If it's the admin email and the password matches the .env password, allow login
        // If user doesn't exist in DB yet, we can create a temporary one or use a mock
        if (!user) {
          const mockAdmin = {
            id: 'master-admin',
            name: 'System Admin',
            email: process.env.ADMIN_EMAIL,
            role: 'admin',
            emailVerified: true,
            cart: []
          };
          return res.json(authResponse(mockAdmin));
        }
        return res.json(authResponse(user));
      }

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
    body("addresses").optional().isArray().withMessage("Addresses must be a list."),
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
      
      // New Fields
      if (req.body.gender !== undefined) user.gender = String(req.body.gender || "").trim();
      if (req.body.dob !== undefined) user.dob = String(req.body.dob || "").trim();
      if (req.body.altMobile !== undefined) user.altMobile = String(req.body.altMobile || "").trim();
      if (req.body.altName !== undefined) user.altName = String(req.body.altName || "").trim();
      if (req.body.altEmail !== undefined) user.altEmail = String(req.body.altEmail || "").trim();
      if (req.body.addresses !== undefined) user.addresses = normalizeAddresses(req.body.addresses);

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
