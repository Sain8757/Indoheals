const crypto = require("crypto");

class CashfreeService {
  constructor() {
    this.appId = process.env.CASHFREE_APP_ID;
    this.secretKey = process.env.CASHFREE_SECRET_KEY;
    this.baseUrl = process.env.NODE_ENV === "production" 
      ? "https://api.cashfree.com/pg" 
      : "https://sandbox.cashfree.com/pg";
  }

  async createOrder(orderData) {
    const payload = {
      order_id: orderData.orderId,
      order_amount: orderData.amount,
      order_currency: "INR",
      customer_details: {
        customer_id: orderData.customerId,
        customer_email: orderData.email,
        customer_phone: orderData.phone,
      },
      order_meta: {
        return_url: `${process.env.FRONTEND_URL}/order-success?order_id={order_id}`,
        notify_url: `${process.env.BACKEND_URL}/api/webhooks/cashfree`,
      },
    };

    const response = await fetch(`${this.baseUrl}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": this.appId,
        "x-client-secret": this.secretKey,
      },
      body: JSON.stringify(payload),
    });

    return response.json();
  }

  verifySignature(payload, signature) {
    const secretKey = this.secretKey;
    const genSignature = crypto
      .createHmac("sha256", secretKey)
      .update(payload)
      .digest("base64");
    return genSignature === signature;
  }
}

module.exports = new CashfreeService();
