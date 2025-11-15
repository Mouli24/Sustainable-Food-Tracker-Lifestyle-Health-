
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM ready — scripts starting");

  // -------------------------
  // GLOBALS
  // -------------------------
  let nutritionChart = null;

  // Helper
  function safeGet(id) {
    const el = document.getElementById(id);
    if (!el) console.warn(`Element #${id} not found`);
    return el;
  }

  // -------------------------
  // SELECTORS
  // -------------------------
  const navLinks = document.querySelectorAll(".nav-link, .logo") || [];
  const pages = document.querySelectorAll(".page") || [];
  const burger = safeGet("burger");
  const navLinksContainer = safeGet("nav-links");
  const darkModeToggle = safeGet("toggle-dark-mode");
  const searchInput = safeGet("main-search-input");
  const modalContainer = safeGet("modal-container");
  const modalOverlay = safeGet("modal-overlay");
  const modalCloseBtn = safeGet("modal-close-btn");

  // -------------------------
  // NAVIGATION CLICKS
  // -------------------------
  navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();

      const pageName = link.dataset.page;
      if (!pageName) return;

      navLinks.forEach(l => l.classList.remove("active"));
      link.classList.add("active");

      showPage(pageName);
    });
  });

  // -------------------------
  // PAGE SWITCHING
  // -------------------------
  function showPage(pageName) {
    pages.forEach(page => {
      if (page.id === `page-${pageName}`) page.classList.add("active");
      else page.classList.remove("active");
    });

    if (pageName === "search") {
      setTimeout(() => {
        const inp = safeGet("main-search-input");
        if (inp) inp.focus();
      }, 150);
    }
  }

  // -------------------------
  // BURGER MENU
  // -------------------------
  if (burger && navLinksContainer) {
    burger.addEventListener("click", () => {
      burger.classList.toggle("active");
      navLinksContainer.classList.toggle("active");
    });
  }


  if (darkModeToggle) {
    if (localStorage.getItem("theme") === "dark") {
      document.documentElement.classList.add("dark-mode");
      darkModeToggle.checked = true;
    }

    darkModeToggle.addEventListener("change", () => {
      if (darkModeToggle.checked) {
        document.documentElement.classList.add("dark-mode");
        localStorage.setItem("theme", "dark");
      } else {
        document.documentElement.classList.remove("dark-mode");
        localStorage.setItem("theme", "light");
      }
    });
  }

  // -------------------------
  // SEARCH INPUT (ENTER KEY)
  // -------------------------
  if (searchInput) {
    searchInput.addEventListener("keyup", (e) => {
      if (e.key === "Enter") searchProducts();
    });
  }

  // -------------------------
  // CLOSE MODAL
  // -------------------------
  if (modalCloseBtn && modalContainer && modalOverlay) {
    modalCloseBtn.addEventListener("click", () => {
      modalContainer.classList.add("hidden");
      modalOverlay.classList.add("hidden");
    });
  }

  // -------------------------
  // SEARCH PRODUCTS (API)
  // -------------------------
  async function searchProducts() {
    const query = (searchInput && searchInput.value.trim()) || "";
    const container = safeGet("search-results-container");
    if (!container) return;

    if (!query) {
      container.innerHTML = "<p>Type something to search!</p>";
      return;
    }

    container.innerHTML = "<p>Searching...</p>";

    try {
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&page_size=20&json=1`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (!data.products || data.products.length === 0) {
        container.innerHTML = "<p>No products found.</p>";
        return;
      }

      container.innerHTML = "";
      data.products.forEach(product => {
        const code = product.code || "";
        const img = product.image_front_small_url || "";
        const name = product.product_name || "No name";
        const brand = product.brands || "Unknown brand";
        const grade = (product.nutrition_grade_fr || "c").toUpperCase();

        const item = document.createElement("div");
        item.className = "search-result-item";
        item.tabIndex = 0;

        item.innerHTML = `
          <img src="${img}">
          <div class="search-result-info">
            <h4>${escapeHtml(name)}</h4>
            <p>${escapeHtml(brand)}</p>
          </div>
          <span class="grade-badge grade-${grade.toLowerCase()}">${grade}</span>
        `;

        item.addEventListener("click", () => openProductDetails(code));
        container.appendChild(item);
      });

    } catch (err) {
      console.error("Search error:", err);
      container.innerHTML = "<p>Error searching products.</p>";
    }
  }

  // -------------------------
  // PRODUCT DETAILS + CHART
  // -------------------------
  async function openProductDetails(code) {
    if (!code) return;

    const content = safeGet("modal-content");
    if (!content) return;

    try {
      const url = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const p = data.product;

      if (!p) {
        content.innerHTML = "<p>Product details not found.</p>";
        modalOverlay.classList.remove("hidden");
        modalContainer.classList.remove("hidden");
        return;
      }

      const img = p.image_front_small_url || "";
      const name = p.product_name || "No name";
      const brands = p.brands || "Unknown";
      const quantity = p.quantity || "N/A";
      const nutr = p.nutriments || {};

      content.innerHTML = `
        <div class="product-detail-header">
          <img src="${img}" alt="${escapeHtml(name)}">
          <div>
            <h3>${escapeHtml(name)}</h3>
            <p><b>Brand:</b> ${escapeHtml(brands)}</p>
            <p><b>Quantity:</b> ${escapeHtml(quantity)}</p>
          </div>
        </div>

        <h4>Nutritional Chart (per 100g)</h4>
        <div class="chart-container">
          <canvas id="nutritionChart"></canvas>
        </div>
      `;

      modalOverlay.classList.remove("hidden");
      modalContainer.classList.remove("hidden");

      drawNutritionChart(
        nutr.fat_100g ?? nutr.fat ?? 0,
        nutr.carbohydrates_100g ?? nutr.carbohydrates ?? 0,
        nutr.proteins_100g ?? nutr.proteins ?? 0,
        nutr.sugars_100g ?? nutr.sugars ?? 0
      );

    } catch (err) {
      console.error("Details error:", err);
      content.innerHTML = "<p>Error loading product details.</p>";
      modalOverlay.classList.remove("hidden");
      modalContainer.classList.remove("hidden");
    }
  }

  // -------------------------
  // DRAW CHART
  // -------------------------
  function drawNutritionChart(fat, carbs, protein, sugar) {
    const canvas = document.getElementById("nutritionChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (nutritionChart) nutritionChart.destroy();

    nutritionChart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: ["Fat", "Carbs", "Protein", "Sugar"],
        datasets: [{
          data: [fat, carbs, protein, sugar]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  // -------------------------
  // XSS-SAFE TEXT
  // -------------------------
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // expose globally
  window.searchProducts = searchProducts;
  window.openProductDetails = openProductDetails;

  console.log("scripts.js initialized");
});



const heroInput = document.getElementById("hero-search-input");
const homeCardContainer = document.getElementById("home-product-cards");

// Listen Enter on home search
if (heroInput) {
    heroInput.addEventListener("keyup", (e) => {
        if (e.key === "Enter") {
            homeSearchProduct();
        }
    });
}

async function homeSearchProduct() {
    const query = heroInput.value.trim();
    if (!query) return;

    let url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&page_size=1&json=1`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (!data.products || data.products.length === 0) {
            return;
        }

        const p = data.products[0];

        const img = p.image_front_small_url || "https://via.placeholder.com/80";
        const name = p.product_name || "Unknown";
        const code = p.code;

        // Nutrition grade (A/B/C/D/E)
        const grade = (p.nutrition_grade_fr || "c").toUpperCase();

        addHomeMiniCard(name, img, code, grade);

    } catch (err) {
        console.error("Home search error:", err);
    }
});
// ==================== BARCODE SCANNER ==================== //

let qr = null;
let scanning = false;

// Elements
const scannerModal = document.getElementById("scanner-modal");
const scannerOverlay = document.getElementById("scanner-overlay");
const scannerClose = document.getElementById("scanner-close-btn");
const scannerStatus = document.getElementById("scanner-status");

const scanButtons = [
    document.getElementById("hero-start-scanning"),
    document.getElementById("action-scan-barcode")
];

// Fetch product from OpenFoodFacts
async function fetchProduct(barcode) {
    const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.status === 0) {
            alert("❌ Product not found");
            return;
        }

        const p = data.product;

        alert(
            `✔️ Product Found!\n\n` +
            `Name: ${p.product_name}\n` +
            `Brand: ${p.brands}\n` +
            `Nutri-Score: ${p.nutriscore_grade}`
        );

    } catch (e) {
        alert("Error fetching OpenFoodFacts API");
        console.log(e);
    }
}

// Open scanner
async function openScanner() {
    if (scanning) return;

    scannerOverlay.classList.remove("hidden");
    scannerModal.classList.remove("hidden");
    scannerStatus.textContent = "Opening camera…";

    if (!qr) {
        qr = new Html5Qrcode("scanner-view");
    }

    scanning = true;

    try {
        await qr.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: 250 },

            async decodedText => {
                await closeScanner();
                fetchProduct(decodedText.trim());
            }
        );

        scannerStatus.textContent = "Scanning…";

    } catch (err) {
        scannerStatus.textContent = "Camera error. Check permissions.";
        console.error(err);
    }
}

// Close scanner
async function closeScanner() {
    if (qr && scanning) {
        try {
            await qr.stop();
        } catch (e) {}
    }
    scanning = false;

    scannerOverlay.classList.add("hidden");
    scannerModal.classList.add("hidden");
}

// Attach events
scanButtons.forEach(btn => {
    if (btn) btn.addEventListener("click", openScanner);
});

scannerClose.addEventListener("click", closeScanner);
scannerOverlay.addEventListener("click", closeScanner);

// ==================== MANUAL BARCODE ENTRY ==================== //

const enterBarcodeBtn = document.getElementById("action-enter-barcode");

const barcodeModal = document.getElementById("barcode-modal");
const barcodeOverlay = document.getElementById("barcode-overlay");
const barcodeClose = document.getElementById("barcode-close-btn");

const barcodeInput = document.getElementById("barcode-input");
const barcodeSearchBtn = document.getElementById("barcode-search-btn");
const barcodeResult = document.getElementById("barcode-result");

// Open modal
enterBarcodeBtn.addEventListener("click", () => {
    barcodeModal.classList.remove("hidden");
    barcodeOverlay.classList.remove("hidden");
});

// Close modal
barcodeClose.addEventListener("click", closeBarcodeModal);
barcodeOverlay.addEventListener("click", closeBarcodeModal);

function closeBarcodeModal() {
    barcodeModal.classList.add("hidden");
    barcodeOverlay.classList.add("hidden");
    barcodeInput.value = "";
    barcodeResult.innerHTML = "";
}

// Search Product
barcodeSearchBtn.addEventListener("click", () => {
    const code = barcodeInput.value.trim();
    if (code.length < 4) {
        barcodeResult.innerHTML = `<p style="color:red;">Please enter a valid barcode.</p>`;
        return;
    }
    fetchBarcodeProduct(code);
});

// API Fetch Function
async function fetchBarcodeProduct(code) {
    barcodeResult.innerHTML = `<p>Loading product info...</p>`;

    try {
        const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
        const data = await res.json();

        if (data.status === 0) {
            barcodeResult.innerHTML = `<p style="color:red;">❌ Product not found</p>`;
            return;
        }

        const p = data.product;

        // Clean UI output — NO raw JSON
        barcodeResult.innerHTML = `
            <h3>${p.product_name || "Unnamed Product"}</h3>
            <p><b>Brand:</b> ${p.brands || "Unknown"}</p>
            <p><b>Quantity:</b> ${p.quantity || "N/A"}</p>
            <p><b>Nutri-Score:</b> ${p.nutriscore_grade?.toUpperCase() || "N/A"}</p>
            <p><b>Eco-Score:</b> ${p.ecoscore_grade?.toUpperCase() || "N/A"}</p>
            
            <img src="${p.image_front_small_url || p.image_url}" 
                 alt="Product Image"
                 style="width:120px; margin-top:10px; border-radius:8px;">
        `;
    }
    catch (error) {
        barcodeResult.innerHTML = `<p style="color:red;">Error fetching data.</p>`;
        console.log(error);
    }
}
