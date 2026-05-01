const User = require("../models/User");
const { verifyToken } = require("../utils/auth");

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const payload = verifyToken(token);

    if (!payload) {
      return res.status(401).json({ message: "Please login to continue." });
    }

    req.auth = payload;

    if (req.app.locals.dbReady) {
      const user = await User.findById(payload.sub).select("name email role cart");
      if (!user) {
        return res.status(401).json({ message: "Account not found. Please login again." });
      }
      req.user = user;
    } else {
      req.user = {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        role: payload.role || "user"
      };
    }

    return next();
  } catch (error) {
    return res.status(401).json({ message: "Please login again." });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required." });
  }

  return next();
}

module.exports = requireAuth;
module.exports.requireAdmin = requireAdmin;
