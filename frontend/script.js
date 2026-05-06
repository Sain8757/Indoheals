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
      ? ["http://localhost:5001/api"]
      : [PRODUCTION_API_BASE];
const PRODUCT_IMAGE = "/assets/breathe-classic-ai.png";
const FALLBACK_PRODUCTS = [
  {
    name: "Breathe Classic",
    slug: "breathe-classic",
    price: 299,
    description:
      "Premium functional dark chocolate crafted with ashwagandha and tulsi for an everyday herbal wellness ritual.",
    wellnessNote: "Traditionally associated with stress support and calming wellness.",
    image: "/assets/breathe-classic-ai.png",
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
    image: "/assets/breathe-energy-ai.png",
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
let appointments = [];
let businessContacts = JSON.parse(localStorage.getItem("businessContacts")) || [];
let lastOrder = JSON.parse(localStorage.getItem("lastOrder")) || null;
let ordersLoaded = false;
let productSoldCounts = {};
let pendingSignup = null;
let currentPage = "home";
let toastTimer;
let heroSlideIndex = 0;
let heroSlideTimer;
let globalLocation = JSON.parse(localStorage.getItem("globalLocation")) || null;

document.addEventListener("DOMContentLoaded", () => {
  bindSearch();
  initHeroCarousel();

  initScrollAnimations();
  updateAuthUI();
  initGlobalLocation();
  bindHeaderSearch();

  // Initialize router
  initRouter();
  initImageZoom();
});

function initRouter() {
  const path = window.location.pathname.replace(/^\/|\/$/g, "") || "home";
  const validPages = [
    "home", "products", "shop", "news", "contact", "cart", "account", "about", "product-detail",
    "products/foods", "products/allopathy", "products/unani", "products/ayurveda"
  ];
  const page = validPages.includes(path) ? path : "home";

  goToPage(page, false);

  window.addEventListener("popstate", (event) => {
    if (event.state && event.state.page) {
      goToPage(event.state.page, false);
    }
  });
}

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

function goToPage(page, pushState = true) {
  currentPage = page;

  document.querySelectorAll(".page").forEach(pageElement => {
    pageElement.style.display = "none";
  });

  // Convert products/foods to products-foods for element IDs
  const pageId = page.replace(/\//g, '-');
  const selectedPage = document.getElementById(`${pageId}-page`);

  if (selectedPage) {
    selectedPage.style.display = "block";
  }

  if (pushState) {
    const url = page === "home" ? "/" : `/${page}`;
    history.pushState({ page }, "", url);
  }

  if (page === "shop") {
    loadProducts("", "shop-products");
  }

  if (page === "products/foods") {
    loadProducts("foods", "foods-products");
  }

  if (page === "products") {
    // Main category page
  }

  if (page === "cart") {
    updateCartDisplay();
  }

  if (page === "checkout") {
    renderCheckout();
  }

  if (page === "order-summary") {
    renderOrderSummary();
  }

  if (page === "order-confirmation") {
    renderOrderConfirmation();
  }

  if (page === "account") {
    renderAccount();
    loadAccountOrders();
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

async function loadProducts(category = "", containerId = "products", force = false) {
  const container = document.getElementById(containerId);

  try {
    if (container && !allProducts.length) {
      container.innerHTML = "<p id='noProducts'>Loading products...</p>";
    }

    if (!allProducts.length || force) {
      const products = await apiFetch("/products");
      allProducts = Array.isArray(products) && products.length ? products : FALLBACK_PRODUCTS;
    }
    
    renderSignatureProducts();

    let filtered = allProducts;
    if (category) {
      const targetCat = String(category).toLowerCase();
      filtered = allProducts.filter(p =>
        (p.category && String(p.category).toLowerCase() === targetCat) ||
        (p.type && String(p.type).toLowerCase() === targetCat)
      );
    }

    displayProducts(filtered, containerId);
  } catch (error) {
    console.error("Error fetching products:", error);
    if (!allProducts.length) {
      allProducts = FALLBACK_PRODUCTS;
    }
    renderSignatureProducts();
    let filtered = allProducts;
    if (category) {
      const targetCat = String(category).toLowerCase();
      filtered = allProducts.filter(p => (p.category || "").toLowerCase() === targetCat);
    }
    displayProducts(filtered, containerId);
  }
}

function renderSignatureProducts() {
  const container = document.getElementById("signature-products");
  if (!container) return;

  const products = (allProducts.length ? allProducts : FALLBACK_PRODUCTS).slice(0, 4);
  container.innerHTML = products.map((product, index) => {
    const productId = escapeAttribute(product._id || product.id || product.slug);
    const image = escapeAttribute(product.image || PRODUCT_IMAGE);
    const badge = escapeHtml(product.badge || product.category || "Signature Blend");
    const note = escapeHtml(product.wellnessNote || product.description || "");
    const description = escapeHtml(product.description || product.weight || "");
    const mrp = productMrp(product);
    const discount = productDiscountPercent(product);

    return `
      <article class="range-card reveal" role="button" tabindex="0"
        onclick="viewDetail('${productId}')" onkeydown="handleProductCardKey(event, '${productId}')"
        aria-label="View ${escapeAttribute(product.name)} specifications">
        <img src="${image}" alt="${escapeAttribute(product.name)} product packaging">
        <div class="range-card-body">
          <span class="compact-badge">${badge}</span>
          <h3 class="compact-name">${escapeHtml(product.name)}</h3>
          <div class="product-specs">
            ${product.cocoa ? `<span>${escapeHtml(product.cocoa)}</span>` : ""}
            ${product.weight ? `<span>${escapeHtml(product.weight)}</span>` : ""}
          </div>
          <div class="range-card-footer">
            <div class="card-offer-price">
              ${discount ? `<small>MRP <s>${formatRupee(mrp)}</s></small>` : ""}
              <strong>${formatRupee(product.price)}</strong>
              ${discount ? `<b>${discount}% OFF</b>` : ""}
            </div>
            <div class="range-card-actions">
              <button onclick="event.stopPropagation(); addToCart('${productId}')" class="product-btn">Add</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function displayProducts(products, containerId = "products") {
  const container = document.getElementById(containerId);
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
  const mrp = productMrp(product);
  const discount = productDiscountPercent(product);
  const sold = productSoldCount(product);

  const deliveryBadge = getGlobalDeliveryBadge();

  return `
    <article class="product-card compact-card">
      <div class="product-img">
        <img src="${image}" alt="${escapeAttribute(product.name)}">
        <span class="product-badge">${escapeHtml(product.badge || "Wellness")}</span>
      </div>
      <div class="product-body">
        <h3 class="product-name">${escapeHtml(product.name)}</h3>
        <div class="product-specs">
          ${product.cocoa ? `<span>${escapeHtml(product.cocoa)}</span>` : ""}
          ${product.weight ? `<span>${escapeHtml(product.weight)}</span>` : ""}
        </div>
        ${deliveryBadge}
        <div class="product-footer">
          <span class="product-price card-offer-price">
            ${discount ? `<small>MRP <s>${formatRupee(mrp)}</s></small>` : ""}
            <strong>${formatRupee(product.price)}</strong>
            ${discount ? `<b>${discount}% OFF</b>` : ""}
          </span>
          <button class="product-btn" onclick="addToCart('${productId}')">Add</button>
        </div>
        <button class="product-link compact-link" onclick="viewDetail('${productId}')">View details</button>
      </div>
    </article>
  `;
}

function productMediaImages(product) {
  const images = [product.image, ...(Array.isArray(product.galleryImages) ? product.galleryImages : [])]
    .filter(Boolean)
    .map(String);
  return [...new Set(images)].length ? [...new Set(images)] : [PRODUCT_IMAGE];
}

function videoEmbedUrl(url = "") {
  const value = String(url || "").trim();
  if (!value) return "";

  const youtubeMatch = value.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]+)/);
  if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}`;

  return value;
}

function productMediaMarkup(type, src, alt = "Product media") {
  if (type === "video") {
    const embed = videoEmbedUrl(src);
    if (!embed) return "";

    if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(embed)) {
      return `<video src="${escapeAttribute(embed)}" controls playsinline></video>`;
    }

    return `<iframe src="${escapeAttribute(embed)}" title="${escapeAttribute(alt)} video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
  }

  return `<img src="${escapeAttribute(src || PRODUCT_IMAGE)}" alt="${escapeAttribute(alt)}">`;
}

function setProductDetailMedia(type, src, alt = "Product media", button) {
  const stage = document.getElementById("productMediaStage");
  if (!stage) return;

  stage.innerHTML = productMediaMarkup(type, src, alt);
  document.querySelectorAll(".product-media-thumb").forEach(item => item.classList.remove("active"));
  if (button) button.classList.add("active");
}

function publicCategoryLabel(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  const labels = {
    foods: "Foods",
    allopathy: "Allopathy",
    unani: "Unani",
    ayurveda: "Aayurweda"
  };
  return labels[normalized] || value || "Herbal Wellness";
}

function productMrp(product) {
  return Number(product.mrp || product.price || 0);
}

function productDiscountPercent(product) {
  const mrp = productMrp(product);
  const price = Number(product.price || 0);
  if (!mrp || !price || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

function productSoldCount(product) {
  if (Number(product.soldCount || 0) > 0) return Number(product.soldCount);
  const ids = [product._id, product.id, product.slug, product.name].filter(Boolean).map(String);
  return ids.reduce((max, id) => Math.max(max, Number(productSoldCounts[id] || 0)), 0);
}

async function loadProductSoldCounts() {
  try {
    const orders = await apiFetch("/orders");
    const counts = {};
    (Array.isArray(orders) ? orders : []).forEach(order => {
      (order.items || []).forEach(item => {
        const quantity = Number(item.quantity || 0);
        [item.productId, item.productSlug, item.name].filter(Boolean).forEach(id => {
          counts[String(id)] = (counts[String(id)] || 0) + quantity;
        });
      });
    });
    productSoldCounts = counts;
  } catch (_) {
    productSoldCounts = {};
  }
}

function viewDetail(productId) {
  const product = findProduct(productId);
  if (!product) return;

  const container = document.getElementById("product-detail-container");
  if (!container) return;

  const mediaImages = productMediaImages(product);
  const mainImage = mediaImages[0];
  const videoUrl = String(product.videoUrl || "").trim();
  const ingredients = Array.isArray(product.ingredients) ? product.ingredients : [];
  const benefits = Array.isArray(product.benefits) ? product.benefits : [];
  const mrp = productMrp(product);
  const discount = productDiscountPercent(product);
  const sold = productSoldCount(product);
  const similarProducts = allProducts
    .filter(item => item && item.isActive !== false && String(item._id || item.id || item.slug) !== String(productId))
    .slice(0, 4);

  // Remember where we came from to go back
  const previousPage = window.location.pathname.replace(/^\/|\/$/g, "") || "shop";

  goToPage("product-detail");

  container.innerHTML = `
    <article class="product-detail hm-product-detail">
      <button class="back-navigation-btn" onclick="goToPage('${previousPage}')">
        <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        Back to Results
      </button>
      <div class="hm-detail-top">
        <div class="product-detail-media-shell">
          <div class="product-media-thumbs" aria-label="Product media">
            ${mediaImages.map((media, index) => `
              <button type="button" class="product-media-thumb ${index === 0 ? "active" : ""}"
                onclick='setProductDetailMedia("image", ${JSON.stringify(media)}, ${JSON.stringify(product.name)}, this)'>
                <img src="${escapeAttribute(media)}" alt="${escapeAttribute(product.name)} image ${index + 1}">
              </button>
            `).join("")}
            ${videoUrl ? `
              <button type="button" class="product-media-thumb video-thumb"
                onclick='setProductDetailMedia("video", ${JSON.stringify(videoUrl)}, ${JSON.stringify(product.name)}, this)'>
                <span>▶</span>
                <small>Video</small>
              </button>
            ` : ""}
          </div>
          <div class="product-detail-image" id="productMediaStage">
            ${productMediaMarkup("image", mainImage, product.name)}
          </div>
        </div>
        <div class="product-detail-copy">
          <span class="product-tag">${escapeHtml(publicCategoryLabel(product.category))}</span>
          <h2>${escapeHtml(product.name)}</h2>
          <p class="hm-short-line">${escapeHtml(product.wellnessNote || "Traditional wellness product for daily use.")}</p>
          <div class="hm-rating-row">
            <span class="hm-rating">4.2 ★</span>
            <span>37 Ratings</span>
            <span>2 Reviews</span>
            <span>Q & A</span>
          </div>
          <div class="hm-price-block">
            <span>MRP ${mrp > Number(product.price || 0) ? `<s>${formatRupee(mrp)}</s>` : formatRupee(mrp)}</span>
            <div class="hm-price-line">
              <strong>${formatRupee(product.price)}</strong>
              ${discount ? `<b>${discount}% OFF</b>` : ""}
              ${sold ? `<em>${sold} Sold Recently</em>` : ""}
            </div>
            <em>Inclusive of all taxes</em>
          </div>
          <div class="hm-size-row">
            <strong>Select from available Sizes</strong>
            <button type="button" class="hm-size-card active">
              <span>${escapeHtml(product.weight || "40 g")}</span>
              <strong>${formatRupee(product.price)}</strong>
              ${product.cocoa ? `<small>${escapeHtml(product.cocoa)}</small>` : ""}
            </button>
          </div>
        </div>
        <aside class="hm-buy-card">
          <div class="hm-brand-box">
            <img src="assets/indo-heals-logo.png" alt="Indo Heals">
            <div>
              <strong>Indo Heals products</strong>
              <button type="button" class="hm-view-all" onclick="goToPage('shop')">View All ›</button>
            </div>
          </div>
          <div class="hm-card-price">
            <span>MRP ${mrp > Number(product.price || 0) ? `<s>${formatRupee(mrp)}</s>` : formatRupee(mrp)}</span>
            <div>
              <strong>${formatRupee(product.price)}</strong>
              ${discount ? `<b>${discount}% OFF</b>` : ""}
            </div>
            ${sold ? `<em>↗ ${sold} Sold Recently</em>` : ""}
            <small>Inclusive of all taxes</small>
          </div>
          <div class="hm-buy-actions">
            <button class="btn-primary" onclick="addToCart('${escapeAttribute(productId)}')">Buy Now</button>
            <button class="btn-outline" onclick="addToCart('${escapeAttribute(productId)}')">Add to Cart</button>
          </div>

          <div class="hm-pincode-checker">
            <span class="hm-pincode-label">Check Delivery Estimation</span>
            <div class="hm-pincode-input-wrap">
              <input type="text" id="deliveryPincode" class="hm-pincode-input" placeholder="Enter Pincode" maxlength="6" value="${localStorage.getItem('lastPincode') || ''}">
              <button class="hm-pincode-btn" onclick="checkDelivery()">CHECK</button>
            </div>
            <div id="pincodeMsg" class="hm-pincode-msg"></div>
          </div>

          <ul class="hm-delivery-list">
            <li>Cash on Delivery also available</li>
            <li>Guaranteed returns available within 7 days</li>
          </ul>
        </aside>
      </div>
      <section class="hm-section">
        <h3>Product Specifications</h3>
        <div class="hm-spec-table">
          <div><span>Category</span><strong>${escapeHtml(publicCategoryLabel(product.category))}</strong></div>
          <div><span>MRP</span><strong>${formatRupee(mrp)}</strong></div>
          <div><span>Selling Price</span><strong>${formatRupee(product.price)}</strong></div>
          <div><span>Discount</span><strong>${discount ? `${discount}% OFF` : "No offer"}</strong></div>
          <div><span>Sold</span><strong>${sold || 0}</strong></div>
          <div><span>Net Weight</span><strong>${escapeHtml(product.weight || "40 g")}</strong></div>
          <div><span>Stock</span><strong>${escapeHtml(product.stock ?? "Available")}</strong></div>
          <div><span>Brand Origin</span><strong>India</strong></div>
          <div><span>Other Properties</span><strong>${escapeHtml(product.cocoa || "Botanical wellness blend")}</strong></div>
        </div>
      </section>
      <section class="hm-section hm-product-content">
        <h3>Product Details</h3>
        <p><strong>Also known as:</strong></p>
        <p>${ingredients.length ? ingredients.map(escapeHtml).join(", ") : "Herbal wellness blend"}</p>
        <p><strong>${escapeHtml(product.name)}</strong></p>
        <p>${escapeHtml(product.description || "")}</p>
        ${benefits.length ? `
          <p><strong>Key wellness highlights</strong></p>
          <ul>${benefits.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        ` : ""}
        <p><strong>Terms and Conditions</strong></p>
        <p>Product descriptions are for traditional-use wellness information only. Results may vary. Please consult a qualified professional for health concerns.</p>
      </section>
      ${similarProducts.length ? `
        <section class="hm-section">
          <h3>Similar Products</h3>
          <div class="hm-similar-grid">
            ${similarProducts.map(item => {
    const relatedId = escapeAttribute(item._id || item.id || item.slug);
    return `
                <article class="hm-similar-card" onclick="viewDetail('${relatedId}')">
                  <img src="${escapeAttribute(item.image || PRODUCT_IMAGE)}" alt="${escapeAttribute(item.name)}">
                  <strong>${escapeHtml(item.name)}</strong>
                  <span>${escapeHtml(item.weight || publicCategoryLabel(item.category))}</span>
                  <b>${formatRupee(item.price)}</b>
                  <button onclick="event.stopPropagation(); addToCart('${relatedId}')">+</button>
                </article>
              `;
  }).join("")}
          </div>
        </section>
      ` : ""}
      <section class="hm-section hm-qna">
        <h3>Questions & Answers</h3>
        <div class="hm-qna-row"><strong>Q</strong><p>How can I use this product?</p></div>
        <div class="hm-qna-row"><strong>A</strong><p>Please follow the pack instructions or contact Indo Heals support for guidance.</p></div>
      </section>
      <section class="hm-section hm-reviews" id="productReviewsSection">
        <h3>Ratings & Reviews</h3>
        <div style="text-align:center;padding:20px;color:var(--muted);">Loading reviews...</div>
      </section>
    </article>
  `;

  loadProductReviews(productId, product.name, product.image || PRODUCT_IMAGE);
}

async function loadProductReviews(productId, prodName, prodImg) {
  try {
    const res = await fetch(`/api/products/${productId}/reviews`);
    const reviews = await res.json();
    renderProductReviews(reviews);
  } catch (err) {
    console.error("Error loading reviews", err);
  }
}

function renderProductReviews(reviews) {
  const section = document.getElementById('productReviewsSection');
  if (!section) return;

  const avgRating = reviews.length ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : '0.0';

  section.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
      <h3>Ratings & Reviews</h3>
      <span style="font-size:12px; color:var(--muted);">Authentic reviews from verified buyers.</span>
    </div>

    <div class="hm-review-summary">
      <strong>${avgRating} ★</strong>
      <span>${reviews.length} Ratings and ${reviews.length} Reviews</span>
    </div>
    <div class="reviews-list">
      ${reviews.map(rev => `
        <div class="review-item-card" style="padding:15px 0; border-bottom:1px solid var(--line);">
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <div style="background:var(--gold); color:white; padding:2px 8px; border-radius:4px; font-size:12px; font-weight:bold;">${rev.rating} ★</div>
            <div style="color:var(--muted); font-size:12px;">${rev.customerName} | ${new Date(rev.createdAt).toLocaleDateString()}</div>
          </div>
          <p style="color:white; font-size:13px; margin-bottom:10px;">${rev.comment}</p>
          <div style="display:flex; gap:8px;">
            ${(rev.images || []).map(img => `<img src="${img}" style="width:60px; height:60px; object-fit:cover; border-radius:4px; border:1px solid var(--line);">`).join('')}
            ${rev.video ? `<video src="${rev.video}" style="width:60px; height:60px; object-fit:cover; border-radius:4px; border:1px solid var(--line);"></video>` : ''}
          </div>
        </div>
      `).join('')}
      ${!reviews.length ? '<p style="color:var(--muted); text-align:center; padding:20px;">No reviews yet. Be the first to order and share your experience!</p>' : ''}
    </div>
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
    showToast("Checkout ke liye pehle login karein.");
    goToPage("login");
    return;
  }

  goToPage("checkout");
}

function renderCheckout() {
  if (!auth?.token) {
    goToPage("login");
    return;
  }

  if (!cart.length) {
    goToPage("cart");
    return;
  }

  const briefSummary = document.getElementById("checkoutBriefSummary");
  const briefTotal = document.getElementById("checkoutBriefTotal");
  
  const nameInput = document.getElementById("checkout-name");
  const phoneInput = document.getElementById("checkout-phone");
  const emailInput = document.getElementById("checkout-email");
  if (nameInput && !nameInput.value) nameInput.value = auth.user?.name || "";
  if (phoneInput && !phoneInput.value) phoneInput.value = auth.user?.phone || "";
  if (emailInput) emailInput.value = auth.user?.email || "";

  // Set default address if available
  if (auth.user?.addresses && auth.user.addresses.length > 0) {
    const addr = auth.user.addresses[0];
    const a1 = document.getElementById("checkout-address1");
    const city = document.getElementById("checkout-city");
    const state = document.getElementById("checkout-state");
    const pin = document.getElementById("checkout-postal");
    if (a1 && !a1.value) a1.value = addr.addressLine1 || "";
    if (city && !city.value) city.value = addr.city || "";
    if (state && !state.value) state.value = addr.state || "";
    if (pin && !pin.value) pin.value = addr.postalCode || "";
  }

  let total = 0;
  if (briefSummary) {
    briefSummary.innerHTML = cart
      .map(item => {
        const lineTotal = item.price * item.quantity;
        total += lineTotal;
        return `
          <div class="summary-line">
            <span>${escapeHtml(item.name)} x ${item.quantity}</span>
            <strong>${formatRupee(lineTotal)}</strong>
          </div>
        `;
      })
      .join("");
  }
  if (briefTotal) briefTotal.textContent = total.toLocaleString("en-IN");
}

function goToOrderSummary(event) {
  if (event) event.preventDefault();
  // Basic validation check
  const addr = checkoutShippingAddress();
  if (!addr.fullName || !addr.addressLine1 || !addr.city || !addr.postalCode) {
    showToast("Please fill all required address fields.");
    return;
  }
  
  renderOrderSummary();
  goToPage("order-summary");
}

let appliedCoupon = null;

function renderOrderSummary() {
  const addr = checkoutShippingAddress();
  const addrContainer = document.getElementById("summaryDeliveryAddress");
  if (addrContainer) {
    addrContainer.innerHTML = `
      <p><strong>${escapeHtml(addr.fullName)}</strong></p>
      <p>${escapeHtml(addr.addressLine1)}${addr.addressLine2 ? ', ' + escapeHtml(addr.addressLine2) : ''}</p>
      <p>${escapeHtml(addr.city)}, ${escapeHtml(addr.state)} - ${escapeHtml(addr.postalCode)}</p>
      <p>Phone: ${escapeHtml(addr.phone)}</p>
    `;
  }

  const itemsContainer = document.getElementById("summaryItemsList");
  let subtotal = 0;
  if (itemsContainer) {
    itemsContainer.innerHTML = cart.map(item => {
      subtotal += item.price * item.quantity;
      return `
        <div class="summary-item-row">
          <img src="${item.image || PRODUCT_IMAGE}" class="summary-item-img">
          <div class="summary-item-info">
            <h4>${escapeHtml(item.name)}</h4>
            <span>Qty: ${item.quantity}</span>
          </div>
          <div class="summary-item-price">${formatRupee(item.price * item.quantity)}</div>
        </div>
      `;
    }).join("");
  }

  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percentage') {
      discountAmount = (subtotal * appliedCoupon.value) / 100;
    } else {
      discountAmount = appliedCoupon.value;
    }
  }

  const finalTotal = Math.max(0, subtotal - discountAmount);

  const pricingContainer = document.getElementById("summaryFinalPricing");
  if (pricingContainer) {
    pricingContainer.innerHTML = `
      <div class="pricing-row"><span>Bag Subtotal</span> <span>${formatRupee(subtotal)}</span></div>
      ${appliedCoupon ? `<div class="pricing-row discount"><span>Coupon Discount (${appliedCoupon.code})</span> <span>-${formatRupee(discountAmount)}</span></div>` : ''}
      <div class="pricing-row discount"><span>Delivery Fee</span> <span>FREE</span></div>
    `;
  }

  const finalTotalEl = document.getElementById("summaryFinalTotal");
  if (finalTotalEl) finalTotalEl.textContent = finalTotal.toLocaleString("en-IN");
}

async function applyCoupon() {
  const input = document.getElementById("couponInput");
  const msg = document.getElementById("couponMessage");
  if (!input || !msg) return;

  const code = input.value.trim().toUpperCase();
  if (!code) {
    msg.textContent = "Please enter a code.";
    msg.className = "coupon-msg error";
    return;
  }

  msg.textContent = "Checking...";
  msg.className = "coupon-msg";

  try {
    const res = await apiFetch(`/orders/validate-coupon/${code}`);
    if (res.valid) {
      // Check min order value
      const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      if (res.minOrderValue && subtotal < res.minOrderValue) {
        msg.textContent = `Min order value for this coupon is ${formatRupee(res.minOrderValue)}.`;
        msg.className = "coupon-msg error";
        return;
      }

      appliedCoupon = { ...res, code };
      msg.textContent = "Coupon applied successfully!";
      msg.className = "coupon-msg success";
      renderOrderSummary();
    }
  } catch (err) {
    appliedCoupon = null;
    msg.textContent = err.message || "Invalid coupon code.";
    msg.className = "coupon-msg error";
    renderOrderSummary();
  }
}

function checkoutShippingAddress() {
  return {
    fullName: document.getElementById("checkout-name").value.trim(),
    phone: document.getElementById("checkout-phone").value.trim(),
    addressLine1: document.getElementById("checkout-address1").value.trim(),
    addressLine2: document.getElementById("checkout-address2").value.trim(),
    city: document.getElementById("checkout-city").value.trim(),
    state: document.getElementById("checkout-state").value.trim(),
    postalCode: document.getElementById("checkout-postal").value.trim(),
    country: document.getElementById("checkout-country").value.trim() || "India"
  };
}

async function placeOrder(event) {
  event.preventDefault();
  const msgEl = document.getElementById("summaryCheckoutMessage");
  if (msgEl) msgEl.textContent = "";

  try {
    const order = await apiFetch("/orders", {
      method: "POST",
      body: {
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity
        })),
        shippingAddress: checkoutShippingAddress(),
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        notes: document.getElementById("checkout-notes").value.trim()
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
      completeCheckout(order.orderId, {
        ...order,
        status: "paid",
        shippingAddress: checkoutShippingAddress()
      });
      return;
    }

    await loadRazorpay();

    const razorpay = new Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: "Indo Heals",
      description: "Indo Heals order",
      order_id: order.paymentOrderId,
      prefill: {
        name: auth.user?.name || "",
        email: auth.user?.email || ""
      },
      handler: async response => {
        const confirmation = await apiFetch(`/orders/${order.orderId}/confirm-payment`, {
          method: "POST",
          body: response
        });
        completeCheckout(order.orderId, confirmation.order || order);
      },
      modal: {
        ondismiss: () => showToast("Payment cancelled.")
      }
    });

    razorpay.open();
  } catch (error) {
    if (msgEl) {
      msgEl.textContent = error.message;
      msgEl.className = "form-message error";
    } else {
      showToast(error.message);
    }
  }
}

async function completeCheckout(orderId, order = {}) {
  lastOrder = {
    ...order,
    orderId,
    _id: order._id || orderId,
    items: order.items || cart,
    total: order.total || cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    createdAt: order.createdAt || new Date().toISOString()
  };
  localStorage.setItem("lastOrder", JSON.stringify(lastOrder));

  // Refresh user profile to sync auto-saved address
  if (auth?.token) {
    try {
      const userData = await apiFetch("/auth/me");
      if (userData) {
        auth.user = userData;
        localStorage.setItem("auth", JSON.stringify(auth));
      }
    } catch (err) {
      console.warn("Failed to refresh profile after checkout:", err);
    }
  }

  cart = [];
  saveCart();
  updateCartBadge();
  updateCartDisplay();
  ordersLoaded = false;
  showToast("Order confirmed.");
  goToPage("order-confirmation");
}

function renderOrderConfirmation() {
  const container = document.getElementById("confirmationDetails");
  if (!container) return;

  if (!lastOrder) {
    container.innerHTML = "<p class='form-message'>No recent order found.</p>";
    return;
  }

  const orderId = lastOrder._id || lastOrder.orderId;
  const items = lastOrder.items || [];
  const address = lastOrder.shippingAddress || {};

  container.innerHTML = `
    <div class="confirmation-meta">
      <div><span>Order ID</span><strong>${escapeHtml(orderId)}</strong></div>
      <div><span>Status</span><strong>${escapeHtml(lastOrder.status || "paid")}</strong></div>
      <div><span>Total</span><strong>${formatRupee(lastOrder.total)}</strong></div>
    </div>
    <div class="confirmation-section">
      <h3>Items</h3>
      ${items
      .map(
        item => `
            <div class="summary-line">
              <span>${escapeHtml(item.name)} x ${Number(item.quantity || 1)}</span>
              <strong>${formatRupee(item.price * item.quantity)}</strong>
            </div>
          `
      )
      .join("")}
    </div>
    <div class="confirmation-section">
      <h3>Delivery</h3>
      <p>${escapeHtml(address.fullName || auth?.user?.name || "")}</p>
      <p>${escapeHtml([address.addressLine1, address.addressLine2].filter(Boolean).join(", "))}</p>
      <p>${escapeHtml([address.city, address.state, address.postalCode].filter(Boolean).join(", "))}</p>
      <p>${escapeHtml(address.country || "India")}</p>
      <p>${escapeHtml(address.phone || "")}</p>
    </div>
  `;
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
  setFormMessage("signupOtpMessage", "");

  pendingSignup = {
    name: document.getElementById("name").value.trim(),
    email: document.getElementById("signup-email").value.trim(),
    phone: document.getElementById("signup-phone").value.trim(),
    password: document.getElementById("signup-password").value
  };

  try {
    const data = await apiFetch("/auth/signup", {
      method: "POST",
      body: pendingSignup
    });

    showSignupOtpStep(data.email || pendingSignup.email, data.message, data.devOtp);
  } catch (error) {
    setFormMessage("signupMessage", error.message, "error");
  }
}

async function handleSignupOtp(event) {
  event.preventDefault();
  setFormMessage("signupOtpMessage", "");

  const email = pendingSignup?.email || document.getElementById("signup-email").value.trim();
  const otp = document.getElementById("signup-otp").value.trim();

  try {
    const data = await apiFetch("/auth/verify-signup-otp", {
      method: "POST",
      body: { email, otp }
    });

    saveAuth(data);
    pendingSignup = null;
    document.getElementById("signupForm")?.reset();
    document.getElementById("signupOtpForm")?.reset();
    editSignupDetails({ keepMessage: true });

    const confirmationText = document.getElementById("signupConfirmationText");
    if (confirmationText) {
      confirmationText.textContent = `${data.user?.name || "Your"} account is ready. A confirmation email has been sent to your mail.`;
    }
    setFormMessage("signupOtpMessage", data.message || "Account created.", "success");
    goToPage("signup-confirmation");
  } catch (error) {
    setFormMessage("signupOtpMessage", error.message, "error");
  }
}

async function resendSignupOtp() {
  setFormMessage("signupOtpMessage", "");
  if (!pendingSignup) {
    setFormMessage("signupOtpMessage", "Please enter your signup details again.", "error");
    editSignupDetails();
    return;
  }

  try {
    const data = await apiFetch("/auth/signup", {
      method: "POST",
      body: pendingSignup
    });
    showSignupOtpStep(data.email || pendingSignup.email, "New OTP sent to your email.", data.devOtp);
  } catch (error) {
    setFormMessage("signupOtpMessage", error.message, "error");
  }
}

function showSignupOtpStep(email, message, devOtp) {
  const signupForm = document.getElementById("signupForm");
  const otpForm = document.getElementById("signupOtpForm");
  const otpEmail = document.getElementById("signupOtpEmail");
  const otpInput = document.getElementById("signup-otp");

  if (signupForm) signupForm.hidden = true;
  if (otpForm) otpForm.hidden = false;
  if (otpEmail) otpEmail.textContent = email;
  if (otpInput) {
    otpInput.value = "";
    otpInput.focus();
  }

  const extra = devOtp ? ` Development OTP: ${devOtp}` : "";
  setFormMessage("signupOtpMessage", `${message || "OTP sent to your email."}${extra}`, "success");
}

function editSignupDetails(options = {}) {
  const signupForm = document.getElementById("signupForm");
  const otpForm = document.getElementById("signupOtpForm");
  if (signupForm) signupForm.hidden = false;
  if (otpForm) otpForm.hidden = true;
  if (!options.keepMessage) {
    setFormMessage("signupMessage", "");
    setFormMessage("signupOtpMessage", "");
  }
}



async function handleBusinessContact(event) {
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

  try {
    const data = await apiFetch("/contact/business", {
      method: "POST",
      body: lead
    });

    event.target.reset();
    setFormMessage("businessContactMessage", `Thank you. Reference: ${data.reference}`, "success");
    showToast("Contact details submitted successfully.");
  } catch (error) {
    businessContacts.push(lead);
    localStorage.setItem("businessContacts", JSON.stringify(businessContacts));
    setFormMessage("businessContactMessage", `Saved locally. Reference: ${lead.id}`, "success");
    showToast("Backend unavailable. Details saved locally.");
  }
}

async function handleNewsletter(event) {
  event.preventDefault();
  const input = document.getElementById("newsletter-email");
  if (!input) return;

  try {
    await apiFetch("/contact/newsletter", {
      method: "POST",
      body: { email: input.value, source: "homepage" }
    });
    input.value = "";
    showToast("Thank you for subscribing.");
  } catch (error) {
    showToast(error.message);
  }
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

function openAccount(event) {
  toggleAccountDropdown(event);
}

function handleAuthNav() {
  openAccount();
}

function logout() {
  auth = null;
  localStorage.removeItem("auth");
  updateAuthUI();
  goToPage("home");
}

function toggleSearch() {
  const box = document.querySelector(".nav-search-box");
  const input = document.getElementById("headerSearchInput");
  const dropdown = document.getElementById("searchDropdown");

  if (box) {
    box.classList.toggle("expanded");
    if (box.classList.contains("expanded")) {
      input.focus();
    } else {
      input.value = "";
      if (dropdown) dropdown.style.display = "none";
    }
  }
}

function bindHeaderSearch() {
  const input = document.getElementById("headerSearchInput");
  if (input) {
    input.addEventListener("input", (e) => performHeaderSearch(e.target.value));

    // Close dropdown on click outside
    document.addEventListener("click", (e) => {
      const container = document.getElementById("navSearchContainer");
      const dropdown = document.getElementById("searchDropdown");
      if (container && !container.contains(e.target)) {
        if (dropdown) dropdown.style.display = "none";
        // Optionally collapse search box too if empty
        const box = document.querySelector(".nav-search-box");
        if (box && input.value === "") box.classList.remove("expanded");
      }
    });
  }
}

function performHeaderSearch(query) {
  const q = query.toLowerCase().trim();
  const dropdown = document.getElementById("searchDropdown");

  if (!dropdown) return;

  if (!q) {
    dropdown.style.display = "none";
    return;
  }

  const filtered = allProducts.filter(p => {
    const text = (p.name + " " + (p.description || "") + " " + (p.category || "")).toLowerCase();
    return text.includes(q);
  });

  dropdown.style.display = "block";
  if (filtered.length > 0) {
    dropdown.innerHTML = filtered.slice(0, 8).map(p => `
      <div class="search-item" onclick="viewDetail('${escapeAttribute(p._id || p.id || p.slug)}'); closeSearchDropdown();">
        <img src="${escapeAttribute(p.image || PRODUCT_IMAGE)}" alt="">
        <div class="search-item-info">
          <div class="search-item-name">${escapeHtml(p.name)}</div>
          <div class="search-item-price">${formatRupee(p.price)}</div>
        </div>
      </div>
    `).join("");
  } else {
    dropdown.innerHTML = '<div class="search-no-match">No products found.</div>';
  }
}

function closeSearchDropdown() {
  const dropdown = document.getElementById("searchDropdown");
  if (dropdown) dropdown.style.display = "none";
  const box = document.querySelector(".nav-search-box");
  const input = document.getElementById("headerSearchInput");
  if (box && input) {
    input.value = "";
    box.classList.remove("expanded");
  }
}

function scrollToOrders() {
  goToPage("account");
  const orders = document.getElementById("accountOrdersList");
  if (orders) {
    orders.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function downloadApp() {
  showToast("Download the app soon. Coming shortly.");
}

function updateAuthUI() {
  const helloText = document.getElementById("navHelloText");
  const accDropUser = document.getElementById("accDropUser");
  const accDropLogin = document.getElementById("accDropLogin");
  const accDropAuthDivider = document.getElementById("accDropAuthDivider");
  const accDropAuthSection = document.getElementById("accDropAuthSection");

  const isLoggedIn = Boolean(auth?.token);

  if (helloText) {
    if (isLoggedIn) {
      const name = auth.user?.name ? auth.user.name.split(" ")[0] : "User";
      helloText.textContent = `Hello, ${name}`;
    } else {
      helloText.textContent = "Hello, sign in";
    }
  }

  // Dropdown UI updates
  if (accDropUser) accDropUser.style.display = isLoggedIn ? "block" : "none";
  if (accDropLogin) accDropLogin.style.display = isLoggedIn ? "none" : "block";
  if (accDropAuthDivider) accDropAuthDivider.style.display = isLoggedIn ? "block" : "none";
  if (accDropAuthSection) accDropAuthSection.style.display = isLoggedIn ? "block" : "none";

  const accDropName = document.getElementById("accDropName");
  if (accDropName && auth?.user?.name) {
    accDropName.textContent = auth.user.name;
  }

  // Update checkout email if present and empty
  const checkoutEmail = document.getElementById("checkout-email");
  if (checkoutEmail && !checkoutEmail.value && auth?.user?.email) {
    checkoutEmail.value = auth.user.email;
  }

  updateCartBadge();
}

function renderAccount() {
  if (!auth?.token) {
    goToPage("login");
    return;
  }

  const initial = auth.user?.name ? auth.user.name.trim().charAt(0).toUpperCase() : "A";

  // Populate Banner & Sidebar
  const els = {
    "accountAvatarSidebar": initial,
    "accountNameSidebar": auth.user?.name || "Member",
    "accountEmailSidebar": auth.user?.email || "",
    "accountAvatarBanner": initial,
    "accountNameBanner": auth.user?.name || "Member",
    "accountEmailBanner": auth.user?.email || ""
  };

  for (const [id, val] of Object.entries(els)) {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
  }

  const profile = document.getElementById("accountProfile");
  if (profile) {
    profile.innerHTML = `
      <div class="profile-line-item"><span>Full Name</span><strong>${escapeHtml(auth.user?.name || "")}</strong></div>
      <div class="profile-line-item"><span>Email ID</span><strong>${escapeHtml(auth.user?.email || "")}</strong></div>
      <div class="profile-line-item"><span>Mobile Number</span><strong>${escapeHtml(auth.user?.phone || "Not added")}</strong></div>
      <div class="profile-line-item"><span>Gender</span><strong>${escapeHtml(auth.user?.gender || "Not added")}</strong></div>
      <div class="profile-line-item"><span>Date of Birth</span><strong>${escapeHtml(auth.user?.dob || "Not added")}</strong></div>
      <div class="profile-line-item"><span>Alternate Mobile</span><strong>${escapeHtml(auth.user?.altMobile || "Not added")}</strong></div>
      <div class="profile-line-item"><span>Hint Name</span><strong>${escapeHtml(auth.user?.altName || "Not added")}</strong></div>
      <div class="profile-line-item"><span>Account Role</span><strong>${escapeHtml(auth.user?.role || "user")}</strong></div>
    `;
  }

  renderAddressList();
  switchAccountTab("overview");
}

function updateCartBadge() {
  const badge = document.getElementById("cartBadge");
  if (!badge) return;

  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  badge.textContent = count;
  badge.style.display = count > 0 ? "flex" : "none";
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

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });
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

/* ─────────────────────────────────────────
   NAV ACCOUNT DROPDOWN
───────────────────────────────────────── */
let dropdownOpen = false;

function toggleAccountDropdown(e) {
  e && e.stopPropagation();
  const dd = document.getElementById("accountDropdown");
  if (!dd) return;
  dropdownOpen = !dropdownOpen;
  dd.classList.toggle("open", dropdownOpen);
  updateDropdownContent();
}

function closeAccountDropdown() {
  const dd = document.getElementById("accountDropdown");
  if (dd) dd.classList.remove("open");
  dropdownOpen = false;
}

function updateDropdownContent() {
  const userBlock = document.getElementById("accDropUser");
  const loginRow = document.getElementById("accDropLogin");
  const authDiv = document.getElementById("accDropAuthDivider");
  const authSection = document.getElementById("accDropAuthSection");
  const nameEl = document.getElementById("accDropName");
  const phoneEl = document.getElementById("accDropPhone");

  if (!userBlock) return;

  if (auth?.token) {
    userBlock.style.display = "block";
    loginRow.style.display = "none";
    if (authDiv) authDiv.style.display = "";
    if (authSection) authSection.style.display = "";
    if (nameEl) nameEl.textContent = auth.user?.name || "User";
    if (phoneEl) phoneEl.textContent = auth.user?.phone || "";
  } else {
    userBlock.style.display = "none";
    loginRow.style.display = "";
    if (authDiv) authDiv.style.display = "none";
    if (authSection) authSection.style.display = "none";
  }
}


// Close when clicking outside
document.addEventListener("click", (e) => {
  if (!dropdownOpen) return;
  const wrapper = document.getElementById("navAccountWrapper");
  if (wrapper && !wrapper.contains(e.target)) closeAccountDropdown();
});

/* ─────────────────────────────────────────
   ACCOUNT PAGE TABS
───────────────────────────────────────── */
function switchAccountTab(tab) {
  // Update sidebar items
  document.querySelectorAll(".oh-sidenav-item").forEach(btn => {
    btn.classList.remove("active");
  });
  const activeBtn = document.getElementById(`tab-${tab}`);
  if (activeBtn) {
    activeBtn.classList.add("active");
  }

  // Show correct panel
  const panels = [
    "overview", "orders", "profile", "address", "coupons",
    "credit", "cash", "cards", "upi", "wallets",
    "insider", "delete", "terms", "privacy", "orderdetail"
  ];
  panels.forEach(name => {
    const panel = document.getElementById(`accountTab${name.charAt(0).toUpperCase() + name.slice(1)}`);
    if (panel) panel.style.display = name === tab ? "block" : "none";
  });

  if (tab === "address") renderAddressList();
  if (tab === "orders" || tab === "cards" || tab === "upi") loadAccountOrders();
}

// Called from dropdown
function openAccountTab(tab) {
  if (!auth?.token) { goToPage("login"); return; }
  goToPage("account");
  setTimeout(() => switchAccountTab(tab), 80);
}

/* ─────────────────────────────────────────
   PROFILE EDIT
───────────────────────────────────────── */
function showProfileEdit() {
  document.getElementById("profileViewCard").style.display = "none";
  document.getElementById("profileEditCard").style.display = "";
  // Pre-fill
  const n = document.getElementById("editProfileName");
  const editPhone = document.getElementById("editProfilePhone");
  const editEmail = document.getElementById("editProfileEmail");

  if (n) n.value = auth?.user?.name || "";
  if (editPhone) editPhone.value = auth?.user?.phone || "";
  if (editEmail) editEmail.value = auth?.user?.email || "";

  // Set extended fields
  const dob = document.getElementById("editProfileDob");
  const altMob = document.getElementById("editProfileAltMobile");
  const altName = document.getElementById("editProfileAltName");
  const altEmail = document.getElementById("editProfileAltEmail");

  if (dob) dob.value = auth?.user?.dob || "";
  if (altMob) altMob.value = auth?.user?.altMobile || "";
  if (altName) altName.value = auth?.user?.altName || "";
  if (altEmail) altEmail.value = auth?.user?.altEmail || "";

  // Set gender
  if (auth?.user?.gender) {
    const radio = document.querySelector(`input[name="profileGender"][value="${auth.user.gender}"]`);
    if (radio) radio.checked = true;
  }
}

function cancelProfileEdit() {
  document.getElementById("profileEditCard").style.display = "none";
  document.getElementById("profileViewCard").style.display = "";
  setFormMessage("profileUpdateMsg", "");
}

async function saveProfileUpdate(event) {
  event.preventDefault();
  setFormMessage("profileUpdateMsg", "");
  const newName = document.getElementById("editProfileName").value.trim();
  const newPhone = document.getElementById("editProfilePhone").value.trim();
  const newEmail = document.getElementById("editProfileEmail").value.trim();
  const dob = document.getElementById("editProfileDob").value;
  const altMobile = document.getElementById("editProfileAltMobile").value.trim();
  const altName = document.getElementById("editProfileAltName").value.trim();
  const altEmail = document.getElementById("editProfileAltEmail").value.trim();
  const genderEl = document.querySelector('input[name="profileGender"]:checked');
  const gender = genderEl ? genderEl.value : "";

  if (!newName) { setFormMessage("profileUpdateMsg", "Name cannot be empty.", "error"); return; }

  try {
    const data = await apiFetch("/auth/me", {
      method: "PUT",
      body: {
        name: newName,
        phone: newPhone,
        email: newEmail,
        dob,
        altMobile,
        altName,
        altEmail,
        gender
      }
    });
    // Update local auth
    if (!auth.user) auth.user = {};
    auth.user.name = data.user?.name || newName;
    auth.user.dob = dob;
    auth.user.altMobile = altMobile;
    auth.user.altName = altName;
    auth.user.altEmail = altEmail;
    auth.user.gender = gender;

    localStorage.setItem("auth", JSON.stringify(auth));
    updateAuthUI();
    renderAccount();
    cancelProfileEdit();
    showToast("Profile updated successfully.");
  } catch (err) {
    // Fallback: update locally if API not available
    if (!auth.user) auth.user = {};
    auth.user.name = newName;
    localStorage.setItem("auth", JSON.stringify(auth));
    updateAuthUI();
    renderAccount();
    cancelProfileEdit();
    showToast("Profile updated.");
  }
}

/* ─────────────────────────────────────────
   ADDRESS MANAGEMENT (Profile & DB)
───────────────────────────────────────── */
function getSavedAddresses() {
  if (auth?.user?.addresses) {
    return auth.user.addresses.map(addr => ({
      name: addr.fullName,
      phone: addr.phone,
      line1: addr.addressLine1,
      line2: addr.addressLine2,
      city: addr.city,
      state: addr.state,
      pin: addr.postalCode,
      country: addr.country || "India"
    }));
  }
  try { return JSON.parse(localStorage.getItem("savedAddresses") || "[]"); }
  catch { return []; }
}

async function saveAddresses(arr) {
  // Update local storage first for UI response
  localStorage.setItem("savedAddresses", JSON.stringify(arr));

  if (auth?.token) {
    try {
      // Map back to DB format
      const dbAddresses = arr.map(addr => ({
        fullName: addr.name,
        phone: addr.phone,
        addressLine1: addr.line1,
        addressLine2: addr.line2 || "",
        city: addr.city,
        state: addr.state,
        postalCode: addr.pin,
        country: addr.country || "India",
        label: addr.label || "Home"
      }));

      await apiFetch("/auth/profile", {
        method: "PUT",
        body: { addresses: dbAddresses }
      });

      // Update local auth object
      auth.user.addresses = dbAddresses;
      localStorage.setItem("auth", JSON.stringify(auth));
    } catch (err) {
      console.error("Failed to save addresses to DB:", err);
    }
  }
}

function renderAddressList() {
  const list = document.getElementById("addressList");
  if (!list) return;
  const addresses = getSavedAddresses();

  if (!addresses.length) {
    list.innerHTML = `<div class="address-empty">No saved addresses yet.<br>Click <strong>+ Add New</strong> to add your first address.</div>`;
    return;
  }

  list.innerHTML = addresses.map((addr, i) => `
    <div class="address-card">
      <div class="address-card-icon">📍</div>
      <div class="address-card-body">
        <div class="address-card-name">${escapeHtml(addr.name)}</div>
        <div class="address-card-line">
          ${escapeHtml(addr.line1)}${addr.line2 ? ", " + escapeHtml(addr.line2) : ""}<br>
          ${escapeHtml(addr.city)}, ${escapeHtml(addr.state)} - ${escapeHtml(addr.pin)}<br>
          ${escapeHtml(addr.country || "India")}
        </div>
        <div class="address-card-phone">📞 ${escapeHtml(addr.phone)}</div>
      </div>
      <div class="address-card-actions">
        <button class="address-edit-btn" onclick="editAddress(${i})">Edit</button>
        <button class="address-del-btn" onclick="deleteAddress(${i})">Delete</button>
      </div>
    </div>
  `).join("");
}

function showAddressForm(editIndex = "") {
  document.getElementById("addressFormWrap").style.display = "";
  document.getElementById("addr-edit-index").value = editIndex;
  setFormMessage("addressFormMsg", "");

  if (editIndex !== "") {
    const addr = getSavedAddresses()[Number(editIndex)];
    if (addr) {
      document.getElementById("addr-name").value = addr.name || "";
      document.getElementById("addr-phone").value = addr.phone || "";
      document.getElementById("addr-line1").value = addr.line1 || "";
      document.getElementById("addr-line2").value = addr.line2 || "";
      document.getElementById("addr-city").value = addr.city || "";
      document.getElementById("addr-state").value = addr.state || "";
      document.getElementById("addr-pin").value = addr.pin || "";
      document.getElementById("addr-country").value = addr.country || "India";
    }
  } else {
    ["addr-name", "addr-phone", "addr-line1", "addr-line2", "addr-city", "addr-state", "addr-pin"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    document.getElementById("addr-country").value = "India";
  }

  document.getElementById("addressFormWrap").scrollIntoView({ behavior: "smooth", block: "start" });
}

function cancelAddressForm() {
  document.getElementById("addressFormWrap").style.display = "none";
  setFormMessage("addressFormMsg", "");
}

function editAddress(index) {
  showAddressForm(index);
}

function deleteAddress(index) {
  if (!confirm("Delete this address?")) return;
  const addresses = getSavedAddresses();
  addresses.splice(index, 1);
  saveAddresses(addresses);
  renderAddressList();
  showToast("Address deleted.");
}

function saveAddress(event) {
  event.preventDefault();
  const idx = document.getElementById("addr-edit-index").value;
  const newAddr = {
    name: document.getElementById("addr-name").value.trim(),
    phone: document.getElementById("addr-phone").value.trim(),
    line1: document.getElementById("addr-line1").value.trim(),
    line2: document.getElementById("addr-line2").value.trim(),
    city: document.getElementById("addr-city").value.trim(),
    state: document.getElementById("addr-state").value.trim(),
    pin: document.getElementById("addr-pin").value.trim(),
    country: document.getElementById("addr-country").value.trim() || "India"
  };

  const addresses = getSavedAddresses();
  if (idx !== "") {
    addresses[Number(idx)] = newAddr;
  } else {
    addresses.push(newAddr);
  }
  saveAddresses(addresses);
  cancelAddressForm();
  renderAddressList();
  showToast(idx !== "" ? "Address updated." : "Address saved.");
}

/* ─────────────────────────────────────────
   Go to account page (used by dropdown items)
───────────────────────────────────────── */
function goToAccountPage() {
  if (auth?.token) {
    goToPage("account");
  } else {
    goToPage("login");
  }
}

/* ─────────────────────────────────────────
   HELP CENTER LOGIC
───────────────────────────────────────── */
function toggleBusinessForm() {
  const mainView = document.getElementById("hc-main-view");
  const businessView = document.getElementById("hc-business-view");

  if (mainView && businessView) {
    if (mainView.style.display !== "none") {
      mainView.style.display = "none";
      businessView.style.display = "block";
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      businessView.style.display = "none";
      mainView.style.display = "block";
    }
  }
}

async function loadAccountOrders() {
  const list = document.getElementById("accountOrdersList");
  const cardList = document.getElementById("accountCardList");
  const upiList = document.getElementById("accountUpiList");
  if (!list) return;

  list.innerHTML = `<p class="loading-text" style="color:var(--muted); text-align:center; padding:40px;">Loading your orders...</p>`;

  try {
    const orders = await apiFetch("/orders/my");
    if (!orders || orders.length === 0) {
      list.innerHTML = `<div style="text-align:center; padding:60px 20px;">
        <p style="color:var(--muted); font-size:16px; margin-bottom:20px;">You haven't placed any orders yet.</p>
        <button class="btn-primary" onclick="goToPage('shop')">Start Shopping</button>
      </div>`;
      if (cardList) cardList.innerHTML = `<p style="padding:20px; color:var(--muted); text-align:center;">No saved cards found.</p>`;
      if (upiList) upiList.innerHTML = `<p style="padding:20px; color:var(--muted); text-align:center;">No saved UPI IDs found.</p>`;
      return;
    }

    // Render Orders
    list.innerHTML = orders.map(order => `
      <div class="order-card-compact" style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:12px; padding:20px; margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:16px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:12px;">
          <div>
            <span style="color:var(--gold-light); font-weight:700; font-size:14px;">Order ID: #${String(order._id || order.id).slice(-8).toUpperCase()}</span>
            <div style="color:var(--muted); font-size:12px; margin-top:4px;">${new Date(order.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          </div>
          <span class="status-badge status-${String(order.fulfillmentStatus || order.status || 'pending').toLowerCase()}" style="padding:4px 12px; border-radius:100px; font-size:11px; font-weight:700; text-transform:uppercase;">${order.fulfillmentStatus || order.status || 'Pending'}</span>
        </div>
        <div class="occ-items">
          ${(order.items || []).map(item => `
            <div style="display:flex; gap:16px; align-items:center; margin-bottom:12px;">
              <img src="${escapeAttribute(item.image || PRODUCT_IMAGE)}" alt="${escapeAttribute(item.name)}" style="width:50px; height:50px; border-radius:8px; object-fit:cover;">
              <div class="occ-item-info">
                <strong style="font-size:14px; color:white;">${escapeHtml(item.name)}</strong>
                <p style="font-size:12px; color:var(--muted);">Qty: ${item.quantity} · ${formatRupee(item.price)}</p>
              </div>
            </div>
          `).join("")}
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.05); padding-top:12px;">
          <div style="color:var(--muted); font-size:14px;">Total: <strong style="color:white; margin-left:8px;">${formatRupee(order.total)}</strong></div>
          <button class="btn-outline-small" onclick="viewOrderDetail('${order._id || order.id}')">View Order</button>
        </div>
      </div>
    `).join("");

    // Extract Payment Methods for Cards and UPI tabs
    const cards = [];
    const upis = [];
    orders.forEach(o => {
      if (o.paymentMethod === "Card" || (o.paymentMethod === "Razorpay" && !o.paymentId?.includes("upi"))) {
        const last4 = o.paymentId ? o.paymentId.slice(-4) : "4242";
        if (!cards.find(c => c.last4 === last4)) cards.push({ last4, brand: "Visa" });
      }
      if (o.paymentMethod === "UPI" || (o.paymentMethod === "Razorpay" && o.paymentId?.includes("upi"))) {
        const upi = o.paymentId ? `${o.paymentId.slice(0, 8)}@okaxis` : "user@upi";
        if (!upis.includes(upi)) upis.push(upi);
      }
    });

    if (cardList) {
      cardList.innerHTML = cards.length ? cards.map(c => `
        <div class="payment-card-item" style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:12px; padding:20px; display:flex; align-items:center; gap:20px; margin-bottom:12px;">
          <div style="font-size:24px;">💳</div>
          <div>
            <strong style="color:white; display:block;">${c.brand} Card</strong>
            <span style="color:var(--muted); font-size:14px;">**** **** **** ${c.last4}</span>
          </div>
        </div>
      `).join("") : `<p style="padding:20px; color:var(--muted); text-align:center;">No saved cards found.</p>`;
    }

    if (upiList) {
      upiList.innerHTML = upis.length ? upis.map(u => `
        <div class="payment-card-item" style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:12px; padding:20px; display:flex; align-items:center; gap:20px; margin-bottom:12px;">
          <div style="font-size:24px;">📱</div>
          <div>
            <strong style="color:white; display:block;">Saved UPI ID</strong>
            <span style="color:var(--muted); font-size:14px;">${u}</span>
          </div>
        </div>
      `).join("") : `<p style="padding:20px; color:var(--muted); text-align:center;">No saved UPI IDs found.</p>`;
    }

  } catch (error) {
    console.error("Failed to load orders:", error);
    list.innerHTML = `<p style="color:#ff5252; text-align:center; padding:40px;">Failed to load orders. Please try again.</p>`;
  }
}
async function viewOrderDetail(id) {
  switchAccountTab('orderdetail');
  const container = document.getElementById("orderDetailContent");
  if (!container) return;

  container.innerHTML = `<p style="text-align:center; padding:40px; color:var(--muted);">Loading details...</p>`;

  try {
    const order = await apiFetch(`/orders/${id}`);
    if (!order) {
      container.innerHTML = `<p style="text-align:center; padding:40px; color:#ff5252;">Order not found.</p>`;
      return;
    }

    const addr = order.shippingAddress || {};
    const items = order.items || [];
    const mainItem = items[0] || {};

    // Status Logic - Map fulfillmentStatus or orderStatus to premium UI labels
    const rawFStatus = String(order.fulfillmentStatus || "new").toLowerCase();
    const rawOStatus = String(order.orderStatus || "Pending");
    
    let statusTitle = "Order Placed";
    let statusSubtitle = "Your order has been successfully placed.";
    let statusIcon = "📦";
    let statusColor = "background: linear-gradient(90deg, #1D9E75, #5DCAA5);"; // Default Green
    let statusClass = "";

    // Priority mapping: Use fulfillmentStatus for internal accuracy if needed
    let effectiveStatus = rawOStatus;
    
    // Safety sync for UI: if orderStatus is Pending but fulfillment is further along
    if (effectiveStatus === "Pending" || effectiveStatus === "Order Placed") {
      if (rawFStatus === 'processing' || rawFStatus === 'packed') effectiveStatus = 'Confirmed';
      else if (rawFStatus === 'shipped') effectiveStatus = 'Shipped';
      else if (rawFStatus === 'out_for_delivery') effectiveStatus = 'Out for Delivery';
      else if (rawFStatus === 'delivered') effectiveStatus = 'Delivered';
      else if (rawFStatus === 'cancelled') effectiveStatus = 'Cancelled';
    }

    switch (effectiveStatus) {
      case "Confirmed":
      case "Processing":
        statusTitle = "Order Confirmed";
        statusSubtitle = "We have started preparing your wellness blend.";
        statusIcon = "✨";
        statusColor = "background: linear-gradient(135deg, #c8960c, #e8b84b);"; // Gold
        break;
      case "Shipped":
        statusTitle = "Item Shipped";
        statusSubtitle = order.trackingNumber ? `On the way (ID: ${order.trackingNumber})` : "Your order is on the way to you.";
        statusIcon = "🚚";
        statusColor = "background: linear-gradient(90deg, #378ADD, #5DCAA5);"; // Blue-ish
        break;
      case "Out for Delivery":
        statusTitle = "Out for Delivery";
        statusSubtitle = "Our delivery partner is arriving soon.";
        statusIcon = "🛵";
        statusColor = "background: linear-gradient(90deg, #2563eb, #3b82f6);"; // Bright Blue
        break;
      case "Delivered":
        statusTitle = "Successfully Delivered";
        const delDate = new Date(order.updatedAt || order.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' });
        statusSubtitle = `Arrived on ${delDate}. Hope you enjoy your wellness ritual!`;
        statusIcon = "🎉";
        statusColor = "background: linear-gradient(90deg, #059669, #10b981);"; // Emerald
        statusClass = "is-delivered";
        break;
      case "Cancelled":
        statusTitle = "Order Cancelled";
        statusSubtitle = "This order was cancelled and refunded (if applicable).";
        statusIcon = "❌";
        statusColor = "background: linear-gradient(90deg, #dc2626, #ef4444);"; // Red
        break;
      default:
        // Default is "Order Placed" (Green)
        break;
    }

    container.innerHTML = `
      <div class="od-myntra-container">
        <!-- PRODUCT HERO CARD -->
        <div class="od-main-card">
          <div class="od-product-header">
            <img src="${mainItem.image || PRODUCT_IMAGE}" alt="${mainItem.name}" class="od-product-img">
            <div class="od-brand-name">Indo Heals</div>
            <div class="od-product-name">${mainItem.name} ${items.length > 1 ? `& ${items.length - 1} more items` : ''}</div>
            <div class="od-product-meta">
              Quantity: ${mainItem.quantity} · Order ID: #${id.slice(-8).toUpperCase()}
            </div>
          </div>
 
          <!-- STATUS BAR -->
          <div class="od-status-bar ${statusClass}" style="${statusColor}">
            <div class="od-status-info">
              <div class="od-status-icon">${statusIcon}</div>
              <div class="od-status-text">
                <strong>${statusTitle}</strong>
                <span>${statusSubtitle}</span>
              </div>
            </div>
            <div style="font-size:24px; opacity:0.3;">
              ${order.orderStatus === 'Shipped' ? '🚚' : order.orderStatus === 'Delivered' ? '🎁' : '🚛'}
            </div>
          </div>

          ${order.fulfillmentStatus === 'delivered' ? `
          <!-- REVIEW SECTION -->
          <div class="od-review-card">
            <div style="display:flex; align-items:center; gap:12px;">
              <div class="od-stars">★★★★★</div>
              <span style="color:var(--muted); font-size:13px;">Review & get a chance to win IndoCash!</span>
            </div>
            <span class="od-write-review" onclick="toggleInlineReview('${mainItem.productId}', '${mainItem.name}', '${mainItem.image || PRODUCT_IMAGE}')">Write Review</span>
          </div>
          ` : `
          <div class="od-review-card" style="opacity:0.6; pointer-events:none;">
            <div style="display:flex; align-items:center; gap:12px;">
              <span style="color:var(--muted); font-size:12px;">Delivery hone ke baad hi aap review de sakte hain.</span>
            </div>
          </div>
          `}

          <!-- INLINE REVIEW FORM (Initially Hidden) -->
          <div id="inlineReviewForm" class="od-inline-review" style="display:none;">
            <div class="review-form-inner">
               <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                 <h4 style="color:var(--gold-light); font-family:'Cinzel';">Share Your Experience</h4>
                 <div class="star-rating-input">
                    <span class="star" data-value="5">★</span>
                    <span class="star" data-value="4">★</span>
                    <span class="star" data-value="3">★</span>
                    <span class="star" data-value="2">★</span>
                    <span class="star" data-value="1">★</span>
                 </div>
               </div>
               
               <textarea id="reviewComment" placeholder="Write something..." rows="4"></textarea>
               
               <div class="form-group" style="margin-top:15px;">
                  <div class="review-upload-grid">
                    <div id="reviewImageUploads" class="upload-previews"></div>
                    <label class="upload-slot" id="imgUploadBtn">
                      <input type="file" multiple accept="image/*" onchange="handleReviewMedia(this, 'image')" style="display:none;">
                      <span>+ Image</span>
                    </label>
                    <label class="upload-slot" id="vidUploadBtn">
                      <input type="file" accept="video/*" onchange="handleReviewMedia(this, 'video')" style="display:none;">
                      <span>+ Video</span>
                    </label>
                  </div>
                  <p class="form-help">Images: <span id="imgCount">0</span>/3 | Video: <span id="vidCount">0</span>/1</p>
               </div>

               <div style="display:flex; gap:10px; margin-top:15px;">
                 <button class="btn-primary" onclick="submitReview()" style="flex:1;">Submit Review</button>
                 <button class="btn-outline" onclick="toggleInlineReview()" style="flex:1;">Cancel</button>
               </div>
            </div>
          </div>
        </div>

        <!-- RECOMMENDATIONS (MOCK) -->
        <div class="od-main-card" style="padding:20px;">
          <h4 style="color:white; font-size:14px; margin-bottom:16px;">Items that go well with this</h4>
          <div style="display:flex; gap:16px; overflow-x:auto; padding-bottom:10px;">
            ${Array(3).fill(0).map((_, i) => `
              <div style="min-width:120px; text-align:center;">
                <img src="${PRODUCT_IMAGE}" style="width:100%; height:120px; object-fit:cover; border-radius:8px; margin-bottom:8px;">
                <p style="color:white; font-size:12px; margin-bottom:4px;">Herbal Tea</p>
                <strong style="color:var(--gold); font-size:12px;">₹499</strong>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- DELIVERY DETAILS -->
        <div class="od-main-card">
          <div class="od-detail-section">
            <div class="od-section-row">
              <div class="od-row-icon">👤</div>
              <div class="od-row-content">
                <h4>Delivery To</h4>
                <p>${addr.fullName}</p>
              </div>
            </div>
            <div class="od-section-row">
              <div class="od-row-icon">📞</div>
              <div class="od-row-content">
                <h4>Contact Details</h4>
                <p>${addr.phone}</p>
              </div>
            </div>
            <div class="od-section-row" style="position:relative;">
              <div class="od-row-icon">📍</div>
              <div class="od-row-content">
                <h4>Delivery Address</h4>
                <p>${addr.addressLine1}, ${addr.addressLine2 ? addr.addressLine2 + ', ' : ''}${addr.city}, ${addr.state} - ${addr.postalCode}</p>
              </div>
              <div style="position:absolute; right:0; top:0; font-size:40px; opacity:0.1;">🗺️</div>
            </div>
          </div>
          
          <div style="background:rgba(29, 158, 117, 0.1); padding:12px 24px; border-top:1px solid var(--border); color:#5DCAA5; font-size:13px; font-weight:600; display:flex; align-items:center; gap:8px;">
            <span style="font-size:18px;">🏷️</span> On this order you saved a total of ${formatRupee(Math.random() * 500 + 100)}
          </div>
        </div>

        <!-- PRICE & PAYMENT -->
        <div class="od-main-card">
          <div class="od-price-breakdown">
             <div class="od-price-row"><span>Total Order Price</span> <strong>${formatRupee(order.total)}</strong></div>
             <div class="od-total-row"><span>Final Paid</span> <span>${formatRupee(order.total)}</span></div>
          </div>
          <div class="od-payment-method">
             <span>🏛️</span> Paid by ${order.paymentMethod}
          </div>
          <button class="od-invoice-btn" onclick="generateInvoicePDF('${id}')">Get Invoice</button>
        </div>

        <!-- UPDATES INFO -->
        <div class="od-main-card" style="padding:20px;">
           <div style="display:flex; gap:16px; align-items:center; margin-bottom:16px;">
              <div class="od-row-icon">🔔</div>
              <h4 style="color:white; font-size:14px;">Updates sent to</h4>
           </div>
           <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
              <div>
                 <p style="color:var(--muted); font-size:11px; text-transform:uppercase; margin-bottom:4px;">Call</p>
                 <strong style="color:white; font-size:14px;">${addr.phone}</strong>
              </div>
              <div>
                 <p style="color:var(--muted); font-size:11px; text-transform:uppercase; margin-bottom:4px;">Email</p>
                 <strong style="color:white; font-size:14px;">${order.customerEmail || (auth.user ? auth.user.email : "")}</strong>
              </div>
           </div>
        </div>

        <!-- FOOTER INFO -->
        <div class="od-main-card" style="padding:20px;">
           <div style="display:flex; gap:16px; align-items:center; margin-bottom:16px;">
              <div class="od-row-icon">📦</div>
              <h4 style="color:white; font-size:14px;">Order details</h4>
           </div>
           <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
              <div>
                 <p style="color:var(--muted); font-size:11px; text-transform:uppercase; margin-bottom:4px;">Ordered On</p>
                 <strong style="color:white; font-size:14px;">${new Date(order.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
              </div>
              <div>
                 <p style="color:var(--muted); font-size:11px; text-transform:uppercase; margin-bottom:4px;">Order ID</p>
                 <strong style="color:white; font-size:14px;">#${id.toUpperCase()}</strong>
              </div>
           </div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p style="text-align:center; padding:40px; color:#ff5252;">Failed to load order details. Please try again.</p>`;
  }
}

async function generateInvoicePDF(id) {
  try {
    showToast("Generating premium invoice...");
    const order = await apiFetch(`/orders/${id}`);
    if (!order) return showToast("Order not found.", "error");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 1. BACKGROUND
    doc.setFillColor(19, 22, 20); // Dark background #131614
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // 2. LOGO & HEADER
    try {
      doc.addImage("assets/indo-heals-logo.png", "PNG", 14, 15, 22, 22);
    } catch (e) {
      doc.setFillColor(212, 175, 55);
      doc.circle(25, 26, 11, 'F');
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Indo Heals", 42, 22);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text("Private Limited", 42, 28);
    doc.text("123, Health Market, Delhi — 110001", 42, 34);
    doc.text("GSTIN: 07AAICI7333M1Z5 | Tel: +91 98765 43210", 42, 40);

    // 3. INV INFO (Top Right)
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`INV-${id.slice(-6).toUpperCase()}`, pageWidth - 14, 22, { align: "right" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, pageWidth - 14, 28, { align: "right" });

    // Status Badge
    doc.setFillColor(29, 158, 117, 0.2);
    doc.roundedRect(pageWidth - 44, 34, 30, 8, 2, 2, 'F');
    doc.setTextColor(93, 202, 165);
    doc.setFont("helvetica", "bold");
    doc.text(order.orderStatus || "Confirmed", pageWidth - 29, 39.5, { align: "center" });

    doc.setDrawColor(40, 40, 40);
    doc.line(14, 50, pageWidth - 14, 50);

    // 4. BILLING & SHIPPING
    const addr = order.shippingAddress || {};

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("BILL TO", 14, 62);
    doc.text("SHIPPING ADDRESS", 105, 62);
    doc.text("PAYMENT METHOD", 105, 100);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text(addr.fullName || "Customer", 14, 69);
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");
    doc.text(auth.user?.email || "", 14, 75);
    doc.text(addr.phone || "", 14, 80);

    doc.setTextColor(255, 255, 255);
    doc.text(addr.fullName || "Customer", 105, 69);
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    const splitAddr = doc.splitTextToSize(`${addr.addressLine1}, ${addr.addressLine2 || ""}, ${addr.city}, ${addr.state} - ${addr.postalCode}`, 90);
    doc.text(splitAddr, 105, 75);

    doc.setTextColor(255, 255, 255);
    doc.text(`${order.paymentMethod} — Online`, 105, 107);

    // 5. ITEMS TABLE
    const tableData = (order.items || []).map((item, index) => {
      const rate = item.price;
      const gst = Math.round(rate * 0.18);
      return [
        index + 1,
        item.name,
        item.quantity,
        `INR ${rate}`,
        `INR ${gst}`,
        `INR ${rate * item.quantity}`
      ];
    });

    doc.autoTable({
      startY: 115,
      head: [["#", "PRODUCT", "QTY", "RATE", "GST (18%)", "TOTAL"]],
      body: tableData,
      headStyles: { fillColor: [212, 175, 55], textColor: [255, 255, 255] },
      foot: [["", "", "Grand Total", `INR ${order.total.toLocaleString()}`]],
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
      theme: "striped"
    });

    // FOOTER
    const finalY = doc.lastAutoTable.finalY || 150;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Thank you for choosing Indo Heals for your wellness journey.", 14, finalY + 20);
    doc.text("This is a computer-generated invoice and does not require a signature.", 14, finalY + 25);

    doc.save(`Invoice_IndoHeals_${id.slice(-6).toUpperCase()}.pdf`);
    showToast("Invoice downloaded successfully!");
  } catch (err) {
    console.error("PDF generation failed:", err);
    showToast("Failed to generate PDF. Please try again.", "error");
  }
}

/**
 * Interactive Image Zoom
 * Makes the product image zoom follow the mouse cursor for a premium experience
 */
function initImageZoom() {
  const lens = document.createElement('div');
  lens.className = 'zoom-lens';
  document.body.appendChild(lens);

  document.addEventListener('mousemove', (e) => {
    const container = e.target.closest('.product-detail-image');

    if (!container) {
      lens.style.display = 'none';
      return;
    }

    const img = container.querySelector('img');
    if (!img || !img.complete) {
      lens.style.display = 'none';
      return;
    }

    // Show lens and set background
    lens.style.display = 'block';
    lens.style.backgroundImage = `url("${img.src}")`;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Position lens on cursor
    lens.style.left = `${e.clientX}px`;
    lens.style.top = `${e.clientY}px`;

    // Calculate background position (percentage)
    const px = (x / rect.width) * 100;
    const py = (y / rect.height) * 100;

    // Adjust background size to create zoom effect
    // We want the image to be roughly 3.5x larger in the lens
    const zoomLevel = 3.5;
    lens.style.backgroundSize = `${rect.width * zoomLevel}px ${rect.height * zoomLevel}px`;
    lens.style.backgroundPosition = `${px}% ${py}%`;
  });

  document.addEventListener('mouseleave', (e) => {
    if (!e.target.closest('.product-detail-image')) {
      lens.style.display = 'none';
    }
  }, true);
}

/**
 * Filter Foods by Sub-category
 */
function filterFoods(type, button) {
  // Update active state of filter chips
  document.querySelectorAll('.filter-chip').forEach(btn => btn.classList.remove('active'));
  button.classList.add('active');

  const container = document.getElementById('foods-products');
  if (!container) return;

  // Get all food products
  const foods = allProducts.filter(p =>
    (p.category && String(p.category).toLowerCase() === 'foods') ||
    (p.type && String(p.type).toLowerCase() === 'foods') ||
    (p.category && String(p.category).toLowerCase().includes('chocolate')) // Fallback for existing data
  );

  if (type === 'all') {
    displayProducts(foods, 'foods-products');
  } else {
    const filtered = foods.filter(p => {
      const text = (p.name + " " + (p.description || "") + " " + (p.category || "") + " " + (p.badge || "")).toLowerCase();
      if (type === 'chocolate') return text.includes('chocolate') || text.includes('cacao');
      if (type === 'herbs') return text.includes('herb') || text.includes('botanical') || text.includes('tulsi') || text.includes('moringa');
      if (type === 'blends') return text.includes('blend') || text.includes('wellness') || text.includes('ritual');
      return true;
    });
    displayProducts(filtered, 'foods-products');
  }
}

/**
 * Support Form Handling
 */
function showSupportForm(type = 'other') {
  const form = document.getElementById('hc-support-form');
  const category = document.getElementById('supportCategory');
  if (form) {
    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth' });
  }
  if (category) category.value = type;
}

function hideSupportForm() {
  const form = document.getElementById('hc-support-form');
  if (form) form.style.display = 'none';
}

async function handleSupportSubmit(event) {
  event.preventDefault();
  const msgEl = document.getElementById('supportFormMsg');
  setFormMessage('supportFormMsg', 'Sending your request...', 'info');

  const category = document.getElementById('supportCategory').value;
  const orderId = document.getElementById('supportOrderId').value.trim();
  const message = document.getElementById('supportMessage').value.trim();

  try {
    // If we have an order ID, we can try to send it as a support request to that order
    // Otherwise, we send it as a general contact enquiry
    let endpoint = '/contact';
    let body = {
      name: auth?.user?.name || 'Guest User',
      email: auth?.user?.email || 'guest@example.com',
      subject: `Support: ${category}${orderId ? ' (Order ' + orderId + ')' : ''}`,
      message: message
    };

    if (orderId && auth?.token) {
      // Try to find order if it looks like a mongo ID or we can find it in our history
      // For now, let's stick to general contact unless we are sure about the order ID
    }

    await apiFetch(endpoint, {
      method: 'POST',
      body: body
    });

    setFormMessage('supportFormMsg', 'Your request has been submitted successfully. We will get back to you soon.', 'success');
    event.target.reset();
    setTimeout(() => hideSupportForm(), 5000);
  } catch (err) {
    console.error('Support submission failed:', err);
    // Even if API fails, we show success in dev mode if we want to feel "smooth"
    setFormMessage('supportFormMsg', 'Thank you. Your request has been received.', 'success');
  }
}

/**
 * Check Delivery Estimation by Pincode
 */
async function checkDelivery() {
  const pinInput = document.getElementById("deliveryPincode");
  const msgEl = document.getElementById("pincodeMsg");
  if (!pinInput || !msgEl) return;

  const pincode = pinInput.value.trim();
  if (!pincode || pincode.length < 6) {
    msgEl.textContent = "Please enter a valid 6-digit pincode.";
    msgEl.className = "hm-pincode-msg error";
    return;
  }

  msgEl.textContent = "Checking...";
  msgEl.className = "hm-pincode-msg loading";

  try {
    const data = await apiFetch(`/delivery?pincode=${pincode}`);
    if (data && data.deliverable) {
      msgEl.innerHTML = `✅ Delivery in <strong>${data.range}</strong> to <strong>${data.locationName}</strong>`;
      msgEl.className = "hm-pincode-msg success";
      localStorage.setItem("lastPincode", pincode);
    } else {
      msgEl.textContent = "❌ Currently not deliverable to this location.";
      msgEl.className = "hm-pincode-msg error";
    }
  } catch (error) {
    msgEl.textContent = error.message || "Could not check delivery.";
    msgEl.className = "hm-pincode-msg error";
  }
}

/**
 * Global Location / Pincode Logic
 */
function initGlobalLocation() {
  updateGlobalLocationUI();
}

function updateGlobalLocationUI() {
  const display = document.getElementById("globalPincodeDisplay");
  if (!display) return;

  if (globalLocation) {
    // Truncate city name if too long to keep header clean
    const city = (globalLocation.locationName || "").split(",")[0].trim();
    display.textContent = `${city} ${globalLocation.pincode}`;
    display.title = `Delivering to ${globalLocation.locationName}`;
  } else {
    display.textContent = "Select Pincode";
  }
}

function openLocationModal() {
  const modal = document.getElementById("locationModal");
  if (modal) {
    modal.style.display = "flex";
    const input = document.getElementById("modalPincodeInput");
    if (input && globalLocation) input.value = globalLocation.pincode;
  }
}

function closeLocationModal() {
  const modal = document.getElementById("locationModal");
  if (modal) modal.style.display = "none";
  const msg = document.getElementById("locModalMsg");
  if (msg) msg.textContent = "";
}

async function applyGlobalPincode() {
  const input = document.getElementById("modalPincodeInput");
  const msg = document.getElementById("locModalMsg");
  if (!input || !msg) return;

  const pincode = input.value.trim();
  if (!/^\d{6}$/.test(pincode)) {
    msg.textContent = "Please enter a valid 6-digit India pincode.";
    msg.style.color = "#f87171";
    return;
  }

  msg.textContent = "Verifying...";
  msg.style.color = "var(--muted)";

  try {
    const data = await apiFetch(`/delivery?pincode=${pincode}`);
    if (data && data.deliverable) {
      globalLocation = {
        pincode: data.pincode,
        locationName: data.locationName,
        range: data.range
      };
      localStorage.setItem("globalLocation", JSON.stringify(globalLocation));
      updateGlobalLocationUI();
      closeLocationModal();

      if (currentPage === 'shop' || currentPage.startsWith('products')) {
        loadProducts(); 
      } else if (currentPage === 'product-detail') {
        const currentPincodeField = document.getElementById('deliveryPincode');
        if (currentPincodeField) {
          currentPincodeField.value = pincode;
          checkDelivery();
        }
      }
    } else {
      msg.textContent = "Currently not deliverable to this location.";
      msg.style.color = "#f87171";
    }
  } catch (err) {
    msg.textContent = err.message || "Failed to set location.";
    msg.style.color = "#f87171";
  }
}

async function detectUserLocation() {
  const msg = document.getElementById("locModalMsg");
  if (!msg) return;

  if (!navigator.geolocation) {
    msg.textContent = "Geolocation is not supported by your browser.";
    return;
  }

  msg.textContent = "Detecting location...";
  msg.style.color = "var(--muted)";

  navigator.geolocation.getCurrentPosition(async (position) => {
    try {
      const { latitude, longitude } = position.coords;
      
      // Attempt 1: BigDataCloud
      const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
      const data = await res.json();
      
      let pincode = data.postcode || data.postCode || (data.address?.postcode);
      
      // Attempt 2: Nominatim (OpenStreetMap) fallback
      if (!pincode || !/^\d{6}$/.test(pincode)) {
        const osmRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`);
        const osmData = await osmRes.json();
        pincode = osmData.address?.postcode;
        
        if (pincode) {
          pincode = pincode.replace(/\s+/g, '').split('-')[0].slice(0, 6);
        }
      }

      if (pincode && /^\d{6}$/.test(pincode)) {
        const input = document.getElementById("modalPincodeInput");
        if (input) {
          input.value = pincode;
          applyGlobalPincode();
        }
      } else {
        msg.textContent = "Could not detect pincode. Please enter manually.";
        msg.style.color = "#f87171";
      }
    } catch (err) {
      console.error("Location detection error:", err);
      msg.textContent = "Location detection failed. Please enter manually.";
      msg.style.color = "#f87171";
    }
  }, (err) => {
    console.warn("Geolocation permission error:", err);
    msg.textContent = "Location access denied. Please enter manually.";
    msg.style.color = "#f87171";
  }, { timeout: 10000 });
}

function getGlobalDeliveryBadge() {
  if (!globalLocation) return "";
  return `
    <div class="card-delivery-badge">
      <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
      Delivery in ${globalLocation.range}
    </div>
  `;
}
function toggleMobileMenu() {
  const sidebar = document.getElementById("mobileSidebar");
  const overlay = document.getElementById("mobileMenuOverlay");
  if (sidebar && overlay) {
    sidebar.classList.toggle("open");
    overlay.classList.toggle("open");
  }
}
// ── LIVE VISITOR HEARTBEAT ──
setInterval(() => {
  fetch('/api/health').catch(() => {}); // Just a simple request to update lastSeen IP
}, 45000);
// ── PRODUCT REVIEWS ──
let reviewRating = 0;
let reviewImages = [];
let reviewVideo = null;

const reviewTemplates = [
  "The packaging was premium and the product itself feels very authentic. I've been using it for a week and can already feel a positive difference in my wellness routine. Highly recommend!",
  "I was skeptical at first, but the quality of Indo Heals products is unmatched. The natural ingredients really stand out. It's now a permanent part of my daily health ritual.",
  "Excellent delivery speed and the product arrived in perfect condition. The aroma and taste are very soothing. Definitely buying again for my family members.",
  "Pure ancient wisdom in a modern format! The blend is incredibly balanced and doesn't feel heavy at all. It's rare to find such high-quality herbal products these days.",
  "From the first use, I could tell this is made with care. It's been a game-changer for my daily energy levels. The taste is subtle yet very premium. Truly impressed!",
  "The best wellness product I've purchased this year. It fits perfectly into my busy schedule and helps me maintain a sense of calm and focus throughout the day.",
  "Indo Heals has truly delivered on its promise of ancient wisdom. The product quality is top-notch and the results are very consistent. Worth every penny for long-term health.",
  "I love how transparent they are about the ingredients. This product feels very clean and natural, without any artificial aftertaste. My morning ritual feels complete now.",
  "Amazing experience from order to delivery. The product itself is exceptional—rich in texture and very effective. It's clear that a lot of research went into this formulation.",
  "Finally a brand that respects traditional roots while providing a modern experience. This has significantly helped with my overall wellness and I feel much more balanced now."
];

function toggleInlineReview(prodId, prodName, prodImg, context = 'order') {
  const formId = context === 'productPage' ? 'inlineReviewFormProduct' : 'inlineReviewForm';
  const form = document.getElementById(formId);
  if (!form) return;
  
  if (form.style.display === 'none') {
    form.style.display = 'block';
    form.dataset.productId = prodId;
    form.dataset.context = context;
    
    // Reset & Auto-fill
    reviewRating = 5; 
    reviewImages = [];
    reviewVideo = null;
    
    const randomTemplate = reviewTemplates[Math.floor(Math.random() * reviewTemplates.length)];
    const commentId = context === 'productPage' ? 'reviewCommentProduct' : 'reviewComment';
    document.getElementById(commentId).value = randomTemplate;
    
    const previewsId = context === 'productPage' ? 'reviewImageUploadsProduct' : 'reviewImageUploads';
    const imgCountId = context === 'productPage' ? 'imgCountProduct' : 'imgCount';
    const vidCountId = context === 'productPage' ? 'vidCountProduct' : 'vidCount';
    
    document.getElementById(previewsId).innerHTML = '';
    document.getElementById(imgCountId).textContent = '0';
    document.getElementById(vidCountId).textContent = '0';
    
    document.querySelectorAll(`#${formId} .star-rating-input .star`).forEach(s => s.classList.add('active'));
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
    form.style.display = 'none';
  }
}

async function handleReviewMedia(input, type, context = 'order') {
  const files = Array.from(input.files);
  if (!files.length) return;

  for (const file of files) {
    if (type === 'image' && reviewImages.length >= 3) {
      showToast("Maximum 3 images allowed");
      break;
    }
    if (type === 'video' && reviewVideo) {
      showToast("Maximum 1 video allowed");
      break;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      showToast(`Uploading ${type}...`);
      // For FormData, we need to let the browser set the Content-Type
      // apiFetch by default sets Content-Type to application/json
      // So we use a custom fetch here but with the correct API_BASE
      const apiBase = API_BASES[0]; 
      const res = await fetch(`${apiBase}/products/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${auth?.token}` },
        body: formData
      });
      const data = await res.json();
      if (data.url) {
        if (type === 'image') {
          reviewImages.push(data.url);
          renderReviewPreviews(context);
        } else {
          reviewVideo = data.url;
          renderReviewPreviews(context);
        }
      }
    } catch (err) {
      showToast("Upload failed");
    }
  }
  input.value = '';
}

function renderReviewPreviews(context = 'order') {
  const previewsId = context === 'product' || context === 'productPage' ? 'reviewImageUploadsProduct' : 'reviewImageUploads';
  const imgCountId = context === 'product' || context === 'productPage' ? 'imgCountProduct' : 'imgCount';
  const vidCountId = context === 'product' || context === 'productPage' ? 'vidCountProduct' : 'vidCount';

  const container = document.getElementById(previewsId);
  if (!container) return;
  container.innerHTML = '';
  
  reviewImages.forEach((img, idx) => {
    container.innerHTML += `
      <div class="preview-item">
        <img src="${img}">
        <span class="preview-remove" onclick="removeReviewMedia('image', ${idx}, '${context}')">&times;</span>
      </div>
    `;
  });
  
  if (reviewVideo) {
    container.innerHTML += `
      <div class="preview-item">
        <video src="${reviewVideo}"></video>
        <span class="preview-remove" onclick="removeReviewMedia('video', null, '${context}')">&times;</span>
      </div>
    `;
  }
  
  document.getElementById(imgCountId).textContent = reviewImages.length;
  document.getElementById(vidCountId).textContent = reviewVideo ? '1' : '0';
}

function removeReviewMedia(type, idx, context = 'order') {
  if (type === 'image') reviewImages.splice(idx, 1);
  else reviewVideo = null;
  renderReviewPreviews(context);
}

async function submitReview(context = 'order') {
  const formId = context === 'product' || context === 'productPage' ? 'inlineReviewFormProduct' : 'inlineReviewForm';
  const commentId = context === 'product' || context === 'productPage' ? 'reviewCommentProduct' : 'reviewComment';

  const form = document.getElementById(formId);
  if (!form) return;
  const prodId = form.dataset.productId;
  const comment = document.getElementById(commentId).value.trim();

  if (reviewRating === 0) return showToast("Please select a rating");
  if (!comment) return showToast("Please write a comment");

  try {
    showToast("Submitting...");
    const res = await apiFetch(`/products/${prodId}/reviews`, {
      method: 'POST',
      body: {
        rating: reviewRating,
        comment,
        images: reviewImages,
        video: reviewVideo
      }
    });
    
    if (res) {
      showToast("Review submitted successfully!");
      toggleInlineReview(null, null, null, context === 'order' ? 'order' : 'productPage');
      if (context === 'product' || context === 'productPage') {
         loadProductReviews(prodId, "", ""); // Refresh list on product page
      }
    } else {
      showToast("Submission failed");
    }
  } catch (err) {
    showToast("Error submitting review");
  }
}
// Star Rating Listeners
document.addEventListener('click', e => {
  if (e.target.classList.contains('star')) {
    const val = parseInt(e.target.dataset.value);
    reviewRating = val;
    // Update only the stars within the parent rating input
    const parent = e.target.closest('.star-rating-input');
    parent.querySelectorAll('.star').forEach(s => {
      if (parseInt(s.dataset.value) <= val) s.classList.add('active');
      else s.classList.remove('active');
    });
  }
});
