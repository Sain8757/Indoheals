const express = require("express");
const { body } = require("express-validator");
const router = express.Router();
const Product = require("../models/Product");
const requireAuth = require("../middleware/auth");
const { requireAdmin } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  ensureDefaultProducts,
  fallbackProducts,
  productQuery
} = require("../utils/products");

const productValidators = [
  body("name").trim().notEmpty().withMessage("Product name is required."),
  body("slug").optional().trim().isSlug().withMessage("Slug must be URL safe."),
  body("price").isFloat({ min: 0 }).withMessage("Price must be a positive number."),
  body("stock").optional().isInt({ min: 0 }).withMessage("Stock must be a positive integer."),
  validate
];

router.get("/", async (req, res) => {
  try {
    if (!req.app.locals.dbReady) {
      return res.json(fallbackProducts());
    }

    await ensureDefaultProducts();
    const products = await Product.find({ isActive: { $ne: false } }).sort({ createdAt: 1 });
    return res.json(products);
  } catch (error) {
    console.error("Product fetch failed:", error.message);
    return res.json(fallbackProducts());
  }
});

router.get("/:id", async (req, res) => {
  try {
    if (!req.app.locals.dbReady) {
      const product = fallbackProducts().find(item => item._id === req.params.id || item.slug === req.params.id);
      return product
        ? res.json(product)
        : res.status(404).json({ message: "Product not found" });
    }

    const product = await Product.findOne(productQuery(req.params.id));
    if (!product || product.isActive === false) {
      return res.status(404).json({ message: "Product not found" });
    }
    return res.json(product);
  } catch (error) {
    return res.status(404).json({ message: "Product not found" });
  }
});

router.post("/", requireAuth, requireAdmin, productValidators, async (req, res, next) => {
  try {
    if (!req.app.locals.dbReady) {
      return res.status(503).json({ message: "Database is not connected." });
    }

    const product = await Product.create(req.body);
    return res.status(201).json(product);
  } catch (error) {
    return next(error);
  }
});

router.put("/:id", requireAuth, requireAdmin, productValidators, async (req, res, next) => {
  try {
    if (!req.app.locals.dbReady) {
      return res.status(503).json({ message: "Database is not connected." });
    }

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

router.delete("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!req.app.locals.dbReady) {
      return res.status(503).json({ message: "Database is not connected." });
    }

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

module.exports = router;
