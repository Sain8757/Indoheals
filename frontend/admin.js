const LIVE_SERVER_PORTS = ["3000", "5173", "5500", "5501"];
const LOCAL_HOSTS = ["localhost", "127.0.0.1"];
const PRODUCTION_API_BASE = "https://indoheals.onrender.com/api";
const isLocalHost = LOCAL_HOSTS.includes(window.location.hostname);
const isBackendServedFrontend =
  window.location.protocol.startsWith("http") &&
  window.location.port &&
  !LIVE_SERVER_PORTS.includes(window.location.port);
const API_BASES = window.INDO_HEALS_API
  ? [window.INDO_HEALS_API]
  : isBackendServedFrontend
    ? [`${window.location.origin}/api`]
    : isLocalHost
      ? [
          "http://localhost:5001/api",
          "http://127.0.0.1:5001/api",
          "http://localhost:5002/api"
        ]
      : [PRODUCTION_API_BASE];

let adminAuth = JSON.parse(localStorage.getItem("adminAuth")) || null;
let products = [];
let orders = [];
let users = [];
let appointments = [];
let leads = [];
let newsletterSubscriptions = [];
const ORDER_FULFILLMENT_OPTIONS = ["new", "processing", "packed", "shipped", "delivered", "cancelled", "returned"];
let currentTab = "dashboard";
let toastTimer;

document.addEventListener("DOMContentLoaded", () => {
  bindTabs();
  renderAuthState();
});

async function apiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (adminAuth?.token) {
    headers.Authorization = `Bearer ${adminAuth.token}`;
  }

  let lastError;

  for (const apiBase of API_BASES) {
    try {
      const response = await fetch(`${apiBase}${path}`, {
        ...options,
        headers,
        body:
          options.body && typeof options.body !== "string"
            ? JSON.stringify(options.body)
            : options.body
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Request failed");
      return data;
    } catch (error) {
      lastError = error;
      if (!String(error.message || "").includes("fetch")) throw error;
    }
  }

  throw lastError || new Error("Backend request failed");
}

function bindTabs() {
  document.querySelectorAll("[data-tab]").forEach(button => {
    button.addEventListener("click", () => {
      setTab(button.dataset.tab);
    });
  });
}

function setTab(tab) {
  currentTab = tab;
  setText("adminPageTitle", titleCase(tab));
  document.querySelectorAll("[data-tab]").forEach(button => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });
  document.querySelectorAll(".tab-panel").forEach(panel => {
    panel.hidden = panel.id !== `${tab}Tab`;
  });
  refreshCurrentTab();
}

function renderAuthState() {
  const loginPanel = document.getElementById("loginPanel");
  const dashboardPanel = document.getElementById("dashboardPanel");
  const adminName = document.getElementById("adminName");

  const isAdmin = adminAuth?.user?.role === "admin";
  loginPanel.hidden = isAdmin;
  dashboardPanel.hidden = !isAdmin;
  adminName.textContent = isAdmin ? adminAuth.user.email : "";

  if (isAdmin) refreshCurrentTab();
}

async function loginAdmin(event) {
  event.preventDefault();
  setMessage("adminLoginMessage", "");

  try {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: {
        email: document.getElementById("adminEmail").value,
        password: document.getElementById("adminPassword").value
      }
    });

    if (data.user?.role !== "admin") {
      throw new Error("This account does not have admin access.");
    }

    adminAuth = data;
    localStorage.setItem("adminAuth", JSON.stringify(data));
    event.target.reset();
    renderAuthState();
    showToast("Admin login successful.");
  } catch (error) {
    setMessage("adminLoginMessage", error.message, "error");
  }
}

function logoutAdmin() {
  adminAuth = null;
  localStorage.removeItem("adminAuth");
  renderAuthState();
}

async function refreshCurrentTab() {
  if (!adminAuth?.token) return;

  if (currentTab === "dashboard") await loadDashboard();
  if (currentTab === "products") await loadProducts();
  if (currentTab === "orders") await loadOrders();
  if (currentTab === "users") await loadUsers();
  if (currentTab === "appointments") await loadAppointments();
  if (currentTab === "leads") await loadLeads();
  if (currentTab === "newsletter") await loadNewsletter();
}

async function loadDashboard() {
  setMessage("dashboardMessage", "");

  const requests = await Promise.allSettled([
    apiFetch("/admin/orders"),
    apiFetch("/admin/products"),
    apiFetch("/admin/users"),
    apiFetch("/admin/appointments"),
    apiFetch("/admin/business-leads"),
    apiFetch("/admin/newsletter")
  ]);

  const [ordersResult, productsResult, usersResult, appointmentsResult, leadsResult, newsletterResult] = requests;
  if (ordersResult.status === "fulfilled") orders = ordersResult.value;
  if (productsResult.status === "fulfilled") products = productsResult.value;
  if (usersResult.status === "fulfilled") users = usersResult.value;
  if (appointmentsResult.status === "fulfilled") appointments = appointmentsResult.value;
  if (leadsResult.status === "fulfilled") leads = leadsResult.value;
  if (newsletterResult.status === "fulfilled") newsletterSubscriptions = newsletterResult.value;

  const firstError = requests.find(result => result.status === "rejected");
  if (firstError) {
    setMessage("dashboardMessage", firstError.reason?.message || "Dashboard data could not be loaded.", "error");
  }

  renderDashboard();
}

function renderDashboard() {
  const stats = getOrderStats();
  const activeProducts = products.filter(product => product.isActive !== false).length;

  setText("metricTotalOrders", stats.total);
  setText("metricPendingOrders", stats.pending);
  setText("metricConfirmedOrders", stats.confirmed);
  setText("metricShippedOrders", stats.shipped);
  setText("metricReturnedOrders", stats.returned);
  setText("metricFailedOrders", `${stats.failed} failed`);
  setText("metricTotalRevenue", `${formatRupee(stats.revenue)} confirmed revenue`);
  setText("metricActiveProducts", `${activeProducts} active`);
  setText("metricProducts", products.length);
  setText("metricUsers", users.length);
  setText("metricAppointments", appointments.length);
  setText("metricLeads", leads.length);
  setText("metricNewsletter", newsletterSubscriptions.length);

  renderOrderFlow(stats);
  renderDashboardOrders();
}

function getOrderStats() {
  return orders.reduce(
    (stats, order) => {
      const paymentStatus = String(order.status || "").toLowerCase();
      const fulfillmentStatus = String(order.fulfillmentStatus || "").toLowerCase();

      stats.total += 1;
      if (paymentStatus === "pending") stats.pending += 1;
      if (paymentStatus === "paid") {
        stats.confirmed += 1;
        stats.revenue += Number(order.total || 0);
      }
      if (paymentStatus === "failed") stats.failed += 1;
      if (fulfillmentStatus === "shipped") stats.shipped += 1;
      if (fulfillmentStatus === "returned" || paymentStatus === "returned") stats.returned += 1;
      return stats;
    },
    {
      total: 0,
      pending: 0,
      confirmed: 0,
      shipped: 0,
      returned: 0,
      failed: 0,
      revenue: 0
    }
  );
}

function renderOrderFlow(stats) {
  const flowItems = [
    { label: "Pending", value: stats.pending },
    { label: "Confirmed", value: stats.confirmed },
    { label: "Shipped", value: stats.shipped },
    { label: "Returns", value: stats.returned }
  ];
  const max = Math.max(...flowItems.map(item => item.value), 1);
  const list = document.getElementById("orderFlowList");
  if (!list) return;

  list.innerHTML = flowItems.map(item => `
    <div class="flow-item">
      <span>${escapeHtml(item.label)}</span>
      <div class="flow-track" aria-hidden="true">
        <div class="flow-bar" style="width: ${Math.max(6, (item.value / max) * 100)}%"></div>
      </div>
      <strong>${item.value}</strong>
    </div>
  `).join("");
}

function renderDashboardOrders() {
  const list = document.getElementById("dashboardOrdersList");
  if (!list) return;

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 5);

  if (!recentOrders.length) {
    list.innerHTML = `<p class="meta-line">No recent orders found.</p>`;
    return;
  }

  list.innerHTML = recentOrders.map(order => orderCardTemplate(order, false)).join("");
}

async function loadProducts() {
  try {
    products = await apiFetch("/admin/products");
    renderProducts();
  } catch (error) {
    renderError("productsList", error.message);
  }
}

function renderProducts() {
  document.getElementById("productCount").textContent = products.length;
  const list = document.getElementById("productsList");
  if (!products.length) {
    list.innerHTML = `<p class="meta-line">No products found.</p>`;
    return;
  }

  list.innerHTML = products.map(product => `
    <article class="list-card">
      <div class="list-head">
        <div class="list-title">
          <strong>${escapeHtml(product.name)}</strong>
          <span>${escapeHtml(product.slug || product._id)} · ${formatRupee(product.price)} · Stock ${Number(product.stock || 0)}</span>
        </div>
        <span class="status">${product.isActive === false ? "inactive" : "active"}</span>
      </div>
      <p class="meta-line">${escapeHtml(product.description || "")}</p>
      <p class="meta-line">Digital file: ${escapeHtml(product.digitalFile?.storagePath || "Not mapped")}</p>
      <div class="action-row">
        <button class="small-button" type="button" onclick="editProduct('${escapeAttribute(product._id)}')">Edit</button>
        <button class="small-button" type="button" onclick="mapDigitalFile('${escapeAttribute(product._id)}')">Digital File</button>
        <button class="danger-button" type="button" onclick="deleteProduct('${escapeAttribute(product._id)}')">Delete</button>
      </div>
    </article>
  `).join("");
}

function editProduct(id) {
  const product = products.find(item => String(item._id) === String(id));
  if (!product) return;

  document.getElementById("productFormTitle").textContent = "Edit Product";
  document.getElementById("productId").value = product._id;
  document.getElementById("productName").value = product.name || "";
  document.getElementById("productSlug").value = product.slug || "";
  document.getElementById("productPrice").value = product.price || 0;
  document.getElementById("productStock").value = product.stock || 0;
  document.getElementById("productCategory").value = product.category || "";
  document.getElementById("productBadge").value = product.badge || "";
  document.getElementById("productImage").value = product.image || "";
  document.getElementById("productWeight").value = product.weight || "";
  document.getElementById("productCocoa").value = product.cocoa || "";
  document.getElementById("productWellness").value = product.wellnessNote || "";
  document.getElementById("productDescription").value = product.description || "";
  document.getElementById("productIngredients").value = (product.ingredients || []).join(", ");
  document.getElementById("productBenefits").value = (product.benefits || []).join(", ");
  document.getElementById("productActive").checked = product.isActive !== false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function saveProduct(event) {
  event.preventDefault();
  setMessage("productMessage", "");

  const id = document.getElementById("productId").value;
  const body = {
    name: document.getElementById("productName").value.trim(),
    slug: document.getElementById("productSlug").value.trim(),
    price: Number(document.getElementById("productPrice").value || 0),
    stock: Number(document.getElementById("productStock").value || 0),
    category: document.getElementById("productCategory").value.trim(),
    badge: document.getElementById("productBadge").value.trim(),
    image: document.getElementById("productImage").value.trim(),
    weight: document.getElementById("productWeight").value.trim(),
    cocoa: document.getElementById("productCocoa").value.trim(),
    wellnessNote: document.getElementById("productWellness").value.trim(),
    description: document.getElementById("productDescription").value.trim(),
    ingredients: splitCsv(document.getElementById("productIngredients").value),
    benefits: splitCsv(document.getElementById("productBenefits").value),
    isActive: document.getElementById("productActive").checked
  };

  try {
    await apiFetch(id ? `/admin/products/${encodeURIComponent(id)}` : "/admin/products", {
      method: id ? "PUT" : "POST",
      body
    });
    resetProductForm();
    await loadProducts();
    setMessage("productMessage", "Product saved.", "success");
    showToast("Product saved.");
  } catch (error) {
    setMessage("productMessage", error.message, "error");
  }
}

function resetProductForm() {
  document.getElementById("productFormTitle").textContent = "Add Product";
  document.querySelector(".form-panel").reset();
  document.getElementById("productId").value = "";
  document.getElementById("productActive").checked = true;
}

async function deleteProduct(id) {
  if (!confirm("Delete this product from public listing?")) return;

  try {
    await apiFetch(`/admin/products/${encodeURIComponent(id)}`, { method: "DELETE" });
    await loadProducts();
    showToast("Product deleted.");
  } catch (error) {
    showToast(error.message);
  }
}

async function mapDigitalFile(id) {
  const storagePath = prompt("Secure file path inside backend/secure-files");
  if (!storagePath) return;
  const originalName = prompt("Download file name", storagePath.split("/").pop()) || storagePath.split("/").pop();

  try {
    await apiFetch(`/admin/products/${encodeURIComponent(id)}/digital-file`, {
      method: "PUT",
      body: {
        storagePath,
        originalName,
        mimeType: "application/octet-stream"
      }
    });
    await loadProducts();
    showToast("Digital file mapped.");
  } catch (error) {
    showToast(error.message);
  }
}

async function loadOrders() {
  try {
    orders = await apiFetch("/admin/orders");
    renderOrders();
  } catch (error) {
    renderError("ordersList", error.message);
  }
}

function renderOrders() {
  document.getElementById("orderCount").textContent = orders.length;
  const list = document.getElementById("ordersList");
  if (!orders.length) {
    list.innerHTML = `<p class="meta-line">No orders found.</p>`;
    return;
  }

  list.innerHTML = orders.map(order => orderCardTemplate(order, true)).join("");
}

function orderCardTemplate(order, includeActions = true) {
  const fulfillmentStatus = order.fulfillmentStatus || "new";
  const statusOptions = ORDER_FULFILLMENT_OPTIONS.map(status => `
    <option value="${escapeAttribute(status)}" ${status === fulfillmentStatus ? "selected" : ""}>${titleCase(status)}</option>
  `).join("");

  return `
    <article class="list-card">
      <div class="list-head">
        <div class="list-title">
          <strong>${escapeHtml(order.customerName || order.user?.name || "Customer")}</strong>
          <span>${escapeHtml(order.customerEmail || order.user?.email || "")} · ${formatRupee(order.total)} · ${formatDate(order.createdAt)}</span>
        </div>
        <span class="status">${escapeHtml(paymentStatusLabel(order.status || "pending"))}</span>
      </div>
      <p class="meta-line">Order: ${escapeHtml(order._id)} · Payment: ${escapeHtml(order.paymentId || order.paymentOrderId || "Pending")}</p>
      <p class="meta-line">Fulfillment: ${escapeHtml(titleCase(fulfillmentStatus))} · Phone: ${escapeHtml(order.customerPhone || order.shippingAddress?.phone || "Not added")}</p>
      <p class="meta-line">${(order.items || []).map(item => `${escapeHtml(item.name)} x ${item.quantity}`).join(", ")}</p>
      ${includeActions ? `
        <div class="action-row order-actions">
          <select class="status-select" aria-label="Fulfillment status" onchange="updateOrderStatus('${escapeAttribute(order._id)}', this.value)">
            ${statusOptions}
          </select>
          <button class="small-button" type="button" onclick="refreshCurrentTab()">Refresh</button>
        </div>
      ` : ""}
    </article>
  `;
}

async function updateOrderStatus(id, fulfillmentStatus) {
  try {
    await apiFetch(`/admin/orders/${encodeURIComponent(id)}/status`, {
      method: "PUT",
      body: { fulfillmentStatus }
    });
    await loadOrders();
    showToast(`Order marked ${titleCase(fulfillmentStatus)}.`);
  } catch (error) {
    showToast(error.message);
    await loadOrders();
  }
}

async function loadUsers() {
  try {
    users = await apiFetch("/admin/users");
    renderUsers();
  } catch (error) {
    renderError("usersList", error.message);
  }
}

function renderUsers() {
  document.getElementById("userCount").textContent = users.length;
  const list = document.getElementById("usersList");
  if (!users.length) {
    list.innerHTML = `<p class="meta-line">No users found.</p>`;
    return;
  }

  list.innerHTML = users.map(user => `
    <article class="list-card">
      <div class="list-head">
        <div class="list-title">
          <strong>${escapeHtml(user.name)}</strong>
          <span>${escapeHtml(user.email)}</span>
        </div>
        <span class="status">${escapeHtml(user.role || "user")}</span>
      </div>
      <p class="meta-line">Joined: ${formatDate(user.createdAt)} · Cart items: ${(user.cart || []).length}</p>
    </article>
  `).join("");
}

async function loadAppointments() {
  try {
    appointments = await apiFetch("/admin/appointments");
    renderAppointments();
  } catch (error) {
    renderError("appointmentsList", error.message);
  }
}

function renderAppointments() {
  document.getElementById("appointmentCount").textContent = appointments.length;
  const list = document.getElementById("appointmentsList");
  if (!appointments.length) {
    list.innerHTML = `<p class="meta-line">No appointment requests found.</p>`;
    return;
  }

  list.innerHTML = appointments.map(appointment => `
    <article class="list-card">
      <div class="list-head">
        <div class="list-title">
          <strong>${escapeHtml(appointment.name)}</strong>
          <span>${escapeHtml(appointment.email)} · ${escapeHtml(appointment.phone)}</span>
        </div>
        <span class="status">${escapeHtml(appointment.status || "new")}</span>
      </div>
      <p class="meta-line">Reference: ${escapeHtml(appointment.reference)} · ${escapeHtml(appointment.interest)} · ${escapeHtml(appointment.date)} ${escapeHtml(appointment.time)}</p>
      <p class="meta-line">${escapeHtml(appointment.message || "")}</p>
    </article>
  `).join("");
}

async function loadLeads() {
  try {
    leads = await apiFetch("/admin/business-leads");
    renderLeads();
  } catch (error) {
    renderError("leadsList", error.message);
  }
}

function renderLeads() {
  document.getElementById("leadCount").textContent = leads.length;
  const list = document.getElementById("leadsList");
  if (!leads.length) {
    list.innerHTML = `<p class="meta-line">No business leads found.</p>`;
    return;
  }

  list.innerHTML = leads.map(lead => `
    <article class="list-card">
      <div class="list-head">
        <div class="list-title">
          <strong>${escapeHtml(lead.company)}</strong>
          <span>${escapeHtml(lead.city)}, ${escapeHtml(lead.country)} · ${escapeHtml(lead.email)}</span>
        </div>
        <span class="status">${escapeHtml(lead.status || "new")}</span>
      </div>
      <p class="meta-line">Reference: ${escapeHtml(lead.reference)} · Contact: ${escapeHtml(lead.contactPerson)} · ${escapeHtml(lead.mobile)}</p>
      <p class="meta-line">${escapeHtml(lead.currentProducts || "")}</p>
      <p class="meta-line">${escapeHtml(lead.message || "")}</p>
    </article>
  `).join("");
}

async function loadNewsletter() {
  try {
    newsletterSubscriptions = await apiFetch("/admin/newsletter");
    renderNewsletter();
  } catch (error) {
    renderError("newsletterList", error.message);
  }
}

function renderNewsletter() {
  document.getElementById("newsletterCount").textContent = newsletterSubscriptions.length;
  const list = document.getElementById("newsletterList");
  if (!newsletterSubscriptions.length) {
    list.innerHTML = `<p class="meta-line">No subscriptions found.</p>`;
    return;
  }

  list.innerHTML = newsletterSubscriptions.map(subscription => `
    <article class="list-card">
      <div class="list-head">
        <div class="list-title">
          <strong>${escapeHtml(subscription.email)}</strong>
          <span>${escapeHtml(subscription.source || "website")} · ${formatDate(subscription.createdAt)}</span>
        </div>
        <span class="status">${escapeHtml(subscription.status || "subscribed")}</span>
      </div>
    </article>
  `).join("");
}

function renderError(elementId, message) {
  document.getElementById(elementId).innerHTML = `<p class="form-message error">${escapeHtml(message)}</p>`;
}

function setMessage(elementId, message, type = "") {
  const element = document.getElementById(elementId);
  if (!element) return;
  element.textContent = message;
  element.className = `form-message ${type}`.trim();
}

function setText(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) element.textContent = value;
}

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

function formatRupee(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function titleCase(value = "") {
  return String(value || "")
    .replaceAll("-", " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function paymentStatusLabel(status = "") {
  const value = String(status || "").toLowerCase();
  if (value === "paid") return "Confirmed";
  return titleCase(value || "pending");
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value = "") {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}
