/* =========================================================
   SIOMAMARKET — COMPLETE APPLICATION
   Products, Authentication, Selling, Favorites and Messages
   ========================================================= */

"use strict";

/* =========================================================
   1. CONFIGURATION
   ========================================================= */

const SUPABASE_URL = "https://luolbdjonzissgskjupd.supabase.co";
const SUPABASE_KEY = "sb_publishable_bMHzln24777v-kDo-uE8Eg_AYUWThn-";

const IMAGE_BUCKET = "Product-images";
const MAX_PRODUCT_IMAGES = 3;
const MAX_IMAGE_SIZE = 6 * 1024 * 1024;

const LISTING_COLUMNS =
    "id, title, description, price, category, location, " +
    "image_url, seller_name, seller_phone, status, created_at, user_id";

let supabaseClient = null;
let currentUser = null;
let isRegistering = false;
let selectedProductImages = [];
let favoriteListingIds = new Set();
let showingFavorites = false;

let currentConversationId = null;
let currentConversationListingId = null;
let currentConversationRecipientId = null;

let messageRefreshTimer = null;
let applicationInitialized = false;
let messagingInitialized = false;
let searchRequestNumber = 0;

/* =========================================================
   2. BASIC HELPERS
   ========================================================= */

function byId(id) {
    return document.getElementById(id);
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function formatPrice(price) {
    const amount = Number(price);

    if (!Number.isFinite(amount)) {
        return "Price on request";
    }

    return "K" + amount.toLocaleString("en-ZM", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

function showProductMessage(message, isError = false) {
    const element = byId("productMessage");

    if (!element) return;

    element.textContent = message;
    element.classList.toggle("error", isError);
}

function showSellMessage(message, isError = false) {
    const element = byId("sellMessage");

    if (!element) return;

    element.textContent = message;
    element.classList.toggle("error", isError);
}

function showAuthMessage(message, isError = false) {
    const element = byId("authMessage");

    if (!element) return;

    element.textContent = message;
    element.classList.toggle("error", isError);
}

function reportError(context, error) {
    console.error("[SiomaMarket] " + context, error);

    return error?.message || "Something went wrong. Please try again.";
}

function getProductImages(value) {
    if (!value) return [];

    if (Array.isArray(value)) {
        return value.filter(item => typeof item === "string");
    }

    if (typeof value !== "string") {
        return [];
    }

    try {
        const parsed = JSON.parse(value);

        if (Array.isArray(parsed)) {
            return parsed.filter(item => typeof item === "string");
        }
    } catch (_) {
        // Older listings may store one image URL as plain text.
    }

    return [value];
}

function getPrimaryImage(listing) {
    return getProductImages(listing.image_url)[0] ||
        "https://placehold.co/600x400?text=SiomaMarket";
}

function openModal(id) {
    const modal = byId(id);

    if (!modal) {
        console.warn("Modal not found:", id);
        return;
    }

    modal.hidden = false;
    modal.style.display = "";

    document.body.classList.add("modal-open");
}

function closeModal(id) {
    const modal = byId(id);

    if (!modal) return;

    modal.hidden = true;
    modal.style.display = "";

    if (!document.querySelector(".app-modal:not([hidden])")) {
        document.body.classList.remove("modal-open");
    }

    if (id === "messagesModal") {
        stopMessageRefresh();
    }
}

function closeAllModals() {
    document.querySelectorAll(".app-modal").forEach(modal => {
        modal.hidden = true;
        modal.style.display = "";
    });

    document.body.classList.remove("modal-open");

    stopMessageRefresh();
}

function stopMessageRefresh() {
    if (messageRefreshTimer) {
        clearInterval(messageRefreshTimer);
        messageRefreshTimer = null;
    }
}

function showLoginModal(message = "") {
    setAuthMode(false);

    if (message) {
        showAuthMessage(message);
    }

    openModal("authModal");
}

/* =========================================================
   3. INITIALIZE THE APPLICATION
   ========================================================= */

async function initializeSiomaMarket() {
    if (applicationInitialized) return;

    applicationInitialized = true;

    if (!window.supabase?.createClient) {
        showProductMessage(
            "Supabase failed to load. Check the script tags in index.html.",
            true
        );

        console.error("Supabase JavaScript library is unavailable.");
        return;
    }

    try {
        supabaseClient = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY
        );

        connectButtons();
        connectForms();
        connectPhotoInput();
        connectSearch();
        connectMessagingSystem();

        await restoreSession();
        await loadListings();
        await refreshFavorites();
        await updateUnreadMessagesBadge();

        supabaseClient.auth.onAuthStateChange((_event, session) => {
            currentUser = session?.user || null;

            updateAccountButtons();

            // Run additional requests outside the auth callback.
            setTimeout(async () => {
                await refreshFavorites();
                await updateUnreadMessagesBadge();

                if (showingFavorites && currentUser) {
                    await showFavorites();
                }
            }, 0);
        });

        console.log("SiomaMarket initialized successfully.");

    } catch (error) {
        reportError("Application initialization failed", error);

        showProductMessage(
            "SiomaMarket could not initialize. Check the browser console.",
            true
        );
    }
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeSiomaMarket,
        { once: true }
    );
} else {
    initializeSiomaMarket();
}

/* =========================================================
   4. BUTTONS AND MODALS
   ========================================================= */

function connectButtons() {
    ["accountButton", "navAccountButton"].forEach(id => {
        byId(id)?.addEventListener("click", handleAccountClick);
    });

    ["sellButton", "startSellingButton", "navSellButton"].forEach(id => {
        byId(id)?.addEventListener("click", handleSellClick);
    });

    byId("buyButton")?.addEventListener("click", () => {
        showingFavorites = false;

        byId("products")?.scrollIntoView({
            behavior: "smooth"
        });
    });

    byId("favoritesButton")?.addEventListener("click", showFavorites);

    document.querySelectorAll("[data-close-modal]").forEach(button => {
        button.addEventListener("click", () => {
            closeModal(button.dataset.closeModal);
        });
    });

    document.querySelectorAll(".app-modal").forEach(modal => {
        modal.addEventListener("click", event => {
            if (event.target === modal) {
                closeModal(modal.id);
            }
        });
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeAllModals();
        }
    });

    byId("authToggleLink")?.addEventListener("click", event => {
        event.preventDefault();
        setAuthMode(!isRegistering);
    });
}

async function handleAccountClick() {
    if (currentUser) {
        if (confirm("Do you want to log out of SiomaMarket?")) {
            await logoutUser();
        }

        return;
    }

    showLoginModal();
}

async function handleSellClick() {
    if (!currentUser) {
        showLoginModal(
            "Please log in or register before selling a product."
        );

        return;
    }

    showSellMessage("");
    openModal("sellModal");
}

/* =========================================================
   5. AUTHENTICATION
   ========================================================= */

async function restoreSession() {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        reportError("Session restoration failed", error);
        return;
    }

    currentUser = data.session?.user || null;

    updateAccountButtons();
}

function updateAccountButtons() {
    ["accountButton", "navAccountButton"].forEach(id => {
        const button = byId(id);

        if (!button) return;

        button.setAttribute(
            "aria-label",
            currentUser ? "Account and logout" : "Log in or register"
        );
    });
}

function connectForms() {
    byId("authForm")?.addEventListener("submit", handleAuthSubmit);
    byId("sellForm")?.addEventListener("submit", handlePublishListing);
}

function setAuthMode(registering) {
    isRegistering = registering;

    const title = byId("authTitle");
    const submit = byId("authSubmitBtn");
    const toggleText = byId("authToggleText");
    const toggleLink = byId("authToggleLink");
    const registerFields = byId("registerFields");
    const password = byId("authPassword");

    if (title) {
        title.textContent = registering
            ? "Create Your Account"
            : "Welcome to SiomaMarket";
    }

    if (submit) {
        submit.textContent = registering ? "Create Account" : "Log In";
    }

    if (toggleText) {
        toggleText.textContent = registering
            ? "Already have an account?"
            : "Don't have an account?";
    }

    if (toggleLink) {
        toggleLink.textContent = registering ? "Log In" : "Register";
    }

    if (registerFields) {
        registerFields.hidden = !registering;
    }

    if (password) {
        password.autocomplete = registering
            ? "new-password"
            : "current-password";
    }

    ["authFullName", "authPhone", "authLocation"].forEach(id => {
        byId(id)?.toggleAttribute("required", registering);
    });

    showAuthMessage(
        registering
            ? "Create your free SiomaMarket account."
            : "Log in to buy or sell on SiomaMarket."
    );
}

async function handleAuthSubmit(event) {
    event.preventDefault();

    const submit = byId("authSubmitBtn");
    const email = byId("authEmail")?.value.trim();
    const password = byId("authPassword")?.value;

    if (!email || !password) {
        showAuthMessage(
            "Enter your email address and password.",
            true
        );

        return;
    }

    if (password.length < 6) {
        showAuthMessage(
            "Your password must contain at least 6 characters.",
            true
        );

        return;
    }

    if (submit) {
        submit.disabled = true;
        submit.textContent = "Please wait...";
    }

    try {
        if (isRegistering) {
            await registerUser(email, password);
        } else {
            await loginUser(email, password);
        }
    } catch (error) {
        showAuthMessage(
            reportError("Authentication failed", error),
            true
        );
    } finally {
        if (submit) {
            submit.disabled = false;
            submit.textContent = isRegistering
                ? "Create Account"
                : "Log In";
        }
    }
}

async function registerUser(email, password) {
    const fullName = byId("authFullName")?.value.trim();
    const phone = byId("authPhone")?.value.trim();
    const location = byId("authLocation")?.value.trim();

    if (!fullName || !phone || !location) {
        throw new Error("Complete all registration fields.");
    }

    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                phone,
                location
            }
        }
    });

    if (error) throw error;

    if (data.user && data.session) {
        currentUser = data.user;

        await saveSellerProfile({
            id: currentUser.id,
            full_name: fullName,
            phone,
            location
        });

        updateAccountButtons();
        closeModal("authModal");

        await refreshFavorites();
        await updateUnreadMessagesBadge();

        alert("Your SiomaMarket account has been created.");
        return;
    }

    showAuthMessage(
        "Registration submitted. Check your email to confirm your account, then log in."
    );

    setAuthMode(false);
}

async function loginUser(email, password) {
const { data, error } =
await supabaseClient.auth.signInWithPassword({
email,
password
});

if (error) throw error;

currentUser = data.user;

updateAccountButtons();
closeModal("authModal");

await refreshFavorites();
await updateUnreadMessagesBadge();

// Keep the user on the marketplace after login.
// Open the Seller Dashboard only when requested.
alert("Welcome back to SiomaMarket!");
}

// Open the Seller Dashboard automatically after login.
const dashboard = document.getElementById("sellerDashboard");
const home = document.getElementById("home");

if (dashboard) {
    dashboard.hidden = false;

    if (home) {
        home.hidden = true;
    }

    await loadSellerDashboard();

    dashboard.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

alert("Welcome back to SiomaMarket!");

}

async function logoutUser() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        alert("Unable to log out: " + error.message);
        return;
    }

    currentUser = null;
    favoriteListingIds.clear();
    showingFavorites = false;

    currentConversationId = null;
    currentConversationListingId = null;
    currentConversationRecipientId = null;

    stopMessageRefresh();

    updateAccountButtons();
    updateFavoriteButtons();
    closeAllModals();

    await loadListings();

    alert("You have logged out of SiomaMarket.");
}

async function saveSellerProfile(profile) {
    const { error } = await supabaseClient
        .from("seller_profiles")
        .upsert(profile, { onConflict: "id" });

    if (error) {
        throw new Error(
            "Your account exists, but your seller profile could not be saved: " +
            error.message
        );
    }
}

/* =========================================================
   6. PRODUCT PHOTO SELECTION
   ========================================================= */

function connectPhotoInput() {
    const input = byId("sellImage");

    if (!input) return;

    input.setAttribute("accept", "image/*");
    input.setAttribute("multiple", "");

    input.addEventListener("change", () => {
        const files = Array.from(input.files || []);
        const errors = [];

        selectedProductImages = [];

        if (files.length > MAX_PRODUCT_IMAGES) {
            errors.push("Choose no more than 3 photos.");
        }

        files.slice(0, MAX_PRODUCT_IMAGES).forEach(file => {
            if (!file.type.startsWith("image/")) {
                errors.push(file.name + " is not an image.");
                return;
            }

            if (file.size > MAX_IMAGE_SIZE) {
                errors.push(file.name + " exceeds the 6 MB limit.");
                return;
            }

            selectedProductImages.push(file);
        });

        renderImagePreviews();

        showSellMessage(
            errors.join(" "),
            errors.length > 0
        );
    });
}

function renderImagePreviews() {
    const preview = byId("imagePreview");
    const counter = byId("photoCounter");

    if (counter) {
        counter.textContent =
            selectedProductImages.length + " / 3 photos selected";
    }

    if (!preview) return;

    preview.replaceChildren();

    selectedProductImages.forEach(file => {
        const image = document.createElement("img");
        const objectUrl = URL.createObjectURL(file);

        image.src = objectUrl;
        image.alt = "Selected product photo";
        image.style.width = "90px";
        image.style.height = "90px";
        image.style.objectFit = "cover";
        image.style.borderRadius = "8px";
        image.style.margin = "4px";

        image.addEventListener("load", () => {
            URL.revokeObjectURL(objectUrl);
        }, { once: true });

        image.addEventListener("error", () => {
            URL.revokeObjectURL(objectUrl);
        }, { once: true });

        preview.appendChild(image);
    });
}

/* =========================================================
   7. UPLOAD PHOTOS
   ========================================================= */

async function uploadProductImages(files) {
    const uploadedUrls = [];

    for (const file of files) {
        const extension = (
            file.name.split(".").pop() || "jpg"
        ).toLowerCase().replace(/[^a-z0-9]/g, "");

        const uniqueName = globalThis.crypto?.randomUUID
            ? crypto.randomUUID()
            : Date.now() + "-" +
                Math.random().toString(36).slice(2);

        const filePath =
            currentUser.id + "/" + uniqueName + "." + extension;

        const { error } = await supabaseClient.storage
            .from(IMAGE_BUCKET)
            .upload(filePath, file, {
                cacheControl: "3600",
                upsert: false,
                contentType: file.type
            });

        if (error) {
            throw new Error("Photo upload failed: " + error.message);
        }

        const { data } = supabaseClient.storage
            .from(IMAGE_BUCKET)
            .getPublicUrl(filePath);

        if (!data?.publicUrl) {
            throw new Error("Unable to obtain the uploaded photo URL.");
        }

        uploadedUrls.push(data.publicUrl);
    }

    return uploadedUrls;
}

/* =========================================================
   8. PUBLISH A PRODUCT
   ========================================================= */

async function handlePublishListing(event) {
    event.preventDefault();

    if (!currentUser) {
        closeModal("sellModal");

        showLoginModal(
            "Please log in before publishing a product."
        );

        return;
    }

    const title = byId("sellTitle")?.value.trim();
    const description = byId("sellDescription")?.value.trim();
    const priceValue = byId("sellPrice")?.value;
    const price = Number(priceValue);
    const category = byId("sellCategory")?.value;
    const location = byId("sellLocation")?.value.trim();
    const sellerName = byId("sellerName")?.value.trim();
    const sellerPhone = byId("sellerPhone")?.value.trim();
    const button = byId("publishListingBtn");

    if (
        !title ||
        !description ||
        priceValue === "" ||
        !Number.isFinite(price) ||
        price <= 0 ||
        !category ||
        !location ||
        !sellerName ||
        !sellerPhone
    ) {
        showSellMessage(
            "Please complete every required field correctly.",
            true
        );

        return;
    }

    if (selectedProductImages.length > MAX_PRODUCT_IMAGES) {
        showSellMessage("Choose no more than 3 photos.", true);
        return;
    }

    if (selectedProductImages.some(file =>
        !file.type.startsWith("image/") ||
        file.size > MAX_IMAGE_SIZE
    )) {
        showSellMessage(
            "Each photo must be an image no larger than 6 MB.",
            true
        );

        return;
    }

    if (button) {
        button.disabled = true;
        button.textContent = "Publishing...";
    }

    try {
        showSellMessage("Uploading your product photos...");

        const imageUrls = await uploadProductImages(
            selectedProductImages
        );

        showSellMessage("Saving your product...");

        const listing = {
            user_id: currentUser.id,
            title,
            description,
            price,
            category,
            location,
            seller_name: sellerName,
            seller_phone: sellerPhone,
            image_url: JSON.stringify(imageUrls),
            status: "pending"
        };

        const { error } = await supabaseClient
            .from("listings")
            .insert(listing);

        if (error) throw error;

        byId("sellForm")?.reset();

        selectedProductImages = [];
        renderImagePreviews();

        if (byId("sellLocation")) {
            byId("sellLocation").value = "Sioma";
        }

        closeModal("sellModal");

        showingFavorites = false;

        await loadListings();

        showProductMessage(
    "Your product was submitted and is awaiting administrator approval."
);

     alert(
    "Your product has been submitted successfully. " +
    "It will appear publicly after administrator approval."
);   
    } catch (error) {
        showSellMessage(
            reportError("Product publishing failed", error),
            true
        );
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = "Publish Product";
        }
    }
}

/* =========================================================
   9. LOAD ACTIVE PRODUCTS
   ========================================================= */

async function loadListings() {
    const grid = byId("productGrid");

    if (!grid || !supabaseClient) return;

    showingFavorites = false;

    showProductMessage("Loading products...");

    const { data, error } = await supabaseClient
        .from("listings")
        .select(LISTING_COLUMNS)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(24);

    if (error) {
        reportError("Loading products failed", error);

        grid.replaceChildren();

        showProductMessage(
            "Products could not be loaded. Please refresh and try again.",
            true
        );

        return;
    }

    grid.replaceChildren();

    if (!data || data.length === 0) {
        showProductMessage(
            "No products yet. Be the first to sell on SiomaMarket!"
        );

        return;
    }

    data.forEach(listing => {
        grid.appendChild(createProductCard(listing));
    });

    updateFavoriteButtons();
    showProductMessage("");
}

/* =========================================================
   10. PRODUCT CARDS
   ========================================================= */

function createProductCard(listing) {
    const card = document.createElement("article");

    card.className = "product-card";

    const imageUrl = getPrimaryImage(listing);
    const title = escapeHTML(listing.title);
    const category = escapeHTML(listing.category);
    const location = escapeHTML(listing.location);
    const seller = escapeHTML(
        listing.seller_name || "Sioma seller"
    );

    card.innerHTML = `
        <img
            class="product-image"
            src="${escapeHTML(imageUrl)}"
            alt="${title}"
            loading="lazy"
        >

        <div class="product-info">
            <button
                type="button"
                class="favorite-button"
                data-favorite-id="${escapeHTML(listing.id)}"
                aria-label="Save ${title} to favorites"
                aria-pressed="false"
            >♡ Favorite</button>

            <p class="product-category">${category}</p>
            <h3 class="product-title">${title}</h3>
            <p class="product-price">${formatPrice(listing.price)}</p>
            <p class="product-location">${location}</p>
            <p class="product-seller">${seller}</p>

            <button
                type="button"
                class="view-product-button"
            >View Product</button>
        </div>
    `;

    const image = card.querySelector(".product-image");
    const favoriteButton = card.querySelector(".favorite-button");
    const viewButton = card.querySelector(".view-product-button");

    favoriteButton.addEventListener("click", async () => {
        await toggleFavorite(listing.id, favoriteButton);
    });

    viewButton.addEventListener("click", () => {
        showListingDetails(listing);
    });

    image.addEventListener("click", () => {
        showListingDetails(listing);
    });

    image.addEventListener("error", () => {
        image.src = "https://placehold.co/600x400?text=SiomaMarket";
    }, { once: true });

    return card;
}
/* =========================================================
   11. PRODUCT DETAILS AND SELLER CONTACT
========================================================= */

function showListingDetails(listing) {
    if (!listing) return;

    // Remove an older product-details modal, if one exists.
    document.getElementById("productDetailsModal")?.remove();

    const images = getProductImages(listing.image_url);
    const phone = normalizeZambianPhone(listing.seller_phone);
    const sellerId = listing.user_id || "";
    const isOwnProduct = currentUser && sellerId === currentUser.id;

    const modal = document.createElement("div");
    modal.id = "productDetailsModal";
    modal.className = "app-modal";
    modal.style.display = "flex";

    const content = document.createElement("div");
    content.className = "app-modal-content";
    content.style.maxWidth = "560px";
    content.style.maxHeight = "90vh";
    content.style.overflowY = "auto";
    content.style.position = "relative";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "modal-close";
    closeButton.setAttribute("aria-label", "Close product details");
    closeButton.textContent = "×";
    closeButton.addEventListener("click", () => modal.remove());

    const title = document.createElement("h2");
    title.textContent = listing.title || "Product details";

    const image = document.createElement("img");
    image.src = getPrimaryImage(listing);
    image.alt = listing.title || "Product photo";
    image.style.width = "100%";
    image.style.maxHeight = "320px";
    image.style.objectFit = "contain";
    image.style.borderRadius = "12px";
    image.style.background = "#f4f7f5";

    image.addEventListener("error", () => {
        image.src = "https://placehold.co/600x400?text=SiomaMarket";
    }, { once: true });

    const price = document.createElement("h3");
    price.textContent = formatPrice(listing.price);
    price.style.color = "#087f3d";

    const information = document.createElement("div");
    information.style.whiteSpace = "pre-wrap";
    information.style.overflowWrap = "anywhere";
    information.textContent =
        "Category: " + (listing.category || "Other") + "\n" +
        "Location: " + (listing.location || "Not provided") + "\n" +
        "Seller: " + (listing.seller_name || "SiomaMarket seller") + "\n\n" +
        (listing.description || "No description provided.");

    content.append(
        closeButton,
        image,
        title,
        price,
        information
    );

    if (images.length > 1) {
        const gallery = document.createElement("div");
        gallery.style.display = "flex";
        gallery.style.gap = "8px";
        gallery.style.overflowX = "auto";
        gallery.style.margin = "12px 0";

        images.forEach((imageUrl, index) => {
            const thumbnail = document.createElement("button");
            thumbnail.type = "button";
            thumbnail.style.padding = "2px";
            thumbnail.style.border = "1px solid #dce5df";
            thumbnail.style.borderRadius = "8px";
            thumbnail.style.background = "#fff";

            const thumbImage = document.createElement("img");
            thumbImage.src = imageUrl;
            thumbImage.alt = "Product photo " + (index + 1);
            thumbImage.style.width = "68px";
            thumbImage.style.height = "68px";
            thumbImage.style.objectFit = "cover";
            thumbImage.style.borderRadius = "6px";

            thumbnail.appendChild(thumbImage);
            thumbnail.addEventListener("click", () => {
                image.src = imageUrl;
            });

            gallery.appendChild(thumbnail);
        });

        content.insertBefore(gallery, title);
    }

    const actions = document.createElement("div");
    actions.style.display = "grid";
    actions.style.gridTemplateColumns = "1fr";
    actions.style.gap = "10px";
    actions.style.marginTop = "18px";

    function makeActionButton(label, callback, background) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.style.width = "100%";
        button.style.padding = "13px";
        button.style.border = "none";
        button.style.borderRadius = "10px";
        button.style.background = background;
        button.style.color = "#fff";
        button.style.fontWeight = "700";
        button.style.cursor = "pointer";
        button.addEventListener("click", callback);
        return button;
    }

    if (phone) {
        actions.appendChild(
            makeActionButton("📞 Call Seller", () => {
                window.location.href = "tel:+" + phone;
            }, "#087f3d")
        );

        actions.appendChild(
            makeActionButton("🟢 WhatsApp Seller", () => {
                const message = encodeURIComponent(
                    "Hello, I found your product on SiomaMarket: " +
                    listing.title
                );

                window.open(
                    "https://wa.me/" + phone + "?text=" + message,
                    "_blank",
                    "noopener,noreferrer"
                );
            }, "#168447")
        );
    } else {
        const phoneNotice = document.createElement("p");
        phoneNotice.textContent =
            "The seller has not provided a valid phone number.";
        actions.appendChild(phoneNotice);
    }

    if (!isOwnProduct) {
        actions.appendChild(
            makeActionButton("💬 Message Seller", async () => {
                await startConversationForListing(listing);
            }, "#075b2d")
        );
    } else {
        const ownNotice = document.createElement("p");
        ownNotice.textContent = "This is your own listing.";
        actions.appendChild(ownNotice);
    }

    content.appendChild(actions);
    modal.appendChild(content);

    modal.addEventListener("click", event => {
        if (event.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
    document.body.classList.add("modal-open");

    modal.querySelector(".modal-close")?.focus();
}

function normalizeZambianPhone(value) {
    let phone = String(value || "").replace(/\D/g, "");

    if (phone.startsWith("00")) {
        phone = phone.slice(2);
    }

    if (phone.startsWith("0")) {
        phone = "260" + phone.slice(1);
    } else if (phone.length === 9 && phone.startsWith("9")) {
        phone = "260" + phone;
    }

    if (!/^260\d{9}$/.test(phone)) {
        return "";
    }

    return phone;
}

/* =========================================================
   12. SEARCH AND CATEGORY FILTERS
   ========================================================= */

function connectSearch() {
    const form = byId("searchForm");
    const input = byId("searchInput");

    form?.addEventListener("submit", async event => {
        event.preventDefault();

        await searchListings(input?.value.trim() || "");
    });

    document.querySelectorAll("[data-category]").forEach(button => {
        button.addEventListener("click", async () => {
            const category = button.dataset.category;

            if (!category) return;

            await searchListings("", category);
        });
    });
}

async function searchListings(searchText = "", category = "") {
    const grid = byId("productGrid");

    if (!grid || !supabaseClient) return;

    const requestNumber = ++searchRequestNumber;

    showingFavorites = false;

    showProductMessage("Searching products...");

    let query = supabaseClient
        .from("listings")
        .select(LISTING_COLUMNS)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(100);

    const cleanedSearch = String(searchText || "")
        .trim();

    if (cleanedSearch) {
        query = query.ilike(
            "title",
            "%" + cleanedSearch + "%"
        );
    }

    if (category) {
        query = query.ilike("category", category);
    }

    const { data, error } = await query;

    if (requestNumber !== searchRequestNumber) return;

    if (error) {
        reportError("Search failed", error);

        showProductMessage("Search failed. Please try again.", true);
        return;
    }

    grid.replaceChildren();

    if (!data || data.length === 0) {
        showProductMessage("No matching products found.");

        byId("products")?.scrollIntoView({
            behavior: "smooth"
        });

        return;
    }

    data.forEach(listing => {
        grid.appendChild(createProductCard(listing));
    });

    updateFavoriteButtons();
    showProductMessage("");

    byId("products")?.scrollIntoView({
        behavior: "smooth"
    });
}

/* =========================================================
   13. FAVORITES
   ========================================================= */

async function loadFavoriteIds() {
    favoriteListingIds = new Set();

    if (!currentUser || !supabaseClient) return;

    const { data, error } = await supabaseClient
        .from("favorites")
        .select("listing_id")
        .eq("user_id", currentUser.id);

    if (error) {
        reportError("Unable to load favorites", error);
        return;
    }

    (data || []).forEach(item => {
        favoriteListingIds.add(String(item.listing_id));
    });
}

async function toggleFavorite(listingId, button) {
    if (!currentUser) {
        showLoginModal("Please log in to save favorite products.");
        return;
    }

    const id = String(listingId);
    const alreadyFavorite = favoriteListingIds.has(id);

    if (button) button.disabled = true;

    try {
        if (alreadyFavorite) {
            const { error } = await supabaseClient
                .from("favorites")
                .delete()
                .eq("user_id", currentUser.id)
                .eq("listing_id", listingId);

            if (error) throw error;

            favoriteListingIds.delete(id);

        } else {
            const { error } = await supabaseClient
                .from("favorites")
                .insert({
                    user_id: currentUser.id,
                    listing_id: listingId
                });

            if (error) throw error;

            favoriteListingIds.add(id);
        }

        updateFavoriteButtons();

        if (showingFavorites) {
            await showFavorites();
        }

    } catch (error) {
        alert(
            "Unable to update favorites. Check your database permissions.\n\n" +
            reportError("Favorite update failed", error)
        );
    } finally {
        if (button) button.disabled = false;
    }
}

function updateFavoriteButtons() {
    document.querySelectorAll("[data-favorite-id]").forEach(button => {
        const id = String(button.dataset.favoriteId);
        const saved = favoriteListingIds.has(id);

        button.classList.toggle("is-favorite", saved);

        button.textContent = saved
            ? "♥ Saved"
            : "♡ Favorite";

        button.setAttribute(
            "aria-pressed",
            saved ? "true" : "false"
        );
    });
}

async function showFavorites() {
    if (!currentUser) {
        showLoginModal("Please log in to view your favorites.");
        return;
    }

    const grid = byId("productGrid");

    if (!grid || !supabaseClient) return;

    showingFavorites = true;

    showProductMessage("Loading your favorite products...");

    grid.replaceChildren();

    await loadFavoriteIds();

    const ids = Array.from(favoriteListingIds);

    if (ids.length === 0) {
        showProductMessage(
            "You have no favorites yet. Browse products and tap Favorite to save them."
        );

        byId("products")?.scrollIntoView({
            behavior: "smooth"
        });

        return;
    }

    const { data, error } = await supabaseClient
        .from("listings")
        .select(LISTING_COLUMNS)
        .in("id", ids)
        .eq("status", "active")
        .order("created_at", { ascending: false });

    if (error) {
        reportError("Unable to load favorite products", error);

        showProductMessage(
            "Unable to load your favorites. Please try again.",
            true
        );

        return;
    }

    grid.replaceChildren();

    if (!data || data.length === 0) {
        showProductMessage("Your saved products are no longer available.");
        return;
    }

    data.forEach(listing => {
        grid.appendChild(createProductCard(listing));
    });

    updateFavoriteButtons();
    showProductMessage("");

    byId("products")?.scrollIntoView({
        behavior: "smooth"
    });
}

async function refreshFavorites() {
    favoriteListingIds = new Set();

    if (currentUser && supabaseClient) {
        await loadFavoriteIds();
    }

    updateFavoriteButtons();
}

/* =========================================================
   14. MESSAGING BUTTONS AND EVENTS
   ========================================================= */

function connectMessagingSystem() {
    if (messagingInitialized) return;

    messagingInitialized = true;

    [
        "navMessagesButton",
        "messagesButton",
        "accountMessagesButton"
    ].forEach(id => {
        byId(id)?.addEventListener("click", event => {
            event.preventDefault();
            openMessagesWindow();
        });
    });

    byId("sendMessageForm")?.addEventListener("submit", async event => {
        event.preventDefault();
        await sendCurrentMessage();
    });

    byId("conversationList")?.addEventListener("click", async event => {
        const button = event.target.closest("[data-conversation-id]");

        if (!button) return;

        await openConversation(
            button.getAttribute("data-conversation-id"),
            button.getAttribute("data-listing-id") || null,
            button.getAttribute("data-recipient-id") || null
        );
    });

    byId("messagesModal")?.addEventListener("click", event => {
        if (event.target === byId("messagesModal")) {
            closeMessagesWindow();
        }
    });
}

/* =========================================================
   15. OPEN AND CLOSE MESSAGES
   ========================================================= */

async function openMessagesWindow() {
    if (!currentUser) {
        showLoginModal("Please log in to view your messages.");
        return;
    }

    const modal = byId("messagesModal");

    if (modal) {
        modal.hidden = false;
        modal.style.display = "flex";
        modal.classList.add("active");
        modal.setAttribute("aria-hidden", "false");

        document.body.classList.add("modal-open");
    }

    const list = byId("messagesList");

    if (list) {
        list.textContent = "Select a conversation to view messages.";
    }

    await loadConversations();

    stopMessageRefresh();

    messageRefreshTimer = setInterval(async () => {
        if (!currentUser) {
            stopMessageRefresh();
            return;
        }

        await updateUnreadMessagesBadge();

        if (currentConversationId) {
            await loadConversationMessages(
                currentConversationId,
                false
            );
        }
    }, 10000);
}

function closeMessagesWindow() {
    const modal = byId("messagesModal");

    if (modal) {
        modal.hidden = true;
        modal.style.display = "";
        modal.classList.remove("active");
        modal.setAttribute("aria-hidden", "true");
    }

    stopMessageRefresh();

    if (!document.querySelector(".app-modal:not([hidden])")) {
        document.body.classList.remove("modal-open");
    }
}

/* =========================================================
   16. LOAD CONVERSATIONS
   ========================================================= */

async function loadConversations() {
    const conversationList = byId("conversationList");

    if (!conversationList) {
        console.warn("conversationList is missing from index.html.");
        return;
    }

    if (!currentUser) {
        conversationList.textContent =
            "Please log in to view your messages.";
        return;
    }

    conversationList.textContent = "Loading conversations...";

    try {
        const { data: conversations, error } = await supabaseClient
            .from("conversations")
            .select(
                "id, listing_id, buyer_id, seller_id, created_at, updated_at"
            )
            .or(
                "buyer_id.eq." + currentUser.id +
                ",seller_id.eq." + currentUser.id
            )
            .order("updated_at", { ascending: false });

        if (error) throw error;

        if (!conversations || conversations.length === 0) {
            conversationList.textContent =
                "You have no conversations yet.";
            return;
        }

        const listingIds = [
            ...new Set(
                conversations
                    .map(conversation => conversation.listing_id)
                    .filter(id => id !== null && id !== undefined)
            )
        ];

        const listingMap = {};

        if (listingIds.length > 0) {
            const { data: listings, error: listingsError } =
                await supabaseClient
                    .from("listings")
                    .select("id, title")
                    .in("id", listingIds);

            if (listingsError) throw listingsError;

            (listings || []).forEach(listing => {
                listingMap[String(listing.id)] = listing.title;
            });
        }

        conversationList.replaceChildren();

        conversations.forEach(conversation => {
            const isBuyer =
                conversation.buyer_id === currentUser.id;

            const recipientId = isBuyer
                ? conversation.seller_id
                : conversation.buyer_id;

            const title =
                listingMap[String(conversation.listing_id)] ||
                "Marketplace conversation";

            const button = document.createElement("button");

            button.type = "button";
            button.className = "conversation-item";

            button.dataset.conversationId = conversation.id;
            button.dataset.listingId = conversation.listing_id || "";
            button.dataset.recipientId = recipientId || "";

            button.style.width = "100%";
            button.style.textAlign = "left";
            button.style.padding = "12px";
            button.style.marginBottom = "8px";
            button.style.border = "1px solid #e2e8e5";
            button.style.borderRadius = "10px";
            button.style.background = "#ffffff";
            button.style.cursor = "pointer";

            const heading = document.createElement("strong");
            heading.textContent = title;

            const subtitle = document.createElement("div");

            subtitle.textContent = isBuyer
                ? "Seller conversation"
                : "Buyer conversation";

            subtitle.style.fontSize = "13px";
            subtitle.style.marginTop = "4px";
            subtitle.style.color = "#64748b";

            button.appendChild(heading);
            button.appendChild(subtitle);

            conversationList.appendChild(button);
        });

        await updateUnreadMessagesBadge();

    } catch (error) {
        reportError("Could not load conversations", error);

        conversationList.textContent =
            "Unable to load conversations. Please try again.";
    }
}

/* =========================================================
   17. OPEN A CONVERSATION
   ========================================================= */

async function openConversation(
    conversationId,
    listingId = null,
    recipientId = null
) {
    if (!currentUser) {
        showLoginModal("Please log in to view messages.");
        return;
    }

    currentConversationId = conversationId;
    currentConversationListingId = listingId;
    currentConversationRecipientId = recipientId;

    const heading = byId("conversationHeading");
    const input = byId("messageInput");
    const sendButton = byId("sendMessageButton");
    const status = byId("messageStatus");

    if (heading) {
        heading.textContent = "Conversation";
    }

    if (input) {
        input.disabled = false;
    }

    if (sendButton) {
        sendButton.disabled = false;
    }

    if (status) {
        status.textContent = "";
    }

    document.querySelectorAll("[data-conversation-id]").forEach(button => {
        button.classList.toggle(
            "active",
            button.getAttribute("data-conversation-id") ===
                String(conversationId)
        );
    });

    await loadConversationMessages(conversationId, true);
}

/* =========================================================
   18. LOAD CONVERSATION MESSAGES
   ========================================================= */

async function loadConversationMessages(
    conversationId,
    markAsRead = true
) {
    const messagesList = byId("messagesList");

    if (!messagesList || !currentUser || !conversationId) return;

    try {
        const { data: messages, error } = await supabaseClient
            .from("messages")
            .select(
                "id, conversation_id, sender_id, message, created_at, is_read"
            )
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true });

        if (error) throw error;

        messagesList.replaceChildren();

        if (!messages || messages.length === 0) {
            messagesList.textContent =
                "No messages yet. Send the first message.";
            return;
        }

        const unreadIncomingIds = [];

        messages.forEach(message => {
            const isMine = message.sender_id === currentUser.id;

            const bubble = document.createElement("div");

            bubble.className = isMine
                ? "message-bubble message-mine"
                : "message-bubble message-theirs";

            bubble.style.maxWidth = "85%";
            bubble.style.padding = "10px 12px";
            bubble.style.marginBottom = "10px";
            bubble.style.borderRadius = "12px";
            bubble.style.whiteSpace = "pre-wrap";
            bubble.style.overflowWrap = "anywhere";

            if (isMine) {
                bubble.style.marginLeft = "auto";
                bubble.style.background = "#e8f6ee";
            } else {
                bubble.style.marginRight = "auto";
                bubble.style.background = "#f1f5f9";
            }

            const text = document.createElement("div");
            text.textContent = message.message || "";

            const timestamp = document.createElement("small");
            const date = message.created_at
                ? new Date(message.created_at)
                : null;

            timestamp.textContent =
                date && !Number.isNaN(date.getTime())
                    ? date.toLocaleString()
                    : "";

            timestamp.style.display = "block";
            timestamp.style.marginTop = "5px";
            timestamp.style.fontSize = "11px";
            timestamp.style.color = "#64748b";

            bubble.appendChild(text);
            bubble.appendChild(timestamp);

            messagesList.appendChild(bubble);

            if (
                markAsRead &&
                !isMine &&
                message.is_read === false
            ) {
                unreadIncomingIds.push(message.id);
            }
        });

        messagesList.scrollTop = messagesList.scrollHeight;

        if (unreadIncomingIds.length > 0) {
            const { error: readError } = await supabaseClient
                .from("messages")
                .update({ is_read: true })
                .in("id", unreadIncomingIds);

            if (readError) {
                reportError("Messages could not be marked as read", readError);
            }
        }

        await updateUnreadMessagesBadge();

    } catch (error) {
        reportError("Could not load messages", error);

        messagesList.textContent =
            "Unable to load messages. Please try again.";
    }
}

/* =========================================================
   19. SEND A MESSAGE
   ========================================================= */

async function sendCurrentMessage() {
    if (!currentUser) {
        showLoginModal("Please log in to send messages.");
        return;
    }

    if (!currentConversationId) {
        alert("Please select a conversation first.");
        return;
    }

    const input = byId("messageInput");
    const sendButton = byId("sendMessageButton");
    const status = byId("messageStatus");

    if (!input) return;

    const messageText = input.value.trim();

    if (!messageText) {
        if (status) status.textContent = "Type a message first.";
        return;
    }

    if (messageText.length > 5000) {
        if (status) {
            status.textContent =
                "Your message is too long. Please shorten it.";
        }

        return;
    }

    if (sendButton) sendButton.disabled = true;
    if (status) status.textContent = "Sending message...";

    try {
        const conversationId = currentConversationId;

        const { error } = await supabaseClient
            .from("messages")
            .insert({
                conversation_id: conversationId,
                sender_id: currentUser.id,
                message: messageText,
                is_read: false
            });

        if (error) throw error;

        input.value = "";

        const { error: updateError } = await supabaseClient
            .from("conversations")
            .update({
                updated_at: new Date().toISOString()
            })
            .eq("id", conversationId);

        if (updateError) {
            reportError(
                "Conversation timestamp could not be updated",
                updateError
            );
        }

        if (status) status.textContent = "Message sent.";

        await loadConversationMessages(conversationId, false);
        await loadConversations();
        await updateUnreadMessagesBadge();

    } catch (error) {
        if (status) {
            status.textContent =
                reportError("Could not send message", error);
        }
    } finally {
        if (sendButton) sendButton.disabled = false;
    }
}

/* =========================================================
   20. UNREAD MESSAGE BADGE
   ========================================================= */

async function updateUnreadMessagesBadge() {
    const badges = [
        byId("unreadMessagesBadge"),
        byId("messagesBadge")
    ].filter(Boolean);

    if (badges.length === 0) return;

    if (!currentUser || !supabaseClient) {
        badges.forEach(badge => {
            badge.textContent = "";
            badge.style.display = "none";
        });

        return;
    }

    try {
        const { data: conversations, error } = await supabaseClient
            .from("conversations")
            .select("id")
            .or(
                "buyer_id.eq." + currentUser.id +
                ",seller_id.eq." + currentUser.id
            );

        if (error) throw error;

        const conversationIds = (conversations || []).map(
            conversation => conversation.id
        );

        if (conversationIds.length === 0) {
            badges.forEach(badge => {
                badge.textContent = "";
                badge.style.display = "none";
            });

            return;
        }

        const { count, error: countError } = await supabaseClient
            .from("messages")
            .select("id", {
                count: "exact",
                head: true
            })
            .in("conversation_id", conversationIds)
            .neq("sender_id", currentUser.id)
            .eq("is_read", false);

        if (countError) throw countError;

        const unreadCount = count || 0;

        badges.forEach(badge => {
            badge.textContent =
                unreadCount > 99 ? "99+" : String(unreadCount);

            badge.style.display =
                unreadCount > 0 ? "inline-flex" : "none";
        });

    } catch (error) {
        reportError("Unread badge could not be updated", error);
    }
}

/* =========================================================
   21. START A CONVERSATION WITH A SELLER
   ========================================================= */

async function startConversationForListing(listing) {
if (!listing || !listing.id) {
alert("This listing could not be opened.");
return;
}

if (!currentUser) {
    showListingDetailsCloseMessage();
    showLoginModal("Please log in to message the seller.");
    return;
}

const sellerId = listing.user_id;

if (!sellerId) {
    alert(
        "This listing does not have a linked seller account. " +
        "Please contact the seller using the available phone number."
    );
    return;
}

if (sellerId === currentUser.id) {
    alert("You cannot start a conversation with yourself.");
    return;
}

const messageButton = Array.from(
    document.querySelectorAll("#productDetailsModal button")
).find(button =>
    button.textContent.trim().includes("Message Seller")
);
try {
    if (messageButton) {
        messageButton.disabled = true;
    }

    const { data: existingConversation, error: findError } =
        await supabaseClient
            .from("conversations")
            .select(
                "id, listing_id, buyer_id, seller_id, created_at, updated_at"
            )
            .eq("listing_id", listing.id)
            .eq("buyer_id", currentUser.id)
            .eq("seller_id", sellerId)
            .maybeSingle();

    if (findError) {
        throw findError;
    }

    let conversation = existingConversation;

    if (!conversation) {
        const { data, error } = await supabaseClient
            .from("conversations")
            .insert({
                listing_id: listing.id,
                buyer_id: currentUser.id,
                seller_id: sellerId
            })
            .select(
                "id, listing_id, buyer_id, seller_id, created_at, updated_at"
            )
            .single();

        if (error) {
            throw error;
        }

        conversation = data;
    }

    // Close product details before opening the messaging window.
    document.getElementById("productDetailsModal")?.remove();

    // Open the messaging window.
    await openMessagesWindow();

    // Select the correct conversation immediately.
    await openConversation(
        conversation.id,
        conversation.listing_id,
        sellerId
    );

    // Refresh the conversation list.
    await loadConversations();

    // Ensure the messaging window remains visible.
    const messagesModal = byId("messagesModal");

    if (messagesModal) {
        messagesModal.hidden = false;
        messagesModal.style.display = "flex";
        messagesModal.classList.add("active");
        messagesModal.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open");
    }

    byId("messageInput")?.focus();

} catch (error) {
    reportError("Could not start seller conversation", error);

    alert(
        "Could not start the conversation. Please try again. " +
        "If the problem continues, check your Supabase permissions."
    );

} finally {
    if (messageButton) {
        messageButton.disabled = false;
    }
}

}

function showListingDetailsCloseMessage() {
document.getElementById("productDetailsModal")?.remove();
}

/* =========================================================
   22. EXPOSE FUNCTIONS FOR HTML BUTTONS
   ========================================================= */

window.openSiomaMessages = openMessagesWindow;
window.closeSiomaMessages = closeMessagesWindow;
window.startConversationForListing = startConversationForListing;
window.refreshSiomaConversations = loadConversations;
window.loadSiomaListings = loadListings;
window.searchSiomaListings = searchListings;
/* ==================================================
SELLER DASHBOARD — DATA AND CONTROLS
================================================== */

async function loadSellerDashboard() {
const message = document.getElementById("sellerDashboardMessage");
const container = document.getElementById("sellerListingsContainer");

if (!supabaseClient || !currentUser) {
if (message) {
message.textContent = "Please log in to view your seller dashboard.";
}
return;
}

if (message) message.textContent = "Loading your products...";
if (container) container.replaceChildren();

try {
const { data, error } = await supabaseClient
.from("listings")
.select(LISTING_COLUMNS)
.eq("user_id", currentUser.id)
.order("created_at", { ascending: false });

if (error) throw error;

const listings = data || [];

const counts = {
  total: listings.length,
  pending: listings.filter(item => item.status === "pending").length,
  active: listings.filter(item => item.status === "active").length,
  rejected: listings.filter(item => item.status === "rejected").length
};

document.getElementById("sellerTotalCount").textContent = counts.total;
document.getElementById("sellerPendingCount").textContent = counts.pending;
document.getElementById("sellerActiveCount").textContent = counts.active;
document.getElementById("sellerRejectedCount").textContent = counts.rejected;

if (!container) return;

if (listings.length === 0) {
  if (message) {
    message.textContent = "You have not listed any products yet.";
  }
  return;
}

const fragment = document.createDocumentFragment();

listings.forEach(listing => {
  const card = document.createElement("article");
  card.className = "seller-listing-card";

  const image = document.createElement("img");
  image.className = "seller-listing-image";
  image.alt = listing.title || "Product image";
  image.loading = "lazy";

  const images = getProductImages(listing.image_url);
  image.src = images[0] || "";
  image.addEventListener("error", () => {
    image.style.visibility = "hidden";
  }, { once: true });

  const info = document.createElement("div");
  info.className = "seller-listing-info";

  const title = document.createElement("h4");
  title.textContent = listing.title || "Untitled product";

  const price = document.createElement("p");
  price.className = "seller-listing-price";
  price.textContent = formatPrice(listing.price);

  const status = document.createElement("span");
  status.className = "seller-listing-status";

  const safeStatus = ["pending", "active", "rejected", "sold"]
    .includes(listing.status) ? listing.status : "unknown";

  status.classList.add("status-" + safeStatus);
  status.textContent = safeStatus;

  info.append(title, price, status);
  card.append(image, info);
  fragment.appendChild(card);
});

container.appendChild(fragment);

if (message) {
  message.textContent = "Here are your products and their current statuses.";
}

} catch (error) {
console.error("Seller dashboard error:", error);

if (message) {
  message.textContent =
    "Could not load your products. Please refresh and try again.";
}

}
}

function openSellerDashboard() {
if (!currentUser) {
if (typeof openAuthModal === "function") {
openAuthModal();
} else {
document.getElementById("authModal")?.removeAttribute("hidden");
}
return;
}

const dashboard = document.getElementById("sellerDashboard");
if (!dashboard) return;

dashboard.hidden = false;
document.getElementById("home")?.setAttribute("hidden", "");
document.getElementById("sellerDashboard")
?.scrollIntoView({ behavior: "smooth", block: "start" });

loadSellerDashboard();
}

function closeSellerDashboard() {
const dashboard = document.getElementById("sellerDashboard");
if (dashboard) dashboard.hidden = true;

document.getElementById("home")?.removeAttribute("hidden");
document.getElementById("home")
?.scrollIntoView({ behavior: "smooth", block: "start" });
}

document.getElementById("closeSellerDashboard")
?.addEventListener("click", closeSellerDashboard);

document.getElementById("sellerAddProductButton")
?.addEventListener("click", () => {
closeSellerDashboard();

if (typeof handleSellClick === "function") {
  handleSellClick();
} else {
  document.getElementById("sellModal")?.removeAttribute("hidden");
}

});

/* Seller dashboard functions available for navigation. */
window.openSellerDashboard = openSellerDashboard;
window.loadSellerDashboard = loadSellerDashboard;
window.closeSellerDashboard = closeSellerDashboard;
/* ==================================================
ADD SELLER DASHBOARD ACCESS TO ACCOUNT MODAL
================================================== */

function addSellerDashboardAccountButton() {
const authModal = document.getElementById("authModal");
const modalContent = authModal?.querySelector(".app-modal-content");

if (!modalContent) return;

if (document.getElementById("openSellerDashboardButton")) return;

const button = document.createElement("button");

button.type = "button";
button.id = "openSellerDashboardButton";
button.className = "primary-button";
button.textContent = "📦 My Seller Dashboard";
button.style.width = "100%";
button.style.marginTop = "14px";

button.addEventListener("click", async () => {
  authModal.setAttribute("hidden", "");

  const dashboard = document.getElementById("sellerDashboard");

  if (!dashboard) {
    alert("Seller Dashboard section was not found. Please check index.html.");
    return;
  }

  if (!currentUser) {
    alert("Please log in first to open your Seller Dashboard.");
    document.getElementById("authModal")?.removeAttribute("hidden");
    return;
  }

  dashboard.hidden = false;

  const home = document.getElementById("home");
  if (home) {
    home.hidden = true;
  }

  dashboard.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  await loadSellerDashboard();
});

modalContent.appendChild(button);
}

addSellerDashboardAccountButton();
/* =========================================================
   END OF SIOMAMARKET APPLICATION
   ========================================================= */
