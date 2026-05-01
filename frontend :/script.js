const LIVE_SERVER_PORTS = ["3000", "5173", "5500", "5501"];
const API_BASES = window.INDO_HEALS_API
  ? [window.INDO_HEALS_API]
  : window.location.protocol.startsWith("http") &&
    window.location.port &&
    !LIVE_SERVER_PORTS.includes(window.location.port)
    ? [`${window.location.origin}/api`]
    : ["http://localhost:5002/api", "http://localhost:5001/api"];
const PRODUCT_IMAGE = "assets/breathe-classic-ai.png";
const FALLBACK_PRODUCTS = [
  {
    name: "Breathe Classic",
    slug: "breathe-classic",
    price: 299,
    description:
      "Premium functional dark chocolate crafted with ashwagandha and tulsi for an everyday herbal wellness ritual.",
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
    description:
      "Dark chocolate with moringa and almond, created for active daily routines with a refined herbal profile.",
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
    description:
      "Amla, cinnamon and mulethi meet smooth dark chocolate in a blend inspired by familiar Indian wellness rituals.",
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
    description:
      "A warm botanical dark chocolate with ginger and black pepper for digestive and metabolic wellness routines.",
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

let allProducts = [];
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let auth = JSON.parse(localStorage.getItem("auth")) || null;
let appointments = JSON.parse(localStorage.getItem("appointments")) || [];
let businessContacts = JSON.parse(localStorage.getItem("businessContacts")) || [];
let currentPage = "home";
let toastTimer;
let heroSlideIndex = 0;
let heroSlideTimer;

document.addEventListener("DOMContentLoaded", () => {
  bindSearch();
  initHeroCarousel();
  setAppointmentMinDate();
  initScrollAnimations();
  updateAuthUI();
  loadProducts();
  goToPage("home");
});

async function apiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (auth?.token) {
    headers.Authorization = `Bearer ${auth.token}`;
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
        throw new Error(data.message || "Request failed");
      }

      return data;
    } catch (error) {
      lastError = error;
      if (!String(error.message || "").includes("fetch")) {
        throw error;
      }
    }
  }

  throw lastError || new Error("Backend request failed");
}

function goToPage(page) {
  currentPage = page;

  document.querySelectorAll(".page").forEach(pageElement => {
    pageElement.style.display = "none";
  });

  const selectedPage = document.getElementById(`${page}-page`);
  if (selectedPage) {
    selectedPage.style.display = "block";
  }

  if (page === "products") {
    displayProducts(allProducts);
  }

  if (page === "cart") {
    updateCartDisplay();
  }

  if (page === "about") {
    refreshAboutAnimation();
  }

  if (page === "home") {
    resumeHeroCarousel();
  }

  window.scrollTo(0, 0);
}

function resumeHeroCarousel() {
  const hero = document.querySelector(".premium-hero.show-consult");
  const consultTab = document.querySelector('[data-hero-tab="consult"]');
  if (hero && consultTab) {
    document.querySelectorAll("[data-hero-tab]").forEach(tab => {
      tab.classList.toggle("active", tab === consultTab);
    });
  }
}

function initHeroCarousel() {
  const hero = document.querySelector(".premium-hero");
  const slides = [...document.querySelectorAll(".hero-slide")];
  const tabs = [...document.querySelectorAll("[data-hero-tab]")];
  if (!hero || !slides.length || !tabs.length) return;
  let shouldAdvanceFromConsult = true;

  function setHeroTab(name) {
    tabs.forEach(tab => {
      tab.classList.toggle("active", tab.dataset.heroTab === name);
    });
  }

  function showSlide(index) {
    hero.classList.remove("show-consult");
    const nextIndex = (index + slides.length) % slides.length;
    const currentSlide = slides[heroSlideIndex];
    const nextSlide = slides[nextIndex];

    if (currentSlide && currentSlide !== nextSlide) {
      currentSlide.classList.remove("active");
      currentSlide.classList.add("leaving");
      setTimeout(() => currentSlide.classList.remove("leaving"), 950);
    }

    nextSlide.classList.add("active");
    heroSlideIndex = nextIndex;
    setHeroTab(nextSlide.dataset.slide);
  }

  function showConsultSection(stopAuto = true) {
    hero.classList.add("show-consult");
    setHeroTab("consult");
    if (stopAuto) {
      clearInterval(heroSlideTimer);
    }
  }

  function startHeroAutoSlide(startFromConsult = false) {
    clearInterval(heroSlideTimer);
    shouldAdvanceFromConsult = startFromConsult;
    heroSlideTimer = setInterval(() => {
      if (currentPage !== "home") return;

      if (hero.classList.contains("show-consult")) {
        if (shouldAdvanceFromConsult) {
          shouldAdvanceFromConsult = false;
          showSlide(0);
        }
        return;
      }

      if (!hero.classList.contains("show-consult")) {
        if (heroSlideIndex === slides.length - 1) {
          showConsultSection();
          return;
        }

        showSlide(heroSlideIndex + 1);
      }
    }, 4500);
  }

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.heroTab;

      if (target === "consult") {
        shouldAdvanceFromConsult = false;
        showConsultSection();
        return;
      }

      const targetIndex = slides.findIndex(slide => slide.dataset.slide === target);
      if (targetIndex !== -1) {
        shouldAdvanceFromConsult = false;
        showSlide(targetIndex);
        startHeroAutoSlide();
      }
    });
  });

  showConsultSection(false);
  startHeroAutoSlide(true);
}

async function loadProducts() {
  const container = document.getElementById("products");

  try {
    if (container) {
      container.innerHTML = "<p id='noProducts'>Loading products...</p>";
    }

    const products = await apiFetch("/products");
    allProducts = Array.isArray(products) && products.length ? products : FALLBACK_PRODUCTS;
    displayProducts(allProducts);
  } catch (error) {
    console.error("Error fetching products:", error);
    allProducts = FALLBACK_PRODUCTS;
    displayProducts(allProducts);
  }
}

function displayProducts(products) {
  const container = document.getElementById("products");
  if (!container) return;

  if (!products || products.length === 0) {
    container.innerHTML = "<p id='noProducts'>No products found</p>";
    return;
  }

  container.innerHTML = products.map(productCardTemplate).join("");
}

function productCardTemplate(product) {
  const productId = escapeAttribute(product._id || product.id || product.slug);
  const image = escapeAttribute(product.image || PRODUCT_IMAGE);
  const ingredients = Array.isArray(product.ingredients) ? product.ingredients : [];

  return `
    <article class="product-card">
      <div class="product-img">
        <img src="${image}" alt="${escapeAttribute(product.name)}">
        <span class="product-badge">${escapeHtml(product.badge || "Wellness Chocolate")}</span>
      </div>
      <div class="product-body">
        <span class="product-tag">${escapeHtml(product.category || "Health Support")}</span>
        <h3 class="product-name">${escapeHtml(product.name)}</h3>
        <p class="product-wellness">${escapeHtml(product.wellnessNote || "")}</p>
        <p class="product-desc">${escapeHtml(product.description || "")}</p>
        <div class="product-herbs">
          ${ingredients.map(item => `<span class="herb-tag">${escapeHtml(item)}</span>`).join("")}
        </div>
        <div class="product-specs">
          ${product.cocoa ? `<span>${escapeHtml(product.cocoa)}</span>` : ""}
          ${product.weight ? `<span>${escapeHtml(product.weight)}</span>` : ""}
        </div>
        <div class="product-footer">
          <span class="product-price">${formatRupee(product.price)}</span>
          <button class="product-btn" onclick="addToCart('${productId}')">Add to Cart</button>
        </div>
        <button class="product-link" onclick="viewDetail('${productId}')">View details</button>
      </div>
    </article>
  `;
}

function viewDetail(productId) {
  const product = findProduct(productId);
  if (!product) return;

  const container = document.getElementById("products");
  const image = escapeAttribute(product.image || PRODUCT_IMAGE);
  const ingredients = Array.isArray(product.ingredients) ? product.ingredients : [];
  const benefits = Array.isArray(product.benefits) ? product.benefits : [];
  const ingredientsText = ingredients.length ? ingredients.join(", ") : "Botanical wellness blend";

  goToPage("products");
  container.innerHTML = `
    <article class="product-detail">
      <button class="back-btn" onclick="displayProducts(allProducts)">Back to products</button>
      <div class="product-detail-grid">
        <div class="product-detail-image">
          <img src="${image}" alt="${escapeAttribute(product.name)}">
        </div>
        <div class="product-detail-copy">
          <span class="product-tag">${escapeHtml(product.category || "Health Support")}</span>
          <h2>${escapeHtml(product.name)}</h2>
          <p class="detail-price">${formatRupee(product.price)}</p>
          <p class="detail-note">${escapeHtml(product.wellnessNote || "")}</p>
          <p>${escapeHtml(product.description || "")}</p>
          <h3 class="detail-heading">Full Specification</h3>
          <div class="spec-grid">
            <div>
              <span>Category</span>
              <strong>${escapeHtml(product.category || "Herbal Wellness Product")}</strong>
            </div>
            <div>
              <span>Price</span>
              <strong>${formatRupee(product.price)}</strong>
            </div>
            <div>
              <span>Net Weight</span>
              <strong>${escapeHtml(product.weight || "40 g")}</strong>
            </div>
            <div>
              <span>Cocoa Profile</span>
              <strong>${escapeHtml(product.cocoa || "Premium dark cocoa")}</strong>
            </div>
            <div>
              <span>Key Ingredients</span>
              <strong>${escapeHtml(ingredientsText)}</strong>
            </div>
            <div>
              <span>Stock Status</span>
              <strong>${product.stock ? `${Number(product.stock)} units available` : "Available"}</strong>
            </div>
            <div>
              <span>Suggested Use</span>
              <strong>Enjoy as a premium daily wellness chocolate.</strong>
            </div>
            <div>
              <span>Compliance</span>
              <strong>Traditional-use wellness product. No medical claims made.</strong>
            </div>
          </div>
          <div class="product-specs detail-specs">
            ${product.cocoa ? `<span>${escapeHtml(product.cocoa)}</span>` : ""}
            ${product.weight ? `<span>${escapeHtml(product.weight)}</span>` : ""}
          </div>
          <div class="product-herbs">
            ${ingredients.map(item => `<span class="herb-tag">${escapeHtml(item)}</span>`).join("")}
          </div>
          <ul class="benefit-list">
            ${benefits.map(item => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
          <button class="btn-primary" onclick="addToCart('${escapeAttribute(productId)}')">
            Add to Cart
          </button>
        </div>
      </div>
    </article>
  `;
}

function handleProductCardKey(event, productId) {
  if (event.target.closest("button")) return;
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  viewDetail(productId);
}

function findProduct(productId) {
  const products = [...allProducts, ...FALLBACK_PRODUCTS];
  return products.find(product => {
    const ids = [product._id, product.id, product.slug].filter(Boolean).map(String);
    return ids.includes(String(productId));
  });
}

async function addToCart(productId) {
  const product = findProduct(productId);
  if (!product) return;

  const cartId = String(product._id || product.id || product.slug || productId);
  const existingItem = cart.find(item => item.id === cartId);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      id: cartId,
      name: product.name,
      price: product.price,
      image: product.image || PRODUCT_IMAGE,
      quantity: 1
    });
  }

  saveCart();
  updateCartBadge();
  showToast(`${product.name} added to cart.`);

  if (auth?.token) {
    try {
      await apiFetch("/cart/items", {
        method: "POST",
        body: { productId: cartId, quantity: 1 }
      });
    } catch (error) {
      console.warn("Cart sync failed:", error.message);
    }
  }
}

async function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCart();
  updateCartDisplay();
  updateCartBadge();

  if (auth?.token) {
    try {
      await apiFetch(`/cart/items/${encodeURIComponent(productId)}`, { method: "DELETE" });
    } catch (error) {
      console.warn("Cart sync failed:", error.message);
    }
  }
}

async function changeQuantity(productId, direction) {
  const item = cart.find(cartItem => cartItem.id === productId);
  if (!item) return;

  item.quantity += direction;
  if (item.quantity <= 0) {
    removeFromCart(productId);
    return;
  }

  saveCart();
  updateCartDisplay();
  updateCartBadge();

  if (auth?.token) {
    try {
      await apiFetch(`/cart/items/${encodeURIComponent(productId)}`, {
        method: "PUT",
        body: { quantity: item.quantity }
      });
    } catch (error) {
      console.warn("Cart sync failed:", error.message);
    }
  }
}

function updateCartDisplay() {
  const cartItems = document.getElementById("cartItems");
  const cartSummary = document.getElementById("cartSummary");
  const emptyCart = document.getElementById("emptyCart");
  const totalPrice = document.getElementById("totalPrice");
  const orderSummary = document.getElementById("orderSummary");

  if (!cartItems || !cartSummary || !emptyCart || !totalPrice || !orderSummary) return;

  cartItems.innerHTML = "";
  orderSummary.innerHTML = "";

  if (cart.length === 0) {
    cartSummary.style.display = "none";
    emptyCart.style.display = "block";
    return;
  }

  emptyCart.style.display = "none";
  cartSummary.style.display = "block";

  let total = 0;

  cart.forEach(item => {
    const lineTotal = item.price * item.quantity;
    total += lineTotal;

    const itemDiv = document.createElement("div");
    itemDiv.className = "cart-item";
    itemDiv.innerHTML = `
      <img src="${escapeAttribute(item.image || PRODUCT_IMAGE)}" alt="${escapeAttribute(item.name)}">
      <div class="cart-item-copy">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${formatRupee(item.price)} x ${item.quantity} = ${formatRupee(lineTotal)}</span>
      </div>
      <div class="quantity-controls">
        <button onclick="changeQuantity('${escapeAttribute(item.id)}', -1)">-</button>
        <span>${item.quantity}</span>
        <button onclick="changeQuantity('${escapeAttribute(item.id)}', 1)">+</button>
      </div>
      <button class="remove-btn" onclick="removeFromCart('${escapeAttribute(item.id)}')">Remove</button>
    `;
    cartItems.appendChild(itemDiv);

    const summaryLine = document.createElement("div");
    summaryLine.className = "summary-line";
    summaryLine.innerHTML = `
      <span>${escapeHtml(item.name)} x ${item.quantity}</span>
      <strong>${formatRupee(lineTotal)}</strong>
    `;
    orderSummary.appendChild(summaryLine);
  });

  totalPrice.textContent = total;
}

async function checkout() {
  if (cart.length === 0) return;

  if (!auth?.token) {
    alert("Checkout ke liye pehle login karein.");
    goToPage("login");
    return;
  }

  try {
    const order = await apiFetch("/orders", {
      method: "POST",
      body: {
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity
        }))
      }
    });

    if (order.devMode || !order.keyId) {
      await apiFetch(`/orders/${order.orderId}/confirm-payment`, {
        method: "POST",
        body: {
          razorpay_order_id: order.paymentOrderId,
          razorpay_payment_id: `dev-payment-${Date.now()}`,
          razorpay_signature: ""
        }
      });
      completeCheckout(order.orderId);
      return;
    }

    await loadRazorpay();

    const razorpay = new Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: "Indo Heals",
      description: "Digital product purchase",
      order_id: order.paymentOrderId,
      prefill: {
        name: auth.user?.name || "",
        email: auth.user?.email || ""
      },
      handler: async response => {
        await apiFetch(`/orders/${order.orderId}/confirm-payment`, {
          method: "POST",
          body: response
        });
        completeCheckout(order.orderId);
      },
      modal: {
        ondismiss: () => showToast("Payment cancelled.")
      }
    });

    razorpay.open();
  } catch (error) {
    alert(error.message);
  }
}

function completeCheckout(orderId) {
  cart = [];
  saveCart();
  updateCartBadge();
  updateCartDisplay();
  alert(`Order paid successfully. Order ID: ${orderId}`);
  goToPage("products");
}

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Unable to load Razorpay checkout."));
    document.body.appendChild(script);
  });
}

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
}

async function handleLogin(event) {
  event.preventDefault();
  setFormMessage("loginMessage", "");

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: { email, password }
    });

    saveAuth(data);
    setFormMessage("loginMessage", "Login successful.", "success");
    goToPage("products");
  } catch (error) {
    setFormMessage("loginMessage", error.message, "error");
  }
}

async function handleSignup(event) {
  event.preventDefault();
  setFormMessage("signupMessage", "");

  const name = document.getElementById("name").value;
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;

  try {
    const data = await apiFetch("/auth/signup", {
      method: "POST",
      body: { name, email, password }
    });

    saveAuth(data);
    setFormMessage("signupMessage", "Account created.", "success");
    goToPage("products");
  } catch (error) {
    setFormMessage("signupMessage", error.message, "error");
  }
}

function handleAppointment(event) {
  event.preventDefault();
  setFormMessage("appointmentMessage", "");

  const appointment = {
    id: `APT-${Date.now()}`,
    name: document.getElementById("appointment-name").value.trim(),
    phone: document.getElementById("appointment-phone").value.trim(),
    email: document.getElementById("appointment-email").value.trim(),
    interest: document.getElementById("appointment-interest").value,
    date: document.getElementById("appointment-date").value,
    time: document.getElementById("appointment-time").value,
    message: document.getElementById("appointment-message").value.trim(),
    createdAt: new Date().toISOString()
  };

  appointments.push(appointment);
  localStorage.setItem("appointments", JSON.stringify(appointments));
  event.target.reset();
  setFormMessage(
    "appointmentMessage",
    `Appointment booked. Reference: ${appointment.id}`,
    "success"
  );
  showToast("Appointment request booked successfully.");
}

function handleBusinessContact(event) {
  event.preventDefault();
  setFormMessage("businessContactMessage", "");

  const lead = {
    id: `IH-BIZ-${Date.now()}`,
    company: document.getElementById("business-company").value.trim(),
    city: document.getElementById("business-city").value.trim(),
    country: document.getElementById("business-country").value.trim(),
    website: document.getElementById("business-website").value.trim(),
    contactPerson: document.getElementById("business-person").value.trim(),
    mobile: document.getElementById("business-mobile").value.trim(),
    email: document.getElementById("business-email").value.trim(),
    currentProducts: document.getElementById("business-current-products").value.trim(),
    message: document.getElementById("business-message").value.trim(),
    createdAt: new Date().toISOString()
  };

  businessContacts.push(lead);
  localStorage.setItem("businessContacts", JSON.stringify(businessContacts));
  event.target.reset();

  setFormMessage("businessContactMessage", `Thank you. Reference: ${lead.id}`, "success");
  showToast("Contact details submitted successfully.");
}

function setAppointmentMinDate() {
  const dateInput = document.getElementById("appointment-date");
  if (!dateInput) return;

  dateInput.min = new Date().toISOString().split("T")[0];
}

function initScrollAnimations() {
  const aboutSection = document.querySelector(".about-section");
  if (!aboutSection) return;

  if (!("IntersectionObserver" in window)) {
    aboutSection.classList.add("in-view");
    return;
  }

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
        }
      });
    },
    { threshold: 0.24 }
  );

  observer.observe(aboutSection);
}

function refreshAboutAnimation() {
  const aboutSection = document.querySelector(".about-section");
  if (!aboutSection) return;

  aboutSection.classList.remove("in-view");
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      aboutSection.classList.add("in-view");
    });
  });
}

function saveAuth(data) {
  auth = data;
  localStorage.setItem("auth", JSON.stringify(data));
  localStorage.removeItem("user");
  updateAuthUI();
  syncCartAfterLogin();
}

async function syncCartAfterLogin() {
  if (!auth?.token) return;

  try {
    if (cart.length) {
      await Promise.all(
        cart.map(item =>
          apiFetch("/cart/items", {
            method: "POST",
            body: { productId: item.id, quantity: item.quantity }
          })
        )
      );
    }

    const serverCart = await apiFetch("/cart");
    if (Array.isArray(serverCart.items)) {
      cart = serverCart.items.map(item => ({
        id: String(item.productId || item.product || item.id),
        name: item.name,
        price: item.price,
        image: item.image || PRODUCT_IMAGE,
        quantity: item.quantity
      }));
      saveCart();
      updateCartBadge();
      if (currentPage === "cart") updateCartDisplay();
    }
  } catch (error) {
    console.warn("Cart sync failed:", error.message);
  }
}

function handleAuthNav() {
  if (auth?.token) {
    logout();
    return;
  }

  goToPage("login");
}

function logout() {
  auth = null;
  localStorage.removeItem("auth");
  updateAuthUI();
  goToPage("home");
}

function updateAuthUI() {
  const authLink = document.getElementById("authLink");
  const navUser = document.getElementById("navUser");

  if (authLink) {
    authLink.textContent = auth?.token ? "Logout" : "Login";
  }

  if (navUser) {
    navUser.textContent = auth?.user?.name ? auth.user.name.split(" ")[0] : "";
  }

  updateCartBadge();
}

function updateCartBadge() {
  const cartLink = document.getElementById("cartLink");
  if (!cartLink) return;

  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartLink.textContent = count ? `Cart (${count})` : "Cart";
}

function bindSearch() {
  const searchBox = document.getElementById("searchBox");
  if (!searchBox) return;

  searchBox.addEventListener("input", event => {
    const query = event.target.value.toLowerCase();
    const filtered = allProducts.filter(product => {
      const searchText = [
        product.name,
        product.description,
        product.category,
        ...(product.ingredients || [])
      ]
        .join(" ")
        .toLowerCase();

      return searchText.includes(query);
    });

    displayProducts(filtered);
  });
}

function setFormMessage(elementId, message, type = "") {
  const element = document.getElementById(elementId);
  if (!element) return;

  element.textContent = message;
  element.className = `form-message ${type}`.trim();
}

function formatRupee(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
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
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2400);
}
