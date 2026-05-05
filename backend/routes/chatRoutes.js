const express = require("express");
const router = express.Router();

// Indo Heals knowledge base for context
const SYSTEM_CONTEXT = `You are a friendly and knowledgeable wellness assistant for Indo Heals, a premium herbal wellness brand from New Delhi, India.

About Indo Heals:
- Founded in 2026, rooted in Ayurvedic and Unani herbal traditions
- Products: Breathe Classic (₹299), Breathe Energy (₹349), Breathe Immunity (₹349), Breathe Slim (₹329)
- All products are FSSAI-compliant traditional-use wellness products
- Address: 3rd Floor, Plot No. 139, Opp. Okhla Jama Masjid, Main Market, Okhla Village, Jamia Nagar, New Delhi - 110025
- Email: Contact@indoheals.com | Phone: +91 9955289295
- Offer: video call consultations with Unani doctors

Product Details:
- Breathe Classic: Ashwagandha and tulsi with deep cocoa richness. Premium herbal dark chocolate ritual.
- Breathe Energy: Moringa and almond for active everyday routines. Bright, energizing herbal formulation.
- Breathe Immunity: Amla, cinnamon and mulethi in a smooth cacao base. Rich immunity support.
- Breathe Slim: Ginger and black pepper for warm digestive balance. Metabolic support in premium chocolate format.

Services:
- Online doctor consultations (video call)
- Appointment booking for product guidance, business enquiries, and wellness consultations
- Wholesale and international partnerships

Keep answers concise, warm, and helpful. If asked about medical advice, recommend consulting with our Unani doctors via appointment booking. Do not make specific medical claims.`;

// Simple keyword-based fallback when no AI key is configured
function getRuleBasedResponse(message) {
  const msg = message.toLowerCase();

  if (msg.includes("price") || msg.includes("cost") || msg.includes("₹") || msg.includes("rupee")) {
    return "Our products are priced as follows:\n• **Breathe Classic** – ₹299\n• **Breathe Energy** – ₹349\n• **Breathe Immunity** – ₹349\n• **Breathe Slim** – ₹329\n\nAll are premium herbal dark chocolate wellness blends. Want to book a consultation for personalised guidance?";
  }

  if (msg.includes("classic") || msg.includes("ashwagandha") || msg.includes("tulsi")) {
    return "**Breathe Classic** (₹299) combines Ashwagandha and Tulsi with deep cocoa richness. It's our signature herbal dark chocolate blend for daily calm and balance. 🌿";
  }

  if (msg.includes("energy") || msg.includes("moringa") || msg.includes("almond")) {
    return "**Breathe Energy** (₹349) features Moringa and Almond for an active everyday routine. It's a bright, energizing herbal formulation perfect for your morning ritual. ⚡";
  }

  if (msg.includes("immunity") || msg.includes("amla") || msg.includes("cinnamon") || msg.includes("mulethi")) {
    return "**Breathe Immunity** (₹349) contains Amla, Cinnamon and Mulethi in a smooth cacao base — rich immunity support in a premium chocolate format. 🛡️";
  }

  if (msg.includes("slim") || msg.includes("ginger") || msg.includes("weight") || msg.includes("digest")) {
    return "**Breathe Slim** (₹329) uses Ginger and Black Pepper for warm digestive balance — metabolic support in a premium chocolate format. 🔥";
  }

  if (msg.includes("appointment") || msg.includes("book") || msg.includes("consult") || msg.includes("doctor")) {
    return "You can **book an appointment** with our Unani doctors for a video call consultation! Just click 'Book an Appointment' in the navigation menu.\n\nWe offer:\n• Personal wellness guidance\n• Product recommendations\n• Business/wholesale enquiries";
  }

  if (msg.includes("contact") || msg.includes("phone") || msg.includes("email") || msg.includes("address")) {
    return "📞 **Contact Indo Heals:**\n• Email: Contact@indoheals.com\n• Phone: +91 9955289295\n• Address: 3rd Floor, Plot No. 139, Okhla Village, Jamia Nagar, New Delhi - 110025";
  }

  if (msg.includes("ayurveda") || msg.includes("unani") || msg.includes("herbal") || msg.includes("ingredient")) {
    return "Indo Heals is rooted in **Ayurvedic and Unani traditions**. We use botanicals like Ashwagandha, Tulsi, Amla, Moringa, Mulethi, Ginger and Black Pepper — all in premium dark chocolate wellness formats. All products are FSSAI-compliant. 🌱";
  }

  if (msg.includes("wholesale") || msg.includes("business") || msg.includes("bulk") || msg.includes("partner")) {
    return "For **wholesale and business partnerships**, please use our Contact page or book an appointment. We welcome international partnerships and bulk orders! Our team will connect with you promptly.";
  }

  if (msg.includes("shipping") || msg.includes("deliver") || msg.includes("order")) {
    return "We ship across India! Once you place an order, you can track it from 'My Orders' in your account. For delivery queries, reach us at Contact@indoheals.com or +91 9955289295.";
  }

  if (msg.includes("hello") || msg.includes("hi") || msg.includes("hey") || msg.includes("namaste")) {
    return "Namaste! 🙏 Welcome to Indo Heals — where ancient herbal wisdom meets modern wellness. How can I help you today? You can ask me about our products, book an appointment, or get in touch with our team!";
  }

  if (msg.includes("thank")) {
    return "You're welcome! 😊 Feel free to ask anything else about Indo Heals. For personalised wellness guidance, consider booking a consultation with our Unani doctors!";
  }

  return "I'm the Indo Heals wellness assistant! I can help you with:\n• 🛍️ Product information (Breathe Classic, Energy, Immunity, Slim)\n• 📅 Booking appointments with Unani doctors\n• 📞 Contact and support information\n• 🌿 Herbal wellness guidance\n\nWhat would you like to know?";
}

router.post("/ask", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required." });
    }

    const userMessage = message.trim().slice(0, 500); // limit input length

    // Try Gemini AI if API key is available
    if (process.env.GEMINI_API_KEY) {
      try {
        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Build conversation history for context
        const chatHistory = (history || [])
          .slice(-6) // keep last 3 exchanges
          .map(h => ({
            role: h.role === "user" ? "user" : "model",
            parts: [{ text: h.content }]
          }));

        const chat = model.startChat({
          history: [
            {
              role: "user",
              parts: [{ text: "You are the Indo Heals assistant. Please always stay in character and help users with Indo Heals products and services." }]
            },
            {
              role: "model",
              parts: [{ text: SYSTEM_CONTEXT }]
            },
            ...chatHistory
          ],
          generationConfig: {
            maxOutputTokens: 300,
            temperature: 0.7
          }
        });

        const result = await chat.sendMessage(userMessage);
        const reply = result.response.text();

        return res.json({ reply, powered_by: "gemini" });
      } catch (aiError) {
        console.warn("Gemini AI error, using fallback:", aiError.message);
        // Fall through to rule-based
      }
    }

    // Rule-based fallback
    const reply = getRuleBasedResponse(userMessage);
    return res.json({ reply, powered_by: "fallback" });

  } catch (error) {
    console.error("Chat error:", error);
    return res.status(500).json({ error: "Sorry, I couldn't process your message. Please try again." });
  }
});

module.exports = router;
