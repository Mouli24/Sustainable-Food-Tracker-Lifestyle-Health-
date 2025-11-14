
// ELEMENT SELECTION

// Select all navigation links + logo
const navLinks = document.querySelectorAll(".nav-link, .logo");

// Select all individual pages
const pages = document.querySelectorAll(".page");

// Select burger menu (mobile)
const burger = document.getElementById("burger");
const navLinksContainer = document.getElementById("nav-links");


//    NAVIGATION CLICK EVENTS


navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
        e.preventDefault();

        const pageName = link.dataset.page;
        if (!pageName) return;

        // Remove active class from all nav links
        navLinks.forEach(l => l.classList.remove("active"));

        // Add active class to the clicked nav item
        link.classList.add("active");

        // Trigger page switch
        showPage(pageName);
    });
});


//   PAGE SWITCHING FUNCTION


function showPage(pageName) {
    pages.forEach(page => {
        page.id === `page-${pageName}`
            ? page.classList.add("active")
            : page.classList.remove("active");
    });

    // Auto-focus search bar when search page opens
    if (pageName === "search") {
        setTimeout(() => {
            const searchInput = document.getElementById("main-search-input");
            if (searchInput) searchInput.focus();
        }, 200);
    }
}


//  BURGER MENU (MOBILE)


burger.addEventListener("click", () => {
    burger.classList.toggle("active");
    navLinksContainer.classList.toggle("active");
});

// dark mode 

const darkModeToggle = document.getElementById("toggle-dark-mode");

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
