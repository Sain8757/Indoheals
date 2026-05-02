const express = require("express");
const { body } = require("express-validator");
const router = express.Router();
const User = require("../models/User");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Appointment = require("../models/Appointment");
const BusinessLead = require("../models/BusinessLead");
const NewsletterSubscription = require("../models/NewsletterSubscription");
const requireAuth = require("../middleware/auth");
const { requireAdmin } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { productQuery } = require("../utils/products");

router.use(requireAuth, requireAdmin);

const productValidators = [
  body("name").trim().notEmpty().withMessage("Product name is required."),
  body("slug").optional().trim().isSlug().withMessage("Slug must be URL safe."),
  body("price").isFloat({ min: 0 }).withMessage("Price must be a positive number."),
  body("stock").optional().isInt({ min: 0 }).withMessage("Stock must be a positive integer."),
  validate
];

const digitalFileValidators = [
  body("storagePath")
    .trim()
    .notEmpty()
    .withMessage("Secure storage path is required.")
    .custom(value => {
      if (String(value).includes("..") || String(value).startsWith("/")) {
        throw new Error("Storage path must stay inside SECURE_DOWNLOAD_DIR.");
      }
      return true;
    }),
  body("originalName").optional().trim().notEmpty().withMessage("Original file name cannot be empty."),
  body("mimeType").optional().trim().notEmpty().withMessage("MIME type cannot be empty."),
  body("size").optional().isInt({ min: 0 }).withMessage("File size must be a positive integer."),
  validate
];

const orderStatusValues = ["pending", "paid", "failed"];
const fulfillmentStatusValues = ["new", "processing", "packed", "shipped", "delivered", "cancelled", "returned"];

const orderStatusValidators = [
  body("status").optional().isIn(orderStatusValues).withMessage("Invalid payment status."),
  body("fulfillmentStatus").optional().isIn(fulfillmentStatusValues).withMessage("Invalid fulfillment status."),
  validate
];

function requireDatabase(req, res) {
  if (req.app.locals.dbReady) return false;
  res.status(503).json({ message: "Database is not connected." });
  return true;
}

router.get("/users", async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;

    const users = await User.find().select("-passwordHash -passwordResetTokenHash").sort({ createdAt: -1 });
    return res.json(users);
  } catch (error) {
    return next(error);
  }
});

router.get("/orders", async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;

    const orders = await Order.find().populate("user", "name email role").sort({ createdAt: -1 });
    return res.json(orders);
  } catch (error) {
    return next(error);
  }
});

router.put("/orders/:id/status", orderStatusValidators, async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;

    const updates = {};
    if (req.body.status) updates.status = req.body.status;
    if (req.body.fulfillmentStatus) updates.fulfillmentStatus = req.body.fulfillmentStatus;
    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: "No order status update provided." });
    }

    const order = await Order.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    }).populate("user", "name email role");
    if (!order) return res.status(404).json({ message: "Order not found." });

    return res.json(order);
  } catch (error) {
    return next(error);
  }
});

router.get("/products", async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;

    const products = await Product.find().sort({ createdAt: -1 });
    return res.json(products);
  } catch (error) {
    return next(error);
  }
});

router.get("/appointments", async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;

    const appointments = await Appointment.find().sort({ createdAt: -1 });
    return res.json(appointments);
  } catch (error) {
    return next(error);
  }
});

router.get("/business-leads", async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;

    const leads = await BusinessLead.find().sort({ createdAt: -1 });
    return res.json(leads);
  } catch (error) {
    return next(error);
  }
});

router.get("/newsletter", async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;

    const subscriptions = await NewsletterSubscription.find().sort({ createdAt: -1 });
    return res.json(subscriptions);
  } catch (error) {
    return next(error);
  }
});

router.post("/products", productValidators, async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;

    const product = await Product.create(req.body);
    return res.status(201).json(product);
  } catch (error) {
    return next(error);
  }
});

router.put("/products/:id", productValidators, async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;

    const product = await Product.findOneAndUpdate(productQuery(req.params.id), req.body, {
      new: true,
      runValidators: true
    });
    if (!product) return res.status(404).json({ message: "Product not found." });

    return res.json(product);
  } catch (error) {
    return next(error);
  }
});

router.delete("/products/:id", async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;

    const product = await Product.findOneAndUpdate(
      productQuery(req.params.id),
      { isActive: false },
      { new: true }
    );
    if (!product) return res.status(404).json({ message: "Product not found." });

    return res.json({ message: "Product deleted.", product });
  } catch (error) {
    return next(error);
  }
});

router.put("/products/:id/digital-file", digitalFileValidators, async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;

    const product = await Product.findOneAndUpdate(
      productQuery(req.params.id),
      {
        digitalFile: {
          originalName: req.body.originalName || req.body.storagePath.split("/").pop(),
          storagePath: req.body.storagePath,
          mimeType: req.body.mimeType || "application/octet-stream",
          size: Number(req.body.size || 0)
        }
      },
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ message: "Product not found." });

    return res.json(product);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
