/* =========================================================
SIOMAMARKET — COMPLETE APPLICATION
Products, Authentication, Selling, Favorites, Messages & Seller Dashboard
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

    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      currentUser = session?.user || null;
      updateAccountButtons();

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
  document.addEventListener("DOMContentLoaded", initializeSiomaMarket, { once: true });
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
    const dashboard = byId("sellerDashboard");
    if (dashboard) {
      dashboard.hidden = !dashboard.hidden;
      if (!dashboard.hidden) {
        await loadSellerDashboard();
        dashboard.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    if (confirm("Do you want to log out of SiomaMarket?")) {
      await logoutUser();
    }
    return;
  }
  showLoginModal();
}

async function handleSellClick() {
  if (!currentUser) {
    showLoginModal("Please log in or register before selling a product.");
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
      currentUser ? "Account dashboard and logout" : "Log in or register"
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
    title.textContent = registering ? "Create Your Account" : "Welcome to SiomaMarket";
  }
  if (submit) {
    submit.textContent = registering ? "Create Account" : "Log In";
  }
  if (toggleText) {
    toggleText.textContent = registering ? "Already have an account?" : "Don't have an account?";
  }
  if (toggleLink) {
    toggleLink.textContent = registering ? "Log In" : "Register";
  }
  if (registerFields) {
    registerFields.hidden = !registering;
  }
  if (password) {
    password.autocomplete = registering ? "new-password" : "current-password";
  }

  ["authFullName", "authPhone", "authLocation"].forEach(id => {
    byId(id)?.toggleAttribute("required", registering);
  });

  showAuthMessage(
    registering ? "Create your free SiomaMarket account." : "Log in to buy or sell on SiomaMarket."
  );
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  const submit = byId("authSubmitBtn");
  const email = byId("authEmail")?.value.trim();
  const password = byId("authPassword")?.value;

  if (!email || !password) {
    showAuthMessage("Enter your email address and password.", true);
    return;
  }

  if (password.length < 6) {
    showAuthMessage("Your password must contain at least 6 characters.", true);
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
    showAuthMessage(reportError("Authentication failed", error), true);
  } finally {
    if (submit) {
      submit.disabled = false;
      submit.textContent = isRegistering ? "Create Account" : "Log In";
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
      data: { full_name: fullName, phone, location }
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

  showAuthMessage("Registration submitted. Check your email to confirm your account, then log in.");
  setAuthMode(false);
}

async function loginUser(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;

  currentUser = data.user;
  updateAccountButtons();
  closeModal("authModal");

  await refreshFavorites();
  await updateUnreadMessagesBadge();

  const dashboard = document.getElementById("sellerDashboard");
  const home = document.getElementById("home");

  if (dashboard) {
    dashboard.hidden = false;
    if (home) {
      home.hidden = true;
    }
    await loadSellerDashboard();
    dashboard.scrollIntoView({ behavior: "smooth", block: "start" });
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

  const dashboard = document.getElementById("sellerDashboard");
  if (dashboard) dashboard.hidden = true;

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
6. SELLER DASHBOARD & "MARK AS SOLD"
========================================================= */

async function loadSellerDashboard() {
  const container = byId("sellerListingsContainer");
  if (!container || !currentUser) return;

  container.textContent = "Loading your listings...";

  const { data, error } = await supabaseClient
    .from("listings")
    .select(LISTING_COLUMNS)
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    container.textContent = "Could not load your listings.";
    return;
  }

  if (!data || data.length === 0) {
    container.textContent = "You haven't posted any listings yet.";
    return;
  }

  container.replaceChildren();

  data.forEach(listing => {
    const item = document.createElement("div");
    item.className = "seller-listing-item";
    item.style.display = "flex";
    item.style.justifyContent = "space-between";
    item.style.alignItems = "center";
    item.style.padding = "10px";
    item.style.borderBottom = "1px solid #e2e8e5";

    const info = document.createElement("div");
    info.innerHTML = `<strong>${escapeHTML(listing.title)}</strong><br><small>Status: ${escapeHTML(listing.status)} | ${formatPrice(listing.price)}</small>`;

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "6px";

    if (listing.status !== "sold") {
      const soldBtn = document.createElement("button");
      soldBtn.type = "button";
      soldBtn.textContent = "Mark as Sold";
      soldBtn.style.padding = "6px 10px";
      soldBtn.style.background = "#ffb703";
      soldBtn.style.border = "none";
      soldBtn.style.borderRadius = "6px";
      soldBtn.style.cursor = "pointer";
      soldBtn.addEventListener("click", () => updateListingStatus(listing.id, "sold"));
      actions.appendChild(soldBtn);
    }

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "Delete";
    deleteBtn.style.padding = "6px 10px";
    deleteBtn.style.background = "#c62828";
    deleteBtn.style.color = "#fff";
    deleteBtn.style.border = "none";
    deleteBtn.style.borderRadius = "6px";
    deleteBtn.style.cursor = "pointer";
    deleteBtn.addEventListener("click", () => deleteMyListing(listing.id));
    actions.appendChild(deleteBtn);

    item.append(info, actions);
    container.appendChild(item);
  });
}

async function updateListingStatus(listingId, newStatus) {
  const { error } = await supabaseClient
    .from("listings")
    .update({ status: newStatus })
    .eq("id", listingId)
    .eq("user_id", currentUser.id);

  if (error) {
    alert("Could not update status: " + error.message);
    return;
  }

  alert("Listing updated successfully.");
  await loadSellerDashboard();
  await loadListings();
}

async function deleteMyListing(listingId) {
  if (!confirm("Are you sure you want to delete this listing?")) return;

  const { error } = await supabaseClient
    .from("listings")
    .delete()
    .eq("id", listingId)
    .eq("user_id", currentUser.id);

  if (error) {
    alert("Could not delete listing: " + error.message);
    return;
  }

  alert("Listing deleted.");
  await loadSellerDashboard();
  await loadListings();
}

/* =========================================================
7. PRODUCT PHOTO SELECTION
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
    showSellMessage(errors.join(" "), errors.length > 0);
  });
}

function renderImagePreviews() {
  const preview = byId("imagePreview");
  const counter = byId("photoCounter");

  if (counter) {
    counter.textContent = selectedProductImages.length + " / 3 photos selected";
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

    image.addEventListener("load", () => URL.revokeObjectURL(objectUrl), { once: true });
    image.addEventListener("error", () => URL.revokeObjectURL(objectUrl), { once: true });

    preview.appendChild(image);
  });
}

/* =========================================================
8. UPLOAD PHOTOS
========================================================= */

async function uploadProductImages(files) {
  const uploadedUrls = [];

  for (const file of files) {
    const extension = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const uniqueName = globalThis.crypto?.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2);
    const filePath = currentUser.id + "/" + uniqueName + "." + extension;

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
9. PUBLISH A PRODUCT
========================================================= */

async function handlePublishListing(event) {
  event.preventDefault();

  if (!currentUser) {
    closeModal("sellModal");
    showLoginModal("Please log in before publishing a product.");
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
    showSellMessage("Please complete every required field correctly.", true);
    return;
  }

  if (selectedProductImages.length > MAX_PRODUCT_IMAGES) {
    showSellMessage("Choose no more than 3 photos.", true);
    return;
  }

  if (selectedProductImages.some(file => !file.type.startsWith("image/") || file.size > MAX_IMAGE_SIZE)) {
    showSellMessage("Each photo must be an image no larger than 6 MB.", true);
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "Publishing...";
  }

  try {
    showSellMessage("Uploading your product photos...");
    const imageUrls = await uploadProductImages(selectedProductImages);

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

    const { error } = await supabaseClient.from("listings").insert(listing);
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

    showProductMessage("Your product was submitted and is awaiting administrator approval.");
    alert("Your product has been submitted successfully. It will appear publicly after administrator approval.");
  } catch (error) {
    showSellMessage(reportError("Product publishing failed", error), true);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Publish Product";
    }
  }
}

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
    reportError("Loading products failed", error);
    grid.replaceChildren();
    showProductMessage("Products could not be loaded. Please refresh and try again.", true);
    return;
  }

  grid.replaceChildren();

  if (!data || data.length === 0) {
    showProductMessage("No products yet. Be the first to sell on SiomaMarket!");
    return;
  }

  data.forEach(listing => {
    grid.appendChild(createProductCard(listing));
  });

  updateFavoriteButtons();
  showProductMessage("");
}

/* =========================================================
11. PRODUCT CARDS
========================================================= */

function createProductCard(listing) {
  const card = document.createElement("article");
  card.className = "product-card";

  const imageUrl = getPrimaryImage(listing);
  const title = escapeHTML(listing.title);
  const category = escapeHTML(listing.category);
  const location = escapeHTML(listing.location);
  const seller = escapeHTML(listing.seller_name || "Sioma seller");

  card.innerHTML = `
    <img class="product-image" src="${escapeHTML(imageUrl)}" alt="${title}" loading="lazy">
    <div class="product-info">
      <button type="button" class="favorite-button" data-favorite-id="${escapeHTML(listing.id)}" aria-label="Save ${title} to favorites" aria-pressed="false">♡ Favorite</button>
      <p class="product-category">${category}</p>
      <h3 class="product-title">${title}</h3>
      <p class="product-price">${formatPrice(listing.price)}</p>
      <p class="product-location">${location}</p>
      <p class="product-seller">${seller}</p>
      <button type="button" class="view-product-button">View Product</button>
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
12. PRODUCT DETAILS AND SELLER CONTACT
========================================================= */

function showListingDetails(listing) {
  if (!listing) return;

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

  content.append(closeButton, image, title, price, information);

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
          "Hello, I found your product on SiomaMarket: " + listing.title
        );
        window.open("https://wa.me/" + phone + "?text=" + message, "_blank", "noopener,noreferrer");
      }, "#168447")
    );
  } else {
    const phoneNotice = document.createElement("p");
    phoneNotice.textContent = "The seller has not provided a valid phone number.";
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
13. SEARCH AND CATEGORY FILTERS
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

  const cleanedSearch = String(searchText || "").trim();

  if (cleanedSearch) {
    query = query.ilike("title", "%" + cleanedSearch + "%");
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
    byId("products")?.scrollIntoView({ behavior: "smooth" });
    return;
  }

  data.forEach(listing => {
    grid.appendChild(createProductCard(listing));
  });

  updateFavoriteButtons();
  showProductMessage("");
  byId("products")?.scrollIntoView({ behavior: "smooth" });
}

/* =========================================================
14. FAVORITES
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
        .insert({ user_id: currentUser.id, listing_id: listingId });

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
    button.textContent = saved ? "♥ Saved" : "♡ Favorite";
    button.setAttribute("aria-pressed", saved ? "true" : "false");
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
    showProductMessage("You have no favorites yet. Browse products and tap Favorite to save them.");
    byId("products")?.scrollIntoView({ behavior: "smooth" });
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
    showProductMessage("Unable to load your favorites. Please try again.", true);
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
  byId("products")?.scrollIntoView({ behavior: "smooth" });
}

async function refreshFavorites() {
  favoriteListingIds = new Set();
  if (currentUser && supabaseClient) {
    await loadFavoriteIds();
  }
  updateFavoriteButtons();
}

/* =========================================================
15. MESSAGING SYSTEM
========================================================= */

function connectMessagingSystem() {
  if (messagingInitialized) return;
  messagingInitialized = true;

  ["navMessagesButton", "messagesButton", "accountMessagesButton"].forEach(id => {
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
      await loadConversationMessages(currentConversationId, false);
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

async function loadConversations() {
  const conversationList = byId("conversationList");
  if (!conversationList) return;

  if (!currentUser) {
    conversationList.textContent = "Please log in to view your messages.";
    return;
  }

  conversationList.textContent = "Loading conversations...";

  try {
    const { data: conversations, error } = await supabaseClient
      .from("conversations")
      .select("id, listing_id, buyer_id, seller_id, created_at, updated_at")
      .or("buyer_id.eq." + currentUser.id + ",seller_id.eq." + currentUser.id)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    if (!conversations || conversations.length === 0) {
      conversationList.textContent = "You have no conversations yet.";
      return;
    }

    conversationList.replaceChildren();

    conversations.forEach(conversation => {
      const isBuyer = conversation.buyer_id === currentUser.id;
      const recipientId = isBuyer ? conversation.seller_id : conversation.buyer_id;

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
      heading.textContent = isBuyer ? "Chat with Seller" : "Chat with Buyer";

      button.appendChild(heading);
      conversationList.appendChild(button);
    });
  } catch (error) {
    reportError("Could not load conversations", error);
    conversationList.textContent = "Unable to load conversations.";
  }
}

async function openConversation(conversationId, listingId = null, recipientId = null) {
  if (!currentUser) {
    showLoginModal("Please log in to view messages.");
    return;
  }

  currentConversationId = conversationId;
  currentConversationListingId = listingId;
  currentConversationRecipientId = recipientId;

  await loadConversationMessages(conversationId, true);
}

async function loadConversationMessages(conversationId, markAsRead = true) {
  const messagesList = byId("messagesList");
  if (!messagesList || !currentUser || !conversationId) return;

  try {
    const { data: messages, error } = await supabaseClient
      .from("messages")
      .select("id, conversation_id, sender_id, message, created_at, is_read")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    messagesList.replaceChildren();

    if (!messages || messages.length === 0) {
      messagesList.textContent = "No messages yet. Send the first message.";
      return;
    }

    messages.forEach(message => {
      const isMine = message.sender_id === currentUser.id;
      const bubble = document.createElement("div");

      bubble.style.maxWidth = "85%";
      bubble.style.padding = "10px 12px";
      bubble.style.marginBottom = "10px";
      bubble.style.borderRadius = "12px";

      if (isMine) {
        bubble.style.marginLeft = "auto";
        bubble.style.background = "#e8f6ee";
      } else {
        bubble.style.marginRight = "auto";
        bubble.style.background = "#f1f5f9";
      }

      const text = document.createElement("div");
      text.textContent = message.message || "";
      bubble.appendChild(text);
      messagesList.appendChild(bubble);
    });

    messagesList.scrollTop = messagesList.scrollHeight;
  } catch (error) {
    reportError("Could not load messages", error);
  }
}

async function sendCurrentMessage() {
  if (!currentUser || !currentConversationId) return;

  const input = byId("messageInput");
  const text = input?.value.trim();
  if (!text) return;

  try {
    const { error } = await supabaseClient
      .from("messages")
      .insert({
        conversation_id: currentConversationId,
        sender_id: currentUser.id,
        message: text
      });

    if (error) throw error;

    input.value = "";
    await loadConversationMessages(currentConversationId, false);
  } catch (error) {
    alert("Could not send message: " + error.message);
  }
}

async function startConversationForListing(listing) {
  if (!currentUser) {
    showLoginModal("Please log in to message the seller.");
    return;
  }

  try {
    const { data: existing } = await supabaseClient
      .from("conversations")
      .select("id")
      .eq("listing_id", listing.id)
      .eq("buyer_id", currentUser.id)
      .maybeSingle();

    if (existing) {
      openMessagesWindow();
      await openConversation(existing.id, listing.id, listing.user_id);
      return;
    }

    const { data: created, error } = await supabaseClient
      .from("conversations")
      .insert({
        listing_id: listing.id,
        buyer_id: currentUser.id,
        seller_id: listing.user_id
      })
      .select("id")
      .single();

    if (error) throw error;

    openMessagesWindow();
    await openConversation(created.id, listing.id, listing.user_id);
  } catch (error) {
    alert("Unable to start conversation: " + error.message);
  }
}

async function updateUnreadMessagesBadge() {
  // Safe placeholder function for unread messages tracking
}
// Simple hash-based active class toggling for bottom nav
window.addEventListener('hashchange', () => {
  const hash = window.location.hash || '#home';
  document.querySelectorAll('nav a').forEach(link => {
    if (link.getAttribute('href') === hash) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
});
