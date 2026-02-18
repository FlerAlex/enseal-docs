// Pagefind search integration
// The pagefind assets are generated at build time and served from /pagefind/
window.addEventListener("DOMContentLoaded", function () {
    var container = document.getElementById("search");
    if (!container) return;

    var script = document.createElement("script");
    script.src = "/pagefind/pagefind-ui.js";
    script.onload = function () {
        new PagefindUI({
            element: "#search",
            showSubResults: true,
            showImages: false,
        });
    };
    document.head.appendChild(script);

    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/pagefind/pagefind-ui.css";
    document.head.appendChild(link);
});
