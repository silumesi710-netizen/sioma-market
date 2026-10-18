/* =========================================================
   SIOMAMARKET — COMPLETE APPLICATION
   Part 1: Configuration, authentication, publishing, products
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
let messagingInitialized = false;
let applicationInitialized = false;

/* =========================================================
   2. HELPERS
   ========================================================= */

function byId(id) {
    return document.getElementById(id);
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

function getProductImages(value) {
    if (!value) return [];

    if (Array.isArray(value)) {
        return value.filter(item => typeof item === "string");
    }

    if (typeof value !== "string") return [];

    try {
        const parsed = JSON.parse(value);

        if (Array.isArray(parsed)) {
            return parsed.filter(item => typeof item === "string");
        }
    } catch (_) {
        // Support older listings containing one image URL.
    }

    return [value];
}

function getPrimaryImage(listing) {
    return getProductImages(listing.image_url)[0]
        || "https://placehold.co/600x400?text=SiomaMarket";
}

function showError(error, context) {
    console.error(context, error);

    return error?.message
        || "Something went wrong. Please try again.";
}

function openModal(id) {
    const modal = byId(id);
    if (!modal) return;

    modal.hidden = false;
    document.body.classList.add("modal-open");
}

function closeModal(id) {
    const modal = byId(id);
    if (!modal) return;

    modal.hidden = true;

    if (!document.querySelector(".app-modal:not([hidden])")) {
        document.body.classList.remove("modal-open");
    }

    if (id === "messagesModal" && messageRefreshTimer) {
        clearInterval(messageRefreshTimer);
        messageRefreshTimer = null;
    }
}

function closeAllModals() {
    document.querySelectorAll(".app-modal").forEach(modal => {
        modal.hidden = true;
    });

    document.body.classList.remove("modal-open");

    if (messageRefreshTimer) {
        clearInterval(messageRefreshTimer);
        messageRefreshTimer = null;
    }
}

/* =========================================================
   3. INITIALIZE APPLICATION ONCE
   ========================================================= */

async function initializeSiomaMarket() {
    if (applicationInitialized) return;
    applicationInitialized = true;

    if (!window.supabase?.createClient) {
        showProductMessage(
            "Supabase failed to load. Check the Supabase script in your HTML.",
            true
        );
        return;
    }

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

    supabaseClient.auth.onAuthStateChange((_event, session) => {
        currentUser = session?.user || null;

        updateAccountButtons();

        // Defer database operations to avoid doing additional
        // Supabase requests inside the authentication callback.
        setTimeout(async () => {
            await refreshFavorites();
            await updateUnreadMessagesBadge();

            if (showingFavorites && currentUser) {
                await showFavorites();
            }
        }, 0);
    });
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
        if (event.key === "Escape") closeAllModals();
    });

    byId("authToggleLink")?.addEventListener("click", () => {
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

    setAuthMode(false);
    openModal("authModal");
}

async function handleSellClick() {
    if (!currentUser) {
        setAuthMode(false);
        openModal("authModal");

        const message = byId("authMessage");

        if (message) {
            message.textContent =
                "Please log in or register before selling a product.";
        }

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
        console.error("Session restoration failed:", error.message);
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
    const message = byId("authMessage");

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

    if (message) {
        message.textContent = registering
            ? "Create your free SiomaMarket account."
            : "Log in to buy or sell on SiomaMarket.";
    }

    ["authFullName", "authPhone", "authLocation"].forEach(id => {
        byId(id)?.toggleAttribute("required", registering);
    });
}

async function handleAuthSubmit(event) {
    event.preventDefault();

    const submit = byId("authSubmitBtn");
    const email = byId("authEmail")?.value.trim();
    const password = byId("authPassword")?.value;

    if (!email || !password) {
        alert("Enter your email address and password.");
        return;
    }

    if (password.length < 6) {
        alert("Your password must contain at least 6 characters.");
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
        alert(showError(error, "Authentication failed"));
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

        alert("Your SiomaMarket account has been created.");
        return;
    }

    alert(
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

    updateAccountButtons();
    updateFavoriteButtons();

    if (messageRefreshTimer) {
        clearInterval(messageRefreshTimer);
        messageRefreshTimer = null;
    }

    closeAllModals();

    alert("You have logged out of SiomaMarket.");
}

async function saveSellerProfile(profile) {
    const { error } = await supabaseClient
        .from("seller_profiles")
        .upsert(profile, { onConflict: "id" });

    if (error) {
        console.error("Seller profile save failed:", error.message);

        throw new Error(
            "Your account exists, but your seller profile could not be saved: "
            + error.message
        );
    }
}

/* =========================================================
   6. PRODUCT PHOTO SELECTION
   ========================================================= */

function connectPhotoInput() {
    const input = byId("sellImage");
    if (!input) return;

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
   7. UPLOAD PHOTOS TO SUPABASE STORAGE
   ========================================================= */

async function uploadProductImages(files) {
    const uploadedUrls = [];

    for (const file of files) {
        const extension = (
            file.name.split(".").pop() || "jpg"
        ).toLowerCase().replace(/[^a-z0-9]/g, "");

        const uniqueName = (
            globalThis.crypto?.randomUUID
                ? crypto.randomUUID()
                : Date.now() + "-" + Math.random().toString(36).slice(2)
        );

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
        showSellMessage("Please log in before publishing.", true);
        closeModal("sellModal");
        setAuthMode(false);
        openModal("authModal");
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
            "Check your photos. Each must be an image no larger than 6 MB.",
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
            status: "active"
        };

        const { error } = await supabaseClient
            .from("listings")
            .insert(listing);

        if (error) throw error;

        byId("sellForm")?.reset();

        selectedProductImages = [];
        renderImagePreviews();

        const locationInput = byId("sellLocation");

        if (locationInput) {
            locationInput.value = "Sioma";
        }

        closeModal("sellModal");

        showingFavorites = false;

        await loadListings();

        showProductMessage(
            "Your product has been published successfully!"
        );

        alert("Your product is now published on SiomaMarket!");
    } catch (error) {
        showSellMessage(
            showError(error, "Product publishing failed"),
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
   END OF PART 1
   Part 2 continues with product loading, search and favorites.
   =========================================================*/
/* =========================================================
   SIOMAMARKET — COMPLETE APPLICATION
   Part 2: Products, Search, Categories and Favorites
   ========================================================= */

/* =========================================================
   9. PRODUCT DATABASE COLUMNS
   ========================================================= */

const LISTING_COLUMNS =
    "id, title, description, price, category, location, " +
    "image_url, seller_name, seller_phone, status, created_at, user_id";

/* =========================================================
   10. LOAD ACTIVE PRODUCTS
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
        console.error("Loading products failed:", error.message);

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
   11. CREATE PRODUCT CARDS
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
            >
                ♡ Favorite
            </button>

            <p class="product-category">${category}</p>

            <h3 class="product-title">${title}</h3>

            <p class="product-price">
                ${formatPrice(listing.price)}
            </p>

            <p class="product-location">${location}</p>

            <p class="product-seller">${seller}</p>

            <button
                type="button"
                class="view-product-button"
            >
                View Product
            </button>
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
        image.src =
            "https://placehold.co/600x400?text=SiomaMarket";
    }, { once: true });

    return card;
}

/* =========================================================
   12. PRODUCT DETAILS AND SELLER CONTACT
   ========================================================= */

function showListingDetails(listing) {
    const details = [
        listing.title || "Product",
        "",
        "Price: " + formatPrice(listing.price),
        "Category: " + (listing.category || ""),
        "Location: " + (listing.location || ""),
        "",
        listing.description || "No description provided.",
        "",
        "Seller: " + (listing.seller_name || "Seller"),
        "Phone: " + (listing.seller_phone || "")
    ].join("\n");

    const shouldContact = confirm(
        details +
        "\n\nPress OK to contact the seller on WhatsApp."
    );

    if (!shouldContact) return;

    const phone = normalizeZambianPhone(listing.seller_phone);

    if (!phone) {
        alert("The seller has not provided a valid phone number.");
        return;
    }

    const message = encodeURIComponent(
        "Hello, I found your product on SiomaMarket: " +
        listing.title
    );

    const whatsappUrl =
        "https://wa.me/" + phone + "?text=" + message;

    window.open(
        whatsappUrl,
        "_blank",
        "noopener,noreferrer"
    );
}

/* =========================================================
   13. ZAMBIAN PHONE NUMBER FORMATTING
   ========================================================= */

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

    if (!phone.startsWith("260")) {
        return "";
    }

    // Zambian mobile numbers should contain 12 digits
    // when written with the country code.
    if (!/^260\d{9}$/.test(phone)) {
        return "";
    }

    return phone;
}

/* =========================================================
   14. SEARCH AND CATEGORY FILTERS
   ========================================================= */

function connectSearch() {
    const form = byId("searchForm");
    const input = byId("searchInput");

    form?.addEventListener("submit", async event => {
        event.preventDefault();

        showingFavorites = false;

        await searchListings(
            input?.value.trim() || ""
        );
    });

    document.querySelectorAll("[data-category]").forEach(button => {
        button.addEventListener("click", async () => {
            const category = button.dataset.category;

            if (!category) return;

            showingFavorites = false;

            await searchListings("", category);
        });
    });
}

async function searchListings(searchText = "", category = "") {
    const grid = byId("productGrid");

    if (!grid || !supabaseClient) return;

    showingFavorites = false;

    showProductMessage("Searching products...");

    let query = supabaseClient
        .from("listings")
        .select(LISTING_COLUMNS)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(100);

    const cleanedSearch = String(searchText || "")
        .replace(/[,%()]/g, " ")
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

    if (error) {
        console.error("Search failed:", error.message);

        showProductMessage(
            "Search failed. Please try again.",
            true
        );

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
   15. LOAD FAVORITE PRODUCT IDS
   ========================================================= */

async function loadFavoriteIds() {
    favoriteListingIds = new Set();

    if (!currentUser || !supabaseClient) return;

    const { data, error } = await supabaseClient
        .from("favorites")
        .select("listing_id")
        .eq("user_id", currentUser.id);

    if (error) {
        console.error(
            "Unable to load favorites:",
            error.message
        );

        return;
    }

    (data || []).forEach(item => {
        favoriteListingIds.add(String(item.listing_id));
    });
}

/* =========================================================
   16. ADD OR REMOVE A FAVORITE
   ========================================================= */

async function toggleFavorite(listingId, button) {
    if (!currentUser) {
        alert("Please log in to save favorite products.");

        setAuthMode(false);
        openModal("authModal");

        return;
    }

    if (!supabaseClient) {
        alert("Connection unavailable. Please refresh the page.");
        return;
    }

    const id = String(listingId);

    const alreadyFavorite = favoriteListingIds.has(id);

    if (button) {
        button.disabled = true;
    }

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
        console.error("Favorite update failed:", error);

        alert(
            "Unable to update favorites. Check your database permissions.\n\n" +
            (error.message || "")
        );
    } finally {
        if (button) {
            button.disabled = false;
        }
    }
}

/* =========================================================
   17. UPDATE FAVORITE BUTTONS
   ========================================================= */

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

/* =========================================================
   18. DISPLAY FAVORITES
   ========================================================= */

async function showFavorites() {
    if (!currentUser) {
        alert("Please log in to view your favorites.");

        setAuthMode(false);
        openModal("authModal");

        return;
    }

    const grid = byId("productGrid");

    if (!grid || !supabaseClient) {
        alert("The product grid is unavailable.");
        return;
    }

    showingFavorites = true;

    showProductMessage("Loading your favorite products...");

    grid.replaceChildren();

    await loadFavoriteIds();

    const ids = Array.from(favoriteListingIds);

    if (ids.length === 0) {
        showProductMessage(
            "You have no favorites yet. Browse products and tap ♡ Favorite to save them."
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
        console.error(
            "Unable to load favorite products:",
            error.message
        );

        showProductMessage(
            "Unable to load your favorites. Please try again.",
            true
        );

        return;
    }

    grid.replaceChildren();

    if (!data || data.length === 0) {
        showProductMessage(
            "Your saved products are no longer available."
        );

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
   19. REFRESH FAVORITES AFTER LOGIN OR LOGOUT
   ========================================================= */

async function refreshFavorites() {
    favoriteListingIds = new Set();

    if (currentUser && supabaseClient) {
        await loadFavoriteIds();
    }

    updateFavoriteButtons();
}

/* =========================================================
   END OF PART 2
   Part 3 completes the messaging system.
   ========================================================= */
/* =========================================================
SIOMAMARKET — PART 3
MESSAGING SYSTEM
Uses existing Supabase tables:
conversations, messages, listings
========================================================= */

/* =========================================================

1. MESSAGING STATE
   ========================================================= */

let currentConversationId = null;
let currentConversationListingId = null;
let currentConversationRecipientId = null;
let messageRefreshInterval = null;
let messagingEventsConnected = false;

/* =========================================================
2. SAFE HTML HELPER
========================================================= */

function escapeMessageHTML(value) {
return String(value ?? "").replace(/[&<>"']/g, function (character) {
const entities = {
"&": "&",
"<": "<",
">": ">",
'"': """,
"'": "'"
};

    return entities[character];
});

}

/* =========================================================
3. CONNECT MESSAGING BUTTONS
========================================================= */

function connectMessagingSystem() {
if (messagingEventsConnected) {
return;
}

messagingEventsConnected = true;

const messagesButtonIds = [
    "navMessagesButton",
    "messagesButton",
    "accountMessagesButton"
];

messagesButtonIds.forEach(function (buttonId) {
    const button = document.getElementById(buttonId);

    if (button) {
        button.addEventListener("click", function (event) {
            event.preventDefault();
            openMessagesWindow();
        });
    }
});

const sendMessageForm = document.getElementById("sendMessageForm");

if (sendMessageForm) {
    sendMessageForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        await sendCurrentMessage();
    });
}

const conversationList = document.getElementById("conversationList");

if (conversationList) {
    conversationList.addEventListener("click", async function (event) {
        const conversationButton = event.target.closest(
            "[data-conversation-id]"
        );

        if (!conversationButton) {
            return;
        }

        const conversationId =
            conversationButton.getAttribute("data-conversation-id");

        const listingId =
            conversationButton.getAttribute("data-listing-id");

        const recipientId =
            conversationButton.getAttribute("data-recipient-id");

        if (!conversationId) {
            return;
        }

        await openConversation(
            conversationId,
            listingId || null,
            recipientId || null
        );
    });
}

const messagesModal = document.getElementById("messagesModal");

if (messagesModal) {
    messagesModal.addEventListener("click", function (event) {
        if (event.target === messagesModal) {
            closeMessagesWindow();
        }
    });
}

updateUnreadMessagesBadge();

}

/* =========================================================
4. OPEN MESSAGES WINDOW
========================================================= */

async function openMessagesWindow() {
if (!currentUser) {
showAuthModal();
return;
}

const messagesModal = document.getElementById("messagesModal");

if (messagesModal) {
    messagesModal.style.display = "flex";
    messagesModal.classList.add("active");
    messagesModal.setAttribute("aria-hidden", "false");
}

const messagesList = document.getElementById("messagesList");

if (messagesList) {
    messagesList.textContent = "Loading messages...";
}

await loadConversations();

if (messageRefreshInterval) {
    clearInterval(messageRefreshInterval);
}

messageRefreshInterval = setInterval(async function () {
    if (!currentUser) {
        clearInterval(messageRefreshInterval);
        messageRefreshInterval = null;
        return;
    }

    await updateUnreadMessagesBadge();

    if (currentConversationId) {
        await loadConversationMessages(currentConversationId, false);
    }
}, 10000);

}

/* =========================================================
5. CLOSE MESSAGES WINDOW
========================================================= */

function closeMessagesWindow() {
const messagesModal = document.getElementById("messagesModal");

if (messagesModal) {
    messagesModal.style.display = "none";
    messagesModal.classList.remove("active");
    messagesModal.setAttribute("aria-hidden", "true");
}

if (messageRefreshInterval) {
    clearInterval(messageRefreshInterval);
    messageRefreshInterval = null;
}

}

/* =========================================================
6. LOAD USER CONVERSATIONS
========================================================= */

async function loadConversations() {
const conversationList = document.getElementById("conversationList");

if (!conversationList) {
    console.warn(
        "SiomaMarket: conversationList element was not found in HTML."
    );
    return;
}

if (!currentUser) {
    conversationList.textContent = "Please log in to view your messages.";
    return;
}

conversationList.textContent = "Loading conversations...";

try {
    const { data: conversations, error } = await supabase
        .from("conversations")
        .select(
            "id, listing_id, buyer_id, seller_id, created_at, updated_at"
        )
        .or(
            "buyer_id.eq." + currentUser.id +
            ",seller_id.eq." + currentUser.id
        )
        .order("updated_at", { ascending: false });

    if (error) {
        throw error;
    }

    if (!conversations || conversations.length === 0) {
        conversationList.textContent = "You have no conversations yet.";
        return;
    }

    const listingIds = [
        ...new Set(
            conversations
                .map(function (conversation) {
                    return conversation.listing_id;
                })
                .filter(function (id) {
                    return id !== null && id !== undefined;
                })
        )
    ];

    let listingMap = {};

    if (listingIds.length > 0) {
        const { data: listings, error: listingsError } = await supabase
            .from("listings")
            .select("id, title")
            .in("id", listingIds);

        if (!listingsError && listings) {
            listings.forEach(function (listing) {
                listingMap[String(listing.id)] = listing.title;
            });
        }
    }

    conversationList.innerHTML = "";

    conversations.forEach(function (conversation) {
        const isBuyer =
            conversation.buyer_id === currentUser.id;

        const recipientId = isBuyer
            ? conversation.seller_id
            : conversation.buyer_id;

        const listingTitle =
            listingMap[String(conversation.listing_id)] ||
            "Marketplace conversation";

        const button = document.createElement("button");

        button.type = "button";
        button.className = "conversation-item";
        button.setAttribute(
            "data-conversation-id",
            conversation.id
        );

        button.setAttribute(
            "data-listing-id",
            conversation.listing_id || ""
        );

        button.setAttribute(
            "data-recipient-id",
            recipientId || ""
        );

        button.style.width = "100%";
        button.style.textAlign = "left";
        button.style.padding = "12px";
        button.style.marginBottom = "8px";
        button.style.border = "1px solid #e2e8e5";
        button.style.borderRadius = "10px";
        button.style.background = "#ffffff";
        button.style.cursor = "pointer";

        const title = document.createElement("strong");
        title.textContent = listingTitle;

        const subtitle = document.createElement("div");
        subtitle.textContent = isBuyer
            ? "Seller conversation"
            : "Buyer conversation";

        subtitle.style.fontSize = "13px";
        subtitle.style.marginTop = "4px";
        subtitle.style.color = "#64748b";

        button.appendChild(title);
        button.appendChild(subtitle);

        conversationList.appendChild(button);
    });

    if (
        currentConversationId &&
        !conversations.some(function (conversation) {
            return conversation.id === currentConversationId;
        })
    ) {
        currentConversationId = null;
        currentConversationListingId = null;
        currentConversationRecipientId = null;
    }

    await updateUnreadMessagesBadge();

} catch (error) {
    console.error("SiomaMarket: could not load conversations:", error);

    conversationList.textContent =
        "Unable to load conversations. Please try again.";
}

}

/* =========================================================
7. OPEN A CONVERSATION
========================================================= */

async function openConversation(
conversationId,
listingId = null,
recipientId = null
) {
if (!currentUser) {
showAuthModal();
return;
}

currentConversationId = conversationId;
currentConversationListingId = listingId;
currentConversationRecipientId = recipientId;

const conversationHeading =
    document.getElementById("conversationHeading");

const messageInput =
    document.getElementById("messageInput");

const sendMessageButton =
    document.getElementById("sendMessageButton");

if (conversationHeading) {
    conversationHeading.textContent = "Conversation";
}

if (messageInput) {
    messageInput.disabled = false;
}

if (sendMessageButton) {
    sendMessageButton.disabled = false;
}

document.querySelectorAll("[data-conversation-id]").forEach(
    function (button) {
        button.classList.toggle(
            "active",
            button.getAttribute("data-conversation-id") ===
                conversationId
        );
    }
);

await loadConversationMessages(conversationId, true);

}

/* =========================================================
8. LOAD MESSAGES IN A CONVERSATION
========================================================= */

async function loadConversationMessages(
conversationId,
markAsRead = true
) {
const messagesList = document.getElementById("messagesList");

if (!messagesList || !currentUser || !conversationId) {
    return;
}

try {
    const { data: messages, error } = await supabase
        .from("messages")
        .select(
            "id, conversation_id, sender_id, message, created_at, is_read"
        )
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

    if (error) {
        throw error;
    }

    messagesList.innerHTML = "";

    if (!messages || messages.length === 0) {
        messagesList.textContent =
            "No messages yet. Send the first message.";
        return;
    }

    const unreadIncomingIds = [];

    messages.forEach(function (message) {
        const isMine =
            message.sender_id === currentUser.id;

        const messageBubble = document.createElement("div");

        messageBubble.className = isMine
            ? "message-bubble message-mine"
            : "message-bubble message-theirs";

        messageBubble.style.maxWidth = "85%";
        messageBubble.style.padding = "10px 12px";
        messageBubble.style.marginBottom = "10px";
        messageBubble.style.borderRadius = "12px";
        messageBubble.style.whiteSpace = "pre-wrap";
        messageBubble.style.overflowWrap = "anywhere";

        if (isMine) {
            messageBubble.style.marginLeft = "auto";
            messageBubble.style.background = "#e8f6ee";
        } else {
            messageBubble.style.marginRight = "auto";
            messageBubble.style.background = "#f1f5f9";
        }

        const messageText = document.createElement("div");
        messageText.textContent = message.message || "";

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

        messageBubble.appendChild(messageText);
        messageBubble.appendChild(timestamp);
        messagesList.appendChild(messageBubble);

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
        const { error: readError } = await supabase
            .from("messages")
            .update({ is_read: true })
            .in("id", unreadIncomingIds);

        if (readError) {
            console.warn(
                "SiomaMarket: messages could not be marked as read:",
                readError.message
            );
        }
    }

    await updateUnreadMessagesBadge();

} catch (error) {
    console.error("SiomaMarket: could not load messages:", error);

    messagesList.textContent =
        "Unable to load messages. Please try again.";
}

}

/* =========================================================
9. SEND A MESSAGE
========================================================= */

async function sendCurrentMessage() {
if (!currentUser) {
showAuthModal();
return;
}

if (!currentConversationId) {
    alert("Please select a conversation first.");
    return;
}

const messageInput =
    document.getElementById("messageInput");

const sendMessageButton =
    document.getElementById("sendMessageButton");

const messageStatus =
    document.getElementById("messageStatus");

if (!messageInput) {
    return;
}

const messageText = messageInput.value.trim();

if (!messageText) {
    if (messageStatus) {
        messageStatus.textContent = "Type a message first.";
    }
    return;
}

if (messageText.length > 5000) {
    if (messageStatus) {
        messageStatus.textContent =
            "Your message is too long. Please shorten it.";
    }
    return;
}

if (sendMessageButton) {
    sendMessageButton.disabled = true;
}

if (messageStatus) {
    messageStatus.textContent = "Sending message...";
}

try {
    const { error: sendError } = await supabase
        .from("messages")
        .insert({
            conversation_id: currentConversationId,
            sender_id: currentUser.id,
            message: messageText,
            is_read: false
        });

    if (sendError) {
        throw sendError;
    }

    messageInput.value = "";

    await supabase
        .from("conversations")
        .update({
            updated_at: new Date().toISOString()
        })
        .eq("id", currentConversationId);

    if (messageStatus) {
        messageStatus.textContent = "Message sent.";
    }

    await loadConversationMessages(
        currentConversationId,
        false
    );

    await loadConversations();

} catch (error) {
    console.error("SiomaMarket: could not send message:", error);

    if (messageStatus) {
        messageStatus.textContent =
            error.message ||
            "Message could not be sent. Please try again.";
    }
} finally {
    if (sendMessageButton) {
        sendMessageButton.disabled = false;
    }
}

}

/* =========================================================
10. UPDATE UNREAD MESSAGE BADGE
========================================================= */

async function updateUnreadMessagesBadge() {
const badgeIds = [
"unreadMessagesBadge",
"messagesBadge"
];

const badges = badgeIds
    .map(function (id) {
        return document.getElementById(id);
    })
    .filter(Boolean);

if (badges.length === 0) {
    return;
}

if (!currentUser) {
    badges.forEach(function (badge) {
        badge.textContent = "";
        badge.style.display = "none";
    });
    return;
}

try {
    const { data: conversations, error: conversationsError } =
        await supabase
            .from("conversations")
            .select("id")
            .or(
                "buyer_id.eq." + currentUser.id +
                ",seller_id.eq." + currentUser.id
            );

    if (conversationsError) {
        throw conversationsError;
    }

    const conversationIds = (conversations || []).map(
        function (conversation) {
            return conversation.id;
        }
    );

    if (conversationIds.length === 0) {
        badges.forEach(function (badge) {
            badge.textContent = "";
            badge.style.display = "none";
        });
        return;
    }

    const { count, error: countError } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", conversationIds)
        .neq("sender_id", currentUser.id)
        .eq("is_read", false);

    if (countError) {
        throw countError;
    }

    const unreadCount = count || 0;

    badges.forEach(function (badge) {
        badge.textContent =
            unreadCount > 99 ? "99+" : String(unreadCount);

        badge.style.display =
            unreadCount > 0 ? "inline-flex" : "none";
    });

} catch (error) {
    console.warn(
        "SiomaMarket: unread badge could not be updated:",
        error.message
    );
}

}

/* =========================================================
11. START A CONVERSATION WITH A LISTING'S SELLER
This function can be called when a buyer clicks
"Message Seller" on a product.
========================================================= */

async function startConversationForListing(listing) {
if (!listing || !listing.id) {
alert("This listing could not be opened.");
return;
}

if (!currentUser) {
    showAuthModal();
    return;
}

const sellerId = listing.user_id;

if (!sellerId) {
    alert(
        "This listing does not have a seller account linked. " +
        "Please contact the seller using the available contact details."
    );
    return;
}

if (sellerId === currentUser.id) {
    alert("You cannot start a conversation with yourself.");
    return;
}

try {
    let conversation = null;

    const { data: existingConversation, error: findError } =
        await supabase
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

    conversation = existingConversation;

    if (!conversation) {
        const { data: newConversation, error: createError } =
            await supabase
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

        if (createError) {
            throw createError;
        }

        conversation = newConversation;
    }

    await openMessagesWindow();

    await openConversation(
        conversation.id,
        conversation.listing_id,
        sellerId
    );

    await loadConversations();

} catch (error) {
    console.error(
        "SiomaMarket: could not start seller conversation:",
        error
    );

    alert(
        "Could not start the conversation. " +
        "Please check your connection and try again."
    );
}

}

/* =========================================================
12. PUBLIC FUNCTIONS
========================================================= */

window.openSiomaMessages = openMessagesWindow;
window.closeSiomaMessages = closeMessagesWindow;
window.startConversationForListing = startConversationForListing;
window.refreshSiomaConversations = loadConversations;

/* =========================================================
END OF PART 3
SIOMAMARKET MESSAGING SYSTEM
========================================================= */
