const fs = require('fs');
const path = require('path');

class InvoiceService {
  constructor() {
    this.companyDetails = {
      name: "Indo Heals",
      address: "THIRD FLOOR, PLOT BEARING NO-139, JAMIA NAGAR, DELHI-110025",
      phone: "+91 93766 98757",
      email: "contact@indoheals.com",
      gstin: "07AAACI1234A1Z1", // Placeholder
      pan: "AAACI1234A"
    };
  }

  generateHTML(order) {
    const itemsHtml = order.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price * item.quantity}</td>
      </tr>
    `).join('');

    const subtotal = order.total - (order.gstAmount || 0);
    const cgst = (order.taxDetails?.cgst || (order.gstAmount || 0) / 2);
    const sgst = (order.taxDetails?.sgst || (order.gstAmount || 0) / 2);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice - ${order._id}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #555; line-height: 1.4; }
          .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, .15); font-size: 14px; }
          .invoice-box table { width: 100%; text-align: left; border-collapse: collapse; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .company-info h2 { margin: 0; color: #000; }
          .invoice-info { text-align: right; }
          .bill-to { margin-bottom: 30px; }
          .totals { margin-top: 30px; text-align: right; }
          .totals table { width: 250px; margin-left: auto; }
          .totals td { padding: 5px; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header">
            <div class="company-info">
              <h2>${this.companyDetails.name}</h2>
              <p>${this.companyDetails.address}<br>
              GSTIN: ${this.companyDetails.gstin}<br>
              Phone: ${this.companyDetails.phone}</p>
            </div>
            <div class="invoice-info">
              <h1 style="margin: 0; color: #333;">INVOICE</h1>
              <p>Invoice #: ${order.invoiceNumber || order._id.toString().slice(-6).toUpperCase()}<br>
              Date: ${new Date(order.createdAt).toLocaleDateString()}<br>
              Order ID: #${order._id.toString().slice(-6).toUpperCase()}</p>
            </div>
          </div>

          <div class="bill-to">
            <strong style="color: #000;">Bill To:</strong><br>
            ${order.customerName}<br>
            ${order.shippingAddress?.addressLine1}<br>
            ${order.shippingAddress?.city}, ${order.shippingAddress?.state} - ${order.shippingAddress?.postalCode}<br>
            Phone: ${order.customerPhone}
          </div>

          <table>
            <thead>
              <tr style="background: #f9f9f9; font-weight: bold;">
                <td style="padding: 10px; border-bottom: 2px solid #eee;">Item Description</td>
                <td style="padding: 10px; border-bottom: 2px solid #eee; text-align: center;">Qty</td>
                <td style="padding: 10px; border-bottom: 2px solid #eee; text-align: right;">Price</td>
                <td style="padding: 10px; border-bottom: 2px solid #eee; text-align: right;">Total</td>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals">
            <table>
              <tr>
                <td>Subtotal:</td>
                <td>₹${subtotal}</td>
              </tr>
              <tr>
                <td>CGST:</td>
                <td>₹${cgst}</td>
              </tr>
              <tr>
                <td>SGST:</td>
                <td>₹${sgst}</td>
              </tr>
              <tr style="font-weight: bold; font-size: 16px; color: #000;">
                <td>Grand Total:</td>
                <td>₹${order.total}</td>
              </tr>
            </table>
          </div>

          <div class="footer">
            <p>Thank you for your business!<br>
            This is a computer-generated invoice and does not require a physical signature.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new InvoiceService();
