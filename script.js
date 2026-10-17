/* =========================================================
   SIOMAMARKET — SELLING SYSTEM
   Supabase authentication, product uploads and listings
========================================================= */

"use strict";

/* =========================================================
   1. SUPABASE CONFIGURATION
========================================================= */

const SUPABASE_URL =
  "https://luolbdjonzissgskjupd.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_bMHzln24777v-kDo-uE8Eg_AYUWThn-";

const IMAGE_BUCKET = "Product-images";
const MAX_PRODUCT_IMAGES = 3;
const MAX_IMAGE_SIZE = 6 * 1024 * 1024;

let supabaseClient = null;
let currentUser = null;
let isRegistering = false;
let selectedProductImages = [];
/* =========================================================
   SIOMAMARKET FAVORITES
========================================================= */

let favoriteListingIds = new Set();
let showingFavorites = false;
let favoritesLoading = false;

/* =========================================================
   2. INITIALIZE APPLICATION
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  if (!window.supabase || !window.supabase.createClient) {
    showProductMessage(
      "Unable to connect. Please check the Supabase script.",
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

  await restoreSession();
  await loadListings();

  supabaseClient.auth.onAuthStateChange(
    (_event, session) => {
      currentUser = session?.user || null;
      updateAccountButtons();
    }
  );
});


/* =========================================================
   3. SMALL HELPERS
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

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
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
  } catch (_error) {
    // Older listings may contain a single image URL.
  }

  return [value];
}

function getPrimaryImage(listing) {
  const images = getProductImages(listing.image_url);

  return images[0] ||
    "https://placehold.co/600x400?text=SiomaMarket";
}


/* =========================================================
   4. MODAL CONTROLS
========================================================= */

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

  const anotherOpen = document.querySelector(
    ".app-modal:not([hidden])"
  );

  if (!anotherOpen) {
    document.body.classList.remove("modal-open");
  }
}

function closeAllModals() {
  document.querySelectorAll(".app-modal").forEach(modal => {
    modal.hidden = true;
  });

  document.body.classList.remove("modal-open");
}


/* =========================================================
   5. CONNECT HOMEPAGE BUTTONS
========================================================= */

function connectButtons() {
  const accountButtons = [
    "accountButton",
    "navAccountButton"
  ];

  accountButtons.forEach(id => {
    byId(id)?.addEventListener("click", handleAccountClick);
  });

  const sellButtons = [
    "sellButton",
    "startSellingButton",
    "navSellButton"
  ];

  sellButtons.forEach(id => {
    byId(id)?.addEventListener("click", handleSellClick);
  });

  byId("buyButton")?.addEventListener("click", () => {
    byId("products")?.scrollIntoView({
      behavior: "smooth"
    });
  });

  byId("favoritesButton")?.addEventListener("click", async () => {
    await showFavorites();
});

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

  byId("authToggleLink")?.addEventListener("click", () => {
    setAuthMode(!isRegistering);
  });
}

async function handleAccountClick() {
  if (currentUser) {
    const shouldLogout = confirm(
      "You are logged in. Do you want to log out?"
    );

    if (shouldLogout) {
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
   6. RESTORE LOGIN SESSION
========================================================= */

async function restoreSession() {
  const {
    data,
    error
  } = await supabaseClient.auth.getSession();

  if (error) {
    console.error("Session error:", error.message);
    return;
  }

  currentUser = data.session?.user || null;

  updateAccountButtons();
}

function updateAccountButtons() {
  const buttonIds = [
    "accountButton",
    "navAccountButton"
  ];

  buttonIds.forEach(id => {
    const button = byId(id);

    if (!button) return;

    button.setAttribute(
      "aria-label",
      currentUser ? "Account and logout" : "Log in or register"
    );
  });
}


/* =========================================================
   7. LOGIN AND REGISTRATION FORM
========================================================= */

function connectForms() {
  byId("authForm")?.addEventListener(
    "submit",
    handleAuthSubmit
  );

  byId("sellForm")?.addEventListener(
    "submit",
    handlePublishListing
  );
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
    submit.textContent = registering
      ? "Create Account"
      : "Log In";
  }

  if (toggleText) {
    toggleText.textContent = registering
      ? "Already have an account?"
      : "Don't have an account?";
  }

  if (toggleLink) {
    toggleLink.textContent = registering
      ? "Log In"
      : "Register";
  }

  if (registerFields) {
    registerFields.hidden = !registering;
  }

  if (password) {
    password.autocomplete = registering
      ? "new-password"
      : "current-password";
  }

  const message = byId("authMessage");

  if (message) {
    message.textContent = registering
      ? "Create your free SiomaMarket account."
      : "Log in to buy or sell on SiomaMarket.";
  }

  byId("authFullName")?.toggleAttribute(
    "required",
    registering
  );

  byId("authPhone")?.toggleAttribute(
    "required",
    registering
  );

  byId("authLocation")?.toggleAttribute(
    "required",
    registering
  );
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
    console.error("Authentication error:", error);

    alert(
      error.message ||
      "Authentication failed. Please try again."
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

  const {
    data,
    error
  } = await supabaseClient.auth.signUp({
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

  if (data.session) {
    currentUser = data.session.user;

    await saveSellerProfile({
      id: currentUser.id,
      full_name: fullName,
      phone,
      location
    });

    updateAccountButtons();
    closeModal("authModal");

    alert("Your account has been created successfully.");
  } else {
    alert(
      "Registration submitted. Check your email to confirm your account, then log in."
    );

    setAuthMode(false);
  }
}

async function loginUser(email, password) {
  const {
    data,
    error
  } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;

  currentUser = data.user;

  updateAccountButtons();
  closeModal("authModal");

  alert("Welcome back to SiomaMarket!");
}

async function logoutUser() {
  const {
    error
  } = await supabaseClient.auth.signOut();

  if (error) {
    alert("Unable to log out: " + error.message);
    return;
  }

  currentUser = null;
  updateAccountButtons();

  alert("You have logged out.");
}

async function saveSellerProfile(profile) {
  const {
    error
  } = await supabaseClient
    .from("seller_profiles")
    .upsert(profile, {
      onConflict: "id"
    });

  if (error) {
    console.error(
      "Seller profile could not be saved:",
      error.message
    );
  }
}


/* =========================================================
   8. PRODUCT PHOTO SELECTION
========================================================= */

function connectPhotoInput() {
  const input = byId("sellImage");

  if (!input) return;

  input.addEventListener("change", () => {
    const files = Array.from(input.files || []);

    selectedProductImages = [];
    const errors = [];

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

    if (errors.length) {
      showSellMessage(errors.join(" "), true);
    } else {
      showSellMessage("");
    }
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

    preview.appendChild(image);
  });
}


/* =========================================================
   9. UPLOAD PRODUCT PHOTOS
========================================================= */

async function uploadProductImages(files) {
  const uploadedUrls = [];

  for (const file of files) {
    const extension = (
      file.name.split(".").pop() || "jpg"
    ).toLowerCase().replace(/[^a-z0-9]/g, "");

    const filePath =
      currentUser.id + "/" +
      Date.now() + "-" +
      crypto.randomUUID() + "." +
      extension;

    const {
      error: uploadError
    } = await supabaseClient.storage
      .from(IMAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
      });

    if (uploadError) {
      throw new Error(
        "Photo upload failed: " + uploadError.message
      );
    }

    const {
      data
    } = supabaseClient.storage
      .from(IMAGE_BUCKET)
      .getPublicUrl(filePath);

    uploadedUrls.push(data.publicUrl);
  }

  return uploadedUrls;
}


/* =========================================================
   10. PUBLISH A PRODUCT
========================================================= */

async function handlePublishListing(event) {
  event.preventDefault();

  if (!currentUser) {
    showSellMessage(
      "Please log in before publishing a product.",
      true
    );

    closeModal("sellModal");
    setAuthMode(false);
    openModal("authModal");
    return;
  }

  const title = byId("sellTitle")?.value.trim();
  const description = byId("sellDescription")?.value.trim();
  const price = Number(byId("sellPrice")?.value);
  const category = byId("sellCategory")?.value;
  const location = byId("sellLocation")?.value.trim();
  const sellerName = byId("sellerName")?.value.trim();
  const sellerPhone = byId("sellerPhone")?.value.trim();
  const button = byId("publishListingBtn");

  if (
    !title ||
    !description ||
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
    showSellMessage(
      "Choose no more than 3 photos.",
      true
    );
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "Publishing...";
  }

  showSellMessage("Preparing your product...");

  try {
    const imageUrls = await uploadProductImages(
      selectedProductImages
    );

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

    const {
      error
    } = await supabaseClient
      .from("listings")
      .insert(listing);

    if (error) {
      throw error;
    }

    showSellMessage("Product published successfully!");

    byId("sellForm")?.reset();

    selectedProductImages = [];
    renderImagePreviews();

    const locationInput = byId("sellLocation");

    if (locationInput) {
      locationInput.value = "Sioma";
    }

    closeModal("sellModal");

    showProductMessage(
      "Your product has been published successfully!"
    );

    await loadListings();

    alert("Your product is now published on SiomaMarket!");
  } catch (error) {
    console.error("Publishing error:", error);

    showSellMessage(
      error.message ||
      "Unable to publish your product. Please try again.",
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
   11. LOAD ACTIVE PRODUCTS
========================================================= */

async function loadListings() {
  const grid = byId("productGrid");

  if (!grid) return;

  showProductMessage("Loading products...");

  const {
    data,
    error
  } = await supabaseClient
    .from("listings")
    .select(
      "id, title, description, price, category, location, image_url, seller_name, seller_phone, status, created_at"
    )
    .eq("status", "active")
    .order("created_at", {
      ascending: false
    })
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

  showProductMessage("");
}


/* =========================================================
   12. RENDER PRODUCT CARDS
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
    <img
      class="product-image"
      src="${escapeHTML(imageUrl)}"
      alt="${title}"
      loading="lazy"
    >

    <div class="product-info">
      <p class="product-category">${category}</p>
      <h3 class="product-title">${title}</h3>
      <p class="product-price">${formatPrice(listing.price)}</p>
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

  image.addEventListener("error", () => {
    image.src =
      "https://placehold.co/600x400?text=SiomaMarket";
  }, { once: true });

  card.querySelector(".view-product-button")
    .addEventListener("click", () => {
      showListingDetails(listing);
    });

  image.addEventListener("click", () => {
    showListingDetails(listing);
  });

  return card;
}


/* =========================================================
   13. PRODUCT DETAILS
========================================================= */

function showListingDetails(listing) {
  const images = getProductImages(listing.image_url);

  const details = [
    listing.title,
    "",
    "Price: " + formatPrice(listing.price),
    "Category: " + (listing.category || ""),
    "Location: " + (listing.location || ""),
    "",
    listing.description || "",
    "",
    "Seller: " + (listing.seller_name || "Seller"),
    "Phone: " + (listing.seller_phone || "")
  ].join("\n");

  const shouldContact = confirm(
    details + "\n\nPress OK to contact the seller on WhatsApp."
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

  window.open(
    "https://wa.me/" + phone + "?text=" + message,
    "_blank",
    "noopener,noreferrer"
  );
}

function normalizeZambianPhone(value) {
  let phone = String(value || "").replace(/\D/g, "");

  if (phone.startsWith("00")) {
    phone = phone.slice(2);
  }

  if (phone.startsWith("0")) {
    phone = "260" + phone.slice(1);
  } else if (phone.startsWith("9") && phone.length === 9) {
    phone = "260" + phone;
  }

  if (!phone.startsWith("260")) {
    return "";
  }

  return phone;
}


/* =========================================================
   14. SEARCH PRODUCTS
========================================================= */

function connectSearch() {
  const form = byId("searchForm");
  const input = byId("searchInput");

  if (form) {
    form.addEventListener("submit", async event => {
      event.preventDefault();
      await searchListings(input?.value.trim() || "");
    });
  }

  document.querySelectorAll("[data-category]").forEach(button => {
    button.addEventListener("click", async () => {
      const category = button.dataset.category;

      if (category) {
        await searchListings("", category);
      }
    });
  });
}

async function searchListings(searchText = "", category = "") {
  const grid = byId("productGrid");

  if (!grid) return;

  showProductMessage("Searching products...");

  let query = supabaseClient
    .from("listings")
    .select(
      "id, title, description, price, category, location, image_url, seller_name, seller_phone, status, created_at"
    )
    .eq("status", "active")
    .order("created_at", {
      ascending: false
    })
    .limit(100);

  if (searchText) {
    const safeSearch = searchText.replace(/[,%()]/g, " ").trim();

    if (safeSearch) {
      query = query.ilike("title", "%" + safeSearch + "%");
    }
  }

  if (category) {
    query = query.ilike("category", category);
  }

  const {
    data,
    error
  } = await query;

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
    return;
  }

  data.forEach(listing => {
    grid.appendChild(createProductCard(listing));
  });

  showProductMessage("");

  byId("products")?.scrollIntoView({
    behavior: "smooth"
  });
      }
/* =========================================================
   15. SIOMAMARKET FAVORITES SYSTEM
========================================================= */

/* Load the logged-in user's favorite product IDs */

async function loadFavoriteIds() {
    favoriteListingIds = new Set();

    if (!currentUser) {
        return;
    }

    const { data, error } = await supabaseClient
        .from("favorites")
        .select("listing_id")
        .eq("user_id", currentUser.id);

    if (error) {
        console.error("Unable to load favorites:", error.message);
        return;
    }

    (data || []).forEach(item => {
        favoriteListingIds.add(String(item.listing_id));
    });
}


/* Save or remove a product from favorites */

async function toggleFavorite(listingId, button) {
    if (!currentUser) {
        alert("Please log in to save your favorite products.");

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

            if (error) {
                throw error;
            }

            favoriteListingIds.delete(id);

        } else {
            const { error } = await supabaseClient
                .from("favorites")
                .insert({
                    user_id: currentUser.id,
                    listing_id: listingId
                });

            if (error) {
                throw error;
            }

            favoriteListingIds.add(id);
        }

        updateFavoriteButtons();

        if (showingFavorites) {
            await showFavorites();
        }

    } catch (error) {
        console.error("Favorite update failed:", error.message);

        alert(
            "Unable to update favorites. Please try again.\n\n" +
            error.message
        );

    } finally {
        if (button) {
            button.disabled = false;
        }
    }
}


/* Update the appearance of every visible favorite button */

function updateFavoriteButtons() {
    document.querySelectorAll("[data-favorite-id]").forEach(button => {
        const id = button.dataset.favoriteId;
        const saved = favoriteListingIds.has(String(id));

        button.classList.toggle("is-favorite", saved);

        button.textContent = saved ? "♥ Saved" : "♡ Favorite";

        button.setAttribute(
            "aria-pressed",
            saved ? "true" : "false"
        );
    });
}


/* Open the Favorites page */

async function showFavorites() {
    if (!currentUser) {
        alert("Please log in to view your favorites.");

        setAuthMode(false);
        openModal("authModal");

        return;
    }

    const grid = byId("productGrid");

    if (!grid) {
        alert("The product grid could not be found.");
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
        .select(
            "id, title, description, price, category, location, image_url, seller_name, seller_phone, status, created_at"
        )
        .in("id", ids)
        .eq("status", "active")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Unable to load favorite products:", error.message);

        showProductMessage(
            "Unable to load your favorites. Please try again.",
            true
        );

        return;
    }

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


/* Return from Favorites to all products */

async function showAllProducts() {
    showingFavorites = false;
    await loadListings();
}


/* Update favorites when the customer logs in or out */

async function refreshFavorites() {
    favoriteListingIds = new Set();

    if (currentUser) {
        await loadFavoriteIds();
    }

    updateFavoriteButtons();
        }
