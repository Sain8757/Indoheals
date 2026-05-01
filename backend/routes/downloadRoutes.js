const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const Order = require("../models/Order");
const Product = require("../models/Product");
const requireAuth = require("../middleware/auth");
const { hashToken } = require("../utils/auth");

const SECURE_DOWNLOAD_DIR = process.env.SECURE_DOWNLOAD_DIR || path.join(__dirname, "../secure-files");

router.get("/:orderId/:productId", requireAuth, async (req, res, next) => {
  try {
    if (!req.app.locals.dbReady) {
      return res.status(503).json({ message: "Downloads require database connection." });
    }

    const token = String(req.query.token || "");
    const order = await Order.findOne({
      _id: req.params.orderId,
      user: req.user._id,
      status: "paid"
    });

    if (!order) return res.status(403).json({ message: "Purchase required for this download." });

    const tokenHash = hashToken(token);
    const item = order.items.find(orderItem => {
      return (
        String(orderItem.productId) === String(req.params.productId) &&
        orderItem.downloadTokenHash === tokenHash &&
        orderItem.downloadTokenExpires > new Date()
      );
    });

    if (!item) {
      return res.status(403).json({ message: "Download link is invalid or expired." });
    }

    const product = await Product.findById(item.productId);
    if (!product?.digitalFile?.storagePath) {
      return res.status(404).json({ message: "Digital file is not configured for this product yet." });
    }

    const resolved = path.resolve(SECURE_DOWNLOAD_DIR, product.digitalFile.storagePath);
    if (!resolved.startsWith(path.resolve(SECURE_DOWNLOAD_DIR)) || !fs.existsSync(resolved)) {
      return res.status(404).json({ message: "Digital file not found." });
    }

    return res.download(resolved, product.digitalFile.originalName || `${product.slug || product._id}.zip`);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
