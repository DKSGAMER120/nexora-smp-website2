/* =========================================================
   NEXORA SMP - MAIN JAVASCRIPT
   File: js/main.js
   ========================================================= */

"use strict";

/* ---------------------------------------------------------
   GLOBAL CONFIG
   --------------------------------------------------------- */

const NEXORA_CONFIG = {
    serverIP: "play.nexorasmp.2bd.net",
    discord: "https://discord.gg/vSGXupYJG",
    refreshInterval: 15000
};


/* ---------------------------------------------------------
   DOM READY
   --------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {

    initMobileMenu();
    initCopyButtons();
    initSmoothLinks();
    initCurrentYear();
    initScrollEffects();

});


/* ---------------------------------------------------------
   MOBILE MENU
   --------------------------------------------------------- */

function initMobileMenu() {

    const menuButtons = document.querySelectorAll(
        ".mobile-menu-btn, .mobile-menu-button, [data-mobile-menu]"
    );

    const navLinks = document.querySelectorAll(
        ".nav-links, .nav-links-container"
    );

    if (!menuButtons.length || !navLinks.length) {
        return;
    }

    menuButtons.forEach(button => {

        button.addEventListener("click", () => {

            navLinks.forEach(nav => {

                nav.classList.toggle("open");
                nav.classList.toggle("active");
                nav.classList.toggle("mobile-open");

            });

            button.classList.toggle("active");

            const expanded =
                button.getAttribute("aria-expanded") === "true";

            button.setAttribute(
                "aria-expanded",
                String(!expanded)
            );

        });

    });


    /* Close menu after clicking a link */

    navLinks.forEach(nav => {

        nav.querySelectorAll("a").forEach(link => {

            link.addEventListener("click", () => {

                nav.classList.remove("open");
                nav.classList.remove("active");
                nav.classList.remove("mobile-open");

                menuButtons.forEach(button => {
                    button.classList.remove("active");
                    button.setAttribute("aria-expanded", "false");
                });

            });

        });

    });

}


/* ---------------------------------------------------------
   COPY SERVER IP
   --------------------------------------------------------- */

function copyServerIP() {

    const ip = NEXORA_CONFIG.serverIP;

    if (!navigator.clipboard) {

        fallbackCopy(ip);
        showToast("Server IP copied!");

        return;

    }

    navigator.clipboard.writeText(ip)
        .then(() => {
            showToast("Server IP copied!");
        })
        .catch(() => {
            fallbackCopy(ip);
            showToast("Server IP copied!");
        });

}


function fallbackCopy(text) {

    const textarea = document.createElement("textarea");

    textarea.value = text;

    textarea.style.position = "fixed";
    textarea.style.opacity = "0";

    document.body.appendChild(textarea);

    textarea.focus();
    textarea.select();

    try {
        document.execCommand("copy");
    } catch (error) {
        console.warn("Copy failed:", error);
    }

    textarea.remove();

}


/* ---------------------------------------------------------
   COPY BUTTONS
   --------------------------------------------------------- */

function initCopyButtons() {

    document.querySelectorAll(
        "[data-copy-ip], .copy-ip, .server-ip-copy"
    ).forEach(button => {

        button.addEventListener("click", event => {

            event.preventDefault();

            copyServerIP();

        });

    });

}


/* ---------------------------------------------------------
   SMOOTH INTERNAL LINKS
   --------------------------------------------------------- */

function initSmoothLinks() {

    document.querySelectorAll('a[href^="#"]').forEach(link => {

        link.addEventListener("click", event => {

            const targetID =
                link.getAttribute("href");

            if (!targetID || targetID === "#") {
                return;
            }

            const target =
                document.querySelector(targetID);

            if (!target) {
                return;
            }

            event.preventDefault();

            target.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        });

    });

}


/* ---------------------------------------------------------
   CURRENT YEAR
   --------------------------------------------------------- */

function initCurrentYear() {

    const year = new Date().getFullYear();

    document.querySelectorAll(
        "[data-current-year], .current-year"
    ).forEach(element => {

        element.textContent = year;

    });

}


/* ---------------------------------------------------------
   SCROLL EFFECTS
   --------------------------------------------------------- */

function initScrollEffects() {

    const elements = document.querySelectorAll(
        ".content-card, .features-page-card, .lifesteal-card, " +
        ".economy-card, .team-card, .rule-card, .vote-card, " +
        ".player-card, .stat-card"
    );

    if (!elements.length) {
        return;
    }

    if (!("IntersectionObserver" in window)) {
        elements.forEach(element => {
            element.classList.add("visible");
        });
        return;
    }

    const observer = new IntersectionObserver(
        entries => {

            entries.forEach(entry => {

                if (entry.isIntersecting) {

                    entry.target.classList.add("visible");

                    observer.unobserve(entry.target);

                }

            });

        },
        {
            threshold: 0.08
        }
    );


    elements.forEach(element => {
        observer.observe(element);
    });

}


/* ---------------------------------------------------------
   TOAST MESSAGE
   --------------------------------------------------------- */

function showToast(message) {

    let toast =
        document.getElementById("nexora-toast");

    if (!toast) {

        toast = document.createElement("div");

        toast.id = "nexora-toast";

        toast.setAttribute("role", "status");

        toast.style.position = "fixed";
        toast.style.left = "50%";
        toast.style.bottom = "28px";
        toast.style.transform = "translateX(-50%)";
        toast.style.zIndex = "99999";
        toast.style.padding = "12px 18px";
        toast.style.borderRadius = "12px";
        toast.style.background = "#101a31";
        toast.style.border = "1px solid #31589b";
        toast.style.color = "#ffffff";
        toast.style.fontWeight = "800";
        toast.style.fontSize = "14px";
        toast.style.boxShadow = "0 12px 35px rgba(0,0,0,.45)";
        toast.style.opacity = "0";
        toast.style.pointerEvents = "none";
        toast.style.transition =
            "opacity .2s ease, transform .2s ease";

        document.body.appendChild(toast);

    }

    toast.textContent = message;

    toast.style.opacity = "1";
    toast.style.transform =
        "translateX(-50%) translateY(-4px)";


    clearTimeout(
        window.nexoraToastTimer
    );


    window.nexoraToastTimer =
        setTimeout(() => {

            toast.style.opacity = "0";

            toast.style.transform =
                "translateX(-50%) translateY(0)";

        }, 2200);

}


/* ---------------------------------------------------------
   SERVER IP GLOBAL FUNCTION
   --------------------------------------------------------- */

window.copyServerIP = copyServerIP;


/* ---------------------------------------------------------
   NEXORA GLOBAL HELPERS
   --------------------------------------------------------- */

window.Nexora = {

    config: NEXORA_CONFIG,

    copyIP: copyServerIP,

    toast: showToast,

    openDiscord: () => {
        window.open(
            NEXORA_CONFIG.discord,
            "_blank",
            "noopener,noreferrer"
        );
    }

};


/* ---------------------------------------------------------
   EXTERNAL LINK SECURITY
   --------------------------------------------------------- */

document.querySelectorAll(
    'a[target="_blank"]'
).forEach(link => {

    const current =
        link.getAttribute("rel") || "";

    if (!current.includes("noopener")) {
        link.setAttribute(
            "rel",
            `${current} noopener noreferrer`.trim()
        );
    }

});


/* =========================================================
   END OF NEXORA MAIN JAVASCRIPT
   ========================================================= */