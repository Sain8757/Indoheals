const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL;
const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD;

let cachedToken = null;
let tokenExpiresAt = null;

async function getShiprocketToken() {
  if (cachedToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  try {
    const response = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: SHIPROCKET_EMAIL, password: SHIPROCKET_PASSWORD })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Shiprocket authentication failed");
    }

    cachedToken = data.token;
    // Tokens usually last 10 days, let's refresh after 9 days to be safe
    tokenExpiresAt = Date.now() + 9 * 24 * 60 * 60 * 1000;
    return cachedToken;
  } catch (error) {
    console.error("Shiprocket Auth Error:", error.message);
    throw error;
  }
}

async function createShiprocketOrder(order, pickupLocation = "Primary") {
  const token = await getShiprocketToken();

  const payload = {
    order_id: order._id.toString(),
    order_date: new Date(order.createdAt).toISOString().split("T")[0],
    pickup_location: pickupLocation,
    billing_customer_name: order.shippingAddress.fullName,
    billing_last_name: "",
    billing_address: order.shippingAddress.addressLine1,
    billing_address_2: order.shippingAddress.addressLine2 || "",
    billing_city: order.shippingAddress.city,
    billing_pincode: order.shippingAddress.postalCode,
    billing_state: order.shippingAddress.state,
    billing_country: order.shippingAddress.country || "India",
    billing_email: order.customerEmail || "contact@indoheals.com",
    billing_phone: order.customerPhone || order.shippingAddress.phone,
    shipping_is_billing: true,
    order_items: order.items.map(item => ({
      name: item.name,
      sku: item.productSlug || item.productId,
      units: item.quantity,
      selling_price: item.price,
      discount: 0,
      tax: 0,
      hsn: ""
    })),
    payment_method: order.paymentMethod === "COD" ? "COD" : "Prepaid",
    shipping_charges: 0,
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: 0,
    sub_total: order.total,
    length: 10,
    breadth: 10,
    height: 10,
    weight: 0.5
  };

  try {
    const response = await fetch("https://apiv2.shiprocket.in/v1/external/shipments/create/forward-shipment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to create Shiprocket order");
    }

    return data;
  } catch (error) {
    console.error("Shiprocket Order Creation Error:", error.message);
    throw error;
  }
}

async function getShiprocketTracking(shipmentId) {
  const token = await getShiprocketToken();
  try {
    const response = await fetch(`https://apiv2.shiprocket.in/v1/external/courier/track/shipment/${shipmentId}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    return await response.json();
  } catch (error) {
    console.error("Shiprocket Tracking Error:", error.message);
    throw error;
  }
}

async function generateShiprocketLabel(shipmentIds) {
  const token = await getShiprocketToken();
  try {
    const response = await fetch("https://apiv2.shiprocket.in/v1/external/courier/generate/label", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ shipment_id: Array.isArray(shipmentIds) ? shipmentIds : [shipmentIds] })
    });
    return await response.json();
  } catch (error) {
    console.error("Shiprocket Label Error:", error.message);
    throw error;
  }
}

async function generateShiprocketInvoice(orderIds) {
  const token = await getShiprocketToken();
  try {
    const response = await fetch("https://apiv2.shiprocket.in/v1/external/orders/print/invoice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ ids: Array.isArray(orderIds) ? orderIds : [orderIds] })
    });
    return await response.json();
  } catch (error) {
    console.error("Shiprocket Invoice Error:", error.message);
    throw error;
  }
}

async function getCourierServiceability(pincode, weight = 0.5, total = 100, cod = 0) {
  const token = await getShiprocketToken();
  try {
    const url = `https://apiv2.shiprocket.in/v1/external/courier/serviceability/?delivery_postcode=${pincode}&weight=${weight}&cod=${cod}&order_amount=${total}`;
    const response = await fetch(url, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    return await response.json();
  } catch (error) {
    console.error("Shiprocket Serviceability Error:", error.message);
    throw error;
  }
}

async function assignAWB(shipmentId, courierId = null) {
  const token = await getShiprocketToken();
  try {
    const payload = { shipment_id: shipmentId };
    if (courierId) payload.courier_id = courierId;

    const response = await fetch("https://apiv2.shiprocket.in/v1/external/courier/assign/awb", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    return await response.json();
  } catch (error) {
    console.error("Shiprocket AWB Assignment Error:", error.message);
    throw error;
  }
}

async function getShipmentDetails(shipmentId) {
  const token = await getShiprocketToken();
  try {
    const response = await fetch(`https://apiv2.shiprocket.in/v1/external/shipments/${shipmentId}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    return await response.json();
  } catch (error) {
    console.error("Shiprocket Shipment Details Error:", error.message);
    throw error;
  }
}

module.exports = {
  getShiprocketToken,
  createShiprocketOrder,
  getShiprocketTracking,
  generateShiprocketLabel,
  generateShiprocketInvoice,
  getCourierServiceability,
  assignAWB,
  getShipmentDetails
};
