const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/User");
const { hashPassword } = require("../utils/auth");

require("dotenv").config({ path: ".env" });

async function main() {
  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.argv[2] || `Admin@${crypto.randomBytes(6).toString("base64url")}7`;

  if (!email) throw new Error("ADMIN_EMAIL is missing in backend/.env");
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing in backend/.env");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");

  await mongoose.connect(process.env.MONGO_URI);

  const passwordHash = await hashPassword(password);
  const user = await User.findOneAndUpdate(
    { email },
    {
      $set: {
        name: "Admin",
        email,
        passwordHash,
        role: "admin",
        emailVerified: true,
        emailVerifiedAt: new Date()
      },
      $unset: {
        passwordResetTokenHash: "",
        passwordResetExpires: ""
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log("Admin login is ready:");
  console.log(`Email: ${user.email}`);
  console.log(`Password: ${password}`);

  await mongoose.disconnect();
}

main().catch(async error => {
  console.error(error.message);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
