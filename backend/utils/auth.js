const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const TOKEN_SECRET = process.env.JWT_SECRET || "indo-heals-dev-secret-change-me";
const TOKEN_TTL = process.env.JWT_TTL || "7d";

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function createToken(user) {
  return jwt.sign(
    {
      sub: String(user._id || user.id),
      name: user.name,
      email: user.email,
      role: user.role || "user"
    },
    TOKEN_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

function verifyToken(token) {
  if (!token) return null;

  try {
    return jwt.verify(token, TOKEN_SECRET);
  } catch (error) {
    return null;
  }
}

function createOpaqueToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, hash };
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function publicUser(user) {
  return {
    id: String(user._id || user.id),
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    role: user.role || "user",
    emailVerified: Boolean(user.emailVerified)
  };
}

module.exports = {
  createOpaqueToken,
  createToken,
  hashPassword,
  hashToken,
  publicUser,
  verifyPassword,
  verifyToken
};
