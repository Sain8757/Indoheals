const { useState, useEffect } = React;

const API_BASE = window.location.protocol === "file:" || ["127.0.0.1", "localhost"].includes(window.location.hostname) ? "http://127.0.0.1:5001/api" : "/api";

function getAuth() {
  try {
    return JSON.parse(localStorage.getItem("auth") || "null");
  } catch {
    return null;
  }
}

function fetchJson(path, options = {}) {
  const auth = getAuth();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (auth?.token) {
    headers.Authorization = `Bearer ${auth.token}`;
  }

  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body
  }).then(async response => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }
    return data;
  });
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

function formatRupee(value) {
  const amount = Number(value || 0);
  return `₹${amount.toLocaleString("en-IN")}`;
}

function selectStatusBadge(status) {
  if (!status) return "badge-pending";
  const key = String(status).toLowerCase();
  if (key.includes("delivered")) return "badge-delivered";
  if (key.includes("shipped")) return "badge-shipped";
  if (key.includes("confirmed")) return "badge-confirmed";
  if (key.includes("out")) return "badge-out";
  return "badge-pending";
}

function selectPaymentBadge(status) {
  if (!status) return "badge-pending";
  const key = String(status).toLowerCase();
  if (key.includes("paid")) return "badge-confirmed";
  if (key.includes("cod")) return "badge-cod";
  if (key.includes("failed")) return "badge-out";
  return "badge-pending";
}

function OrderCard({ order, onSelect }) {
  const image = order.items?.[0]?.image || "assets/breathe-classic-ai.png";
  const name = order.items?.[0]?.name || "Order item";
  return (
    <article className="order-card" onClick={() => onSelect(order)}>
      <div className="order-card-image">
        <img src={image} alt={name} />
      </div>
      <div className="order-card-summary">
        <span className={`order-status-badge ${selectStatusBadge(order.orderStatus)}`}>{order.orderStatus || "Pending"}</span>
        <h2>{name}</h2>
        <p>{order.items?.map(item => `${item.name} x ${item.quantity}`).join(", ")}</p>
        <div className="order-card-meta">
          <span className="order-date">{formatDate(order.createdAt)}</span>
          <span className="order-id">Order ID: {order._id || order.orderId}</span>
        </div>
      </div>
      <div className="order-card-meta">
        <span className={`payment-status-badge ${selectPaymentBadge(order.paymentStatus)}`}>{order.paymentStatus || "Pending"}</span>
        <strong className="order-price">{formatRupee(order.total)}</strong>
      </div>
    </article>
  );
}

function OrderTimeline({ orderStatus, trackingNumber }) {
  const steps = [
    { id: "Pending", title: "Order Placed", description: "Your request is received." },
    { id: "Confirmed", title: "Order Confirmed", description: "We have confirmed your order." },
    { id: "Shipped", title: "Shipped", description: `Tracking number: ${trackingNumber || "pending"}` },
    { id: "Out for Delivery", title: "Out for Delivery", description: "Your order is out with the courier." },
    { id: "Delivered", title: "Delivered", description: "Your order has arrived." }
  ];

  const activeIndex = steps.findIndex(step => step.id === orderStatus);

  return (
    <section className="order-detail-section">
      <h3>Order Timeline</h3>
      <div className="timeline-list">
        {steps.map((step, index) => (
          <div key={step.id} className="timeline-step">
            <div className={`timeline-dot ${index <= activeIndex ? "active" : ""}`} />
            <div className="timeline-text">
              <strong>{step.title}</strong>
              <span>{step.description}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HelpSupportForm({ orderId, onSuccess }) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus(null);

    try {
      await fetchJson(`/orders/${orderId}/support`, {
        method: "POST",
        body: { message }
      });
      setMessage("");
      setStatus({ type: "success", text: "Support issue submitted successfully." });
      if (onSuccess) onSuccess();
    } catch (error) {
      setStatus({ type: "error", text: error.message });
    }
  }

  return (
    <section className="order-support-panel">
      <div className="order-detail-header">
        <div>
          <h3>Help & Support</h3>
          <p>Open an issue for order <strong>{orderId}</strong>.</p>
        </div>
      </div>
      <form className="help-form" onSubmit={handleSubmit}>
        <textarea
          placeholder="Describe your request or issue with this order"
          value={message}
          onChange={event => setMessage(event.target.value)}
          required
        />
        <button className="btn-primary" type="submit">Submit request</button>
        {status?.text && (
          <div className={status.type === "error" ? "page-error" : "page-success"}>{status.text}</div>
        )}
      </form>
    </section>
  );
}

function OrderDetails({ order, onBack }) {
  return (
    <div className="order-detail-panel">
      <div className="order-detail-header">
        <div>
          <p className="section-label">Order Details</p>
          <h2>Order #{order._id || order.orderId}</h2>
        </div>
        <button className="btn-outline" onClick={onBack}>Back to orders</button>
      </div>

      <div className="order-detail-metadata">
        <div>
          <strong>Order Date</strong>
          <span>{formatDate(order.createdAt)}</span>
        </div>
        <div>
          <strong>Order status</strong>
          <span>{order.orderStatus || "Pending"}</span>
        </div>
        <div>
          <strong>Payment method</strong>
          <span>{order.paymentMethod || order.paymentProvider || "Card"}</span>
        </div>
        <div>
          <strong>Payment status</strong>
          <span>{order.paymentStatus || "Pending"}</span>
        </div>
      </div>

      <div className="order-detail-section">
        <h3>Delivery address</h3>
        <p>{order.shippingAddress?.fullName}</p>
        <p>{order.shippingAddress?.addressLine1}</p>
        {order.shippingAddress?.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
        <p>{order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.postalCode}</p>
        <p>{order.shippingAddress?.country}</p>
        <p>{order.shippingAddress?.phone}</p>
      </div>

      <div className="order-detail-section">
        <h3>Items in this order</h3>
        <div className="order-item-list">
          {order.items?.map(item => (
            <div key={`${item.productId}-${item.name}`} className="order-item">
              <img src={item.image || "assets/breathe-classic-ai.png"} alt={item.name} />
              <div className="order-item-info">
                <strong>{item.name}</strong>
                <span>Qty: {item.quantity}</span>
                <span>Price: {formatRupee(item.price)}</span>
                <span>Total: {formatRupee(item.price * item.quantity)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="order-detail-section">
        <h3>Summary</h3>
        <div className="order-card-meta">
          <span className="order-price">Total amount: {formatRupee(order.total)}</span>
        </div>
      </div>

      <OrderTimeline orderStatus={order.orderStatus} trackingNumber={order.trackingNumber} />
      <div className="order-detail-section">
        {order.trackingNumber && (
          <p>Tracking number: <strong>{order.trackingNumber}</strong></p>
        )}
        {order.trackingLink && (
          <p><a href={order.trackingLink} target="_blank" rel="noreferrer">Track shipment externally</a></p>
        )}
      </div>
      <HelpSupportForm orderId={order._id || order.orderId} />
    </div>
  );
}

function App() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getAuth()?.token) return;
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);
    setError("");
    try {
      const data = await fetchJson("/orders/my");
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const auth = getAuth();
  if (!auth?.token) {
    return (
      <div className="orders-app">
        <div className="page-error">
          <p>You need to be logged in to view orders.</p>
          <p><a href="index.html">Go back to login / account page</a></p>
        </div>
      </div>
    );
  }

  if (selectedOrder) {
    return <OrderDetails order={selectedOrder} onBack={() => setSelectedOrder(null)} />;
  }

  return (
    <div className="orders-app">
      {error && <div className="page-error">{error}</div>}
      {loading && <div className="page-message">Loading your orders...</div>}
      {!loading && !orders.length && !error && (
        <div className="page-message">No orders found yet. Your most recent purchase will appear here.</div>
      )}
      <div className="orders-list">
        {orders.map(order => (
          <OrderCard key={order._id || order.orderId} order={order} onSelect={setSelectedOrder} />
        ))}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("orders-root")).render(<App />);
