/* =========================================================
SIOMAMARKET - SCRIPT.JS
CLEAN CONSOLIDATED VERSION
========================================================= */

/* =========================================================
PART 1: SUPABASE + GLOBAL STATE + IMAGE SYSTEM + HELPERS
========================================================= */

const SUPABASE_URL = "https://luolbdjonzissgskjupd.supabase.co";
const SUPABASE_KEY = "sb_publishable_bMHzln24777v-kDo-uE8Eg_AYUWThn-";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

/* ---------- APP CONFIGURATION ---------- */
const ADMIN_EMAIL = "silumesi710@gmail.com";
const EMAIL_REDIRECT_URL = "https://silumesi710-netizen.github.io/sioma-market/";
const DEFAULT_IMAGE = "https://via.placeholder.com/600x400?text=SiomaMarket";

/* ---------- GLOBAL STATE ---------- */
let currentUser = null;
let currentListingId = null;
let sellerListingsCache = [];
let adminListingsCache = [];
let favoritesCache = [];
let sessionLoaded = false;
let searchTimer = null;

/* ---------- MESSAGING STATE ---------- */
let currentConversationId = null;
let currentConversationListingId = null;
let messageRefreshTimer = null;

/* ---------- MESSAGE READ STATE ---------- */
const MESSAGE_READ_KEY = "siomaMarket_message_reads";
let messageReadState = {};

/* ---------- THREE-PHOTO PRODUCT SYSTEM ---------- */
let selectedProductImages = [];
const MAX_PRODUCT_IMAGES = 3;
const MAX_IMAGE_SIZE = 6 * 1024 * 1024;

/* ---------- GET PRODUCT IMAGES ---------- */
function getProductImages(item) {
  if (!item || !item.image_url) {
    return [];
  }

  const value = item.image_url;

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === "string" && value.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }
    } catch (error) {
      console.warn("Could not parse image_url:", error);
    }
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return [];
}

/* ---------- GET PRIMARY IMAGE ---------- */
function getPrimaryImage(item) {
  const images = getProductImages(item);
  return images[0] || DEFAULT_IMAGE;
}

/* ---------- PREPARE IMAGE VALUE FOR DATABASE ---------- */
function getImageStorageValue(images) {
  if (!Array.isArray(images) || images.length === 0) {
    return null;
  }

  const cleanImages = images.filter(Boolean);
  if (cleanImages.length === 0) {
    return null;
  }

  if (cleanImages.length === 1) {
    return cleanImages[0];
  }

  return JSON.stringify(cleanImages);
}

/* ---------- ESCAPE HELPERS ---------- */
function escapeHTML(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHTML(value).replace(/`/g, "&#96;");
}

/* ---------- FORMAT PRICE ---------- */
function formatPrice(price) {
  const number = Number(price);
  if (!Number.isFinite(number)) {
    return "K0";
  }
  return (
    "K" +
    number.toLocaleString("en-ZM", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })
  );
}

/* ---------- LOCATION CHECK ---------- */
function isSioma(location) {
  if (!location) return false;
  return String(location).trim().toLowerCase().includes("sioma");
}

/* ---------- DOM HELPERS ---------- */
function getElement(id) {
  return document.getElementById(id);
}

function showMessage(elementId, message, type = "info") {
  const element = getElement(elementId);
  if (!element) return;
  element.innerText = message || "";
  element.className = "message " + type;
}

function clearMessage(elementId) {
  const element = getElement(elementId);
  if (!element) return;
  element.innerText = "";
  element.className = "message";
}


/* =========================================================
PART 2: AUTHENTICATION + SESSION + ACCOUNT UI
========================================================= */

function openAuthModal() {
  const modal = getElement("authModal");
  if (!modal) return;
  modal.classList.add("show");
  modal.style.display = "flex";
  showLogin();
}

function closeAuthModal() {
  const modal = getElement("authModal");
  if (!modal) return;
  modal.classList.remove("show");
  modal.style.display = "none";
}

function showLogin() {
  const loginForm = getElement("loginForm");
  const registerForm = getElement("registerForm");
  const loginTab = getElement("loginTab");
  const registerTab = getElement("registerTab");

  if (loginForm) loginForm.style.display = "block";
  if (registerForm) registerForm.style.display = "none";
  if (loginTab) loginTab.classList.add("active");
  if (registerTab) registerTab.classList.remove("active");

  clearMessage("authMessage");
}

function showRegister() {
  const loginForm = getElement("loginForm");
  const registerForm = getElement("registerForm");
  const loginTab = getElement("loginTab");
  const registerTab = getElement("registerTab");

  if (loginForm) loginForm.style.display = "none";
  if (registerForm) registerForm.style.display = "block";
  if (loginTab) loginTab.classList.remove("active");
  if (registerTab) registerTab.classList.add("active");

  clearMessage("authMessage");
}

function openAccount() {
  if (currentUser) {
    logoutSeller();
  } else {
    openAuthModal();
  }
}

async function loadAuthSession() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      console.error("Session error:", error);
      currentUser = null;
    } else {
      currentUser = data?.session?.user || null;
    }
    sessionLoaded = true;
    updateAccountUI();
    if (currentUser) {
      await loadSellerProfile();
    }
  } catch (error) {
    console.error("Could not load session:", error);
    currentUser = null;
    sessionLoaded = true;
    updateAccountUI();
  }
}

supabaseClient.auth.onAuthStateChange(async (event, session) => {
  currentUser = session?.user || null;
  sessionLoaded = true;
  updateAccountUI();
  if (currentUser) {
    await loadSellerProfile();
  }
});

async function isAdmin() {
  if (!currentUser) return false;
  try {
    const { data, error } = await supabaseClient
      .from("admin_users")
      .select("user_id")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (error) {
      console.error("Admin check error:", error);
      return false;
    }
    return !!data;
  } catch (error) {
    console.error("Admin check failed:", error);
    return false;
  }
}

async function updateAccountUI() {
  const accountButton = getElement("accountButton");
  const dashboardButton = getElement("dashboardButton");
  const adminButton = getElement("adminButton");
  const messagesButton = getElement("messagesButton");

  if (accountButton) {
    accountButton.innerText = currentUser ? "Logout" : "Account";
  }

  if (dashboardButton) {
    dashboardButton.style.display = currentUser ? "" : "none";
  }

  if (messagesButton) {
    messagesButton.style.display = currentUser ? "" : "none";
  }

  if (adminButton) {
    adminButton.style.display = "none";
    if (currentUser) {
      const admin = await isAdmin();
      if (admin) {
        adminButton.style.display = "";
      }
    }
  }
}

async function createSellerProfile(userId, name, phone, location) {
  if (!userId) return false;
  try {
    const { error } = await supabaseClient
      .from("seller_profiles")
      .upsert(
        {
          id: userId,
          full_name: name || "",
          phone: phone || "",
          location: location || "Sioma"
        },
        { onConflict: "id" }
      );

    if (error) {
      console.error("Seller profile error:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Seller profile failed:", error);
    return false;
  }
}

async function loadSellerProfile() {
  if (!currentUser) return null;
  try {
    const { data, error } = await supabaseClient
      .from("seller_profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (error || !data) {
      if (error) console.error("Profile load error:", error);
      return null;
    }

    const nameInput = getElement("sellerName");
    const phoneInput = getElement("sellerPhone");
    const locationInput = getElement("sellLocation");

    if (nameInput) nameInput.value = data.full_name || "";
    if (phoneInput) phoneInput.value = data.phone || "";
    if (locationInput) locationInput.value = data.location || "Sioma";

    return data;
  } catch (error) {
    console.error("Could not load seller profile:", error);
    return null;
  }
}

/* ---------- AUTH EVENT LISTENERS ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const registerForm = getElement("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      const name = getElement("registerName")?.value.trim();
      const phone = getElement("registerPhone")?.value.trim();
      const location = getElement("registerLocation")?.value.trim() || "Sioma";
      const email = getElement("registerEmail")?.value.trim();
      const password = getElement("registerPassword")?.value;

      if (!name || !phone || !email || !password) {
        showMessage("authMessage", "Please complete all required fields.", "error");
        return;
      }

      if (!isSioma(location)) {
        showMessage("authMessage", "SiomaMarket is currently available in Sioma only.", "error");
        return;
      }

      const button = getElement("registerButton");
      if (button) {
        button.disabled = true;
        button.innerText = "Creating account...";
      }

      clearMessage("authMessage");

      try {
        const { data, error } = await supabaseClient.auth.signUp({
          email: email,
          password: password,
          options: {
            emailRedirectTo: EMAIL_REDIRECT_URL,
            data: { full_name: name, phone: phone, location: location }
          }
        });

        if (error) throw error;

        currentUser = data?.user || null;

        if (data?.session && data?.user) {
          await createSellerProfile(data.user.id, name, phone, location);
          currentUser = data.user;
          updateAccountUI();
          closeAuthModal();
          if (typeof sellNow === "function") sellNow();
        } else {
          showMessage("authMessage", "Account created. Please check your email to confirm.", "success");
        }
      } catch (error) {
        console.error("Registration error:", error);
        showMessage("authMessage", error.message || "Registration failed. Please try again.", "error");
      } finally {
        if (button) {
          button.disabled = false;
          button.innerText = "Create Account";
        }
      }
    });
  }

  const loginForm = getElement("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      const email = getElement("loginEmail")?.value.trim();
      const password = getElement("loginPassword")?.value;

      if (!email || !password) {
        showMessage("authMessage", "Please enter your email and password.", "error");
        return;
      }

      const button = getElement("loginButton");
      if (button) {
        button.disabled = true;
        button.innerText = "Signing in...";
      }

      clearMessage("authMessage");

      try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email: email,
          password: password
        });

        if (error) throw error;

        currentUser = data?.user || null;
        updateAccountUI();
        await loadSellerProfile();
        closeAuthModal();
      } catch (error) {
        console.error("Login error:", error);
        showMessage("authMessage", error.message || "Login failed. Please check your details.", "error");
      } finally {
        if (button) {
          button.disabled = false;
          button.innerText = "Login";
        }
      }
    });
  }
});

async function logoutSeller() {
  const confirmed = window.confirm("Are you sure you want to logout?");
  if (!confirmed) return;

  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;

    currentUser = null;
    currentListingId = null;
    sellerListingsCache = [];
    favoritesCache = [];

    updateAccountUI();
    closeAuthModal();

    const pages = [
      "sellPage",
      "sellerDashboard",
      "adminDashboard",
      "productPage",
      "favoritesPage",
      "messagesPage"
    ];

    pages.forEach((id) => {
      const element = getElement(id);
      if (element) {
        element.classList.remove("show");
        element.style.display = "none";
      }
    });

    window.scrollTo(0, 0);
  } catch (error) {
    console.error("Logout error:", error);
    alert(error.message || "Could not logout.");
  }
}


/* =========================================================
PART 3: SELL PAGE + THREE-PHOTO UPLOAD SYSTEM
========================================================= */

async function sellNow() {
  if (!sessionLoaded) {
    await loadAuthSession();
  }

  if (!currentUser) {
    openAuthModal();
    return;
  }

  await loadSellerProfile();

  const sellPage = getElement("sellPage");
  if (!sellPage) return;

  sellPage.classList.add("show");
  sellPage.style.display = "block";
  window.scrollTo(0, 0);
}

function closeSellPage() {
  const sellPage = getElement("sellPage");
  if (sellPage) {
    sellPage.classList.remove("show");
    sellPage.style.display = "none";
  }

  selectedProductImages = [];
  const imageInput = getElement("sellImage");
  if (imageInput) imageInput.value = "";
  renderImagePreviews();
}

document.addEventListener("DOMContentLoaded", () => {
  const sellImageInput = getElement("sellImage");
  if (sellImageInput) {
    sellImageInput.addEventListener("change", function (event) {
      const files = Array.from(event.target.files || []);
      if (!files.length) return;

      if (selectedProductImages.length + files.length > MAX_PRODUCT_IMAGES) {
        alert("You can upload a maximum of 3 photos.");
        event.target.value = "";
        return;
      }

      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          alert(file.name + " is not a valid image.");
          continue;
        }

        if (file.size > MAX_IMAGE_SIZE) {
          alert(file.name + " is too large. Maximum size is 6 MB.");
          continue;
        }

        selectedProductImages.push(file);
      }

      renderImagePreviews();
      event.target.value = "";
    });
  }
});

function renderImagePreviews() {
  const preview = getElement("imagePreview");
  const counter = getElement("photoCounter");

  if (!preview) return;
  preview.innerHTML = "";

  if (counter) {
    counter.innerText = selectedProductImages.length + "/" + MAX_PRODUCT_IMAGES + " photos";
  }

  if (selectedProductImages.length === 0) return;

  selectedProductImages.forEach((file, index) => {
    const card = document.createElement("div");
    card.className = "image-preview-card";

    const image = document.createElement("img");
    const objectURL = URL.createObjectURL(file);
    image.src = objectURL;
    image.alt = "Product photo " + (index + 1);
    image.onload = () => URL.revokeObjectURL(objectURL);

    const number = document.createElement("span");
    number.className = "photo-number";
    number.innerText = index + 1;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-photo";
    removeButton.innerText = "×";
    removeButton.title = "Remove photo";
    removeButton.onclick = () => removeProductImage(index);

    card.appendChild(image);
    card.appendChild(number);
    card.appendChild(removeButton);

    if (index === 0) {
      const mainLabel = document.createElement("span");
      mainLabel.className = "main-photo-label";
      mainLabel.innerText = "MAIN PHOTO";
      card.appendChild(mainLabel);
    }

    preview.appendChild(card);
  });
}

function removeProductImage(index) {
  if (index < 0 || index >= selectedProductImages.length) return;
  selectedProductImages.splice(index, 1);
  renderImagePreviews();
}

async function uploadProductImage(file) {
  if (!file) throw new Error("No image selected.");
  if (!file.type.startsWith("image/")) throw new Error("Only image files are allowed.");
  if (file.size > MAX_IMAGE_SIZE) throw new Error("Each image must be 6 MB or smaller.");

  let extension = "jpg";
  if (file.type === "image/png") extension = "png";
  else if (file.type === "image/webp") extension = "webp";
  else if (file.type === "image/gif") extension = "gif";

  const fileName = "products/" + Date.now() + "-" + Math.random().toString(36).substring(2, 10) + "." + extension;

  const { error } = await supabaseClient.storage.from("Product-images").upload(fileName, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type
  });

  if (error) {
    console.error("Image upload error:", error);
    throw error;
  }

  const { data } = supabaseClient.storage.from("Product-images").getPublicUrl(fileName);
  if (!data || !data.publicUrl) throw new Error("Could not create image URL.");

  return data.publicUrl;
}

async function uploadProductImages(files) {
  if (!Array.isArray(files) || files.length === 0) return [];
  if (files.length > MAX_PRODUCT_IMAGES) throw new Error("You can upload a maximum of 3 photos.");

  const publishButton = getElement("publishButton");
  const uploadedURLs = [];

  try {
    for (let i = 0; i < files.length; i++) {
      if (publishButton) {
        publishButton.innerText = "Uploading photo " + (i + 1) + " of " + files.length + "...";
      }
      const url = await uploadProductImage(files[i]);
      uploadedURLs.push(url);
    }
    return uploadedURLs;
  } finally {
    if (publishButton) {
      publishButton.innerText = "Publish Listing";
    }
  }
}


/* =========================================================
PART 4: PUBLISH LISTING + DATABASE + SEARCH + CATEGORIES
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const sellForm = getElement("sellForm");
  if (sellForm) {
    sellForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      await loadAuthSession();

      if (!currentUser) {
        openAuthModal();
        showLogin();
        showMessage("authMessage", "🔐 Please login before publishing.", "error");
        return;
      }

      const title = getElement("sellTitle")?.value.trim();
      const description = getElement("sellDescription")?.value.trim();
      const price = Number(getElement("sellPrice")?.value);
      const category = getElement("sellCategory")?.value;
      const location = getElement("sellLocation")?.value || "Sioma";
      const sellerName = getElement("sellerName")?.value.trim();
      const sellerPhone = getElement("sellerPhone")?.value.trim();
      const publishButton = getElement("publishButton");

      clearMessage("sellMessage");

      if (!title) {
        showMessage("sellMessage", "Please enter a product name.", "error");
        return;
      }
      if (!Number.isFinite(price) || price < 0) {
        showMessage("sellMessage", "Please enter a valid price.", "error");
        return;
      }
      if (!category) {
        showMessage("sellMessage", "Please select a category.", "error");
        return;
      }
      if (!isSioma(location)) {
        showMessage("sellMessage", "SiomaMarket is currently for Sioma listings only.", "error");
        return;
      }
      if (!sellerName) {
        showMessage("sellMessage", "Please enter the seller name.", "error");
        return;
      }
      if (!sellerPhone) {
        showMessage("sellMessage", "Please enter a phone or WhatsApp number.", "error");
        return;
      }
      if (!selectedProductImages.length) {
        showMessage("sellMessage", "Please add at least one product photo.", "error");
        return;
      }

      if (publishButton) {
        publishButton.disabled = true;
        publishButton.textContent = "Uploading photos...";
      }

      try {
        const imageURLs = await uploadProductImages(selectedProductImages);
        if (!imageURLs || !imageURLs.length) throw new Error("Photo upload failed.");

        if (publishButton) publishButton.textContent = "Publishing...";

        const listingData = {
          title: title,
          description: description || "",
          price: price,
          category: category,
          location: "Sioma",
          image_url: getImageStorageValue(imageURLs),
          seller_name: sellerName,
          seller_phone: sellerPhone,
          status: "active",
          user_id: currentUser.id
        };

        const { error } = await supabaseClient.from("listings").insert(listingData);
        if (error) throw error;

        try {
          await createSellerProfile(currentUser.id, sellerName, sellerPhone, "Sioma");
        } catch (profileError) {
          console.warn("Seller profile update warning:", profileError);
        }

        showMessage("sellMessage", "✅ Product published successfully!", "success");

        sellForm.reset();
        selectedProductImages = [];
        renderImagePreviews();

        await loadLatestProducts();
        if (typeof loadSellerDashboard === "function") await loadSellerDashboard();

        setTimeout(() => {
          closeSellPage();
        }, 1200);
      } catch (error) {
        console.error("Publish listing error:", error);
        showMessage("sellMessage", "❌ Unable to publish product. Please try again.", "error");
      } finally {
        if (publishButton) {
          publishButton.disabled = false;
          publishButton.textContent = "Publish Product";
        }
      }
    });
  }

  document.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", function () {
      const category = this.dataset.category;
      if (category) searchCategory(category);
    });
  });

  loadLatestProducts();
});

async function loadLatestProducts() {
  const container = getElement("productsGrid");
  if (!container) return;

  try {
    const { data, error } = await supabaseClient
      .from("listings")
      .select("*")
      .eq("status", "active")
      .eq("location", "Sioma")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("Latest products error:", error);
      return;
    }

    renderProductCards(data || [], container);
  } catch (error) {
    console.error("Latest products error:", error);
  }
}

function renderProductCards(listings, container) {
  if (!container) return;

  if (!listings.length) {
    container.innerHTML = `<div class="no-results">No products found in Sioma yet.</div>`;
    return;
  }

  container.innerHTML = listings
    .map((item) => {
      const id = escapeAttribute(item.id);
      const images = getProductImages(item);
      const image = images[0] || DEFAULT_IMAGE;
      const title = escapeHTML(item.title || "Untitled product");
      const category = escapeHTML(item.category || "Other");
      const seller = escapeHTML(item.seller_name || "Sioma Seller");
      const location = escapeHTML(item.location || "Sioma");
      const saved = isFavorite(item.id);

      return `
        <article class="result-card">
          <div class="product-image-wrap">
            <img src="${escapeAttribute(image)}" alt="${title}" loading="lazy" onerror="this.src='${escapeAttribute(DEFAULT_IMAGE)}'">
            <button class="favorite-card favorite-heart ${saved ? "saved" : ""}" type="button" data-id="${id}" aria-label="Save ${title}" onclick="toggleFavorite('${id}')">
              ${saved ? "❤️" : "♡"}
            </button>
            ${images.length > 1 ? `<span class="photo-count-badge">📸 ${images.length} photos</span>` : ""}
          </div>
          <div class="result-info">
            <span class="category-badge">${category}</span>
            <span class="sioma-badge">📍 SIOMA</span>
            <h3>${title}</h3>
            <div class="result-price">${formatPrice(item.price)}</div>
            <div class="result-location">📍 ${location}</div>
            <div class="result-seller">${seller}</div>
            <button class="buy-result" type="button" onclick="openProductDetails('${id}')">
              👀 VIEW PRODUCT
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

async function searchMarket() {
  const input = getElement("searchInput") || getElement("marketSearch");
  const container = getElement("searchResultsGrid");
  const resultsSection = getElement("searchResults");

  if (!input || !container) return;

  const searchTerm = input.value.trim();

  if (!searchTerm) {
    if (resultsSection) resultsSection.hidden = true;
    await loadLatestProducts();
    return;
  }

  clearTimeout(searchTimer);

  try {
    const { data, error } = await supabaseClient
      .from("listings")
      .select("*")
      .eq("status", "active")
      .eq("location", "Sioma")
      .ilike("title", `%${searchTerm}%`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Search error:", error);
      container.innerHTML = `<div class="no-results">Unable to search right now.</div>`;
      return;
    }

    if (resultsSection) resultsSection.hidden = false;
    renderProductCards(data || [], container);
  } catch (error) {
    console.error("Search error:", error);
  }
}

async function searchCategory(category) {
  const container = getElement("searchResultsGrid");
  const resultsSection = getElement("searchResults");

  if (!container) return;

  try {
    const { data, error } = await supabaseClient
      .from("listings")
      .select("*")
      .eq("status", "active")
      .eq("location", "Sioma")
      .eq("category", category)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Category search error:", error);
      container.innerHTML = `<div class="no-results">Unable to load this category.</div>`;
      return;
    }

    if (resultsSection) resultsSection.hidden = false;
    renderProductCards(data || [], container);

    if (resultsSection) {
      resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  } catch (error) {
    console.error("Category search error:", error);
  }
}


/* =========================================================
PART 5: PRODUCT DETAILS + GALLERY + CONTACT + FAVORITES
========================================================= */

const FAVORITES_KEY = "siomaMarket_favorites";

function getFavorites() {
  try {
    const saved = localStorage.getItem(FAVORITES_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
