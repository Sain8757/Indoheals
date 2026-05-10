const express = require("express");
const { body } = require("express-validator");
const router = express.Router();
const User = require("../models/User");
const Order = require("../models/Order");
const Product = require("../models/Product");

const Razorpay = require("razorpay");
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const BusinessLead = require("../models/BusinessLead");
const NewsletterSubscription = require("../models/NewsletterSubscription");
const Discount = require("../models/Discount");
const StoreSetting = require("../models/StoreSetting");
const EmailCampaign = require("../models/EmailCampaign");
const ProductReview = require("../models/ProductReview");
const requireAuth = require("../middleware/auth");
const { requireAdmin } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { productQuery } = require("../utils/products");
const { sendMail } = require("../utils/email");
const upload = require("../utils/upload");
const shiprocket = require("../services/shiprocket.service");

router.use(requireAuth, requireAdmin);

// ── FILE UPLOAD ROUTE ──
router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  const relativePath = `assets/uploads/${req.file.filename}`;
  res.json({ url: relativePath });
});

const productValidators = [
  body("name").trim().notEmpty().withMessage("Product name is required."),
  body("slug").optional({ checkFalsy: true }).trim().isSlug().withMessage("Slug must be URL safe."),
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


const leadStatusValues = ["new", "contacted", "qualified", "closed"];
const newsletterStatusValues = ["subscribed", "unsubscribed"];
const productReviewStatusValues = ["new", "published", "hidden", "archived"];

const discountValidators = [
  body("code").trim().notEmpty().withMessage("Discount code is required."),
  body("type").optional().isIn(["percentage", "fixed"]).withMessage("Invalid discount type."),
  body("value").isFloat({ min: 0 }).withMessage("Discount value must be positive."),
  body("minOrderValue").optional().isFloat({ min: 0 }).withMessage("Minimum order value must be positive."),
  body("maxUses").optional().isInt({ min: 0 }).withMessage("Maximum uses must be positive."),
  body("startsAt").optional({ checkFalsy: true }).isISO8601().withMessage("Start date must be valid."),
  body("endsAt").optional({ checkFalsy: true }).isISO8601().withMessage("End date must be valid."),
  validate
];

const emailCampaignValidators = [
  body("subject").trim().notEmpty().withMessage("Subject is required."),
  body("audience").optional().isIn(["newsletter", "customers", "all"]).withMessage("Invalid audience."),
  body("body").trim().notEmpty().withMessage("Email body is required."),
  validate
];

function requireDatabase(req, res) {
  if (req.app.locals.dbReady) return false;
  res.status(503).json({ message: "Database is not connected." });
  return true;
}

function cleanDiscountBody(body) {
  return {
    code: String(body.code || "").trim().toUpperCase(),
    description: String(body.description || "").trim(),
    type: body.type || "percentage",
    value: Number(body.value || 0),
    minOrderValue: Number(body.minOrderValue || 0),
    maxUses: Number(body.maxUses || 0),
    startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
    endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
    isActive: body.isActive !== false
  };
}

async function getStoreSettings() {
  return StoreSetting.findOneAndUpdate(
    { key: "default" },
    { $setOnInsert: { key: "default" } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
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

router.get("/settings", async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;

    const settings = await getStoreSettings();
    return res.json(settings);
  } catch (error) {
    return next(error);
  }
});

router.put("/settings", async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;

    const allowed = [
      "storeName",
      "supportEmail",
      "supportPhone",
      "currency",
      "measurementSystem",
      "company",
      "payments",
      "shipping",
      "checkout",
      "taxes",
      "invoices",
      "email"
    ];
    const updates = allowed.reduce((payload, key) => {
      if (req.body[key] !== undefined) payload[key] = req.body[key];
      return payload;
    }, {});

    const settings = await StoreSetting.findOneAndUpdate(
      { key: "default" },
      { $set: updates, $setOnInsert: { key: "default" } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return res.json(settings);
  } catch (error) {
    return next(error);
  }
});

router.put("/orders/:id/status", orderStatusValidators, async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;

    const updates = {};
    if (req.body.status) updates.status = req.body.status;
    if (req.body.fulfillmentStatus) {
      updates.fulfillmentStatus = req.body.fulfillmentStatus;

      // Sync with user-facing orderStatus
      const fStatus = req.body.fulfillmentStatus.toLowerCase();
      if (fStatus === 'new') updates.orderStatus = 'Pending';
      else if (fStatus === 'processing' || fStatus === 'packed') updates.orderStatus = 'Confirmed';
      else if (fStatus === 'shipped') updates.orderStatus = 'Shipped';
      else if (fStatus === 'out_for_delivery') updates.orderStatus = 'Out for Delivery';
      else if (fStatus === 'delivered') updates.orderStatus = 'Delivered';
      else if (fStatus === 'cancelled') updates.orderStatus = 'Cancelled';
      else if (fStatus === 'returned') updates.orderStatus = 'Cancelled';
    }
    if (req.body.trackingNumber !== undefined) updates.trackingNumber = req.body.trackingNumber;
    if (req.body.trackingLink !== undefined) updates.trackingLink = req.body.trackingLink;

    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: "No order update provided." });
    }

    const order = await Order.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    }).populate("user", "name email role");
    if (!order) return res.status(404).json({ message: "Order not found." });

    // Send status update email to customer if status or fulfillment changed
    if (req.body.status || req.body.fulfillmentStatus) {
      const customerEmail = order.customerEmail || (order.user && order.user.email);
      if (customerEmail) {
        const currentStatus = order.fulfillmentStatus || order.status;
        await sendMail({
          to: customerEmail,
          subject: `Order Update - Indo Heals (INV-${order._id.toString().slice(-6).toUpperCase()})`,
          text: `Dear ${order.customerName || 'Customer'},\n\nYour order status has been updated to: ${currentStatus.toUpperCase()}.\n\n${order.trackingNumber ? `Tracking ID: ${order.trackingNumber}\n` : ''}Thank you for shopping with Indo Heals!`,
          html: `<p>Dear ${order.customerName || 'Customer'},</p><p>Your order status has been updated to: <strong>${currentStatus.toUpperCase()}</strong>.</p>${order.trackingNumber ? `<p>Tracking ID: <strong>${order.trackingNumber}</strong></p>` : ''}<p>Thank you for shopping with Indo Heals!</p>`
        }).catch(err => console.error("Failed to send order status email:", err.message));
      }
    }

    return res.json(order);
  } catch (error) {
    return next(error);
  }
});

// ── SETTLEMENT ROUTE ──
router.put("/orders/:id/settle", async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;
    const { settlementId } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        settlementStatus: "settled",
        settlementId: settlementId || `SET-${Date.now().toString().slice(-6)}`,
        settlementDate: new Date()
      },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: "Order not found." });
    return res.json(order);
  } catch (error) {
    return next(error);
  }
});

// ── REFUND ROUTE ──
router.post("/orders/:id/refund", async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found." });
    if (order.status === 'refunded') return res.status(400).json({ message: "Order already refunded." });

    const { paymentId, amount } = req.body;
    if (!paymentId || paymentId.startsWith('cod')) {
      return res.status(400).json({ message: "COD orders cannot be refunded via Razorpay." });
    }

    // Initiate refund via Razorpay API
    const refund = await razorpay.payments.refund(paymentId, {
      amount: amount || order.total * 100, // paise
      speed: "normal",
      notes: { orderId: order._id.toString(), reason: "Admin initiated refund" }
    });

    // Update order status to refunded
    await Order.findByIdAndUpdate(req.params.id, { status: 'refunded', fulfillmentStatus: 'cancelled' });

    // Send refund email to customer
    const customerEmail = order.customerEmail;
    if (customerEmail) {
      await sendMail({
        to: customerEmail,
        subject: `Refund Initiated - Indo Heals (Order ${order._id.toString().slice(-6).toUpperCase()})`,
        html: `<p>Dear ${order.customerName || 'Customer'},</p><p>Your refund of <strong>₹${order.total}</strong> has been initiated successfully.</p><p>Refund ID: <strong>${refund.id}</strong></p><p>It will reflect in your account within 5-7 business days.</p><p>Thank you for shopping with Indo Heals!</p>`
      }).catch(err => console.error("Refund email error:", err.message));
    }

    return res.json({ success: true, refundId: refund.id, message: "Refund initiated successfully." });
  } catch (error) {
    console.error("Refund error:", error);
    return next(error);
  }
});

// ── PAYMENT ANALYTICS & LOGS ──
router.get("/payments/transactions", async (req, res, next) => {
  try {
    const Transaction = require("../models/Transaction");
    const transactions = await Transaction.find().populate("orderId", "_id customerName").sort({ createdAt: -1 }).limit(100);
    res.json(transactions);
  } catch (error) { next(error); }
});

router.get("/payments/payouts", async (req, res, next) => {
  try {
    const Payout = require("../models/Payout");
    const payouts = await Payout.find().sort({ createdAt: -1 }).limit(50);
    res.json(payouts);
  } catch (error) { next(error); }
});

router.get("/payments/webhooks", async (req, res, next) => {
  try {
    const WebhookLog = require("../models/WebhookLog");
    const logs = await WebhookLog.find().sort({ createdAt: -1 }).limit(100);
    res.json(logs);
  } catch (error) { next(error); }
});

router.get("/payments/refunds", async (req, res, next) => {
  try {
    // Aggregated from Transactions where status is refunded or specific Refund model if created
    const Transaction = require("../models/Transaction");
    const refunds = await Transaction.find({ status: "refunded" }).populate("orderId").sort({ createdAt: -1 });
    res.json(refunds);
  } catch (error) { next(error); }
});

router.get("/orders/:id/invoice", async (req, res, next) => {
  try {
    const invoiceService = require("../services/invoice.service");
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).send("Order not found");
    
    const html = invoiceService.generateHTML(order);
    res.send(html);
  } catch (error) { next(error); }
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

router.delete("/products/:id", async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found." });

    // Helper to delete local files
    const deleteFile = (filePath) => {
      if (!filePath || !filePath.startsWith("assets/uploads/")) return;
      const fullPath = path.join(__dirname, "../../frontend", filePath);
      if (fs.existsSync(fullPath)) {
        try { fs.unlinkSync(fullPath); } catch (err) { console.error("Error deleting file:", err); }
      }
    };

    // Delete associated files
    deleteFile(product.image);
    deleteFile(product.videoUrl);
    if (Array.isArray(product.galleryImages)) {
      product.galleryImages.forEach(img => deleteFile(img));
    }

    await Product.findByIdAndDelete(req.params.id);
    return res.json({ message: "Product and associated assets deleted successfully." });
  } catch (error) {
    next(error);
  }
});

router.get("/product-reviews", async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;

    const filter = {};
    if (req.query.rating) filter.rating = parseInt(req.query.rating);

    const reviews = await ProductReview.find(filter)
      .populate("product", "name slug image")
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    const formatted = reviews.map(rev => ({
      _id: rev._id,
      rating: rev.rating,
      comment: rev.comment,
      images: rev.images,
      video: rev.video,
      status: rev.status,
      createdAt: rev.createdAt,
      productName: rev.product ? rev.product.name : "Unknown Product",
      product: rev.product,
      customerName: rev.user ? rev.user.name : "Anonymous",
      customerEmail: rev.user ? rev.user.email : "N/A"
    }));

    return res.json(formatted);
  } catch (error) {
    return next(error);
  }
});

router.put("/product-reviews/:id/status", [body("status").isIn(productReviewStatusValues), validate], async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;

    const review = await ProductReview.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    ).populate("product", "name slug image");
    if (!review) return res.status(404).json({ message: "Product review not found." });
    return res.json(review);
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



router.put("/business-leads/:id/status", [body("status").isIn(leadStatusValues), validate], async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;

    const lead = await BusinessLead.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    );
    if (!lead) return res.status(404).json({ message: "Business lead not found." });
    return res.json(lead);
  } catch (error) {
    return next(error);
  }
});

router.put("/newsletter/:id/status", [body("status").isIn(newsletterStatusValues), validate], async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;

    const subscription = await NewsletterSubscription.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    );
    if (!subscription) return res.status(404).json({ message: "Subscription not found." });
    return res.json(subscription);
  } catch (error) {
    return next(error);
  }
});

router.get("/discounts", async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;

    const discounts = await Discount.find().sort({ createdAt: -1 });
    return res.json(discounts);
  } catch (error) {
    return next(error);
  }
});

router.post("/discounts", discountValidators, async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;

    const discount = await Discount.create(cleanDiscountBody(req.body));
    return res.status(201).json(discount);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Discount code already exists." });
    }
    return next(error);
  }
});

router.put("/discounts/:id", discountValidators, async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;

    const discount = await Discount.findByIdAndUpdate(req.params.id, cleanDiscountBody(req.body), {
      new: true,
      runValidators: true
    });
    if (!discount) return res.status(404).json({ message: "Discount not found." });
    return res.json(discount);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Discount code already exists." });
    }
    return next(error);
  }
});

router.delete("/discounts/:id", async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;

    const discount = await Discount.findByIdAndDelete(req.params.id);
    if (!discount) return res.status(404).json({ message: "Discount not found." });
    return res.json({ message: "Discount deleted." });
  } catch (error) {
    return next(error);
  }
});

router.get("/email-campaigns", async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;

    const campaigns = await EmailCampaign.find().sort({ createdAt: -1 });
    return res.json(campaigns);
  } catch (error) {
    return next(error);
  }
});

router.post("/email-campaigns", emailCampaignValidators, async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;

    const campaign = await EmailCampaign.create({
      subject: req.body.subject,
      audience: req.body.audience || "newsletter",
      body: req.body.body,
      status: "draft"
    });
    return res.status(201).json(campaign);
  } catch (error) {
    return next(error);
  }
});

router.put("/email-campaigns/:id", emailCampaignValidators, async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;

    const campaign = await EmailCampaign.findByIdAndUpdate(
      req.params.id,
      {
        subject: req.body.subject,
        audience: req.body.audience || "newsletter",
        body: req.body.body
      },
      { new: true, runValidators: true }
    );
    if (!campaign) return res.status(404).json({ message: "Email campaign not found." });
    return res.json(campaign);
  } catch (error) {
    return next(error);
  }
});

router.post("/email-campaigns/:id/send", async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;

    const campaign = await EmailCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Email campaign not found." });

    const newsletterEmails =
      campaign.audience === "newsletter" || campaign.audience === "all"
        ? await NewsletterSubscription.find({ status: "subscribed" }).distinct("email")
        : [];
    const customerEmails =
      campaign.audience === "customers" || campaign.audience === "all"
        ? await User.find().distinct("email")
        : [];
    const recipients = [...new Set([...newsletterEmails, ...customerEmails].filter(Boolean))];

    await Promise.all(
      recipients.map(email =>
        sendMail({
          to: email,
          subject: campaign.subject,
          text: campaign.body,
          html: `<p>${String(campaign.body)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll("\n", "<br>")}</p>`
        }).catch(error => {
          console.warn("Campaign email failed:", error.message);
        })
      )
    );

    campaign.status = "sent";
    campaign.recipientCount = recipients.length;
    campaign.sentAt = new Date();
    await campaign.save();

    return res.json(campaign);
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

router.patch("/products/:id", async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;

    // Allowed fields for partial update
    const updateData = {};
    if (req.body.stock !== undefined) updateData.stock = req.body.stock;
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

    const product = await Product.findOneAndUpdate(productQuery(req.params.id), updateData, {
      new: true
    });
    if (!product) return res.status(404).json({ message: "Product not found." });

    return res.json(product);
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

router.get("/abandoned-carts", async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;
    const users = await User.find({ "cart.0": { $exists: true } }).select("name email phone cart updatedAt abandonedCartStatus");
    const carts = users.map(u => ({
      userId: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      items: u.cart,
      total: u.cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
      updatedAt: u.updatedAt,
      status: u.abandonedCartStatus || "not_called"
    })).sort((a, b) => b.updatedAt - a.updatedAt);
    return res.json(carts);
  } catch (error) {
    next(error);
  }
});

router.put("/abandoned-carts/:userId/status", async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;
    const { status } = req.body;
    if (!["not_called", "called"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const user = await User.findByIdAndUpdate(req.params.userId, { abandonedCartStatus: status }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ message: "Status updated", status: user.abandonedCartStatus });
  } catch (error) {
    next(error);
  }
});

// ── SHIPROCKET INTEGRATION ──
router.post("/shipments/create/:id", async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found." });

    const settings = await getStoreSettings();
    if (!settings.shipping.shiprocketEnabled) {
      return res.status(400).json({ message: "Shiprocket integration is disabled in settings." });
    }

    const result = await shiprocket.createShiprocketOrder(order, settings.shipping.shiprocketPickupLocation);

    // Update order with Shiprocket details
    order.trackingNumber = result.shipment_id.toString(); // Shiprocket shipment_id
    order.fulfillmentStatus = "processing";
    order.orderStatus = "Confirmed";
    await order.save();

    return res.json({ message: "Shipment created in Shiprocket.", result });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to create shipment." });
  }
});

router.get("/shipments/track/:shipmentId", async (req, res, next) => {
  try {
    const tracking = await shiprocket.getShiprocketTracking(req.params.shipmentId);
    return res.json(tracking);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch tracking info." });
  }
});

router.get("/shipments/label/:shipmentId", async (req, res, next) => {
  try {
    const result = await shiprocket.generateShiprocketLabel(req.params.shipmentId);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to generate label." });
  }
});

router.get("/shipments/invoice/:orderId", async (req, res, next) => {
  try {
    const result = await shiprocket.generateShiprocketInvoice(req.params.orderId);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to generate invoice." });
  }
});

router.get("/stats", async (req, res, next) => {
  try {
    if (requireDatabase(req, res)) return;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      totalSalesData,
      todaySalesData,
      totalOrders,
      todayOrders,
      totalUsers,
      todayUsers,
      recentOrders,
      productStats,
      abandonedCarts
    ] = await Promise.all([
      Order.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: null, total: { $sum: "$total" } } }
      ]),
      Order.aggregate([
        { $match: { status: "paid", createdAt: { $gte: startOfDay } } },
        { $group: { _id: null, total: { $sum: "$total" } } }
      ]),
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: startOfDay } }),
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: startOfDay } }),
      Order.find().populate("user", "name email").sort({ createdAt: -1 }).limit(10),
      Product.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 }, stock: { $sum: "$stock" } } }
      ]),
      // Count users with items in their cart (abandoned carts)
      User.countDocuments({ cart: { $exists: true, $not: { $size: 0 } } })
    ]);

    const salesTrend = await Order.aggregate([
      { $match: { status: "paid", createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalRevenue: { $sum: "$total" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return res.json({
      totalSales: totalSalesData[0]?.total || 0,
      todaySales: todaySalesData[0]?.total || 0,
      totalOrders,
      todayOrders,
      totalUsers,
      todayUsers,
      recentOrders,
      productStats,
      salesTrend,
      abandonedCarts,
      liveVisitors: req.app.locals.activeVisitors ? req.app.locals.activeVisitors.size : 0
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
todayUsers,
  recentOrders,
  productStats,
  salesTrend,
  abandonedCarts,
  lowStockProducts,
  inTransitOrders,
  deliveredOrders,
  rtoOrders,
  weeklyShipmentStats,
  liveVisitors: req.app.locals.activeVisitors ? req.app.locals.activeVisitors.size : 0
    });
  } catch (error) {
  return next(error);
}
});

module.exports = router;
