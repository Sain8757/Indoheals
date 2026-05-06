const express = require("express");
const { body } = require("express-validator");
const router = express.Router();

const BusinessLead = require("../models/BusinessLead");
const NewsletterSubscription = require("../models/NewsletterSubscription");
const validate = require("../middleware/validate");
const {
  sendBusinessLeadNotification,
  sendNewsletterConfirmation
} = require("../utils/email");


const memoryBusinessLeads = [];
const memoryNewsletter = new Map();

function reference(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}



router.post(
  "/business",
  [
    body("company").trim().notEmpty().withMessage("Company name is required."),
    body("city").trim().notEmpty().withMessage("City is required."),
    body("country").trim().notEmpty().withMessage("Country is required."),
    body("website").optional({ checkFalsy: true }).isURL().withMessage("Website must be a valid URL."),
    body("contactPerson").trim().notEmpty().withMessage("Contact person is required."),
    body("mobile").trim().isLength({ min: 7 }).withMessage("Mobile number is required."),
    body("email").isEmail().withMessage("Valid email is required.").normalizeEmail(),
    body("currentProducts").optional().trim(),
    body("message").optional().trim(),
    validate
  ],
  async (req, res, next) => {
    try {
      const lead = {
        reference: reference("IH-BIZ"),
        company: String(req.body.company).trim(),
        city: String(req.body.city).trim(),
        country: String(req.body.country).trim(),
        website: String(req.body.website || "").trim(),
        contactPerson: String(req.body.contactPerson).trim(),
        mobile: String(req.body.mobile).trim(),
        email: normalizeEmail(req.body.email),
        currentProducts: String(req.body.currentProducts || "").trim(),
        message: String(req.body.message || "").trim()
      };

      const saved = req.app.locals.dbReady
        ? await BusinessLead.create(lead)
        : { ...lead, _id: lead.reference, createdAt: new Date(), status: "new" };

      if (!req.app.locals.dbReady) memoryBusinessLeads.push(saved);

      sendBusinessLeadNotification(saved).catch(error => {
        console.warn("Business lead email failed:", error.message);
      });

      return res.status(201).json({
        message: "Business enquiry received.",
        reference: saved.reference,
        lead: saved
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/newsletter",
  [body("email").isEmail().withMessage("Valid email is required.").normalizeEmail(), validate],
  async (req, res, next) => {
    try {
      const email = normalizeEmail(req.body.email);

      if (req.app.locals.dbReady) {
        await NewsletterSubscription.findOneAndUpdate(
          { email },
          { email, source: req.body.source || "website", status: "subscribed" },
          { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
        );
      } else {
        memoryNewsletter.set(email, {
          email,
          source: req.body.source || "website",
          status: "subscribed",
          updatedAt: new Date()
        });
      }

      sendNewsletterConfirmation(email).catch(error => {
        console.warn("Newsletter email failed:", error.message);
      });

      return res.status(201).json({ message: "Subscription confirmed." });
    } catch (error) {
      return next(error);
    }
  }
);

module.exports = router;
