
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
