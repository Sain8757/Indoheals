const express = require("express");
const router = express.Router();
const Pincode = require("../models/Pincode");
const axios = require("axios"); // I'll check if axios is available, if not use fetch

// Delivery estimation endpoint with Location lookup
router.get("/", async (req, res, next) => {
  try {
    const { pincode } = req.query;
    if (!pincode || !/^\d{6}$/.test(pincode)) {
      return res.status(400).json({ message: "Please enter a valid 6-digit India pincode." });
    }

    let locationName = "your location";
    let days = 3;
    let maxDays = 5;
    let deliverable = true;

    // 1. Fetch Location Name (India Post API)
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await response.json();
      if (data && data[0] && data[0].Status === "Success") {
        const postOffice = data[0].PostOffice[0];
        locationName = `${postOffice.District}, ${postOffice.State}`;
      }
    } catch (locErr) {
      console.warn("Location lookup failed:", locErr.message);
    }

    // 2. Check DB for specific overrides
    if (req.app.locals.dbReady) {
      const dbData = await Pincode.findOne({ pincode });
      if (dbData) {
        days = dbData.days;
        maxDays = days + 2;
        deliverable = dbData.isDeliverable;
      }
    }

    // 3. Fallback / Default Logic
    if (deliverable) {
      // Logic for range: e.g. 110xxx -> 2-3 days, others 4-6 days
      if (pincode.startsWith("11")) {
        days = 2;
        maxDays = 3;
      } else if (pincode.startsWith("40") || pincode.startsWith("56") || pincode.startsWith("60")) {
        days = 3;
        maxDays = 5;
      } else {
        days = 4;
        maxDays = 7;
      }

      return res.json({
        pincode,
        locationName,
        range: `${days}-${maxDays} days`,
        deliverable: true
      });
    }

    return res.status(404).json({
      pincode,
      deliverable: false,
      message: "Currently not deliverable to this location."
    });
  } catch (error) {
    next(error);
  }
});

// Admin endpoint to add/update pincodes
router.post("/", async (req, res, next) => {
  try {
    const { pincode, days, isDeliverable } = req.body;
    if (!pincode || days === undefined) {
      return res.status(400).json({ message: "Pincode and days are required." });
    }

    const updated = await Pincode.findOneAndUpdate(
      { pincode },
      { days, isDeliverable: isDeliverable !== false },
      { upsert: true, new: true }
    );

    return res.json(updated);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
