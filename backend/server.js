const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config();

const app = express();
app.locals.dbReady = false;

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true,
    credentials: true
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_MAX || 300),
    standardHeaders: true,
    legacyHeaders: false
  })
);
app.use(
  express.json({
    verify: (req, res, buf) => {
      if (req.originalUrl === "/api/orders/webhook/razorpay") {
        req.rawBody = buf;
      }
    }
  })
);

app.use((req, res, next) => {
  console.log("REQ:", req.method, req.url);
  next();
});

const productRoutes = require("./routes/productRoutes");
const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const cartRoutes = require("./routes/cartRoutes");
const downloadRoutes = require("./routes/downloadRoutes");
const adminRoutes = require("./routes/adminRoutes");
const contactRoutes = require("./routes/contactRoutes");
const chatRoutes = require("./routes/chatRoutes");

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    database: app.locals.dbReady ? "connected" : "offline-dev-fallback",
    mongoState: mongoose.connection.readyState
  });
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/admin.html"));
});

app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/downloads", downloadRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chat", chatRoutes);

const frontendPath = path.join(__dirname, "../frontend");
app.use(express.static(frontendPath));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Something went wrong"
  });
});

mongoose.connection.on("connected", () => {
  app.locals.dbReady = true;
  console.log("MongoDB Connected");
});

mongoose.connection.on("disconnected", () => {
  app.locals.dbReady = false;
  console.log("MongoDB Disconnected");
});

async function connectMongo() {
  if (!process.env.MONGO_URI) {
    app.locals.dbReady = false;
    console.log("MONGO_URI is not set. Using development fallback for products/auth.");
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  } catch (err) {
    app.locals.dbReady = false;
    console.log("MongoDB offline, using development fallback for products/auth:", err.message);
  }
}

connectMongo();

const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server };
