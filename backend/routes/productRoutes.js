const express = require("express");
const { body } = require("express-validator");
const router = express.Router();
const Product = require("../models/Product");
const Order = require("../models/Order");
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
  body("mrp").optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage("MRP must be a positive number."),
  body("description").optional({ checkFalsy: true }).trim(),
  body("wellnessNote").optional({ checkFalsy: true }).trim(),
  body("image").optional({ checkFalsy: true }).trim(),
  body("galleryImages").optional().isArray().withMessage("Gallery images must be a list."),
  body("videoUrl").optional({ checkFalsy: true }).trim(),
  body("category").optional({ checkFalsy: true }).trim(),
  body("badge").optional({ checkFalsy: true }).trim(),
  body("weight").optional({ checkFalsy: true }).trim(),
  body("cocoa").optional({ checkFalsy: true }).trim(),
  body("stock").optional().isInt({ min: 0 }).withMessage("Stock must be a positive integer."),
  body("ingredients").optional().isArray().withMessage("Ingredients must be a list."),
  body("benefits").optional().isArray().withMessage("Benefits must be a list."),
  validate
];

async function soldCountMap() {
  const rows = await Order.aggregate([
    {
      $match: {
        status: { $ne: "failed" },
        paymentStatus: { $ne: "Failed" },
        orderStatus: { $ne: "Cancelled" },
        fulfillmentStatus: { $ne: "cancelled" }
      }
    },
    { $unwind: "$items" },
    {
      $group: {
        _id: {
          productId: "$items.productId",
          productSlug: "$items.productSlug",
          name: "$items.name"
        },
        sold: { $sum: "$items.quantity" }
      }
    }
  ]);

  const counts = new Map();
  rows.forEach(row => {
    const sold = Number(row.sold || 0);
    [row._id.productId, row._id.productSlug, row._id.name]
      .filter(Boolean)
      .forEach(key => counts.set(String(key), Math.max(Number(counts.get(String(key)) || 0), sold)));
  });
  return counts;
}

function withSoldCount(product, counts) {
  const plain = product.toObject ? product.toObject() : product;
  const keys = [plain._id, plain.id, plain.slug, plain.name].filter(Boolean).map(String);
  const soldCount = keys.reduce((max, key) => Math.max(max, Number(counts.get(key) || 0)), 0);
  return { ...plain, soldCount };
}

router.get("/", async (req, res) => {
  try {
    if (!req.app.locals.dbReady) {
      return res.json(fallbackProducts());
    }

    await ensureDefaultProducts();
    const products = await Product.find({ isActive: { $ne: false } }).sort({ createdAt: 1 });
    const counts = await soldCountMap();
    return res.json(products.map(product => withSoldCount(product, counts)));
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
    const counts = await soldCountMap();
    return res.json(withSoldCount(product, counts));
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

    const product = await Product.findOneAndDelete(productQuery(req.params.id));
    if (!product) return res.status(404).json({ message: "Product not found." });

    return res.json({ message: "Product permanently deleted.", product });
  } catch (error) {
    return next(error);
  }
});

const ProductReview = require("../models/ProductReview");
const upload = require("../utils/upload");

router.post("/upload", requireAuth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  const relativePath = `assets/uploads/${req.file.filename}`;
  res.json({ url: relativePath });
});

router.get("/:id/verify-purchase", requireAuth, async (req, res, next) => {
  try {
    const product = await Product.findOne(productQuery(req.params.id));
    if (!product) return res.json({ canReview: false });

    const order = await Order.findOne({
      user: req.user._id,
      "items.productId": product._id,
      fulfillmentStatus: "delivered"
    });

    return res.json({ canReview: !!order });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/reviews", async (req, res, next) => {
  try {
    const product = await Product.findOne(productQuery(req.params.id));
    if (!product) return res.status(404).json({ message: "Product not found" });

    const reviews = await ProductReview.find({
      product: product._id,
      status: "published"
    }).sort({ createdAt: -1 });

    return res.json(reviews);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/reviews", requireAuth, async (req, res, next) => {
  try {
    const product = await Product.findOne(productQuery(req.params.id));
    if (!product) return res.status(404).json({ message: "Product not found" });

    const { rating, comment, images, video } = req.body;

    const review = await ProductReview.create({
      product: product._id,
      productName: product.name,
      user: req.user._id,
      customerName: req.user.name,
      customerEmail: req.user.email,
      rating,
      comment,
      images,
      video,
      status: "published" // Default to published as requested
    });

    return res.status(201).json(review);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
