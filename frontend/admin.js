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
      ? ["http://localhost:5001/api", "http://127.0.0.1:5001/api", "http://localhost:5002/api"]
      : [PRODUCTION_API_BASE];

const ORDER_PAYMENT_OPTIONS = ["pending", "paid", "failed"];
const ORDER_FULFILLMENT_OPTIONS = ["new", "processing", "packed", "shipped", "delivered", "cancelled", "returned"];
const APPOINTMENT_STATUS_OPTIONS = ["new", "contacted", "confirmed", "completed", "cancelled"];
const LEAD_STATUS_OPTIONS = ["new", "contacted", "qualified", "closed"];
const NEWSLETTER_STATUS_OPTIONS = ["subscribed", "unsubscribed"];
const LOW_STOCK_THRESHOLD = 5;

const DEFAULT_SETTINGS = {
  storeName: "Indo Heals",
  supportEmail: "",
  supportPhone: "",
  currency: "INR",
  measurementSystem: "metric",
  company: {
    name: "Indo Heals",
    legalName: "",
    gstin: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India"
  },
  payments: {
    razorpayEnabled: true,
    manualEnabled: true,
    codEnabled: false
  },
  shipping: {
    standardFee: 0,
    freeShippingThreshold: 0,
    processingDays: 2,
    shippingZones: "India"
  },
  checkout: {
    requirePhone: true,
    notesEnabled: true,
    allowGuestCheckout: false
  },
  taxes: {
    gstRate: 0,
    pricesIncludeTax: true
  },
  invoices: {
    prefix: "IH",
    nextNumber: 1,
    footerNote: ""
  }
};

localStorage.removeItem("adminAuth");
let adminAuth = null;
let currentView = "overview";
let toastTimer;
let products = [];
let orders = [];
let selectedOrderId = null;
let orderFilterTimer;
let orderFilters = {
  search: "",
  payment: "all",
  fulfillment: "all"
};
let users = [];
let appointments = [];
let leads = [];
let newsletterSubscriptions = [];
let discounts = [];
let emailCampaigns = [];
let settings = structuredClone(DEFAULT_SETTINGS);

document.addEventListener("DOMContentLoaded", () => {
  bindNavigation();
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
      if (!response.ok) {
        if (response.status === 401 && path !== "/auth/login") {
          adminAuth = null;
          localStorage.removeItem("adminAuth");
          renderAuthState();
        }
        throw new Error(data.message || "Request failed");
      }
      return data;
    } catch (error) {
      lastError = error;
      if (!String(error.message || "").includes("fetch")) throw error;
    }
  }

  throw lastError || new Error("Backend request failed");
}

function bindNavigation() {
  document.querySelectorAll("[data-view]").forEach(button => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });
}

function renderAuthState() {
  const loginPanel = document.getElementById("loginPanel");
  const appPanel = document.getElementById("appPanel");
  const adminName = document.getElementById("adminName");
  const isAdmin = adminAuth?.user?.role === "admin";

  loginPanel.hidden = isAdmin;
  appPanel.hidden = !isAdmin;
  document.body.classList.toggle("admin-locked", !isAdmin);
  if (adminName) adminName.textContent = isAdmin ? adminAuth.user.email : "";

  if (isAdmin) {
    setView(currentView, { skipHistory: true });
  } else {
    setWorkspace("");
  }
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
  selectedOrderId = null;
  renderAuthState();
}

async function setView(view, options = {}) {
  currentView = view || "overview";
  updateNavigation();
  renderLoading();

  try {
    await loadViewData(currentView);
    renderCurrentView();
    if (!options.skipHistory) window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    renderErrorPage(error.message);
  }
}

async function refreshCurrentView() {
  if (!adminAuth?.token) return;
  await setView(currentView, { skipHistory: true });
}

function updateNavigation() {
  const isSettings = currentView.startsWith("settings");
  document.querySelectorAll(".main-nav > button[data-view]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.view === currentView || (button.dataset.section === "settings" && isSettings)
    );
  });
  document.querySelectorAll(".sub-nav button").forEach(button => {
    button.classList.toggle("active", button.dataset.view === currentView);
  });
  document.getElementById("settingsNav")?.classList.toggle("open", isSettings);
}

async function loadViewData(view) {
  if (view === "overview") return loadOverviewData();
  if (view === "orders") return loadOrders();
  if (view === "products") return loadProducts();
  if (view === "appointments") return Promise.all([loadAppointments(), loadLeads()]);
  if (view === "discounts") return loadDiscounts();
  if (view === "customers") return Promise.all([loadUsers(), loadLeads()]);
  if (view === "analytics") return Promise.all([loadOrders(), loadProducts(), loadUsers(), loadAppointments()]);
  if (view === "emails") return Promise.all([loadNewsletter(), loadEmailCampaigns()]);
  if (view.startsWith("settings")) return loadSettings();
  if (view === "integrations" || view === "print") return Promise.all([loadSettings(), loadProducts()]);
  return loadOverviewData();
}

async function loadOverviewData() {
  const requests = await Promise.allSettled([
    loadOrders(),
    loadProducts(),
    loadUsers(),
    loadAppointments(),
    loadLeads(),
    loadNewsletter(),
    loadSettings()
  ]);
  const failed = requests.find(result => result.status === "rejected");
  if (failed) throw failed.reason;
}

async function loadProducts() {
  products = await apiFetch("/admin/products");
}

async function loadOrders() {
  orders = await apiFetch("/admin/orders");
}

async function loadUsers() {
  users = await apiFetch("/admin/users");
}

async function loadAppointments() {
  appointments = await apiFetch("/admin/appointments");
}

async function loadLeads() {
  leads = await apiFetch("/admin/business-leads");
}

async function loadNewsletter() {
  newsletterSubscriptions = await apiFetch("/admin/newsletter");
}

async function loadDiscounts() {
  discounts = await apiFetch("/admin/discounts");
}

async function loadEmailCampaigns() {
  emailCampaigns = await apiFetch("/admin/email-campaigns");
}

async function loadSettings() {
  settings = deepMerge(structuredClone(DEFAULT_SETTINGS), await apiFetch("/admin/settings"));
}

function renderCurrentView() {
  if (currentView === "overview") return renderOverview();
  if (currentView === "orders") return renderOrders();
  if (currentView === "products") return renderProducts();
  if (currentView === "appointments") return renderAppointments();
  if (currentView === "discounts") return renderDiscounts();
  if (currentView === "customers") return renderCustomers();
  if (currentView === "analytics") return renderAnalytics();
  if (currentView === "emails") return renderEmails();
  if (currentView.startsWith("settings")) return renderSettings(currentView);
  if (currentView === "integrations") return renderIntegrations();
  if (currentView === "print") return renderPrintOnDemand();
  return renderOverview();
}

function renderOverview() {
  const stats = orderStats();
  const recentOrders = sortedOrders().slice(0, 5);
  const dateRange = currentMonthRange();
  const pendingOrders = countOrders("pending");
  const toFulfill = ordersToFulfill().length;
  const lowStock = lowStockProducts().length;
  const newAppointments = appointments.filter(item => item.status === "new").length;

  setWorkspace(`
    <section class="page">
      <div class="page-head">
        <div>
          <h1>Sales</h1>
          <p class="date-line">${dateRange}</p>
        </div>
        <button class="link-button" type="button" onclick="setView('analytics')">View sales analytics</button>
      </div>
      <section class="card-grid">
        ${metricCard("Total sales", formatRupee(stats.revenue))}
        ${metricCard("Total orders", stats.total)}
        ${metricCard("Average order value", formatRupee(stats.average))}
      </section>
      <section class="ops-grid">
        ${operationCard("Needs payment check", pendingOrders, "Orders still marked pending", "orders", pendingOrders ? "warning" : "success")}
        ${operationCard("Ready to fulfill", toFulfill, "Paid orders not delivered yet", "orders", toFulfill ? "accent" : "success")}
        ${operationCard("Low stock", lowStock, `Active products at ${LOW_STOCK_THRESHOLD} units or less`, "products", lowStock ? "warning" : "success")}
        ${operationCard("New appointments", newAppointments, "Fresh consultation requests", "appointments", newAppointments ? "accent" : "success")}
      </section>
      <section class="panel">
        <div class="panel-head">
          <h2>Recent orders</h2>
          <button class="link-button" type="button" onclick="setView('orders')">View all orders</button>
        </div>
        ${ordersTable(recentOrders, { compact: true })}
        <div class="feedback-row"><button class="link-button" type="button">Rate orders management experience.</button> Help us improve.</div>
      </section>
      <section class="page-head">
        <h1>Need some guidance?</h1>
        <button class="link-button" type="button" onclick="setView('integrations')">View all articles</button>
      </section>
      <section class="guide-grid">
        ${guideCard("Change order of products in your online store", "products")}
        ${guideCard("Set up your shippings", "settings-shipping")}
        ${guideCard("Set up online payment gateways", "settings-payments")}
        ${guideCard("Enable manual offline payments", "settings-payments")}
      </section>
    </section>
  `);
}

function renderOrders() {
  const sorted = sortedOrders();
  const filtered = filteredOrders(sorted);
  if (!selectedOrderId || !filtered.some(order => order._id === selectedOrderId)) {
    selectedOrderId = filtered[0]?._id || null;
  }
  const selectedOrder = filtered.find(order => order._id === selectedOrderId);

  setWorkspace(`
    <section class="page">
      <div class="page-head">
        <div>
          <h1>Orders</h1>
          <p class="subtle">${orders.length} orders in your store</p>
        </div>
        <div class="toolbar">
          <button class="outline-button" type="button" onclick="refreshCurrentView()">Refresh</button>
          <button class="primary-button" type="button" onclick="setView('analytics')">Analytics</button>
        </div>
      </div>
      <section class="card-grid">
        ${metricCard("Pending", countOrders("pending"))}
        ${metricCard("Confirmed", countOrders("paid"))}
        ${metricCard("Shipped", orders.filter(order => order.fulfillmentStatus === "shipped").length)}
      </section>
      ${orderFilterBar(filtered.length)}
      <section class="orders-layout">
        <section class="panel">
          <div class="panel-head"><h2>All orders</h2><span class="count-pill">${filtered.length}/${orders.length}</span></div>
          ${ordersTable(filtered, { actions: true })}
        </section>
        ${orderDetailPanel(selectedOrder)}
      </section>
    </section>
  `);
}

function renderProducts() {
  setWorkspace(`
    <section class="page">
      <div class="page-head">
        <div>
          <h1>Products</h1>
          <p class="subtle">Create, edit, stock, digital files and public visibility.</p>
        </div>
        <button class="outline-button" type="button" onclick="resetProductForm()">Clear form</button>
      </div>
      <section class="split-grid">
        <form class="panel panel-body stack" onsubmit="saveProduct(event)">
          <input id="productId" type="hidden">
          <h2 id="productFormTitle">Add product</h2>
          <label>Name<input id="productName" required></label>
          <label>Slug<input id="productSlug" placeholder="breathe-classic"></label>
          <div class="form-grid">
            <label>Price<input id="productPrice" type="number" min="0" step="1" required></label>
            <label>Stock<input id="productStock" type="number" min="0" step="1"></label>
          </div>
          <div class="form-grid">
            <label>Category<input id="productCategory"></label>
            <label>Badge<input id="productBadge"></label>
          </div>
          <label>Image path<input id="productImage" placeholder="assets/breathe-classic-ai.png"></label>
          <div class="form-grid">
            <label>Weight<input id="productWeight" placeholder="40 g"></label>
            <label>Cocoa<input id="productCocoa" placeholder="55% dark cocoa"></label>
          </div>
          <label>Wellness note<textarea id="productWellness" rows="2"></textarea></label>
          <label>Description<textarea id="productDescription" rows="4"></textarea></label>
          <label>Ingredients, comma separated<input id="productIngredients"></label>
          <label>Benefits, comma separated<input id="productBenefits"></label>
          <label class="check-row"><input id="productActive" type="checkbox" checked> Active product</label>
          <button class="primary-button" type="submit">Save product</button>
          <p id="productMessage" class="form-message"></p>
        </form>
        <section class="panel">
          <div class="panel-head"><h2>Product catalog</h2><span class="count-pill">${products.length}</span></div>
          <div class="panel-body stack">${products.length ? products.map(productCard).join("") : emptyText("No products found.")}</div>
        </section>
      </section>
    </section>
  `);
}

function renderAppointments() {
  setWorkspace(`
    <section class="page">
      <div class="page-head">
        <div>
          <h1>Appointments</h1>
          <p class="subtle">Consultation requests and wholesale leads.</p>
        </div>
        <button class="outline-button" type="button" onclick="refreshCurrentView()">Refresh</button>
      </div>
      <section class="split-grid">
        <section class="panel">
          <div class="panel-head"><h2>Appointment requests</h2><span class="count-pill">${appointments.length}</span></div>
          <div class="panel-body stack">${appointments.length ? appointments.map(appointmentCard).join("") : emptyText("No appointment requests found.")}</div>
        </section>
        <section class="panel">
          <div class="panel-head"><h2>Business leads</h2><span class="count-pill">${leads.length}</span></div>
          <div class="panel-body stack">${leads.length ? leads.map(leadCard).join("") : emptyText("No business leads found.")}</div>
        </section>
      </section>
    </section>
  `);
}

function renderDiscounts() {
  setWorkspace(`
    <section class="page">
      <div class="page-head">
        <div>
          <h1>Discounts</h1>
          <p class="subtle">Manage coupon codes and campaign offers.</p>
        </div>
        <button class="outline-button" type="button" onclick="resetDiscountForm()">Clear form</button>
      </div>
      <section class="split-grid">
        <form class="panel panel-body stack" onsubmit="saveDiscount(event)">
          <input id="discountId" type="hidden">
          <h2 id="discountFormTitle">Create discount</h2>
          <label>Code<input id="discountCode" required placeholder="WELCOME10"></label>
          <label>Description<input id="discountDescription" placeholder="Launch offer"></label>
          <div class="form-grid">
            <label>Type<select id="discountType"><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option></select></label>
            <label>Value<input id="discountValue" type="number" min="0" step="1" required></label>
          </div>
          <div class="form-grid">
            <label>Minimum order<input id="discountMinOrder" type="number" min="0" step="1"></label>
            <label>Max uses<input id="discountMaxUses" type="number" min="0" step="1"></label>
          </div>
          <div class="form-grid">
            <label>Starts at<input id="discountStartsAt" type="date"></label>
            <label>Ends at<input id="discountEndsAt" type="date"></label>
          </div>
          <label class="check-row"><input id="discountActive" type="checkbox" checked> Active discount</label>
          <button class="primary-button" type="submit">Save discount</button>
          <p id="discountMessage" class="form-message"></p>
        </form>
        <section class="panel">
          <div class="panel-head"><h2>Discount codes</h2><span class="count-pill">${discounts.length}</span></div>
          <div class="panel-body stack">${discounts.length ? discounts.map(discountCard).join("") : emptyText("No discounts created.")}</div>
        </section>
      </section>
    </section>
  `);
}

function renderCustomers() {
  setWorkspace(`
    <section class="page">
      <div class="page-head">
        <div>
          <h1>Customers</h1>
          <p class="subtle">Registered users, carts and wholesale lead contacts.</p>
        </div>
        <button class="outline-button" type="button" onclick="refreshCurrentView()">Refresh</button>
      </div>
      <section class="card-grid">
        ${metricCard("Registered users", users.length)}
        ${metricCard("Admin users", users.filter(user => user.role === "admin").length)}
        ${metricCard("Business leads", leads.length)}
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Registered users</h2><span class="count-pill">${users.length}</span></div>
        ${usersTable(users)}
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Wholesale contacts</h2><span class="count-pill">${leads.length}</span></div>
        <div class="panel-body stack">${leads.length ? leads.map(leadCard).join("") : emptyText("No business leads found.")}</div>
      </section>
    </section>
  `);
}

function renderAnalytics() {
  const stats = orderStats();
  const statusRows = [
    ["Pending", countOrders("pending")],
    ["Confirmed", countOrders("paid")],
    ["Failed", countOrders("failed")],
    ["Shipped", orders.filter(order => order.fulfillmentStatus === "shipped").length],
    ["Returned", orders.filter(order => order.fulfillmentStatus === "returned").length]
  ];
  const productRows = topProductRows();

  setWorkspace(`
    <section class="page">
      <div class="page-head">
        <div>
          <h1>Analytics</h1>
          <p class="subtle">Sales, order health and product performance.</p>
        </div>
        <button class="outline-button" type="button" onclick="refreshCurrentView()">Refresh</button>
      </div>
      <section class="card-grid">
        ${metricCard("Confirmed revenue", formatRupee(stats.revenue))}
        ${metricCard("Average order value", formatRupee(stats.average))}
        ${metricCard("Active products", products.filter(product => product.isActive !== false).length)}
      </section>
      <section class="analytics-grid">
        <div class="panel">
          <div class="panel-head"><h2>Order status</h2></div>
          <div class="panel-body">${barChart(statusRows)}</div>
        </div>
        <div class="panel">
          <div class="panel-head"><h2>Top products</h2></div>
          <div class="panel-body">${barChart(productRows.length ? productRows : [["No sales yet", 0]])}</div>
        </div>
      </section>
    </section>
  `);
}

function renderEmails() {
  setWorkspace(`
    <section class="page">
      <div class="page-head">
        <div>
          <h1>Emails</h1>
          <p class="subtle">Newsletter subscriptions and store campaigns.</p>
        </div>
        <button class="outline-button" type="button" onclick="refreshCurrentView()">Refresh</button>
      </div>
      <section class="split-grid">
        <form class="panel panel-body stack" onsubmit="saveCampaign(event)">
          <input id="campaignId" type="hidden">
          <h2 id="campaignFormTitle">Create email campaign</h2>
          <label>Subject<input id="campaignSubject" required placeholder="New Indo Heals update"></label>
          <label>Audience<select id="campaignAudience"><option value="newsletter">Newsletter</option><option value="customers">Customers</option><option value="all">All contacts</option></select></label>
          <label>Body<textarea id="campaignBody" rows="8" required placeholder="Write your announcement"></textarea></label>
          <button class="primary-button" type="submit">Save campaign</button>
          <p id="campaignMessage" class="form-message"></p>
        </form>
        <section class="panel">
          <div class="panel-head"><h2>Campaigns</h2><span class="count-pill">${emailCampaigns.length}</span></div>
          <div class="panel-body stack">${emailCampaigns.length ? emailCampaigns.map(campaignCard).join("") : emptyText("No campaigns created.")}</div>
        </section>
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Newsletter</h2><span class="count-pill">${newsletterSubscriptions.length}</span></div>
        ${newsletterTable(newsletterSubscriptions)}
      </section>
    </section>
  `);
}

function renderSettings(view) {
  const map = {
    "settings-store": settingsStore(),
    "settings-company": settingsCompany(),
    "settings-payments": settingsPayments(),
    "settings-shipping": settingsShipping(),
    "settings-checkout": settingsCheckout(),
    "settings-taxes": settingsTaxes(),
    "settings-invoices": settingsInvoices()
  };
  setWorkspace(map[view] || map["settings-store"]);
}

function renderIntegrations() {
  setWorkspace(`
    <section class="page">
      <div class="page-head">
        <div>
          <h1>Integrations</h1>
          <p class="subtle">Operational connections for payments, database, email and storefront.</p>
        </div>
      </div>
      <section class="guide-grid">
        ${integrationCard("MongoDB Atlas", "Connected through backend MONGO_URI", "Active")}
        ${integrationCard("Razorpay", settings.payments.razorpayEnabled ? "Online payments enabled" : "Online payments disabled", settings.payments.razorpayEnabled ? "Active" : "Off")}
        ${integrationCard("SMTP Email", "Campaigns and transactional mail use backend SMTP settings", "Configurable")}
        ${integrationCard("Vercel storefront", "Static frontend served from the frontend directory", "Live")}
      </section>
    </section>
  `);
}

function renderPrintOnDemand() {
  setWorkspace(`
    <section class="page">
      <div class="page-head">
        <div>
          <h1>Print on demand</h1>
          <p class="subtle">Prepare product packaging, printable inserts and fulfillment notes.</p>
        </div>
        <button class="primary-button" type="button" onclick="setView('products')">Manage products</button>
      </div>
      <section class="card-grid">
        ${metricCard("Active products", products.filter(product => product.isActive !== false).length)}
        ${metricCard("Digital files mapped", products.filter(product => product.digitalFile?.storagePath).length)}
        ${metricCard("Need stock", products.filter(product => Number(product.stock || 0) <= 5).length)}
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Packaging checklist</h2></div>
        <div class="panel-body stack">
          ${guideCard("Confirm product names and weights", "products")}
          ${guideCard("Update company information for invoices", "settings-company")}
          ${guideCard("Review shipping fee and processing days", "settings-shipping")}
        </div>
      </section>
    </section>
  `);
}

function settingsStore() {
  return settingsPage("Store details", "Regional settings", "Choose the currency and measurement system needed for shipping.", `
    <form class="settings-body stack" onsubmit="saveStoreSettings(event, 'store')">
      <label>Store name<input id="settingStoreName" value="${escapeAttribute(settings.storeName)}"></label>
      <div class="settings-grid">
        <label>Support email<input id="settingSupportEmail" type="email" value="${escapeAttribute(settings.supportEmail || "")}"></label>
        <label>Support phone<input id="settingSupportPhone" value="${escapeAttribute(settings.supportPhone || "")}"></label>
      </div>
      <label>Currency<select id="settingCurrency"><option value="INR" ${settings.currency === "INR" ? "selected" : ""}>INR (₹)</option></select></label>
      <p class="subtle">Store currency cannot be changed after connecting any payment method.</p>
      <label>Measurement System<select id="settingMeasurement"><option value="metric" ${settings.measurementSystem === "metric" ? "selected" : ""}>Metric (kg, cm)</option><option value="imperial" ${settings.measurementSystem === "imperial" ? "selected" : ""}>Imperial (lb, in)</option></select></label>
      <button class="primary-button" type="submit">Save store details</button>
      <p id="settingsMessage" class="form-message"></p>
    </form>
  `);
}

function settingsCompany() {
  const company = settings.company || {};
  return settingsPage("Store details", "Company information", "Use these details for invoices, shipping labels and customer communication.", `
    <form class="settings-body stack" onsubmit="saveStoreSettings(event, 'company')">
      <div class="settings-grid">
        <label>Brand name<input id="companyName" value="${escapeAttribute(company.name || "")}"></label>
        <label>Legal name<input id="companyLegalName" value="${escapeAttribute(company.legalName || "")}"></label>
      </div>
      <label>GSTIN<input id="companyGstin" value="${escapeAttribute(company.gstin || "")}"></label>
      <label>Address line 1<input id="companyAddress1" value="${escapeAttribute(company.addressLine1 || "")}"></label>
      <label>Address line 2<input id="companyAddress2" value="${escapeAttribute(company.addressLine2 || "")}"></label>
      <div class="settings-grid">
        <label>City<input id="companyCity" value="${escapeAttribute(company.city || "")}"></label>
        <label>State<input id="companyState" value="${escapeAttribute(company.state || "")}"></label>
        <label>PIN code<input id="companyPostal" value="${escapeAttribute(company.postalCode || "")}"></label>
        <label>Country<input id="companyCountry" value="${escapeAttribute(company.country || "India")}"></label>
      </div>
      <button class="primary-button" type="submit">Save company information</button>
      <p id="settingsMessage" class="form-message"></p>
    </form>
  `);
}

function settingsPayments() {
  return settingsPage("Store details", "Payments", "Control online and offline payment modes for your store.", `
    <form class="settings-body stack" onsubmit="saveStoreSettings(event, 'payments')">
      <label class="check-row"><input id="paymentRazorpay" type="checkbox" ${settings.payments.razorpayEnabled ? "checked" : ""}> Razorpay online payments</label>
      <label class="check-row"><input id="paymentManual" type="checkbox" ${settings.payments.manualEnabled ? "checked" : ""}> Manual offline payments</label>
      <label class="check-row"><input id="paymentCod" type="checkbox" ${settings.payments.codEnabled ? "checked" : ""}> Cash on delivery</label>
      <button class="primary-button" type="submit">Save payment settings</button>
      <p id="settingsMessage" class="form-message"></p>
    </form>
  `);
}

function settingsShipping() {
  return settingsPage("Store details", "Shipping", "Configure shipping fee, free shipping and processing time.", `
    <form class="settings-body stack" onsubmit="saveStoreSettings(event, 'shipping')">
      <div class="settings-grid">
        <label>Standard shipping fee<input id="shippingFee" type="number" min="0" step="1" value="${Number(settings.shipping.standardFee || 0)}"></label>
        <label>Free shipping above<input id="shippingThreshold" type="number" min="0" step="1" value="${Number(settings.shipping.freeShippingThreshold || 0)}"></label>
        <label>Processing days<input id="shippingDays" type="number" min="0" step="1" value="${Number(settings.shipping.processingDays || 0)}"></label>
        <label>Shipping zones<input id="shippingZones" value="${escapeAttribute(settings.shipping.shippingZones || "India")}"></label>
      </div>
      <button class="primary-button" type="submit">Save shipping settings</button>
      <p id="settingsMessage" class="form-message"></p>
    </form>
  `);
}

function settingsCheckout() {
  return settingsPage("Store details", "Checkout", "Manage checkout requirements and customer notes.", `
    <form class="settings-body stack" onsubmit="saveStoreSettings(event, 'checkout')">
      <label class="check-row"><input id="checkoutPhone" type="checkbox" ${settings.checkout.requirePhone ? "checked" : ""}> Require phone number</label>
      <label class="check-row"><input id="checkoutNotes" type="checkbox" ${settings.checkout.notesEnabled ? "checked" : ""}> Enable delivery notes</label>
      <label class="check-row"><input id="checkoutGuest" type="checkbox" ${settings.checkout.allowGuestCheckout ? "checked" : ""}> Allow guest checkout</label>
      <button class="primary-button" type="submit">Save checkout settings</button>
      <p id="settingsMessage" class="form-message"></p>
    </form>
  `);
}

function settingsTaxes() {
  return settingsPage("Store details", "Taxes", "Set GST rate and decide whether displayed prices include tax.", `
    <form class="settings-body stack" onsubmit="saveStoreSettings(event, 'taxes')">
      <label>GST rate (%)<input id="taxGstRate" type="number" min="0" step="0.01" value="${Number(settings.taxes.gstRate || 0)}"></label>
      <label class="check-row"><input id="taxInclusive" type="checkbox" ${settings.taxes.pricesIncludeTax ? "checked" : ""}> Prices include tax</label>
      <button class="primary-button" type="submit">Save tax settings</button>
      <p id="settingsMessage" class="form-message"></p>
    </form>
  `);
}

function settingsInvoices() {
  return settingsPage("Store details", "Invoices", "Control invoice numbering and customer-facing footer notes.", `
    <form class="settings-body stack" onsubmit="saveStoreSettings(event, 'invoices')">
      <div class="settings-grid">
        <label>Invoice prefix<input id="invoicePrefix" value="${escapeAttribute(settings.invoices.prefix || "IH")}"></label>
        <label>Next number<input id="invoiceNext" type="number" min="1" step="1" value="${Number(settings.invoices.nextNumber || 1)}"></label>
      </div>
      <label>Footer note<textarea id="invoiceFooter" rows="4">${escapeHtml(settings.invoices.footerNote || "")}</textarea></label>
      <button class="primary-button" type="submit">Save invoice settings</button>
      <p id="settingsMessage" class="form-message"></p>
    </form>
  `);
}

function settingsPage(title, heading, description, body) {
  return `
    <section class="page">
      <div class="page-head"><h1>${escapeHtml(title)}</h1></div>
      <section class="settings-card">
        <div class="settings-head">
          <div>
            <h2>${escapeHtml(heading)}</h2>
            <p class="subtle">${escapeHtml(description)}</p>
          </div>
        </div>
        ${body}
      </section>
    </section>
  `;
}

function metricCard(label, value) {
  return `<article class="metric-card"><span>${escapeHtml(label)}</span><strong>${value}</strong></article>`;
}

function operationCard(label, value, description, view, tone = "accent") {
  return `
    <button class="operation-card tone-${escapeAttribute(tone)}" type="button" onclick="setView('${escapeAttribute(view)}')">
      <span>${escapeHtml(label)}</span>
      <strong>${Number(value || 0).toLocaleString("en-IN")}</strong>
      <small>${escapeHtml(description)}</small>
    </button>
  `;
}

function guideCard(text, view) {
  return `<button class="guide-card" type="button" onclick="setView('${escapeAttribute(view)}')"><span>${escapeHtml(text)}</span><strong>></strong></button>`;
}

function integrationCard(name, description, status) {
  return `
    <article class="panel panel-body stack">
      <div class="record-head">
        <div class="record-title"><strong>${escapeHtml(name)}</strong><span class="meta-line">${escapeHtml(description)}</span></div>
        <span class="status-pill status-${escapeAttribute(String(status).toLowerCase())}">${escapeHtml(status)}</span>
      </div>
    </article>
  `;
}

function productCard(product) {
  const stock = Number(product.stock || 0);
  const stockTone = stock <= 0 ? "failed" : stock <= LOW_STOCK_THRESHOLD ? "pending" : "subscribed";
  const stockLabel = stock <= 0 ? "Out of stock" : stock <= LOW_STOCK_THRESHOLD ? "Low stock" : "In stock";
  return `
    <article class="record-card">
      <div class="record-head">
        <div class="record-title">
          <strong>${escapeHtml(product.name)}</strong>
          <span class="meta-line">${escapeHtml(product.slug || product._id)} · ${formatRupee(product.price)} · Stock ${stock}</span>
        </div>
        <div class="badge-stack">
          <span class="status-pill status-${product.isActive === false ? "failed" : "subscribed"}">${product.isActive === false ? "Inactive" : "Active"}</span>
          <span class="status-pill status-${stockTone}">${stockLabel}</span>
        </div>
      </div>
      <p class="meta-line">${escapeHtml(product.description || "")}</p>
      <p class="meta-line">Digital file: ${escapeHtml(product.digitalFile?.storagePath || "Not mapped")}</p>
      <div class="inline-actions">
        <button class="small-button" type="button" onclick="editProduct('${escapeAttribute(product._id)}')">Edit</button>
        <button class="small-button" type="button" onclick="mapDigitalFile('${escapeAttribute(product._id)}')">Digital file</button>
        <button class="danger-button" type="button" onclick="deleteProduct('${escapeAttribute(product._id)}')">Disable</button>
      </div>
    </article>
  `;
}

function appointmentCard(appointment) {
  return `
    <article class="record-card">
      <div class="record-head">
        <div class="record-title">
          <strong>${escapeHtml(appointment.name)}</strong>
          <span class="meta-line">${escapeHtml(appointment.email)} · ${escapeHtml(appointment.phone)}</span>
        </div>
        ${statusSelect(APPOINTMENT_STATUS_OPTIONS, appointment.status || "new", `updateAppointmentStatus('${escapeAttribute(appointment._id)}', this.value)`)}
      </div>
      <p class="meta-line">Reference: ${escapeHtml(appointment.reference)} · ${escapeHtml(appointment.interest)} · ${escapeHtml(appointment.date)} ${escapeHtml(appointment.time)}</p>
      <p class="meta-line">${escapeHtml(appointment.message || "")}</p>
    </article>
  `;
}

function leadCard(lead) {
  return `
    <article class="record-card">
      <div class="record-head">
        <div class="record-title">
          <strong>${escapeHtml(lead.company)}</strong>
          <span class="meta-line">${escapeHtml(lead.city)}, ${escapeHtml(lead.country)} · ${escapeHtml(lead.email)}</span>
        </div>
        ${statusSelect(LEAD_STATUS_OPTIONS, lead.status || "new", `updateLeadStatus('${escapeAttribute(lead._id)}', this.value)`)}
      </div>
      <p class="meta-line">Reference: ${escapeHtml(lead.reference)} · Contact: ${escapeHtml(lead.contactPerson)} · ${escapeHtml(lead.mobile)}</p>
      <p class="meta-line">${escapeHtml(lead.currentProducts || lead.message || "")}</p>
    </article>
  `;
}

function discountCard(discount) {
  const value = discount.type === "fixed" ? formatRupee(discount.value) : `${Number(discount.value || 0)}%`;
  return `
    <article class="record-card">
      <div class="record-head">
        <div class="record-title">
          <strong>${escapeHtml(discount.code)}</strong>
          <span class="meta-line">${escapeHtml(discount.description || "Discount")} · ${value} · Used ${Number(discount.usedCount || 0)}/${Number(discount.maxUses || 0) || "unlimited"}</span>
        </div>
        <span class="status-pill status-${discount.isActive ? "subscribed" : "failed"}">${discount.isActive ? "Active" : "Inactive"}</span>
      </div>
      <div class="inline-actions">
        <button class="small-button" type="button" onclick="editDiscount('${escapeAttribute(discount._id)}')">Edit</button>
        <button class="danger-button" type="button" onclick="deleteDiscount('${escapeAttribute(discount._id)}')">Delete</button>
      </div>
    </article>
  `;
}

function campaignCard(campaign) {
  return `
    <article class="record-card">
      <div class="record-head">
        <div class="record-title">
          <strong>${escapeHtml(campaign.subject)}</strong>
          <span class="meta-line">${escapeHtml(titleCase(campaign.audience))} · ${escapeHtml(titleCase(campaign.status))} · ${Number(campaign.recipientCount || 0)} recipients</span>
        </div>
        <span class="status-pill status-${campaign.status === "sent" ? "subscribed" : "new"}">${escapeHtml(campaign.status)}</span>
      </div>
      <p class="meta-line">${escapeHtml(String(campaign.body || "").slice(0, 160))}</p>
      <div class="inline-actions">
        <button class="small-button" type="button" onclick="editCampaign('${escapeAttribute(campaign._id)}')">Edit</button>
        <button class="primary-button" type="button" onclick="sendCampaign('${escapeAttribute(campaign._id)}')">Send</button>
      </div>
    </article>
  `;
}

function ordersTable(items, options = {}) {
  if (!items.length) {
    return `<div class="empty-state">${options.actions ? "No orders match the current filters" : "No recent orders found"}</div>`;
  }
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Order</th>
            <th>Date</th>
            <th>Email</th>
            <th>Total</th>
            <th>Payment</th>
            <th>Fulfillment</th>
            ${options.actions ? "<th>Details</th>" : ""}
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              order => `
                <tr class="order-row ${order._id === selectedOrderId ? "active-row" : ""}" onclick="if (!event.target.closest('button, select')) showOrderDetails('${escapeAttribute(order._id)}')">
                  <td>${escapeHtml(shortId(order._id))}</td>
                  <td>${formatDate(order.createdAt)}</td>
                  <td>${escapeHtml(order.customerEmail || order.user?.email || "")}</td>
                  <td>${formatRupee(order.total)}</td>
                  <td>${
                    options.actions
                      ? statusSelect(ORDER_PAYMENT_OPTIONS, order.status || "pending", `updateOrderStatus('${escapeAttribute(order._id)}', 'status', this.value)`)
                      : paymentStatusLabel(order.status)
                  }</td>
                  <td>${
                    options.actions
                      ? statusSelect(ORDER_FULFILLMENT_OPTIONS, order.fulfillmentStatus || "new", `updateOrderStatus('${escapeAttribute(order._id)}', 'fulfillmentStatus', this.value)`)
                      : titleCase(order.fulfillmentStatus || "new")
                  }</td>
                  ${options.actions ? `<td><button class="small-button" type="button" onclick="showOrderDetails('${escapeAttribute(order._id)}')">View</button></td>` : ""}
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function orderFilterBar(resultCount) {
  return `
    <section class="filter-bar" aria-label="Order filters">
      <label class="filter-search">
        <span>Search orders</span>
        <input
          id="orderSearchInput"
          value="${escapeAttribute(orderFilters.search)}"
          oninput="setOrderSearch(this.value)"
          placeholder="Order ID, email, phone, customer, product"
        >
      </label>
      <label>
        <span>Payment</span>
        <select onchange="updateOrderFilter('payment', this.value)">
          ${filterOption("all", "All payments", orderFilters.payment)}
          ${ORDER_PAYMENT_OPTIONS.map(option => filterOption(option, statusLabel(option), orderFilters.payment)).join("")}
        </select>
      </label>
      <label>
        <span>Fulfillment</span>
        <select onchange="updateOrderFilter('fulfillment', this.value)">
          ${filterOption("all", "All fulfillment", orderFilters.fulfillment)}
          ${ORDER_FULFILLMENT_OPTIONS.map(option => filterOption(option, titleCase(option), orderFilters.fulfillment)).join("")}
        </select>
      </label>
      <div class="filter-summary">
        <strong>${Number(resultCount || 0).toLocaleString("en-IN")}</strong>
        <span>matching orders</span>
      </div>
      <button class="small-button" type="button" onclick="clearOrderFilters()">Clear</button>
    </section>
  `;
}

function filterOption(value, label, selectedValue) {
  return `<option value="${escapeAttribute(value)}" ${value === selectedValue ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

function orderDetailPanel(order) {
  if (!order) {
    return `
      <aside class="panel order-detail-panel">
        <div class="panel-head"><h2>Order details</h2></div>
        <div class="panel-body">${emptyText("Select an order to see full details.")}</div>
      </aside>
    `;
  }

  const address = order.shippingAddress || {};
  const user = order.user || {};
  const items = order.items || [];
  const addressText = [
    address.fullName,
    address.addressLine1,
    address.addressLine2,
    [address.city, address.state, address.postalCode].filter(Boolean).join(", "),
    address.country,
    address.phone ? `Phone: ${address.phone}` : ""
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join("<br>");

  return `
    <aside id="orderDetailPanel" class="panel order-detail-panel">
      <div class="panel-head">
        <div>
          <h2>Order details</h2>
          <p class="meta-line">${escapeHtml(order._id)}</p>
        </div>
        <span class="status-pill status-${escapeAttribute(order.status || "pending")}">${escapeHtml(paymentStatusLabel(order.status))}</span>
      </div>
      <div class="panel-body stack">
        <section class="detail-section">
          <h3>Quick update</h3>
          <div class="detail-actions">
            <label>Payment ${statusSelect(ORDER_PAYMENT_OPTIONS, order.status || "pending", `updateOrderStatus('${escapeAttribute(order._id)}', 'status', this.value)`)}</label>
            <label>Fulfillment ${statusSelect(ORDER_FULFILLMENT_OPTIONS, order.fulfillmentStatus || "new", `updateOrderStatus('${escapeAttribute(order._id)}', 'fulfillmentStatus', this.value)`)}</label>
          </div>
        </section>
        <section class="detail-section">
          <h3>Customer</h3>
          <div class="detail-grid">
            ${detailLine("Name", order.customerName || user.name)}
            ${detailLine("Email", order.customerEmail || user.email)}
            ${detailLine("Phone", order.customerPhone || address.phone)}
            ${detailLine("Account role", user.role || "user")}
          </div>
        </section>
        <section class="detail-section">
          <h3>Delivery address</h3>
          <p class="meta-line">${addressText || "No address saved"}</p>
        </section>
        <section class="detail-section">
          <h3>Items</h3>
          <div class="detail-items">
            ${
              items.length
                ? items.map(orderItemDetail).join("")
                : `<p class="meta-line">No items saved on this order.</p>`
            }
          </div>
        </section>
        <section class="detail-section">
          <h3>Payment and shipping</h3>
          <div class="detail-grid">
            ${detailLine("Total", formatRupee(order.total))}
            ${detailLine("Payment status", paymentStatusLabel(order.status || "pending"))}
            ${detailLine("Fulfillment", titleCase(order.fulfillmentStatus || "new"))}
            ${detailLine("Provider", titleCase(order.paymentProvider || "razorpay"))}
            ${detailLine("Payment order ID", order.paymentOrderId)}
            ${detailLine("Payment ID", order.paymentId)}
            ${detailLine("Paid at", order.paidAt ? formatDate(order.paidAt) : "")}
            ${detailLine("Placed at", formatDate(order.createdAt))}
          </div>
        </section>
        <section class="detail-section">
          <h3>Notes</h3>
          <p class="meta-line">${escapeHtml(order.notes || order.failureReason || "No customer notes.")}</p>
        </section>
      </div>
    </aside>
  `;
}

function detailLine(label, value) {
  return `
    <div class="detail-line">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value || "N/A")}</strong>
    </div>
  `;
}

function orderItemDetail(item) {
  return `
    <div class="detail-item">
      <div>
        <strong>${escapeHtml(item.name || "Product")}</strong>
        <span class="meta-line">${escapeHtml(item.productSlug || item.productId || "")}</span>
      </div>
      <div class="detail-item-total">
        <span>${Number(item.quantity || 1)} x ${formatRupee(item.price)}</span>
        <strong>${formatRupee(Number(item.price || 0) * Number(item.quantity || 1))}</strong>
      </div>
    </div>
  `;
}

function usersTable(items) {
  if (!items.length) return `<div class="empty-state">No users found</div>`;
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Verification</th><th>Role</th><th>Cart</th><th>Joined</th></tr></thead>
        <tbody>
          ${items
            .map(
              user => `
                <tr>
                  <td>${escapeHtml(user.name)}</td>
                  <td>${escapeHtml(user.email)}</td>
                  <td><span class="status-pill status-${user.emailVerified ? "subscribed" : "pending"}">${user.emailVerified ? "Verified" : "Pending"}</span></td>
                  <td>${escapeHtml(user.role || "user")}</td>
                  <td>${(user.cart || []).length}</td>
                  <td>${formatDate(user.createdAt)}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function newsletterTable(items) {
  if (!items.length) return `<div class="empty-state">No newsletter subscriptions found</div>`;
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Email</th><th>Source</th><th>Status</th><th>Joined</th></tr></thead>
        <tbody>
          ${items
            .map(
              item => `
                <tr>
                  <td>${escapeHtml(item.email)}</td>
                  <td>${escapeHtml(item.source || "website")}</td>
                  <td>${statusSelect(NEWSLETTER_STATUS_OPTIONS, item.status || "subscribed", `updateNewsletterStatus('${escapeAttribute(item._id)}', this.value)`)}</td>
                  <td>${formatDate(item.createdAt)}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function statusSelect(options, value, handler) {
  return `
    <select onchange="${handler}">
      ${options.map(option => `<option value="${escapeAttribute(option)}" ${option === value ? "selected" : ""}>${escapeHtml(statusLabel(option))}</option>`).join("")}
    </select>
  `;
}

function barChart(rows) {
  const max = Math.max(...rows.map(row => Number(row[1] || 0)), 1);
  return `
    <div class="chart-list">
      ${rows
        .map(
          ([label, value]) => `
            <div class="chart-row">
              <span>${escapeHtml(label)}</span>
              <div class="chart-track"><div class="chart-bar" style="width:${Math.max(4, (Number(value || 0) / max) * 100)}%"></div></div>
              <strong>${Number(value || 0)}</strong>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderLoading() {
  setWorkspace(`<section class="page"><div class="panel panel-body"><p class="subtle">Loading store manager...</p></div></section>`);
}

function renderErrorPage(message) {
  setWorkspace(`<section class="page"><div class="panel panel-body"><p class="form-message error">${escapeHtml(message)}</p></div></section>`);
}

function setWorkspace(html) {
  const element = document.getElementById("workspaceContent");
  if (element) element.innerHTML = html;
}

function emptyText(message) {
  return `<p class="subtle">${escapeHtml(message)}</p>`;
}

async function saveProduct(event) {
  event.preventDefault();
  setMessage("productMessage", "");
  const id = valueOf("productId");
  const body = {
    name: valueOf("productName"),
    slug: valueOf("productSlug"),
    price: numberOf("productPrice"),
    stock: numberOf("productStock"),
    category: valueOf("productCategory"),
    badge: valueOf("productBadge"),
    image: valueOf("productImage"),
    weight: valueOf("productWeight"),
    cocoa: valueOf("productCocoa"),
    wellnessNote: valueOf("productWellness"),
    description: valueOf("productDescription"),
    ingredients: splitCsv(valueOf("productIngredients")),
    benefits: splitCsv(valueOf("productBenefits")),
    isActive: checkedOf("productActive")
  };

  try {
    await apiFetch(id ? `/admin/products/${encodeURIComponent(id)}` : "/admin/products", {
      method: id ? "PUT" : "POST",
      body
    });
    await loadProducts();
    renderProducts();
    showToast("Product saved.");
  } catch (error) {
    setMessage("productMessage", error.message, "error");
  }
}

function editProduct(id) {
  const product = products.find(item => String(item._id) === String(id));
  if (!product) return;
  setText("productFormTitle", "Edit product");
  setValue("productId", product._id);
  setValue("productName", product.name);
  setValue("productSlug", product.slug);
  setValue("productPrice", product.price);
  setValue("productStock", product.stock);
  setValue("productCategory", product.category);
  setValue("productBadge", product.badge);
  setValue("productImage", product.image);
  setValue("productWeight", product.weight);
  setValue("productCocoa", product.cocoa);
  setValue("productWellness", product.wellnessNote);
  setValue("productDescription", product.description);
  setValue("productIngredients", (product.ingredients || []).join(", "));
  setValue("productBenefits", (product.benefits || []).join(", "));
  setChecked("productActive", product.isActive !== false);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetProductForm() {
  setView("products");
}

async function deleteProduct(id) {
  if (!confirm("Disable this product from public listing?")) return;
  try {
    await apiFetch(`/admin/products/${encodeURIComponent(id)}`, { method: "DELETE" });
    await loadProducts();
    renderProducts();
    showToast("Product disabled.");
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
      body: { storagePath, originalName, mimeType: "application/octet-stream" }
    });
    await loadProducts();
    renderProducts();
    showToast("Digital file mapped.");
  } catch (error) {
    showToast(error.message);
  }
}

async function updateOrderStatus(id, field, value) {
  try {
    await apiFetch(`/admin/orders/${encodeURIComponent(id)}/status`, {
      method: "PUT",
      body: { [field]: value }
    });
    await loadOrders();
    renderOrders();
    showToast("Order updated.");
  } catch (error) {
    showToast(error.message);
  }
}

function showOrderDetails(id) {
  selectedOrderId = id;
  if (currentView !== "orders") {
    setView("orders");
    return;
  }
  renderOrders();
  document.getElementById("orderDetailPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setOrderSearch(value) {
  orderFilters.search = value;
  clearTimeout(orderFilterTimer);
  orderFilterTimer = setTimeout(() => {
    renderOrders();
    const input = document.getElementById("orderSearchInput");
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }, 180);
}

function updateOrderFilter(key, value) {
  clearTimeout(orderFilterTimer);
  orderFilters = {
    ...orderFilters,
    [key]: value
  };
  renderOrders();
}

function clearOrderFilters() {
  clearTimeout(orderFilterTimer);
  orderFilters = {
    search: "",
    payment: "all",
    fulfillment: "all"
  };
  renderOrders();
}

async function updateAppointmentStatus(id, status) {
  try {
    await apiFetch(`/admin/appointments/${encodeURIComponent(id)}/status`, {
      method: "PUT",
      body: { status }
    });
    await loadAppointments();
    renderCurrentView();
    showToast("Appointment updated.");
  } catch (error) {
    showToast(error.message);
  }
}

async function updateLeadStatus(id, status) {
  try {
    await apiFetch(`/admin/business-leads/${encodeURIComponent(id)}/status`, {
      method: "PUT",
      body: { status }
    });
    await loadLeads();
    renderCurrentView();
    showToast("Lead updated.");
  } catch (error) {
    showToast(error.message);
  }
}

async function updateNewsletterStatus(id, status) {
  try {
    await apiFetch(`/admin/newsletter/${encodeURIComponent(id)}/status`, {
      method: "PUT",
      body: { status }
    });
    await loadNewsletter();
    renderCurrentView();
    showToast("Subscription updated.");
  } catch (error) {
    showToast(error.message);
  }
}

async function saveDiscount(event) {
  event.preventDefault();
  setMessage("discountMessage", "");
  const id = valueOf("discountId");
  const body = {
    code: valueOf("discountCode"),
    description: valueOf("discountDescription"),
    type: valueOf("discountType"),
    value: numberOf("discountValue"),
    minOrderValue: numberOf("discountMinOrder"),
    maxUses: numberOf("discountMaxUses"),
    startsAt: valueOf("discountStartsAt"),
    endsAt: valueOf("discountEndsAt"),
    isActive: checkedOf("discountActive")
  };

  try {
    await apiFetch(id ? `/admin/discounts/${encodeURIComponent(id)}` : "/admin/discounts", {
      method: id ? "PUT" : "POST",
      body
    });
    await loadDiscounts();
    renderDiscounts();
    showToast("Discount saved.");
  } catch (error) {
    setMessage("discountMessage", error.message, "error");
  }
}

function editDiscount(id) {
  const discount = discounts.find(item => String(item._id) === String(id));
  if (!discount) return;
  setText("discountFormTitle", "Edit discount");
  setValue("discountId", discount._id);
  setValue("discountCode", discount.code);
  setValue("discountDescription", discount.description);
  setValue("discountType", discount.type);
  setValue("discountValue", discount.value);
  setValue("discountMinOrder", discount.minOrderValue);
  setValue("discountMaxUses", discount.maxUses);
  setValue("discountStartsAt", dateInputValue(discount.startsAt));
  setValue("discountEndsAt", dateInputValue(discount.endsAt));
  setChecked("discountActive", discount.isActive !== false);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetDiscountForm() {
  setView("discounts");
}

async function deleteDiscount(id) {
  if (!confirm("Delete this discount?")) return;
  try {
    await apiFetch(`/admin/discounts/${encodeURIComponent(id)}`, { method: "DELETE" });
    await loadDiscounts();
    renderDiscounts();
    showToast("Discount deleted.");
  } catch (error) {
    showToast(error.message);
  }
}

async function saveCampaign(event) {
  event.preventDefault();
  setMessage("campaignMessage", "");
  const id = valueOf("campaignId");
  const body = {
    subject: valueOf("campaignSubject"),
    audience: valueOf("campaignAudience"),
    body: valueOf("campaignBody")
  };

  try {
    await apiFetch(id ? `/admin/email-campaigns/${encodeURIComponent(id)}` : "/admin/email-campaigns", {
      method: id ? "PUT" : "POST",
      body
    });
    await loadEmailCampaigns();
    renderEmails();
    showToast("Campaign saved.");
  } catch (error) {
    setMessage("campaignMessage", error.message, "error");
  }
}

function editCampaign(id) {
  const campaign = emailCampaigns.find(item => String(item._id) === String(id));
  if (!campaign) return;
  setText("campaignFormTitle", "Edit email campaign");
  setValue("campaignId", campaign._id);
  setValue("campaignSubject", campaign.subject);
  setValue("campaignAudience", campaign.audience);
  setValue("campaignBody", campaign.body);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function sendCampaign(id) {
  if (!confirm("Send this email campaign now?")) return;
  try {
    await apiFetch(`/admin/email-campaigns/${encodeURIComponent(id)}/send`, { method: "POST" });
    await loadEmailCampaigns();
    renderEmails();
    showToast("Campaign sent.");
  } catch (error) {
    showToast(error.message);
  }
}

async function saveStoreSettings(event, section) {
  event.preventDefault();
  setMessage("settingsMessage", "");
  let payload = {};

  if (section === "store") {
    payload = {
      storeName: valueOf("settingStoreName"),
      supportEmail: valueOf("settingSupportEmail"),
      supportPhone: valueOf("settingSupportPhone"),
      currency: valueOf("settingCurrency"),
      measurementSystem: valueOf("settingMeasurement")
    };
  }

  if (section === "company") {
    payload = {
      company: {
        name: valueOf("companyName"),
        legalName: valueOf("companyLegalName"),
        gstin: valueOf("companyGstin"),
        addressLine1: valueOf("companyAddress1"),
        addressLine2: valueOf("companyAddress2"),
        city: valueOf("companyCity"),
        state: valueOf("companyState"),
        postalCode: valueOf("companyPostal"),
        country: valueOf("companyCountry") || "India"
      }
    };
  }

  if (section === "payments") {
    payload = {
      payments: {
        razorpayEnabled: checkedOf("paymentRazorpay"),
        manualEnabled: checkedOf("paymentManual"),
        codEnabled: checkedOf("paymentCod")
      }
    };
  }

  if (section === "shipping") {
    payload = {
      shipping: {
        standardFee: numberOf("shippingFee"),
        freeShippingThreshold: numberOf("shippingThreshold"),
        processingDays: numberOf("shippingDays"),
        shippingZones: valueOf("shippingZones")
      }
    };
  }

  if (section === "checkout") {
    payload = {
      checkout: {
        requirePhone: checkedOf("checkoutPhone"),
        notesEnabled: checkedOf("checkoutNotes"),
        allowGuestCheckout: checkedOf("checkoutGuest")
      }
    };
  }

  if (section === "taxes") {
    payload = {
      taxes: {
        gstRate: numberOf("taxGstRate"),
        pricesIncludeTax: checkedOf("taxInclusive")
      }
    };
  }

  if (section === "invoices") {
    payload = {
      invoices: {
        prefix: valueOf("invoicePrefix"),
        nextNumber: numberOf("invoiceNext") || 1,
        footerNote: valueOf("invoiceFooter")
      }
    };
  }

  try {
    settings = deepMerge(structuredClone(DEFAULT_SETTINGS), await apiFetch("/admin/settings", {
      method: "PUT",
      body: payload
    }));
    renderSettings(currentView);
    showToast("Settings saved.");
  } catch (error) {
    setMessage("settingsMessage", error.message, "error");
  }
}

function orderStats() {
  const total = orders.length;
  const paidOrders = orders.filter(order => order.status === "paid");
  const revenue = paidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  return {
    total,
    revenue,
    average: total ? revenue / total : 0
  };
}

function countOrders(status) {
  return orders.filter(order => order.status === status).length;
}

function ordersToFulfill() {
  const done = ["delivered", "cancelled", "returned"];
  return orders.filter(order => order.status === "paid" && !done.includes(order.fulfillmentStatus || "new"));
}

function lowStockProducts() {
  return products.filter(product => product.isActive !== false && Number(product.stock || 0) <= LOW_STOCK_THRESHOLD);
}

function filteredOrders(source = sortedOrders()) {
  const search = orderFilters.search.trim().toLowerCase();
  return source.filter(order => {
    if (orderFilters.payment !== "all" && (order.status || "pending") !== orderFilters.payment) return false;
    if (orderFilters.fulfillment !== "all" && (order.fulfillmentStatus || "new") !== orderFilters.fulfillment) return false;
    if (!search) return true;

    const address = order.shippingAddress || {};
    const items = (order.items || []).map(item => [item.name, item.productSlug, item.productId].filter(Boolean).join(" ")).join(" ");
    const haystack = [
      order._id,
      order.customerName,
      order.customerEmail,
      order.customerPhone,
      order.paymentOrderId,
      order.paymentId,
      order.notes,
      order.user?.name,
      order.user?.email,
      address.fullName,
      address.phone,
      address.addressLine1,
      address.city,
      address.state,
      address.postalCode,
      items
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(search);
  });
}

function sortedOrders() {
  return [...orders].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function topProductRows() {
  const totals = new Map();
  orders.forEach(order => {
    (order.items || []).forEach(item => {
      totals.set(item.name, (totals.get(item.name) || 0) + Number(item.quantity || 0));
    });
  });
  return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
}

function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return `${start.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} - ${now.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  })}`;
}

function valueOf(id) {
  return String(document.getElementById(id)?.value || "").trim();
}

function numberOf(id) {
  return Number(valueOf(id) || 0);
}

function checkedOf(id) {
  return Boolean(document.getElementById(id)?.checked);
}

function setValue(id, value = "") {
  const element = document.getElementById(id);
  if (element) element.value = value ?? "";
}

function setChecked(id, value) {
  const element = document.getElementById(id);
  if (element) element.checked = Boolean(value);
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value ?? "";
}

function setMessage(id, message, type = "") {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = message;
  element.className = `form-message ${type}`.trim();
}

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

function deepMerge(target, source) {
  Object.keys(source || {}).forEach(key => {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
      target[key] = deepMerge(target[key] || {}, source[key]);
    } else if (source[key] !== undefined && key !== "__v") {
      target[key] = source[key];
    }
  });
  return target;
}

function dateInputValue(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function formatRupee(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function shortId(value = "") {
  const text = String(value || "");
  return text.length > 10 ? `${text.slice(0, 8)}...` : text;
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

function statusLabel(status = "") {
  return paymentStatusLabel(status);
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
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}
