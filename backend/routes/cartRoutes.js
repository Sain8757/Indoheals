const express = require("express");
const { body } = require("express-validator");
const router = express.Router();
const Product = require("../models/Product");
const requireAuth = require("../middleware/auth");
const validate = require("../middleware/validate");
const { findFallbackProduct, productQuery } = require("../utils/products");

const memoryCarts = new Map();

function userId(req) {
  return String(req.user._id || req.user.id);
}

function cartResponse(cart = []) {
  return { items: cart, total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0) };
}

async function findProduct(req, productId) {
  if (!req.app.locals.dbReady) return findFallbackProduct(productId);
  return Product.findOne({ ...productQuery(productId), isActive: { $ne: false } });
}

router.get("/", requireAuth, async (req, res) => {
  if (!req.app.locals.dbReady) {
    return res.json(cartResponse(memoryCarts.get(userId(req)) || []));
  }

  return res.json(cartResponse(req.user.cart || []));
});

router.post(
  "/items",
  requireAuth,
  [
    body("productId").notEmpty().withMessage("Product ID is required."),
    body("quantity").optional().isInt({ min: 1 }).withMessage("Quantity must be at least 1."),
    validate
  ],
  async (req, res, next) => {
    try {
      const product = await findProduct(req, req.body.productId);
      if (!product) return res.status(404).json({ message: "Product not found." });

      const item = {
        product: product._id,
        productId: String(product._id || product.slug),
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: Number(req.body.quantity || 1)
      };

      if (!req.app.locals.dbReady) {
        const cart = memoryCarts.get(userId(req)) || [];
        const existing = cart.find(cartItem => cartItem.productId === item.productId);
        if (existing) existing.quantity += item.quantity;
        else cart.push(item);
        memoryCarts.set(userId(req), cart);
        return res.status(201).json(cartResponse(cart));
      }

      const existing = req.user.cart.find(cartItem => String(cartItem.productId) === item.productId);
      if (existing) existing.quantity += item.quantity;
      else req.user.cart.push(item);
      await req.user.save();

      return res.status(201).json(cartResponse(req.user.cart));
    } catch (error) {
      return next(error);
    }
  }
);

router.put(
  "/items/:productId",
  requireAuth,
  [body("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1."), validate],
  async (req, res, next) => {
    try {
      if (!req.app.locals.dbReady) {
        const cart = memoryCarts.get(userId(req)) || [];
        const item = cart.find(cartItem => cartItem.productId === req.params.productId);
        if (!item) return res.status(404).json({ message: "Cart item not found." });
        item.quantity = Number(req.body.quantity);
        return res.json(cartResponse(cart));
      }

      const item = req.user.cart.find(cartItem => String(cartItem.productId) === req.params.productId);
      if (!item) return res.status(404).json({ message: "Cart item not found." });
      item.quantity = Number(req.body.quantity);
      await req.user.save();
      return res.json(cartResponse(req.user.cart));
    } catch (error) {
      return next(error);
    }
  }
);

router.delete("/items/:productId", requireAuth, async (req, res, next) => {
  try {
    if (!req.app.locals.dbReady) {
      const cart = (memoryCarts.get(userId(req)) || []).filter(item => item.productId !== req.params.productId);
      memoryCarts.set(userId(req), cart);
      return res.json(cartResponse(cart));
    }

    req.user.cart = req.user.cart.filter(item => String(item.productId) !== req.params.productId);
    await req.user.save();
    return res.json(cartResponse(req.user.cart));
  } catch (error) {
    return next(error);
  }
});

router.delete("/", requireAuth, async (req, res, next) => {
  try {
    if (!req.app.locals.dbReady) {
      memoryCarts.set(userId(req), []);
      return res.json(cartResponse([]));
    }

    req.user.cart = [];
    await req.user.save();
    return res.json(cartResponse([]));
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
