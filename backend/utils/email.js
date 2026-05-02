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
    console.log("Email skipped because SMTP is not configured:", { to, subject });
    return { skipped: true };
  }

  return transporter.sendMail({ from, to, subject, text, html });
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatRupee(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
}

function adminEmail() {
  return process.env.ADMIN_EMAIL || process.env.SMTP_USER || "";
}

async function sendWelcomeEmail(user) {
  return sendMail({
    to: user.email,
    subject: "Welcome to Indo Heals",
    text: `Hi ${user.name}, your Indo Heals account has been created successfully.`,
    html: `<p>Hi ${escapeHtml(user.name)},</p><p>Your Indo Heals account has been created successfully.</p>`
  });
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
  const itemLines = (order.items || [])
    .map(item => `${item.name} x ${item.quantity} - ${formatRupee(item.price * item.quantity)}`)
    .join("\n");
  const itemHtml = (order.items || [])
    .map(
      item =>
        `<li>${escapeHtml(item.name)} x ${Number(item.quantity || 1)} - ${escapeHtml(
          formatRupee(item.price * item.quantity)
        )}</li>`
    )
    .join("");
  const address = order.shippingAddress || {};
  const addressText = [
    address.fullName,
    address.addressLine1,
    address.addressLine2,
    [address.city, address.state, address.postalCode].filter(Boolean).join(", "),
    address.country,
    address.phone ? `Phone: ${address.phone}` : ""
  ]
    .filter(Boolean)
    .join("\n");
  const linksText = downloadLinks.length
    ? `\n\nDownload links:\n${downloadLinks.join("\n")}`
    : "";
  const linksHtml = downloadLinks
    .map(link => `<p><a href="${escapeHtml(link)}">Download product</a></p>`)
    .join("");

  return sendMail({
    to: order.customerEmail,
    subject: "Your Indo Heals order is confirmed",
    text: `Thank you for your order ${order._id}.\n\nPayment status: ${order.status}\nTotal: ${formatRupee(
      order.total
    )}\n\nItems:\n${itemLines}\n\nShipping:\n${addressText}${linksText}`,
    html: `<p>Thank you for your order <strong>${escapeHtml(order._id)}</strong>.</p><p>Payment status: ${escapeHtml(
      order.status
    )}</p><p>Total: <strong>${escapeHtml(
      formatRupee(order.total)
    )}</strong></p><ul>${itemHtml}</ul><p><strong>Shipping</strong><br>${escapeHtml(addressText).replaceAll(
      "\n",
      "<br>"
    )}</p>${linksHtml}`
  });
}

async function sendAppointmentConfirmationEmail(appointment) {
  const text = `Your appointment request is received.\nReference: ${appointment.reference}\nPreferred slot: ${appointment.date} ${appointment.time}`;
  await sendMail({
    to: appointment.email,
    subject: "Indo Heals appointment request received",
    text,
    html: `<p>Your appointment request is received.</p><p>Reference: <strong>${escapeHtml(
      appointment.reference
    )}</strong></p><p>Preferred slot: ${escapeHtml(appointment.date)} ${escapeHtml(appointment.time)}</p>`
  });

  const to = adminEmail();
  if (!to) return { skipped: true };
  return sendMail({
    to,
    subject: `New appointment request: ${appointment.reference}`,
    text: `${appointment.name} (${appointment.email}, ${appointment.phone}) requested ${appointment.interest} on ${appointment.date} ${appointment.time}.`,
    html: `<p><strong>${escapeHtml(appointment.name)}</strong> requested ${escapeHtml(
      appointment.interest
    )}.</p><p>${escapeHtml(appointment.email)} · ${escapeHtml(appointment.phone)}</p><p>${escapeHtml(
      appointment.date
    )} ${escapeHtml(appointment.time)}</p>`
  });
}

async function sendBusinessLeadNotification(lead) {
  const text = `Thank you. Your business enquiry reference is ${lead.reference}.`;
  await sendMail({
    to: lead.email,
    subject: "Indo Heals business enquiry received",
    text,
    html: `<p>Thank you. Your business enquiry reference is <strong>${escapeHtml(
      lead.reference
    )}</strong>.</p>`
  });

  const to = adminEmail();
  if (!to) return { skipped: true };
  return sendMail({
    to,
    subject: `New business enquiry: ${lead.company}`,
    text: `${lead.company}, ${lead.city}, ${lead.country}\nContact: ${lead.contactPerson}, ${lead.email}, ${lead.mobile}\n${lead.message || ""}`,
    html: `<p><strong>${escapeHtml(lead.company)}</strong> from ${escapeHtml(lead.city)}, ${escapeHtml(
      lead.country
    )}</p><p>${escapeHtml(lead.contactPerson)} · ${escapeHtml(lead.email)} · ${escapeHtml(
      lead.mobile
    )}</p><p>${escapeHtml(lead.message || "")}</p>`
  });
}

async function sendNewsletterConfirmation(email) {
  return sendMail({
    to: email,
    subject: "You're subscribed to Indo Heals updates",
    text: "Thank you for subscribing to Indo Heals updates.",
    html: "<p>Thank you for subscribing to Indo Heals updates.</p>"
  });
}

module.exports = {
  sendMail,
  sendAppointmentConfirmationEmail,
  sendBusinessLeadNotification,
  sendNewsletterConfirmation,
  sendOrderConfirmationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail
};
