const nodemailer = require("nodemailer");

function configured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function createTransporter() {
  if (!configured()) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

async function sendMail({ to, subject, text, html }) {
  const transporter = createTransporter();
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || "no-reply@indoheals.com";

  if (!transporter) {
    console.log("Email skipped because SMTP is not configured:", { to, subject, text });
    return { skipped: true };
  }

  return transporter.sendMail({ from, to, subject, text, html });
}

async function sendPasswordResetEmail(user, resetUrl) {
  return sendMail({
    to: user.email,
    subject: "Reset your Indo Heals password",
    text: `Use this link to reset your password: ${resetUrl}`,
    html: `<p>Use this link to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
  });
}

async function sendOrderConfirmationEmail(order, downloadLinks = []) {
  const linksText = downloadLinks.length
    ? `\n\nDownload links:\n${downloadLinks.join("\n")}`
    : "";

  return sendMail({
    to: order.customerEmail,
    subject: "Your Indo Heals order is confirmed",
    text: `Thank you for your order ${order._id}. Payment status: ${order.status}.${linksText}`,
    html: `<p>Thank you for your order <strong>${order._id}</strong>.</p><p>Payment status: ${order.status}</p>${downloadLinks
      .map(link => `<p><a href="${link}">Download product</a></p>`)
      .join("")}`
  });
}

module.exports = {
  sendMail,
  sendOrderConfirmationEmail,
  sendPasswordResetEmail
};
