/* orders-new.js — Indo Heals Orders Page Logic */
(function () {
  "use strict";

  const API = "http://localhost:5001/api";
  let allOrders = [];
  let auth = null;

  /* ── ICONS ── */
  const ICONS = {
    check: `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`,
    box: `<svg viewBox="0 0 24 24"><path d="M20 7h-1V6a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v1H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM9 4h6a2 2 0 0 1 2 2v1H7V6a2 2 0 0 1 2-2zm11 16H4V9h16v11z"/></svg>`,
    truck: `<svg viewBox="0 0 24 24"><path d="M20 8h-3V4H3a2 2 0 0 0-2 2v11h2a3 3 0 0 0 6 0h6a3 3 0 0 0 6 0h2v-5l-3-4zm-1 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM7.5 16.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM17 9l1.96 3H17V9z"/></svg>`,
    home: `<svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`,
    arrow: `<svg viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>`
  };

  /* ── HELPERS ── */
  function fmtDate(v) {
    if (!v) return "—";
    return new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }
  function fmtTime(v) {
    if (!v) return "";
    return new Date(v).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }
  function fmtRs(v) { return "₹" + Number(v || 0).toLocaleString("en-IN"); }
  function esc(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function getStatusClass(s) {
    const k = (s || "").toLowerCase();
    if (k.includes("deliver")) return "status-delivered";
    if (k.includes("shipped")) return "status-shipped";
    if (k.includes("out")) return "status-out";
    if (k.includes("confirm")) return "status-confirmed";
    if (k.includes("cancel")) return "status-cancelled";
    return "status-pending";
  }

  function getPayBadge(s) {
    const k = (s || "").toLowerCase();
    if (k.includes("paid")) return "badge-green";
    if (k.includes("cod")) return "badge-yellow";
    if (k.includes("fail")) return "badge-red";
    return "badge-gray";
  }

  /* ── AUTH ── */
  function loadAuth() {
    try { auth = JSON.parse(localStorage.getItem("auth") || "null"); }
    catch { auth = null; }
  }

  function apiGet(path) {
    return fetch(API + path, {
      headers: {
        "Content-Type": "application/json",
        ...(auth?.token ? { Authorization: "Bearer " + auth.token } : {})
      }
    }).then(async r => {
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || "Request failed");
      return d;
    });
  }

  function apiPost(path, body) {
    return fetch(API + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(auth?.token ? { Authorization: "Bearer " + auth.token } : {})
      },
      body: JSON.stringify(body)
    }).then(async r => {
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || "Request failed");
      return d;
    });
  }

  /* ── SIDEBAR USER ── */
  function populateSidebar() {
    if (!auth) return;
    const u = auth.user || auth || {};
    const name = u.name || u.fullName || "User";
    const email = u.email || "";

    const el = document.getElementById("sidebarName");
    const av = document.getElementById("sidebarAvatar");
    const em = document.getElementById("sidebarEmail");
    if (el) el.textContent = name;
    if (em) em.textContent = email;
    if (av) av.textContent = name.charAt(0).toUpperCase();

    // Populate Overview banner
    const ovName = document.getElementById("overviewName");
    const ovEmail = document.getElementById("overviewEmail");
    const ovAvatar = document.getElementById("overviewAvatar");
    if (ovName) ovName.textContent = name;
    if (ovEmail) ovEmail.textContent = email;
    if (ovAvatar) ovAvatar.textContent = name.charAt(0).toUpperCase();

    // Populate Profile detail view
    const pFull = document.getElementById("prof-fullName");
    const pPhone = document.getElementById("prof-phone");
    const pEmail = document.getElementById("prof-email");
    const pGender = document.getElementById("prof-gender");
    const pDob = document.getElementById("prof-dob");
    const pLocation = document.getElementById("prof-location");
    const pAltMobile = document.getElementById("prof-altMobile");
    const pHint = document.getElementById("prof-hint");

    if (pFull) pFull.textContent = u.name || u.fullName || "- not added -";
    if (pPhone) pPhone.textContent = u.phone || u.mobileNumber || "- not added -";
    if (pEmail) pEmail.textContent = u.email || "- not added -";
    if (pGender) pGender.textContent = (u.gender || "").toUpperCase() || "- not added -";
    if (pDob) pDob.textContent = u.dob || u.dateOfBirth || "- not added -";
    if (pLocation) pLocation.textContent = u.location || "- not added -";
    if (pAltMobile) pAltMobile.textContent = u.altMobile || u.alternateMobile || "- not added -";
    if (pHint) pHint.textContent = u.hintName || u.hint || "- not added -";
  }

  window.doLogout = function () {
    localStorage.removeItem("auth");
    window.location.href = "index.html";
  };

  /* ── SWITCH TAB ── */
  window.switchTab = function (tab) {
    // 1. Deselect active class on all sidebar items
    document.querySelectorAll(".oh-sidenav-item").forEach(el => el.classList.remove("active"));

    // Hide all main content views
    ["overviewView", "ordersListView", "orderDetailView", "productDetailView", "profileView"].forEach(hide);

    if (tab === "overview") {
      show("overviewView");
      const item = document.getElementById("side-overview");
      if (item) item.classList.add("active");
    } else if (tab === "orders") {
      show("ordersListView");
      const item = document.getElementById("side-orders");
      if (item) item.classList.add("active");
    } else if (tab === "profile") {
      show("profileView");
      const item = document.getElementById("side-profile");
      if (item) item.classList.add("active");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ── SHOW / HIDE ── */
  function show(id) { const el = document.getElementById(id); if (el) el.style.display = ""; }
  function hide(id) { const el = document.getElementById(id); if (el) el.style.display = "none"; }
  function hideAll() {
    ["notLoggedIn", "loadingState", "errorState", "emptyState", "ordersList"].forEach(hide);
  }

  /* ── LOAD ORDERS ── */
  window.loadOrders = async function () {
    hideAll();
    show("loadingState");
    try {
      const data = await apiGet("/orders/my");
      allOrders = Array.isArray(data) ? data : [];
      hide("loadingState");
      renderList(allOrders);
    } catch (err) {
      hide("loadingState");
      document.getElementById("errorMsg").textContent = err.message;
      show("errorState");
    }
  };

  /* ── FILTER ── */
  window.filterOrders = function () {
    const q = (document.getElementById("orderSearch")?.value || "").toLowerCase();
    const st = (document.getElementById("statusFilter")?.value || "").toLowerCase();
    const filtered = allOrders.filter(o => {
      const matchQ = !q ||
        (o._id || "").toLowerCase().includes(q) ||
        (o.items || []).some(i => (i.name || "").toLowerCase().includes(q));
      const matchSt = !st || (o.orderStatus || "").toLowerCase().includes(st);
      return matchQ && matchSt;
    });
    renderList(filtered);
  };

  /* ── RENDER LIST ── */
  let previousView = "list";
  let allProducts = [];

  const FALLBACK_PRODUCTS = [
    {
      name: "Breathe Classic",
      slug: "breathe-classic",
      price: 299,
      description: "Premium functional dark chocolate crafted with ashwagandha and tulsi for an everyday herbal wellness ritual.",
      wellnessNote: "Traditionally associated with stress support and calming wellness.",
      image: "assets/breathe-classic-ai.png",
      category: "Functional Dark Chocolate",
      badge: "Classic Blend",
      weight: "40 g",
      cocoa: "55% dark cocoa",
      ingredients: ["Dark chocolate", "Ashwagandha", "Tulsi"],
      benefits: [
        "Everyday calming wellness positioning",
        "Inspired by traditional ashwagandha and tulsi use",
        "Rich dark chocolate format for easy daily enjoyment"
      ]
    },
    {
      name: "Breathe Energy",
      slug: "breathe-energy",
      price: 349,
      description: "Dark chocolate with moringa and almond, created for active daily routines with a refined herbal profile.",
      wellnessNote: "Traditionally associated with energy and stamina support.",
      image: "assets/breathe-energy-ai.png",
      category: "Functional Dark Chocolate",
      badge: "Energy Blend",
      weight: "40 g",
      cocoa: "55% dark cocoa",
      ingredients: ["Dark chocolate", "Moringa", "Almond"],
      benefits: [
        "Made for active lifestyle routines",
        "Moringa and almond inspired functional blend",
        "Premium dark chocolate with nut-forward taste"
      ]
    },
    {
      name: "Breathe Immunity",
      slug: "breathe-immunity",
      price: 349,
      description: "Amla, cinnamon and mulethi meet smooth dark chocolate in a blend inspired by familiar Indian wellness rituals.",
      wellnessNote: "Traditionally associated with immune wellness support.",
      image: "assets/breathe-immunity-ai.png",
      category: "Functional Dark Chocolate",
      badge: "Immunity Blend",
      weight: "40 g",
      cocoa: "55% dark cocoa",
      ingredients: ["Dark chocolate", "Amla", "Cinnamon", "Mulethi"],
      benefits: [
        "Inspired by familiar Indian wellness ingredients",
        "Warm cinnamon and herbal mulethi profile",
        "Premium cacao-led daily wellness format"
      ]
    },
    {
      name: "Breathe Slim",
      slug: "breathe-slim",
      price: 329,
      description: "A warm botanical dark chocolate with ginger and black pepper for digestive and metabolic wellness routines.",
      wellnessNote: "Traditionally associated with digestive and metabolic wellness.",
      image: "assets/breathe-slim-ai.png",
      category: "Functional Dark Chocolate",
      badge: "Slim Blend",
      weight: "40 g",
      cocoa: "55% dark cocoa",
      ingredients: ["Dark chocolate", "Ginger", "Black pepper"],
      benefits: [
        "Inspired by traditional digestive wellness routines",
        "Ginger and black pepper warming blend",
        "Premium dark chocolate with a spiced finish"
      ]
    }
  ];

  async function loadAllProducts() {
    try {
      const data = await apiGet("/products");
      allProducts = Array.isArray(data) && data.length ? data : FALLBACK_PRODUCTS;
    } catch (err) {
      console.warn("Could not load products:", err);
      allProducts = FALLBACK_PRODUCTS;
    }
  }

  function renderList(orders) {
    hideAll();
    if (!orders.length) { show("emptyState"); return; }
    show("ordersList");
    const el = document.getElementById("ordersList");
    el.innerHTML = orders.map(o => orderCardHTML(o)).join("");
    el.querySelectorAll(".oh-order-card").forEach(card => {
      card.addEventListener("click", function () {
        const id = this.dataset.id;
        const order = allOrders.find(o => (o._id || o.orderId) === id);
        if (order) showDetail(order);
      });
    });
  }

  window.viewOrder = function (id) {
    const order = allOrders.find(o => (o._id || o.orderId) === id);
    if (order) showDetail(order);
  };

  window.viewProduct = async function (productId) {
    if (!allProducts.length) {
      await loadAllProducts();
    }
    const product = allProducts.find(p => {
      const ids = [p._id, p.id, p.slug, p.name].filter(Boolean).map(s => String(s).toLowerCase());
      return ids.includes(String(productId).toLowerCase());
    }) || FALLBACK_PRODUCTS.find(p => p.slug === productId || p.name.toLowerCase() === productId.toLowerCase());

    if (!product) return;

    hide("ordersListView");
    hide("orderDetailView");
    show("productDetailView");

    const image = product.image || "assets/breathe-classic-ai.png";
    const ingredients = Array.isArray(product.ingredients) ? product.ingredients : [];
    const benefits = Array.isArray(product.benefits) ? product.benefits : [];
    const ingredientsText = ingredients.length ? ingredients.join(", ") : "Botanical wellness blend";

    document.getElementById("productDetailContent").innerHTML = `
      <article class="product-detail">
        <div class="product-detail-grid">
          <div class="product-detail-image">
            <img src="${esc(image)}" alt="${esc(product.name)}">
          </div>
          <div class="product-detail-copy">
            <span class="product-tag">${esc(product.category || "Health Support")}</span>
            <h2 style="font-family:'Inter', sans-serif;font-size:28px;font-weight:800;color:var(--text);margin-top:8px;">${esc(product.name)}</h2>
            <p class="detail-price" style="font-size:22px;font-weight:800;color:var(--gold-d);margin:12px 0;">${fmtRs(product.price)}</p>
            <p class="detail-note" style="color:var(--muted);font-size:14px;line-height:1.6;margin-bottom:12px;">${esc(product.wellnessNote || "")}</p>
            <p style="color:var(--text);font-size:14px;line-height:1.6;margin-bottom:24px;">${esc(product.description || "")}</p>
            <h3 class="detail-heading" style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:12px;text-transform:uppercase;letter-spacing:0.05em;">Full Specification</h3>
            <div class="spec-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px,1fr));gap:14px;background:#fafafa;border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:24px;">
              <div><span style="display:block;font-size:11px;color:var(--muted);text-transform:uppercase;margin-bottom:2px;">Category</span><strong style="color:var(--text);font-size:13px;">${esc(product.category || "Herbal Wellness Product")}</strong></div>
              <div><span style="display:block;font-size:11px;color:var(--muted);text-transform:uppercase;margin-bottom:2px;">Price</span><strong style="color:var(--text);font-size:13px;">${fmtRs(product.price)}</strong></div>
              <div><span style="display:block;font-size:11px;color:var(--muted);text-transform:uppercase;margin-bottom:2px;">Net Weight</span><strong style="color:var(--text);font-size:13px;">${esc(product.weight || "40 g")}</strong></div>
              <div><span style="display:block;font-size:11px;color:var(--muted);text-transform:uppercase;margin-bottom:2px;">Cocoa Profile</span><strong style="color:var(--text);font-size:13px;">${esc(product.cocoa || "Premium dark cocoa")}</strong></div>
              <div><span style="display:block;font-size:11px;color:var(--muted);text-transform:uppercase;margin-bottom:2px;">Key Ingredients</span><strong style="color:var(--text);font-size:13px;">${esc(ingredientsText)}</strong></div>
              <div><span style="display:block;font-size:11px;color:var(--muted);text-transform:uppercase;margin-bottom:2px;">Stock Status</span><strong style="color:var(--text);font-size:13px;">Available</strong></div>
              <div><span style="display:block;font-size:11px;color:var(--muted);text-transform:uppercase;margin-bottom:2px;">Compliance</span><strong style="color:var(--text);font-size:13px;">No medical claims made.</strong></div>
            </div>
            <ul class="benefit-list" style="margin-top:24px;padding-left:20px;display:flex;flex-direction:column;gap:8px;color:var(--muted);font-size:13px;line-height:1.5;">
              ${benefits.map(item => `<li>${esc(item)}</li>`).join("")}
            </ul>
          </div>
        </div>
      </article>
    `;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  window.goBackFromProductView = function () {
    hide("productDetailView");
    if (previousView === "detail") {
      show("orderDetailView");
    } else {
      show("ordersListView");
    }
  };

  function orderCardHTML(o) {
    const id = o._id || o.orderId || "";
    const statusClass = getStatusClass(o.orderStatus);
    const statusLabel = o.orderStatus || "Pending";
    const items = o.items || [];
    const firstImg = items[0]?.image || "assets/breathe-classic-ai.png";

    const itemsHTML = items.slice(0, 2).map(item => `
      <div class="oh-order-item" onclick="event.stopPropagation(); window.viewProduct('${esc(item.productId || item.slug || item.id || item.name)}')">
        <div class="oh-item-img">
          <img src="${esc(item.image || "assets/breathe-classic-ai.png")}" alt="${esc(item.name)}">
        </div>
        <div class="oh-item-info">
          <div class="oh-item-brand">Indo Heals</div>
          <div class="oh-item-name" style="cursor:pointer;text-decoration:none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${esc(item.name)}</div>
          <div class="oh-item-desc">Qty: ${item.quantity} &nbsp;·&nbsp; ${fmtRs(item.price)} each</div>
        </div>
        <div class="oh-item-price">${fmtRs(item.price * item.quantity)}</div>
      </div>
    `).join("");

    const extra = items.length > 2 ? `<p style="font-size:13px;color:var(--muted);padding:0 20px 12px;">+${items.length - 2} more item${items.length - 2 > 1 ? "s" : ""}</p>` : "";
    const payBadge = `<span class="oh-badge ${getPayBadge(o.paymentStatus)}">${esc(o.paymentStatus || "Pending")}</span>`;

    return `
      <div class="oh-order-card ${statusClass}" data-id="${esc(id)}">
        <div class="oh-order-card-top">
          <div class="oh-order-status">
            <span class="oh-status-dot"></span>
            <span class="oh-status-label">${esc(statusLabel)}</span>
          </div>
          <div class="oh-order-meta">
            ${payBadge}
            <span>Order #${esc(id.slice(-8).toUpperCase())}</span>
            <span>${fmtDate(o.createdAt)}</span>
          </div>
        </div>
        <div class="oh-order-items">${itemsHTML}</div>
        ${extra}
        <div class="oh-order-card-footer">
          <div class="oh-order-total">
            <span>Order Total</span>${fmtRs(o.total)}
          </div>
          <button class="oh-view-btn" onclick="event.stopPropagation(); window.viewOrder('${esc(id)}')">
            View Details ${ICONS.arrow}
          </button>
        </div>
      </div>
    `;
  }

  /* ── SHOW DETAIL ── */
  function showDetail(order) {
    previousView = "detail";
    hide("ordersListView");
    show("orderDetailView");
    document.getElementById("orderDetailContent").innerHTML = buildDetailHTML(order);
    document.getElementById("supportForm")?.addEventListener("submit", e => handleSupport(e, order._id || order.orderId));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  window.showListView = function () {
    previousView = "list";
    hide("orderDetailView");
    show("ordersListView");
  };

  /* ── TRACKING STEPS ── */
  const TRACKING_STEPS = [
    { id: "Pending", label: "Order Placed", desc: "Your order has been received.", icon: "check" },
    { id: "Confirmed", label: "Order Confirmed", desc: "We've confirmed your order.", icon: "check" },
    { id: "Shipped", label: "Shipped", desc: "Your order is on its way.", icon: "truck" },
    { id: "Out for Delivery", label: "Out for Delivery", desc: "Arriving today!", icon: "truck" },
    { id: "Delivered", label: "Delivered", desc: "Order delivered successfully.", icon: "home" }
  ];

  function buildTrackingHTML(status, trackingNumber, createdAt) {
    const statuses = TRACKING_STEPS.map(s => s.id);
    const activeIdx = statuses.indexOf(status);
    const isCancelled = (status || "").toLowerCase().includes("cancel");

    if (isCancelled) {
      return `
        <div style="display:flex;align-items:center;gap:12px;padding:16px;background:var(--red-bg);border-radius:8px;">
          <span style="font-size:28px;">❌</span>
          <div>
            <div style="font-weight:700;color:var(--red);">Order Cancelled</div>
            <div style="font-size:13px;color:var(--muted);margin-top:4px;">This order was cancelled. Refunds are processed within 5-7 days.</div>
          </div>
        </div>`;
    }

    return `<div class="oh-tracking-steps">` + TRACKING_STEPS.map((step, i) => {
      const done = i < activeIdx;
      const current = i === activeIdx;
      const cls = done ? "done" : current ? "current" : "";
      const dateStr = done || current ? fmtDate(createdAt) : "";
      return `
        <div class="oh-track-step ${cls}">
          <div class="oh-track-icon-wrap">
            <div class="oh-track-icon">${ICONS[step.icon]}</div>
            <div class="oh-track-line"></div>
          </div>
          <div class="oh-track-content">
            <div class="oh-track-title">${step.label}</div>
            <div class="oh-track-desc">${current ? step.desc : done ? step.desc : "Waiting…"}</div>
            ${dateStr ? `<div class="oh-track-date">${dateStr}</div>` : ""}
          </div>
        </div>`;
    }).join("") + `</div>`;
  }

  /* ── BUILD DETAIL HTML ── */
  function buildDetailHTML(o) {
    const id = o._id || o.orderId || "";
    const items = o.items || [];
    const addr = o.shippingAddress || {};
    const trackNum = o.trackingNumber;

    const itemsHTML = items.map(item => `
      <div class="oh-detail-item" onclick="event.stopPropagation(); window.viewProduct('${esc(item.productId || item.slug || item.id || item.name)}')" style="cursor:pointer;">
        <div class="oh-detail-item-img">
          <img src="${esc(item.image || "assets/breathe-classic-ai.png")}" alt="${esc(item.name)}">
        </div>
        <div class="oh-detail-item-info">
          <div class="oh-detail-item-name" style="cursor:pointer;text-decoration:none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${esc(item.name)}</div>
          <div class="oh-detail-item-meta">Qty: ${item.quantity} &nbsp;·&nbsp; ${fmtRs(item.price)} each</div>
        </div>
        <div class="oh-detail-item-price">${fmtRs(item.price * item.quantity)}</div>
      </div>
    `).join("");

    const subtotal = items.reduce((s, i) => s + (i.price * i.quantity), 0);
    const shipping = o.shippingFee || 0;
    const discount = o.discount || 0;

    return `
      <div class="oh-detail-grid">

        <!-- LEFT COLUMN -->
        <div style="display:flex;flex-direction:column;gap:16px;">

          <!-- Tracking -->
          <div class="oh-detail-card">
            <div class="oh-detail-card-head">
              <h2>🚚 Order Tracking</h2>
              ${trackNum ? `<span style="font-size:12px;color:var(--muted);">Tracking #${esc(trackNum)}</span>` : ""}
            </div>
            <div class="oh-detail-card-body">
              ${buildTrackingHTML(o.orderStatus, trackNum, o.createdAt)}
              ${o.trackingLink ? `<a href="${esc(o.trackingLink)}" target="_blank" style="display:inline-flex;align-items:center;gap:6px;margin-top:16px;font-size:13px;font-weight:600;color:var(--blue);">Track Shipment Externally ${ICONS.arrow}</a>` : ""}
            </div>
          </div>

          <!-- Items -->
          <div class="oh-detail-card">
            <div class="oh-detail-card-head">
              <h2>📦 Items in Order</h2>
              <span style="font-size:12px;color:var(--muted);">${items.length} item${items.length !== 1 ? "s" : ""}</span>
            </div>
            <div class="oh-detail-card-body">
              <div class="oh-detail-items">${itemsHTML}</div>
            </div>
          </div>

          <!-- Order Info -->
          <div class="oh-detail-card">
            <div class="oh-detail-card-head"><h2>📋 Order Info</h2></div>
            <div class="oh-detail-card-body">
              <div class="oh-meta-grid">
                <div class="oh-meta-item"><label>Order ID</label><span>#${esc(id.slice(-8).toUpperCase())}</span></div>
                <div class="oh-meta-item"><label>Order Date</label><span>${fmtDate(o.createdAt)}</span></div>
                <div class="oh-meta-item"><label>Order Status</label>
                  <span>${esc(o.orderStatus || "Pending")}</span>
                </div>
                <div class="oh-meta-item"><label>Payment Method</label><span>${esc(o.paymentMethod || o.paymentProvider || "Online")}</span></div>
                <div class="oh-meta-item"><label>Payment Status</label>
                  <span class="oh-badge ${getPayBadge(o.paymentStatus)}">${esc(o.paymentStatus || "Pending")}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Support -->
          <div class="oh-detail-card">
            <div class="oh-detail-card-head"><h2>🛟 Help & Support</h2></div>
            <div class="oh-detail-card-body">
              <form class="oh-support-form" id="supportForm">
                <textarea id="supportMsg" placeholder="Describe your issue with this order…" required></textarea>
                <div>
                  <button type="submit" class="oh-btn-primary">Submit Request</button>
                </div>
                <div id="supportResult"></div>
              </form>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN -->
        <div style="display:flex;flex-direction:column;gap:16px;">

          <!-- Price Summary -->
          <div class="oh-detail-card">
            <div class="oh-detail-card-head"><h2>💰 Price Details</h2></div>
            <div class="oh-detail-card-body">
              <div class="oh-price-summary">
                <div class="oh-price-row"><span>Subtotal</span><span>${fmtRs(subtotal)}</span></div>
                ${shipping ? `<div class="oh-price-row"><span>Shipping</span><span>${fmtRs(shipping)}</span></div>` : `<div class="oh-price-row"><span>Shipping</span><span style="color:var(--green);">FREE</span></div>`}
                ${discount ? `<div class="oh-price-row"><span>Discount</span><span style="color:var(--green);">- ${fmtRs(discount)}</span></div>` : ""}
                <div class="oh-price-row total"><span>Total Amount</span><span>${fmtRs(o.total)}</span></div>
              </div>
            </div>
          </div>

          <!-- Delivery Address -->
          <div class="oh-detail-card">
            <div class="oh-detail-card-head"><h2>📍 Delivery Address</h2></div>
            <div class="oh-detail-card-body">
              <div class="oh-address-block">
                <p class="oh-address-name">${esc(addr.fullName || addr.name || "—")}</p>
                <p>${esc(addr.addressLine1 || addr.address || "")}</p>
                ${addr.addressLine2 ? `<p>${esc(addr.addressLine2)}</p>` : ""}
                <p>${esc(addr.city || "")}, ${esc(addr.state || "")} ${esc(addr.postalCode || addr.pincode || "")}</p>
                <p>${esc(addr.country || "India")}</p>
                ${addr.phone ? `<p style="margin-top:8px;font-weight:600;">📞 ${esc(addr.phone)}</p>` : ""}
              </div>
            </div>
          </div>
        </div>

      </div>
    `;
  }

  /* ── SUPPORT SUBMIT ── */
  async function handleSupport(e, orderId) {
    e.preventDefault();
    const msg = document.getElementById("supportMsg")?.value?.trim();
    const result = document.getElementById("supportResult");
    if (!msg || !result) return;
    try {
      await apiPost(`/orders/${orderId}/support`, { message: msg });
      result.innerHTML = `<div class="oh-msg-success">✅ Support request submitted successfully.</div>`;
      document.getElementById("supportMsg").value = "";
    } catch (err) {
      result.innerHTML = `<div class="oh-msg-error">❌ ${esc(err.message)}</div>`;
    }
  }

  /* ── INIT ── */
  async function init() {
    loadAuth();
    populateSidebar();

    if (!auth?.token) {
      hide("loadingState");
      show("notLoggedIn");
      return;
    }

    await loadOrders();
    // Default tab
    switchTab("overview");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
