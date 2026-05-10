const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const StoreSetting = require("../models/StoreSetting");
const shiprocket = require("../services/shiprocket.service");
const { requireAuth, requireAdmin } = require("../middleware/auth");

// ── PUBLIC WEBHOOK ──
router.post("/webhook", async (req, res) => {
  try {
    // Shiprocket sends status updates here
    const { shipment_id, status, awb, courier_name } = req.body;
    console.log(`Shiprocket Webhook received: Shipment ${shipment_id}, Status: ${status}`);

    // Update order in DB
    const order = await Order.findOne({ trackingNumber: shipment_id.toString() });
    if (order) {
      if (status.toLowerCase().includes("delivered")) {
        order.fulfillmentStatus = "delivered";
        order.orderStatus = "Delivered";
      } else if (status.toLowerCase().includes("shipped")) {
        order.fulfillmentStatus = "shipped";
        order.orderStatus = "Shipped";
      } else if (status.toLowerCase().includes("out for delivery")) {
        order.fulfillmentStatus = "out_for_delivery";
        order.orderStatus = "Out for Delivery";
      } else if (status.toLowerCase().includes("canceled")) {
        order.fulfillmentStatus = "cancelled";
        order.orderStatus = "Cancelled";
      }
      await order.save();
      
      // Emit real-time update
      if (req.app.locals.io) {
        req.app.locals.io.emit("shipment_updated", {
          shipment_id,
          status: order.fulfillmentStatus,
          orderStatus: order.orderStatus,
          awb,
          courier_name,
          orderId: order._id
        });
      }
    }

    return res.status(200).send("OK");
  } catch (error) {
    console.error("Shiprocket Webhook Error:", error.message);
    return res.status(500).send("Internal Server Error");
  }
});

// Secure remaining routes
router.use(requireAuth, requireAdmin);

async function getStoreSettings() {
  return StoreSetting.findOneAndUpdate(
    { key: "default" },
    { $setOnInsert: { key: "default" } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

// ── SHIPMENT MANAGEMENT ──

// Create shipment from Order
router.post("/shipments/create/:orderId", async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found." });

    const settings = await getStoreSettings();
    if (!settings.shipping.shiprocketEnabled) {
      return res.status(400).json({ message: "Shiprocket integration is disabled." });
    }

    const result = await shiprocket.createShiprocketOrder(order, settings.shipping.shiprocketPickupLocation);
    
    // Update order with Shiprocket details
    order.trackingNumber = result.shipment_id.toString();
    order.fulfillmentStatus = "processing";
    order.orderStatus = "Confirmed";
    await order.save();

    return res.json({ success: true, result });
  } catch (error) {
    next(error);
  }
});

// Bulk Create Shipments
router.post("/shipments/bulk-create", async (req, res, next) => {
  try {
    const { orderIds } = req.body;
    if (!orderIds || !Array.isArray(orderIds)) {
      return res.status(400).json({ message: "Invalid order IDs." });
    }

    const settings = await getStoreSettings();
    const results = [];

    for (const id of orderIds) {
      try {
        const order = await Order.findById(id);
        if (order && order.status === "paid" && !order.trackingNumber) {
          const result = await shiprocket.createShiprocketOrder(order, settings.shipping.shiprocketPickupLocation);
          order.trackingNumber = result.shipment_id.toString();
          order.fulfillmentStatus = "processing";
          order.orderStatus = "Confirmed";
          await order.save();
          results.push({ id, status: "success", shipment_id: result.shipment_id });
        } else {
          results.push({ id, status: "skipped", reason: "Order not eligible or already processed." });
        }
      } catch (err) {
        results.push({ id, status: "failed", reason: err.message });
      }
    }

    return res.json({ results });
  } catch (error) {
    next(error);
  }
});

// Assign AWB
router.post("/shipments/assign-awb", async (req, res, next) => {
  try {
    const { shipmentId, courierId } = req.body;
    const result = await shiprocket.assignAWB(shipmentId, courierId);
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

// Generate Label
router.post("/shipments/generate-label", async (req, res, next) => {
  try {
    const { shipmentIds } = req.body;
    const result = await shiprocket.generateShiprocketLabel(shipmentIds);
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

// Generate Invoice
router.post("/shipments/generate-invoice", async (req, res, next) => {
  try {
    const { orderIds } = req.body;
    const result = await shiprocket.generateShiprocketInvoice(orderIds);
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

// ── TRACKING & SERVICEABILITY ──

// Track Shipment
router.get("/track/:shipmentId", async (req, res, next) => {
  try {
    const tracking = await shiprocket.getShiprocketTracking(req.params.shipmentId);
    return res.json(tracking);
  } catch (error) {
    next(error);
  }
});

// Courier Serviceability
router.get("/serviceability", async (req, res, next) => {
  try {
    const { pincode, weight, total, cod } = req.query;
    const result = await shiprocket.getCourierServiceability(pincode, weight, total, cod);
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

// ── WEBHOOK (Public endpoint, but should verify signature if possible) ──
// Move this to a separate public route if needed, or handle it here without requirement of auth
// Actually, Shiprocket webhooks are incoming, so they won't have admin auth.
// I'll define it separately or exclude from router.use(requireAuth)

module.exports = router;
