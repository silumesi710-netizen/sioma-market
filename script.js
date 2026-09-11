/* =========================================================
   SIOMA MARKET — SCRIPT.JS
   CLEAN CORRECTED BASELINE
   PART 1 — SUPABASE + GLOBAL STATE
   ========================================================= */


/* =========================================================
   SUPABASE
   ========================================================= */

const SUPABASE_URL =
  "https://luolbdjonzissgskjupd.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_bMHzln24777v-kDo-uE8Eg_AYUWThn-";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let currentUser = null;

let currentProfile = null;

let currentListing = null;


/* =========================================================
   DEFAULT LOCATION
   ========================================================= */

const DEFAULT_LOCATION = "Sioma";


/* =========================================================
   FAVORITES
   ========================================================= */

let favorites = [];

try {
  favorites = JSON.parse(
    localStorage.getItem(
      "siomaMarketFavorites"
    ) || "[]"
  );
} catch (error) {
  favorites = [];
}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================================================
   PRICE FORMAT
   ========================================================= */

function formatPrice(value) {

  const number =
    Number(value || 0);

  return "K" +
    number.toLocaleString();
}


/* =========================================================
   PHONE FORMAT
   ========================================================= */

function formatZambiaPhone(phone) {

  let number =
    String(phone || "")
      .replace(/\D/g, "");

  if (number.startsWith("0")) {

    number =
      "260" +
      number.substring(1);
  }

  return number;
}


/* =========================================================
   ELEMENT HELPER
   ========================================================= */

function getElement(id) {

  return document.getElementById(id);
}


/* =========================================================
   PAGE SCROLL
   ========================================================= */

function lockPageScroll() {

  document.body.style.overflow =
    "hidden";
}


function unlockPageScroll() {

  document.body.style.overflow =
    "auto";
}


/* =========================================================
   FAVORITE STORAGE
   ========================================================= */

function saveFavoritesToStorage() {

  localStorage.setItem(
    "siomaMarketFavorites",
    JSON.stringify(favorites)
  );
}


function isFavorite(id) {

  return favorites.includes(
    String(id)
  );
}


/* =========================================================
   FAVORITE COUNT
   ========================================================= */

function updateFavoriteCount() {

  const elements =
    document.querySelectorAll(
      ".favorite-count"
    );

  elements.forEach(
    function (element) {

      element.textContent =
        favorites.length;

    }
  );
}


/* =========================================================
   INITIAL PAGE LOAD
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async function () {

    console.log(
      "SiomaMarket JavaScript loaded."
    );

    await initializeApp();

  }
);


/* =========================================================
   INITIALIZE APP
   ========================================================= */

async function initializeApp() {

  try {

    await checkCurrentUser();

    await loadLatestProducts();

    setupSellForm();

    setupLoginForm();

    setupRegisterForm();

    updateFavoriteCount();

  } catch (error) {

    console.error(
      "APP INITIALIZATION ERROR:",
      error
    );

  }
}


/* =========================================================
   CHECK CURRENT USER
   ========================================================= */

async function checkCurrentUser() {

  try {

    const {
      data,
      error
    } =
      await supabaseClient.auth.getUser();

    if (error) {

      currentUser = null;

      return;
    }

    currentUser =
      data?.user || null;

    if (currentUser) {

      await loadCurrentProfile();

    }

  } catch (error) {

    console.error(
      "USER CHECK ERROR:",
      error
    );

    currentUser = null;

  }
}


/* =========================================================
   LOAD CURRENT PROFILE
   ========================================================= */

async function loadCurrentProfile() {

  if (!currentUser) {

    currentProfile = null;

    return;
  }

  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("seller_profiles")
        .select("*")
        .eq(
          "id",
          currentUser.id
        )
        .maybeSingle();

    if (error) {

      console.error(
        "PROFILE LOAD ERROR:",
        error
      );

      currentProfile = null;

      return;
    }

    currentProfile =
      data || null;

  } catch (error) {

    console.error(
      "PROFILE ERROR:",
      error
    );

    currentProfile = null;

  }
}


/* =========================================================
   AUTH STATE LISTENER
   ========================================================= */

supabaseClient.auth.onAuthStateChange(
  async function (
    event,
    session
  ) {

    console.log(
      "AUTH EVENT:",
      event
    );

    currentUser =
      session?.user || null;

    if (currentUser) {

      await loadCurrentProfile();

    } else {

      currentProfile = null;

    }

  }
);
/* =========================================================
   PART 2 — PRODUCTS, SEARCH, CATEGORIES & FAVORITES
   ========================================================= */

async function loadLatestProducts() {
  const container =
    getElement("productsGrid") ||
    getElement("marketGrid") ||
    getElement("listingGrid");

  if (!container) {
    console.warn("Products container not found.");
    return;
  }

  container.innerHTML =
    '<p class="loading-message">Loading products...</p>';

  try {
    const { data, error } =
      await supabaseClient
        .from("listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", {
          ascending: false
        });

    if (error) {
      console.error("PRODUCT LOAD ERROR:", error);

      container.innerHTML =
        '<p class="error-message">Unable to load products.</p>';

      return;
    }

    displayProducts(
      data || [],
      "Latest Products"
    );

  } catch (error) {
    console.error(
      "LATEST PRODUCTS ERROR:",
      error
    );

    container.innerHTML =
      '<p class="error-message">Something went wrong while loading products.</p>';
  }
}


/* =========================================================
   DISPLAY PRODUCTS
   ========================================================= */

function displayProducts(products, heading) {
  const container =
    getElement("productsGrid") ||
    getElement("marketGrid") ||
    getElement("listingGrid");

  if (!container) {
    return;
  }

  const headingElement =
    getElement("productsHeading") ||
    getElement("marketHeading");

  if (headingElement && heading) {
    headingElement.textContent = heading;
  }

  if (!products.length) {
    container.innerHTML =
      '<p class="empty-message">No products found in Sioma.</p>';

    return;
  }

  container.innerHTML = "";

  products.forEach(function (product) {
    const id = String(product.id || "");

    const title =
      escapeHTML(product.title || "Untitled Product");

    const price =
      formatPrice(product.price);

    const category =
      escapeHTML(product.category || "Other");

    const location =
      escapeHTML(
        product.location || DEFAULT_LOCATION
      );

    const image =
      product.image_url ||
      "https://via.placeholder.com/500x500?text=SiomaMarket";

    const card =
      document.createElement("article");

    card.className = "product-card";

    card.innerHTML = `
      <div class="product-image-wrap">

        <img
          class="product-image"
          src="${escapeHTML(image)}"
          alt="${title}"
          loading="lazy"
          onerror="this.src='https://via.placeholder.com/500x500?text=No+Image'"
        >

        <button
          type="button"
          class="favorite-btn ${isFavorite(id) ? "active" : ""}"
          data-favorite-id="${escapeHTML(id)}"
          onclick="toggleFavorite('${escapeHTML(id)}')"
          aria-label="Favorite ${title}"
        >
          ${isFavorite(id) ? "♥" : "♡"}
        </button>

      </div>

      <div
        class="product-card-body"
        onclick="viewListing('${escapeHTML(id)}')"
      >

        <span class="category-badge">
          ${category}
        </span>

        <h3 class="product-title">
          ${title}
        </h3>

        <div class="product-price">
          ${price}
        </div>

        <div class="product-location">
          📍 ${location}
        </div>

      </div>
    `;

    container.appendChild(card);
  });

  updateFavoriteCount();
}


/* =========================================================
   SEARCH
   ========================================================= */

async function searchMarket() {
  const input =
    getElement("searchInput") ||
    getElement("marketSearch");

  const search =
    String(input?.value || "").trim();

  if (!search) {
    await loadLatestProducts();
    return;
  }

  const container =
    getElement("productsGrid") ||
    getElement("marketGrid") ||
    getElement("listingGrid");

  if (!container) {
    return;
  }

  container.innerHTML =
    '<p class="loading-message">Searching...</p>';

  try {
    const { data, error } =
      await supabaseClient
        .from("listings")
        .select("*")
        .eq("status", "active")
        .ilike(
          "title",
          `%${search}%`
        )
        .order("created_at", {
          ascending: false
        });

    if (error) {
      console.error("SEARCH ERROR:", error);

      container.innerHTML =
        '<p class="error-message">Search failed. Please try again.</p>';

      return;
    }

    displayProducts(
      data || [],
      `Search results for "${escapeHTML(search)}"`
    );

  } catch (error) {
    console.error(
      "SEARCH EXCEPTION:",
      error
    );

    container.innerHTML =
      '<p class="error-message">Unable to complete search.</p>';
  }
}


/* =========================================================
   SEARCH BY CATEGORY
   ========================================================= */

async function searchCategory(category) {
  const selectedCategory =
    String(category || "").trim();

  if (!selectedCategory) {
    await loadLatestProducts();
    return;
  }

  const container =
    getElement("productsGrid") ||
    getElement("marketGrid") ||
    getElement("listingGrid");

  if (!container) {
    return;
  }

  container.innerHTML =
    '<p class="loading-message">Loading category...</p>';

  try {
    const { data, error } =
      await supabaseClient
        .from("listings")
        .select("*")
        .eq("status", "active")
        .eq("category", selectedCategory)
        .order("created_at", {
          ascending: false
        });

    if (error) {
      console.error(
        "CATEGORY SEARCH ERROR:",
        error
      );

      container.innerHTML =
        '<p class="error-message">Unable to load this category.</p>';

      return;
    }

    displayProducts(
      data || [],
      selectedCategory
    );

  } catch (error) {
    console.error(
      "CATEGORY ERROR:",
      error
    );

    container.innerHTML =
      '<p class="error-message">Something went wrong.</p>';
  }
}


/* =========================================================
   BUY NOW
   ========================================================= */

function buyNow() {
  const sellSection =
    getElement("sellSection") ||
    getElement("sellPage");

  if (sellSection) {
    sellSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    return;
  }

  const productsSection =
    getElement("productsSection") ||
    getElement("marketSection");

  if (productsSection) {
    productsSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}


/* =========================================================
   FAVORITES
   ========================================================= */

function toggleFavorite(id) {
  const stringId = String(id);

  if (isFavorite(stringId)) {
    favorites =
      favorites.filter(function (item) {
        return String(item) !== stringId;
      });
  } else {
    favorites.push(stringId);
  }

  saveFavoritesToStorage();
  updateFavoriteCount();

  const buttons =
    document.querySelectorAll(
      `[data-favorite-id="${CSS.escape(stringId)}"]`
    );

  buttons.forEach(function (button) {
    const active =
      isFavorite(stringId);

    button.classList.toggle(
      "active",
      active
    );

    button.textContent =
      active ? "♥" : "♡";
  });

  const detailButton =
    getElement("detailsFavoriteBtn");

  if (
    detailButton &&
    currentListing &&
    String(currentListing.id) === stringId
  ) {
    detailButton.textContent =
      isFavorite(stringId)
        ? "♥ Favorited"
        : "♡ Favorite";
  }
}


/* =========================================================
   SHOW FAVORITES
   ========================================================= */

async function showFavorites() {
  const container =
    getElement("productsGrid") ||
    getElement("marketGrid") ||
    getElement("listingGrid");

  if (!container) {
    return;
  }

  if (!favorites.length) {
    container.innerHTML =
      '<p class="empty-message">You have no favorites yet.</p>';

    return;
  }

  container.innerHTML =
    '<p class="loading-message">Loading favorites...</p>';

  try {
    const { data, error } =
      await supabaseClient
        .from("listings")
        .select("*")
        .in("id", favorites)
        .eq("status", "active");

    if (error) {
      console.error(
        "FAVORITES LOAD ERROR:",
        error
      );

      container.innerHTML =
        '<p class="error-message">Unable to load favorites.</p>';

      return;
    }

    displayProducts(
      data || [],
      "My Favorites"
    );

  } catch (error) {
    console.error(
      "FAVORITES ERROR:",
      error
    );

    container.innerHTML =
      '<p class="error-message">Something went wrong.</p>';
  }
}


/* =========================================================
   CLEAR SEARCH
   ========================================================= */

function clearSearch() {
  const input =
    getElement("searchInput") ||
    getElement("marketSearch");

  if (input) {
    input.value = "";
  }

  loadLatestProducts();
             }
/* =========================================================
   PART 3 — PRODUCT DETAILS, WHATSAPP, CALL, SHARE
   ========================================================= */


/* =========================================================
   VIEW LISTING
   ========================================================= */

async function viewListing(id) {
  const listingId = String(id || "").trim();

  if (!listingId) {
    return;
  }

  try {
    const { data, error } =
      await supabaseClient
        .from("listings")
        .select("*")
        .eq("id", listingId)
        .maybeSingle();

    if (error) {
      console.error(
        "VIEW LISTING ERROR:",
        error
      );

      alert("Unable to load this product.");
      return;
    }

    if (!data) {
      alert("Product not found.");
      return;
    }

    currentListing = data;

    showProductDetails(data);

  } catch (error) {
    console.error(
      "VIEW LISTING EXCEPTION:",
      error
    );

    alert("Something went wrong.");
  }
}


/* =========================================================
   SHOW PRODUCT DETAILS
   ========================================================= */

function showProductDetails(data) {
  const detailsSection =
    getElement("productDetails") ||
    getElement("detailsSection") ||
    getElement("listingDetails");

  if (!detailsSection) {
    console.warn(
      "Product details section not found."
    );
    return;
  }

  const title =
    escapeHTML(
      data.title || "Untitled Product"
    );

  const price =
    formatPrice(data.price);

  const category =
    escapeHTML(
      data.category || "Other"
    );

  const location =
    escapeHTML(
      data.location || DEFAULT_LOCATION
    );

  const seller =
    escapeHTML(
      data.seller_name || "Sioma Seller"
    );

  const phone =
    formatZambiaPhone(
      data.seller_phone || ""
    );

  const image =
    data.image_url ||
    "https://via.placeholder.com/600x600?text=SiomaMarket";

  detailsSection.innerHTML = `
    <div class="details-card">

      <button
        type="button"
        class="details-close"
        onclick="closeProductDetails()"
        aria-label="Close product details"
      >
        ×
      </button>

      <img
        class="details-image"
        src="${escapeHTML(image)}"
        alt="${title}"
        onerror="this.src='https://via.placeholder.com/600x600?text=No+Image'"
      >

      <div class="details-content">

        <span class="category-badge">
          ${category}
        </span>

        <h2 id="detailsTitle">
          ${title}
        </h2>

        <div
          class="details-price"
          id="detailsPrice"
        >
          ${price}
        </div>

        <p
          class="details-location"
          id="detailsLocation"
        >
          📍 ${location}
        </p>

        <p
          class="details-seller"
          id="detailsSeller"
        >
          Seller: ${seller}
        </p>

        <div class="details-actions">

          <button
            type="button"
            class="primary-action"
            onclick="contactSellerWhatsApp()"
          >
            WhatsApp
          </button>

          <button
            type="button"
            class="secondary-action"
            onclick="callSeller()"
          >
            Call
          </button>

          <button
            type="button"
            class="secondary-action"
            id="detailsFavoriteBtn"
            onclick="toggleFavorite('${escapeHTML(String(data.id))}')"
          >
            ${isFavorite(String(data.id))
              ? "♥ Favorited"
              : "♡ Favorite"}
          </button>

          <button
            type="button"
            class="secondary-action"
            onclick="shareListing()"
          >
            Share
          </button>

        </div>

      </div>

    </div>
  `;

  detailsSection.classList.add(
    "active"
  );

  detailsSection.style.display = "block";

  lockPageScroll();

  detailsSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


/* =========================================================
   CLOSE PRODUCT DETAILS
   ========================================================= */

function closeProductDetails() {
  const detailsSection =
    getElement("productDetails") ||
    getElement("detailsSection") ||
    getElement("listingDetails");

  if (detailsSection) {
    detailsSection.classList.remove(
      "active"
    );

    detailsSection.style.display = "none";
  }

  currentListing = null;

  unlockPageScroll();
}


/* =========================================================
   WHATSAPP SELLER
   ========================================================= */

function contactSellerWhatsApp() {
  if (!currentListing) {
    alert("Please select a product first.");
    return;
  }

  const number =
    formatZambiaPhone(
      currentListing.seller_phone
    );

  if (!number) {
    alert(
      "This seller has no WhatsApp number available."
    );
    return;
  }

  const title =
    currentListing.title ||
    "this product";

  const message =
    `Hello, I found "${title}" on SiomaMarket. Is it still available?`;

  const url =
    `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

  window.open(
    url,
    "_blank"
  );
}


/* =========================================================
   CALL SELLER
   ========================================================= */

function callSeller() {
  if (!currentListing) {
    alert("Please select a product first.");
    return;
  }

  const number =
    formatZambiaPhone(
      currentListing.seller_phone
    );

  if (!number) {
    alert(
      "This seller has no phone number available."
    );
    return;
  }

  window.location.href =
    `tel:+${number}`;
}


/* =========================================================
   SHARE LISTING
   ========================================================= */

async function shareListing() {
  if (!currentListing) {
    alert("Please select a product first.");
    return;
  }

  const title =
    currentListing.title ||
    "SiomaMarket product";

  const shareText =
    `${title} - ${formatPrice(currentListing.price)} on SiomaMarket`;

  const shareUrl =
    window.location.href;

  if (
    navigator.share
  ) {
    try {
      await navigator.share({
        title: title,
        text: shareText,
        url: shareUrl
      });

    } catch (error) {
      console.log(
        "Share cancelled."
      );
    }

    return;
  }

  try {
    await navigator.clipboard.writeText(
      `${shareText}\n${shareUrl}`
    );

    alert(
      "Product link copied."
    );

  } catch (error) {
    alert(
      "Sharing is not available on this device."
    );
  }
}


/* =========================================================
   FAVORITE CURRENT LISTING
   ========================================================= */

function favoriteCurrentListing() {
  if (!currentListing) {
    return;
  }

  toggleFavorite(
    String(currentListing.id)
  );
}


/* =========================================================
   RETURN TO PRODUCTS
   ========================================================= */

function backToProducts() {
  closeProductDetails();

  const productsSection =
    getElement("productsSection") ||
    getElement("marketSection");

  if (productsSection) {
    productsSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
                                                         }
/* =========================================================
   PART 4 — LOGIN & REGISTRATION
   ========================================================= */


/* =========================================================
   SETUP LOGIN FORM
   ========================================================= */

function setupLoginForm() {
  const form =
    getElement("loginForm");

  if (!form) {
    return;
  }

  form.addEventListener(
    "submit",
    async function (event) {
      event.preventDefault();

      const email =
        getElement("loginEmail")?.value.trim() || "";

      const password =
        getElement("loginPassword")?.value || "";

      if (!email || !password) {
        alert(
          "Please enter your email and password."
        );
        return;
      }

      const button =
        form.querySelector(
          'button[type="submit"]'
        );

      if (button) {
        button.disabled = true;
        button.textContent = "Logging in...";
      }

      try {
        const { data, error } =
          await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
          });

        if (error) {
          console.error(
            "LOGIN ERROR:",
            error
          );

          alert(
            error.message ||
            "Login failed. Please check your details."
          );

          return;
        }

        currentUser =
          data?.user || null;

        if (currentUser) {
          await loadCurrentProfile();
        }

        alert("Login successful.");

        closeLoginModal();

        showLoggedInAccount();

      } catch (error) {
        console.error(
          "LOGIN EXCEPTION:",
          error
        );

        alert(
          "Something went wrong during login."
        );

      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = "Login";
        }
      }
    }
  );
}


/* =========================================================
   SETUP REGISTER FORM
   ========================================================= */

function setupRegisterForm() {
  const form =
    getElement("registerForm");

  if (!form) {
    return;
  }

  form.addEventListener(
    "submit",
    async function (event) {
      event.preventDefault();

      const name =
        getElement("registerName")?.value.trim() || "";

      const phone =
        getElement("registerPhone")?.value.trim() || "";

      const location =
        getElement("registerLocation")?.value.trim() ||
        DEFAULT_LOCATION;

      const email =
        getElement("registerEmail")?.value.trim() || "";

      const password =
        getElement("registerPassword")?.value || "";

      if (
        !name ||
        !phone ||
        !email ||
        !password
      ) {
        alert(
          "Please complete all required fields."
        );
        return;
      }

      if (password.length < 6) {
        alert(
          "Password must be at least 6 characters."
        );
        return;
      }

      const button =
        form.querySelector(
          'button[type="submit"]'
        );

      if (button) {
        button.disabled = true;
        button.textContent =
          "Creating account...";
      }

      try {
        const { data, error } =
          await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
              data: {
                full_name: name,
                phone: phone,
                location: location
              }
            }
          });

        if (error) {
          console.error(
            "REGISTER ERROR:",
            error
          );

          alert(
            error.message ||
            "Registration failed."
          );

          return;
        }

        if (data?.user) {
          currentUser = data.user;

          const { data: profileData, error: profileError } =
            await supabaseClient
              .from("seller_profiles")
              .upsert(
                {
                  id: data.user.id,
                  full_name: name,
                  phone: phone,
                  location: location
                },
                {
                  onConflict: "id"
                }
              )
              .select()
              .maybeSingle();

          if (profileError) {
            console.error(
              "PROFILE CREATE ERROR:",
              profileError
            );
          } else {
            currentProfile =
              profileData || null;
          }
        }

        alert(
          "Account created successfully. Please check your email if confirmation is required."
        );

        form.reset();

        closeRegisterModal();

      } catch (error) {
        console.error(
          "REGISTER EXCEPTION:",
          error
        );

        alert(
          "Something went wrong during registration."
        );

      } finally {
        if (button) {
          button.disabled = false;
          button.textContent =
            "Create Account";
        }
      }
    }
  );
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logoutUser() {
  try {
    const { error } =
      await supabaseClient.auth.signOut();

    if (error) {
      console.error(
        "LOGOUT ERROR:",
        error
      );

      alert(
        "Unable to log out."
      );

      return;
    }

    currentUser = null;
    currentProfile = null;

    alert("You have been logged out.");

    showLoggedOutAccount();

  } catch (error) {
    console.error(
      "LOGOUT EXCEPTION:",
      error
    );

    alert(
      "Something went wrong while logging out."
    );
  }
}


/* =========================================================
   LOGIN MODAL
   ========================================================= */

function openLoginModal() {
  const modal =
    getElement("loginModal");

  if (!modal) {
    console.warn(
      "Login modal not found."
    );
    return;
  }

  modal.style.display = "flex";
  modal.classList.add("active");

  lockPageScroll();
}


function closeLoginModal() {
  const modal =
    getElement("loginModal");

  if (!modal) {
    return;
  }

  modal.style.display = "none";
  modal.classList.remove("active");

  unlockPageScroll();
}


/* =========================================================
   REGISTER MODAL
   ========================================================= */

function openRegisterModal() {
  const modal =
    getElement("registerModal");

  if (!modal) {
    console.warn(
      "Register modal not found."
    );
    return;
  }

  modal.style.display = "flex";
  modal.classList.add("active");

  lockPageScroll();
}


function closeRegisterModal() {
  const modal =
    getElement("registerModal");

  if (!modal) {
    return;
  }

  modal.style.display = "none";
  modal.classList.remove("active");

  unlockPageScroll();
}


/* =========================================================
   SWITCH LOGIN / REGISTER
   ========================================================= */

function showRegister() {
  closeLoginModal();
  openRegisterModal();
}


function showLogin() {
  closeRegisterModal();
  openLoginModal();
}


/* =========================================================
   ACCOUNT DISPLAY
   ========================================================= */

function showLoggedInAccount() {
  const accountArea =
    getElement("accountArea");

  if (!accountArea) {
    return;
  }

  const name =
    escapeHTML(
      currentProfile?.full_name ||
      currentUser?.user_metadata?.full_name ||
      "SiomaMarket User"
    );

  const phone =
    escapeHTML(
      currentProfile?.phone ||
      currentUser?.user_metadata?.phone ||
      ""
    );

  accountArea.innerHTML = `
    <div class="account-card">

      <h2>
        Welcome, ${name}
      </h2>

      <p>
        ${phone}
      </p>

      <button
        type="button"
        onclick="logoutUser()"
      >
        Logout
      </button>

    </div>
  `;
}


function showLoggedOutAccount() {
  const accountArea =
    getElement("accountArea");

  if (!accountArea) {
    return;
  }

  accountArea.innerHTML = `
    <div class="account-card">

      <h2>
        Welcome to SiomaMarket
      </h2>

      <p>
        Login or create an account to sell products.
      </p>

      <button
        type="button"
        onclick="openLoginModal()"
      >
        Login
      </button>

      <button
        type="button"
        onclick="openRegisterModal()"
      >
        Create Account
      </button>

    </div>
  `;
}


/* =========================================================
   AUTH STATE REFRESH
   ========================================================= */

async function refreshAccountState() {
  if (currentUser) {
    await loadCurrentProfile();
    showLoggedInAccount();
  } else {
    showLoggedOutAccount();
  }
    }
/* =========================================================
   PART 5 — SELL FORM + 3-PHOTO UPLOAD
   ========================================================= */


/* =========================================================
   SETUP SELL FORM
   ========================================================= */

function setupSellForm() {
  const form =
    getElement("sellForm");

  if (!form) {
    console.warn("Sell form not found.");
    return;
  }

  form.addEventListener(
    "submit",
    async function (event) {
      event.preventDefault();

      await submitListing(form);
    }
  );
}


/* =========================================================
   SUBMIT LISTING
   ========================================================= */

async function submitListing(form) {
  if (!currentUser) {
    alert(
      "Please login before posting a product."
    );

    openLoginModal();
    return;
  }

  const title =
    getElement("listingTitle")?.value.trim() ||
    getElement("productTitle")?.value.trim() ||
    "";

  const price =
    getElement("listingPrice")?.value.trim() ||
    getElement("productPrice")?.value.trim() ||
    "";

  const category =
    getElement("listingCategory")?.value.trim() ||
    getElement("productCategory")?.value.trim() ||
    "";

  const location =
    getElement("listingLocation")?.value.trim() ||
    getElement("productLocation")?.value.trim() ||
    DEFAULT_LOCATION;

  const description =
    getElement("listingDescription")?.value.trim() ||
    getElement("productDescription")?.value.trim() ||
    "";

  const imageInput =
    getElement("listingImages") ||
    getElement("productImages") ||
    getElement("imageInput");

  if (!title) {
    alert("Please enter a product title.");
    return;
  }

  if (!price) {
    alert("Please enter a price.");
    return;
  }

  if (!category) {
    alert("Please select a category.");
    return;
  }

  if (
    imageInput &&
    imageInput.files &&
    imageInput.files.length > 3
  ) {
    alert(
      "Please select a maximum of 3 photos."
    );
    return;
  }

  const submitButton =
    form.querySelector(
      'button[type="submit"]'
    );

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent =
      "Uploading...";
  }

  try {
    const imageUrls = [];

    if (
      imageInput &&
      imageInput.files &&
      imageInput.files.length
    ) {
      for (
        let i = 0;
        i < imageInput.files.length;
        i++
      ) {
        const url =
          await uploadProductImage(
            imageInput.files[i]
          );

        if (url) {
          imageUrls.push(url);
        }
      }
    }

    let storedImageUrl = "";

    if (imageUrls.length === 1) {
      storedImageUrl = imageUrls[0];
    } else if (imageUrls.length > 1) {
      /*
       * The current listings table has one
       * image_url column, so multiple image
       * URLs are stored together as JSON.
       */
      storedImageUrl =
        JSON.stringify(imageUrls);
    }

    const sellerName =
      currentProfile?.full_name ||
      currentUser?.user_metadata?.full_name ||
      "Sioma Seller";

    const sellerPhone =
      currentProfile?.phone ||
      currentUser?.user_metadata?.phone ||
      "";

    /*
     * Description is deliberately NOT inserted
     * because your current listings schema does
     * not include a description column.
     */

    const listingData = {
      title: title,
      price: Number(price),
      category: category,
      location: location || DEFAULT_LOCATION,
      image_url: storedImageUrl,
      seller_name: sellerName,
      seller_phone: sellerPhone,
      status: "active"
    };

    const { data, error } =
      await supabaseClient
        .from("listings")
        .insert(listingData)
        .select()
        .single();

    if (error) {
      console.error(
        "LISTING INSERT ERROR:",
        error
      );

      alert(
        "Product could not be posted: " +
        error.message
      );

      return;
    }

    console.log(
      "LISTING CREATED:",
      data
    );

    alert(
      "Your product has been posted successfully!"
    );

    form.reset();

    await loadLatestProducts();

  } catch (error) {
    console.error(
      "SUBMIT LISTING ERROR:",
      error
    );

    alert(
      "Something went wrong while posting your product."
    );

  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent =
        "Post Product";
    }
  }
}


/* =========================================================
   UPLOAD PRODUCT IMAGE
   ========================================================= */

async function uploadProductImage(file) {
  if (!file) {
    return null;
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (
    !allowedTypes.includes(file.type)
  ) {
    throw new Error(
      "Only JPG, PNG and WebP images are allowed."
    );
  }

  /*
   * Keep image size reasonable for mobile
   * uploads.
   */
  if (file.size > 5 * 1024 * 1024) {
    throw new Error(
      "Each photo must be 5MB or smaller."
    );
  }

  const extension =
    file.name
      .split(".")
      .pop()
      .toLowerCase();

  const fileName =
    `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 10)}.${extension}`;

  const filePath =
    `${currentUser.id}/${fileName}`;

  const { error: uploadError } =
    await supabaseClient.storage
      .from("Product-images")
      .upload(
        filePath,
        file,
        {
          cacheControl: "3600",
          upsert: false
        }
      );

  if (uploadError) {
    console.error(
      "IMAGE UPLOAD ERROR:",
      uploadError
    );

    throw new Error(
      "Photo upload failed: " +
      uploadError.message
    );
  }

  const { data } =
    supabaseClient.storage
      .from("Product-images")
      .getPublicUrl(
        filePath
      );

  return data?.publicUrl || null;
}


/* =========================================================
   IMAGE INPUT LIMIT
   ========================================================= */

function setupImageInputLimit() {
  const input =
    getElement("listingImages") ||
    getElement("productImages") ||
    getElement("imageInput");

  if (!input) {
    return;
  }

  input.setAttribute(
    "accept",
    "image/jpeg,image/png,image/webp"
  );

  input.setAttribute(
    "multiple",
    "multiple"
  );

  input.addEventListener(
    "change",
    function () {
      if (this.files.length > 3) {
        alert(
          "You can select a maximum of 3 photos."
        );

        this.value = "";
      }
    }
  );
}


/* =========================================================
   INITIALIZE IMAGE INPUT
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function () {
    setupImageInputLimit();
  }
);
/* =========================================================
   SIOMA MARKET — SCRIPT.JS
   PART 6 — SELLER DASHBOARD
   ========================================================= */


/* =========================================================
   LOAD SELLER DASHBOARD
   ========================================================= */

async function loadSellerDashboard() {
  if (!currentUser) {
    showLoggedOutAccount();
    return;
  }

  const dashboard =
    getElement("sellerDashboard") ||
    getElement("dashboardSection");

  if (dashboard) {
    dashboard.style.display = "block";
  }

  await loadSellerListings();
}


/* =========================================================
   GET SELLER PHONE
   ========================================================= */

function getSellerPhone() {
  if (currentProfile?.phone) {
    return currentProfile.phone;
  }

  if (currentUser?.user_metadata?.phone) {
    return currentUser.user_metadata.phone;
  }

  return "";
}


/* =========================================================
   LOAD SELLER LISTINGS
   ========================================================= */

async function loadSellerListings() {
  if (!currentUser) {
    return;
  }

  const sellerPhone = getSellerPhone();

  if (!sellerPhone) {
    renderSellerListings([]);
    updateSellerStats([]);
    return;
  }

  try {
    const { data, error } =
      await supabaseClient
        .from("listings")
        .select("*")
        .eq("seller_phone", sellerPhone)
        .order("created_at", {
          ascending: false
        });

    if (error) {
      console.error(
        "SELLER LISTINGS ERROR:",
        error
      );

      showSellerDashboardError(
        "Unable to load your listings."
      );

      return;
    }

    const listings = data || [];

    updateSellerStats(listings);
    renderSellerListings(listings);

  } catch (error) {
    console.error(
      "SELLER DASHBOARD ERROR:",
      error
    );

    showSellerDashboardError(
      "Something went wrong while loading your listings."
    );
  }
}


/* =========================================================
   SELLER STATISTICS
   ========================================================= */

function updateSellerStats(listings) {
  const total = listings.length;

  const active =
    listings.filter(function (item) {
      return String(item.status || "")
        .toLowerCase() === "active";
    }).length;

  const sold =
    listings.filter(function (item) {
      return String(item.status || "")
        .toLowerCase() === "sold";
    }).length;


  const totalElement =
    getElement("totalListings") ||
    getElement("sellerTotalListings");

  const activeElement =
    getElement("activeListings") ||
    getElement("sellerActiveListings");

  const soldElement =
    getElement("soldListings") ||
    getElement("sellerSoldListings");


  if (totalElement) {
    totalElement.textContent = total;
  }

  if (activeElement) {
    activeElement.textContent = active;
  }

  if (soldElement) {
    soldElement.textContent = sold;
  }
}


/* =========================================================
   RENDER SELLER LISTINGS
   ========================================================= */

function renderSellerListings(listings) {
  const container =
    getElement("sellerListings") ||
    getElement("myListings") ||
    getElement("sellerListingList");

  if (!container) {
    return;
  }

  if (!listings.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <h3>No listings yet</h3>
        <p>
          Products you post on SiomaMarket
          will appear here.
        </p>
        <button
          type="button"
          onclick="openSellSection()"
        >
          Sell an Item
        </button>
      </div>
    `;

    return;
  }


  let html = "";


  listings.forEach(function (listing) {
    const id =
      escapeHTML(listing.id);

    const title =
      escapeHTML(
        listing.title || "Untitled product"
      );

    const price =
      formatPrice(listing.price);

    const category =
      escapeHTML(
        listing.category || "Other"
      );

    const location =
      escapeHTML(
        listing.location || DEFAULT_LOCATION
      );

    const status =
      String(
        listing.status || "active"
      ).toLowerCase();


    let image =
      "https://placehold.co/400x400?text=SiomaMarket";


    if (listing.image_url) {
      try {
        const parsed =
          JSON.parse(listing.image_url);

        if (Array.isArray(parsed) &&
            parsed.length > 0) {
          image = parsed[0];
        }
      } catch (error) {
        image = listing.image_url;
      }
    }


    const safeImage =
      escapeHTML(image);


    html += `
      <div class="seller-listing-card">

        <div class="seller-listing-image">
          <img
            src="${safeImage}"
            alt="${title}"
            loading="lazy"
            onerror="this.src='https://placehold.co/400x400?text=No+Image'"
          >
        </div>

        <div class="seller-listing-info">

          <span class="seller-listing-category">
            ${category}
          </span>

          <h3>
            ${title}
          </h3>

          <strong>
            ${price}
          </strong>

          <p>
            ${location}
          </p>

          <span class="listing-status status-${escapeHTML(status)}">
            ${escapeHTML(status)}
          </span>

          <div class="seller-listing-actions">

            <button
              type="button"
              onclick="viewListing('${id}')"
            >
              View
            </button>

            <button
              type="button"
              onclick="editListing('${id}')"
            >
              Edit
            </button>

            <button
              type="button"
              onclick="deleteListing('${id}')"
            >
              Delete
            </button>

          </div>

        </div>

      </div>
    `;
  });


  container.innerHTML = html;
}


/* =========================================================
   EDIT LISTING
   ========================================================= */

async function editListing(id) {
  if (!currentUser) {
    openLoginModal();
    return;
  }

  try {
    const { data, error } =
      await supabaseClient
        .from("listings")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (error || !data) {
      alert("Listing could not be found.");
      return;
    }


    const newTitle =
      prompt(
        "Product title:",
        data.title || ""
      );

    if (newTitle === null) {
      return;
    }


    const newPrice =
      prompt(
        "Price in Kwacha:",
        data.price || ""
      );

    if (newPrice === null) {
      return;
    }


    const newLocation =
      prompt(
        "Location:",
        data.location || DEFAULT_LOCATION
      );

    if (newLocation === null) {
      return;
    }


    if (!newTitle.trim()) {
      alert("Product title cannot be empty.");
      return;
    }


    if (
      newPrice.trim() === "" ||
      Number(newPrice) < 0
    ) {
      alert("Please enter a valid price.");
      return;
    }


    const { error: updateError } =
      await supabaseClient
        .from("listings")
        .update({
          title: newTitle.trim(),
          price: Number(newPrice),
          location:
            newLocation.trim() ||
            DEFAULT_LOCATION
        })
        .eq("id", id);


    if (updateError) {
      console.error(
        "EDIT LISTING ERROR:",
        updateError
      );

      alert(
        "Unable to update listing."
      );

      return;
    }


    alert("Listing updated successfully.");

    await loadSellerListings();
    await loadLatestProducts();

  } catch (error) {
    console.error(
      "EDIT ERROR:",
      error
    );

    alert(
      "Something went wrong while editing the listing."
    );
  }
}


/* =========================================================
   DELETE LISTING
   ========================================================= */

async function deleteListing(id) {
  if (!currentUser) {
    openLoginModal();
    return;
  }


  const confirmed =
    confirm(
      "Are you sure you want to delete this listing?"
    );

  if (!confirmed) {
    return;
  }


  try {
    const { error } =
      await supabaseClient
        .from("listings")
        .delete()
        .eq("id", id);


    if (error) {
      console.error(
        "DELETE LISTING ERROR:",
        error
      );

      alert(
        "Unable to delete this listing."
      );

      return;
    }


    favorites =
      favorites.filter(function (item) {
        return String(item) !== String(id);
      });

    saveFavoritesToStorage();
    updateFavoriteCount();


    alert(
      "Listing deleted successfully."
    );


    await loadSellerListings();
    await loadLatestProducts();

  } catch (error) {
    console.error(
      "DELETE ERROR:",
      error
    );

    alert(
      "Something went wrong while deleting the listing."
    );
  }
}


/* =========================================================
   OPEN SELL SECTION
   ========================================================= */

function openSellSection() {
  const sellSection =
    getElement("sellSection") ||
    getElement("sellPage") ||
    getElement("sellModal");


  if (sellSection) {
    sellSection.style.display = "block";
    sellSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}


/* =========================================================
   SHOW SELLER DASHBOARD
   ========================================================= */

async function showSellerDashboard() {
  if (!currentUser) {
    openLoginModal();
    return;
  }

  const accountArea =
    getElement("accountArea");

  if (accountArea) {
    accountArea.style.display = "none";
  }


  const dashboard =
    getElement("sellerDashboard") ||
    getElement("dashboardSection");

  if (dashboard) {
    dashboard.style.display = "block";
  }


  await loadSellerDashboard();
}


/* =========================================================
   DASHBOARD ERROR
   ========================================================= */

function showSellerDashboardError(message) {
  const container =
    getElement("sellerListings") ||
    getElement("myListings") ||
    getElement("sellerListingList");

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="empty-state">
      <h3>Something went wrong</h3>
      <p>
        ${escapeHTML(message)}
      </p>

      <button
        type="button"
        onclick="loadSellerListings()"
      >
        Try Again
      </button>
    </div>
  `;
}


/* =========================================================
   REFRESH DASHBOARD AFTER LOGIN
   ========================================================= */

supabaseClient.auth.onAuthStateChange(
  async function (event) {

    if (
      event === "SIGNED_IN" ||
      event === "USER_UPDATED"
    ) {
      await loadSellerDashboard();
    }

    if (event === "SIGNED_OUT") {

      const dashboard =
        getElement("sellerDashboard") ||
        getElement("dashboardSection");

      if (dashboard) {
        dashboard.style.display = "none";
      }
    }

  }
);
/* =========================================================
   SIOMA MARKET — SCRIPT.JS
   PART 7 — MESSAGING & CONVERSATIONS
   ========================================================= */


/* =========================================================
   GLOBAL MESSAGE STATE
   ========================================================= */

let currentConversationId = null;
let messageSubscription = null;


/* =========================================================
   GET CURRENT USER ID
   ========================================================= */

function getCurrentUserId() {
  return currentUser?.id || null;
}


/* =========================================================
   OPEN MESSAGE AREA
   ========================================================= */

function openMessages() {
  if (!currentUser) {
    openLoginModal();
    return;
  }

  const messagesSection =
    getElement("messagesSection") ||
    getElement("messagingSection") ||
    getElement("messagesPage");

  if (messagesSection) {
    messagesSection.style.display = "block";

    messagesSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  loadConversations();
}


/* =========================================================
   LOAD CONVERSATIONS
   ========================================================= */

async function loadConversations() {
  if (!currentUser) {
    return;
  }

  const container =
    getElement("conversationList") ||
    getElement("conversations") ||
    getElement("messagesList");

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="loading-state">
      Loading conversations...
    </div>
  `;


  try {

    const { data, error } =
      await supabaseClient
        .from("conversations")
        .select("*")
        .or(
          `buyer_id.eq.${currentUser.id},seller_id.eq.${currentUser.id}`
        )
        .order("updated_at", {
          ascending: false
        });


    if (error) {
      console.error(
        "CONVERSATIONS ERROR:",
        error
      );

      container.innerHTML = `
        <div class="empty-state">
          <h3>Messages unavailable</h3>
          <p>
            Your conversations could not be loaded.
          </p>
        </div>
      `;

      return;
    }


    const conversations =
      data || [];


    if (!conversations.length) {

      container.innerHTML = `
        <div class="empty-state">

          <div class="empty-state-icon">
            💬
          </div>

          <h3>No messages yet</h3>

          <p>
            Messages from buyers and sellers
            will appear here.
          </p>

        </div>
      `;

      return;
    }


    renderConversations(
      conversations
    );


  } catch (error) {

    console.error(
      "LOAD CONVERSATIONS ERROR:",
      error
    );

    container.innerHTML = `
      <div class="empty-state">
        <h3>Something went wrong</h3>
        <p>
          Please try again.
        </p>
      </div>
    `;
  }
}


/* =========================================================
   RENDER CONVERSATIONS
   ========================================================= */

function renderConversations(
  conversations
) {

  const container =
    getElement("conversationList") ||
    getElement("conversations") ||
    getElement("messagesList");

  if (!container) {
    return;
  }


  let html = "";


  conversations.forEach(
    function (conversation) {

      const id =
        escapeHTML(
          conversation.id
        );


      const buyerName =
        conversation.buyer_name ||
        "Buyer";


      const sellerName =
        conversation.seller_name ||
        "Seller";


      const otherName =
        String(
          conversation.buyer_id
        ) === String(currentUser.id)
          ? sellerName
          : buyerName;


      const lastMessage =
        conversation.last_message ||
        "Start a conversation";


      const unread =
        Number(
          conversation.unread_count || 0
        );


      html += `
        <button
          type="button"
          class="conversation-item"
          onclick="openConversation('${id}')"
        >

          <div class="conversation-avatar">
            ${escapeHTML(
              String(otherName).charAt(0)
            ).toUpperCase()}
          </div>

          <div class="conversation-content">

            <strong>
              ${escapeHTML(otherName)}
            </strong>

            <p>
              ${escapeHTML(lastMessage)}
            </p>

          </div>

          ${
            unread > 0
              ? `
                <span class="unread-badge">
                  ${unread}
                </span>
              `
              : ""
          }

        </button>
      `;
    }
  );


  container.innerHTML = html;
}


/* =========================================================
   OPEN A CONVERSATION
   ========================================================= */

async function openConversation(
  conversationId
) {

  if (!currentUser) {
    openLoginModal();
    return;
  }


  currentConversationId =
    conversationId;


  const messagesContainer =
    getElement("chatMessages") ||
    getElement("messageList") ||
    getElement("messagesContainer");


  if (messagesContainer) {

    messagesContainer.innerHTML = `
      <div class="loading-state">
        Loading messages...
      </div>
    `;
  }


  const chatSection =
    getElement("chatSection") ||
    getElement("chatArea");


  if (chatSection) {
    chatSection.style.display = "block";
  }


  await loadMessages(
    conversationId
  );


  subscribeToMessages(
    conversationId
  );
}


/* =========================================================
   LOAD MESSAGES
   ========================================================= */

async function loadMessages(
  conversationId
) {

  const container =
    getElement("chatMessages") ||
    getElement("messageList") ||
    getElement("messagesContainer");


  if (!container) {
    return;
  }


  try {

    const { data, error } =
      await supabaseClient
        .from("messages")
        .select("*")
        .eq(
          "conversation_id",
          conversationId
        )
        .order("created_at", {
          ascending: true
        });


    if (error) {

      console.error(
        "MESSAGES ERROR:",
        error
      );

      container.innerHTML = `
        <div class="empty-state">
          <p>
            Unable to load messages.
          </p>
        </div>
      `;

      return;
    }


    renderMessages(
      data || []
    );


  } catch (error) {

    console.error(
      "LOAD MESSAGES ERROR:",
      error
    );
  }
}


/* =========================================================
   RENDER MESSAGES
   ========================================================= */

function renderMessages(
  messages
) {

  const container =
    getElement("chatMessages") ||
    getElement("messageList") ||
    getElement("messagesContainer");


  if (!container) {
    return;
  }


  if (!messages.length) {

    container.innerHTML = `
      <div class="empty-chat">
        <p>
          No messages yet.
        </p>

        <small>
          Send the first message.
        </small>
      </div>
    `;

    return;
  }


  let html = "";


  messages.forEach(
    function (message) {

      const mine =
        String(message.sender_id) ===
        String(currentUser?.id);


      html += `
        <div
          class="chat-message ${
            mine
              ? "message-mine"
              : "message-other"
          }"
        >

          <div class="chat-bubble">
            ${escapeHTML(
              message.message || ""
            )}
          </div>

        </div>
      `;
    }
  );


  container.innerHTML = html;


  container.scrollTop =
    container.scrollHeight;
}


/* =========================================================
   SEND MESSAGE
   ========================================================= */

async function sendMessage() {

  if (!currentUser) {
    openLoginModal();
    return;
  }


  if (!currentConversationId) {
    alert(
      "Please open a conversation first."
    );

    return;
  }


  const input =
    getElement("messageInput") ||
    getElement("chatInput") ||
    getElement("newMessage");


  if (!input) {
    return;
  }


  const message =
    input.value.trim();


  if (!message) {
    return;
  }


  input.disabled = true;


  try {

    const { error } =
      await supabaseClient
        .from("messages")
        .insert({
          conversation_id:
            currentConversationId,

          sender_id:
            currentUser.id,

          message:
            message
        });


    if (error) {

      console.error(
        "SEND MESSAGE ERROR:",
        error
      );

      alert(
        "Unable to send message."
      );

      return;
    }


    input.value = "";


    await loadMessages(
      currentConversationId
    );


  } catch (error) {

    console.error(
      "MESSAGE ERROR:",
      error
    );

    alert(
      "Something went wrong while sending the message."
    );

  } finally {

    input.disabled = false;

    input.focus();
  }
}


/* =========================================================
   ENTER KEY SEND
   ========================================================= */

function setupMessageInput() {

  const input =
    getElement("messageInput") ||
    getElement("chatInput") ||
    getElement("newMessage");


  if (!input) {
    return;
  }


  input.addEventListener(
    "keydown",
    function (event) {

      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {

        event.preventDefault();

        sendMessage();
      }
    }
  );
}


/* =========================================================
   REAL-TIME MESSAGE UPDATES
   ========================================================= */

function subscribeToMessages(
  conversationId
) {

  if (messageSubscription) {

    supabaseClient
      .removeChannel(
        messageSubscription
      );

    messageSubscription = null;
  }


  messageSubscription =
    supabaseClient
      .channel(
        "messages-" +
        conversationId
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter:
            "conversation_id=eq." +
            conversationId
        },
        async function () {

          await loadMessages(
            conversationId
          );

        }
      )
      .subscribe();
}


/* =========================================================
   CLOSE CHAT
   ========================================================= */

function closeChat() {

  if (messageSubscription) {

    supabaseClient
      .removeChannel(
        messageSubscription
      );

    messageSubscription = null;
  }


  currentConversationId =
    null;


  const chatSection =
    getElement("chatSection") ||
    getElement("chatArea");


  if (chatSection) {
    chatSection.style.display =
      "none";
  }
}


/* =========================================================
   MESSAGE BUTTON SETUP
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    setupMessageInput();

  }
);
 /* =========================================================
   SIOMA MARKET — SCRIPT.JS
   PART 8 — ADMIN DASHBOARD
   ========================================================= */


/* =========================================================
   ADMIN CONFIGURATION
   ========================================================= */

/*
   Add your admin email here.

   IMPORTANT:
   Change this email to the email account you use
   for SiomaMarket administration.
*/

const ADMIN_EMAILS = [
  "admin@example.com"
];


/* =========================================================
   CHECK ADMIN
   ========================================================= */

function isAdmin() {
  if (!currentUser) {
    return false;
  }

  const email =
    String(currentUser.email || "")
      .toLowerCase()
      .trim();

  return ADMIN_EMAILS.includes(email);
}


/* =========================================================
   REQUIRE ADMIN
   ========================================================= */

function requireAdmin() {
  if (!currentUser) {
    openLoginModal();
    return false;
  }

  if (!isAdmin()) {
    alert(
      "Admin access is required."
    );

    return false;
  }

  return true;
}


/* =========================================================
   OPEN ADMIN DASHBOARD
   ========================================================= */

async function openAdminDashboard() {

  if (!requireAdmin()) {
    return;
  }

  const dashboard =
    getElement("adminDashboard") ||
    getElement("adminSection");

  if (dashboard) {
    dashboard.style.display = "block";

    dashboard.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  await loadAdminListings();
}


/* =========================================================
   LOAD ALL ADMIN LISTINGS
   ========================================================= */

async function loadAdminListings() {

  if (!requireAdmin()) {
    return;
  }

  const container =
    getElement("adminListings") ||
    getElement("adminListingTable") ||
    getElement("adminTableBody");

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="loading-state">
      Loading marketplace listings...
    </div>
  `;


  try {

    const { data, error } =
      await supabaseClient
        .from("listings")
        .select("*")
        .order("created_at", {
          ascending: false
        });


    if (error) {

      console.error(
        "ADMIN LISTINGS ERROR:",
        error
      );

      container.innerHTML = `
        <div class="empty-state">
          <h3>Unable to load listings</h3>
          <p>
            Please check your admin permissions
            and database policies.
          </p>
        </div>
      `;

      return;
    }


    renderAdminListings(
      data || []
    );


  } catch (error) {

    console.error(
      "ADMIN DASHBOARD ERROR:",
      error
    );

    container.innerHTML = `
      <div class="empty-state">
        <h3>Something went wrong</h3>
        <p>
          Please try again.
        </p>
      </div>
    `;
  }
}


/* =========================================================
   RENDER ADMIN LISTINGS
   ========================================================= */

function renderAdminListings(
  listings
) {

  const container =
    getElement("adminListings") ||
    getElement("adminListingTable") ||
    getElement("adminTableBody");

  if (!container) {
    return;
  }


  if (!listings.length) {

    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          📦
        </div>

        <h3>No listings found</h3>

        <p>
          There are currently no marketplace listings.
        </p>
      </div>
    `;

    return;
  }


  let html = "";


  listings.forEach(
    function (listing) {

      const id =
        escapeHTML(
          listing.id
        );

      const title =
        escapeHTML(
          listing.title ||
          "Untitled"
        );

      const price =
        formatPrice(
          listing.price
        );

      const category =
        escapeHTML(
          listing.category ||
          "Other"
        );

      const location =
        escapeHTML(
          listing.location ||
          DEFAULT_LOCATION
        );

      const seller =
        escapeHTML(
          listing.seller_name ||
          "Seller"
        );

      const phone =
        escapeHTML(
          listing.seller_phone ||
          ""
        );

      const status =
        String(
          listing.status ||
          "active"
        ).toLowerCase();


      html += `
        <div class="admin-listing-row">

          <div class="admin-listing-main">

            <strong>
              ${title}
            </strong>

            <span>
              ${price}
            </span>

          </div>


          <div class="admin-listing-meta">

            <span>
              ${category}
            </span>

            <span>
              ${location}
            </span>

            <span>
              Seller: ${seller}
            </span>

            ${
              phone
                ? `
                  <span>
                    ${phone}
                  </span>
                `
                : ""
            }

          </div>


          <div class="admin-listing-status">

            <span
              class="listing-status status-${escapeHTML(status)}"
            >
              ${escapeHTML(status)}
            </span>

          </div>


          <div class="admin-listing-actions">

            <button
              type="button"
              onclick="adminViewListing('${id}')"
            >
              View
            </button>

            <button
              type="button"
              onclick="setListingStatus('${id}', 'active')"
            >
              Activate
            </button>

            <button
              type="button"
              onclick="setListingStatus('${id}', 'sold')"
            >
              Sold
            </button>

            <button
              type="button"
              onclick="setListingStatus('${id}', 'inactive')"
            >
              Hide
            </button>

            <button
              type="button"
              onclick="adminDeleteListing('${id}')"
            >
              Delete
            </button>

          </div>

        </div>
      `;
    }
  );


  container.innerHTML = html;
}


/* =========================================================
   ADMIN VIEW LISTING
   ========================================================= */

async function adminViewListing(
  id
) {

  if (!requireAdmin()) {
    return;
  }

  await viewListing(id);
}


/* =========================================================
   CHANGE LISTING STATUS
   ========================================================= */

async function setListingStatus(
  id,
  newStatus
) {

  if (!requireAdmin()) {
    return;
  }


  const allowedStatuses = [
    "active",
    "sold",
    "inactive"
  ];


  if (
    !allowedStatuses.includes(
      newStatus
    )
  ) {
    return;
  }


  try {

    const { error } =
      await supabaseClient
        .from("listings")
        .update({
          status: newStatus
        })
        .eq("id", id);


    if (error) {

      console.error(
        "STATUS UPDATE ERROR:",
        error
      );

      alert(
        "Unable to update listing status."
      );

      return;
    }


    await loadAdminListings();

    await loadLatestProducts();


  } catch (error) {

    console.error(
      "ADMIN STATUS ERROR:",
      error
    );

    alert(
      "Something went wrong."
    );
  }
}


/* =========================================================
   ADMIN DELETE LISTING
   ========================================================= */

async function adminDeleteListing(
  id
) {

  if (!requireAdmin()) {
    return;
  }


  const confirmed =
    confirm(
      "Delete this listing permanently?"
    );


  if (!confirmed) {
    return;
  }


  try {

    const { error } =
      await supabaseClient
        .from("listings")
        .delete()
        .eq("id", id);


    if (error) {

      console.error(
        "ADMIN DELETE ERROR:",
        error
      );

      alert(
        "Unable to delete listing."
      );

      return;
    }


    favorites =
      favorites.filter(
        function (favoriteId) {
          return String(favoriteId) !==
            String(id);
        }
      );


    saveFavoritesToStorage();
    updateFavoriteCount();


    await loadAdminListings();

    await loadLatestProducts();


  } catch (error) {

    console.error(
      "ADMIN DELETE ERROR:",
      error
    );

    alert(
      "Something went wrong while deleting."
    );
  }
}


/* =========================================================
   ADMIN STATUS FILTER
   ========================================================= */

async function filterAdminListings(
  status
) {

  if (!requireAdmin()) {
    return;
  }


  const container =
    getElement("adminListings") ||
    getElement("adminListingTable") ||
    getElement("adminTableBody");

  if (!container) {
    return;
  }


  try {

    let query =
      supabaseClient
        .from("listings")
        .select("*")
        .order("created_at", {
          ascending: false
        });


    if (
      status &&
      status !== "all"
    ) {
      query =
        query.eq(
          "status",
          status
        );
    }


    const { data, error } =
      await query;


    if (error) {

      console.error(
        "ADMIN FILTER ERROR:",
        error
      );

      return;
    }


    renderAdminListings(
      data || []
    );


  } catch (error) {

    console.error(
      "ADMIN FILTER ERROR:",
      error
    );
  }
}


/* =========================================================
   ADMIN DASHBOARD REFRESH
   ========================================================= */

async function refreshAdminDashboard() {

  if (!requireAdmin()) {
    return;
  }

  await loadAdminListings();
}


/* =========================================================
   CLOSE ADMIN DASHBOARD
   ========================================================= */

function closeAdminDashboard() {

  const dashboard =
    getElement("adminDashboard") ||
    getElement("adminSection");

  if (dashboard) {
    dashboard.style.display =
      "none";
  }
}
/* =========================================================
   SIOMA MARKET — SCRIPT.JS
   PART 9 — NAVIGATION + UI CONTROLS
   ========================================================= */


/* =========================================================
   SHOW SECTION
   ========================================================= */

function showSection(sectionId) {

  const sections = document.querySelectorAll(
    ".page-section, .app-section, section[data-section]"
  );

  sections.forEach(function (section) {
    section.style.display = "none";
  });


  const section =
    getElement(sectionId);

  if (section) {
    section.style.display = "block";

    section.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}


/* =========================================================
   HOME
   ========================================================= */

function goHome() {

  const sections = document.querySelectorAll(
    ".page-section, .app-section, section[data-section]"
  );

  sections.forEach(function (section) {
    section.style.display = "none";
  });


  const home =
    getElement("homeSection") ||
    getElement("homePage") ||
    getElement("mainContent");

  if (home) {
    home.style.display = "block";
  }


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });


  loadLatestProducts();
}


/* =========================================================
   FAVORITES NAVIGATION
   ========================================================= */

function openFavorites() {

  showFavorites();

  const favoritesSection =
    getElement("favoritesSection") ||
    getElement("favoritesPage");

  if (favoritesSection) {
    favoritesSection.style.display = "block";

    favoritesSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}


/* =========================================================
   ACCOUNT NAVIGATION
   ========================================================= */

async function openAccount() {

  const accountArea =
    getElement("accountArea") ||
    getElement("accountSection") ||
    getElement("accountPage");


  if (!accountArea) {
    return;
  }


  accountArea.style.display = "block";


  accountArea.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });


  await refreshAccountState();
}


/* =========================================================
   SELL NAVIGATION
   ========================================================= */

function openSell() {

  if (!currentUser) {
    openLoginModal();
    return;
  }


  const sellSection =
    getElement("sellSection") ||
    getElement("sellPage");


  if (sellSection) {

    sellSection.style.display =
      "block";

    sellSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    return;
  }


  openSellSection();
}


/* =========================================================
   DASHBOARD NAVIGATION
   ========================================================= */

async function openDashboard() {

  if (!currentUser) {
    openLoginModal();
    return;
  }

  await showSellerDashboard();
}


/* =========================================================
   CLOSE ALL MODALS
   ========================================================= */

function closeAllModals() {

  const modalIds = [
    "loginModal",
    "registerModal",
    "productDetails",
    "productDetailsModal",
    "sellModal",
    "messageModal"
  ];


  modalIds.forEach(function (id) {

    const element =
      getElement(id);

    if (element) {
      element.style.display =
        "none";
    }
  });


  unlockPageScroll();
}


/* =========================================================
   CLOSE ON BACKDROP CLICK
   ========================================================= */

document.addEventListener(
  "click",
  function (event) {

    const target =
      event.target;


    if (
      target.classList &&
      target.classList.contains("modal")
    ) {
      target.style.display =
        "none";

      unlockPageScroll();
    }

  }
);


/* =========================================================
   ESCAPE KEY
   ========================================================= */

document.addEventListener(
  "keydown",
  function (event) {

    if (event.key === "Escape") {
      closeAllModals();
    }

  }
);


/* =========================================================
   CATEGORY BUTTON HELPER
   ========================================================= */

function selectCategory(category) {

  if (!category) {
    return;
  }


  const searchInput =
    getElement("searchInput") ||
    getElement("search");


  if (searchInput) {
    searchInput.value = "";
  }


  searchCategory(category);
}


/* =========================================================
   SEARCH INPUT
   ========================================================= */

function setupSearch() {

  const input =
    getElement("searchInput") ||
    getElement("search");


  if (!input) {
    return;
  }


  input.addEventListener(
    "keydown",
    function (event) {

      if (
        event.key === "Enter"
      ) {
        event.preventDefault();

        searchMarket();
      }

    }
  );
}


/* =========================================================
   CLEAR SEARCH BUTTON
   ========================================================= */

function setupClearSearchButton() {

  const button =
    getElement("clearSearchButton") ||
    getElement("clearSearchBtn");


  if (!button) {
    return;
  }


  button.addEventListener(
    "click",
    function () {
      clearSearch();
    }
  );
}


/* =========================================================
   BOTTOM NAVIGATION ACTIVE STATE
   ========================================================= */

function setActiveNav(button) {

  const buttons =
    document.querySelectorAll(
      ".bottom-nav button, .bottom-navigation button, .nav-button"
    );


  buttons.forEach(function (item) {
    item.classList.remove(
      "active"
    );
  });


  if (button) {
    button.classList.add(
      "active"
    );
  }
}


/* =========================================================
   GENERAL BUTTON HANDLER
   ========================================================= */

function setupNavigationButtons() {

  document.addEventListener(
    "click",
    function (event) {

      const button =
        event.target.closest(
          "[data-action]"
        );


      if (!button) {
        return;
      }


      const action =
        button.dataset.action;


      if (action === "home") {
        goHome();
      }

      else if (
        action === "favorites"
      ) {
        openFavorites();
      }

      else if (
        action === "account"
      ) {
        openAccount();
      }

      else if (
        action === "sell"
      ) {
        openSell();
      }

      else if (
        action === "dashboard"
      ) {
        openDashboard();
      }

      else if (
        action === "messages"
      ) {
        openMessages();
      }

    }
  );
}


/* =========================================================
   INITIAL UI SETUP
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    setupSearch();

    setupClearSearchButton();

    setupNavigationButtons();

  }
);
/* =========================================================
   PART 10 — IMAGE HANDLING + FINAL UTILITIES
   ========================================================= */


/* =========================================================
   GET ALL LISTING IMAGE URLS
   Supports:
   1. Normal single image URL
   2. JSON array of image URLs
   3. Empty/null image
   ========================================================= */

function getListingImages(imageValue) {

  if (!imageValue) {
    return [];
  }

  // Already an array
  if (Array.isArray(imageValue)) {
    return imageValue.filter(Boolean);
  }

  const value = String(imageValue).trim();

  if (!value) {
    return [];
  }

  // Try JSON array
  if (
    value.startsWith("[") &&
    value.endsWith("]")
  ) {
    try {

      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }

    } catch (error) {

      console.warn(
        "Could not parse image JSON:",
        error
      );

    }
  }

  // Normal single image URL
  return [value];
}


/* =========================================================
   GET FIRST LISTING IMAGE
   ========================================================= */

function getFirstListingImage(imageValue) {

  const images =
    getListingImages(imageValue);

  return images.length
    ? images[0]
    : "";
}


/* =========================================================
   SAFE IMAGE HTML
   ========================================================= */

function createImageHTML(
  imageValue,
  altText = "Product image"
) {

  const image =
    getFirstListingImage(imageValue);

  if (!image) {

    return `
      <div class="product-image-placeholder">
        <span>📷</span>
        <small>No image</small>
      </div>
    `;

  }

  return `
    <img
      src="${escapeHTML(image)}"
      alt="${escapeHTML(altText)}"
      loading="lazy"
      onerror="this.style.display='none';"
    >
  `;
}


/* =========================================================
   IMAGE COUNT
   ========================================================= */

function getListingImageCount(imageValue) {

  return getListingImages(imageValue).length;

}


/* =========================================================
   TOAST MESSAGE
   ========================================================= */

function showToast(message, type = "info") {

  let toast =
    document.getElementById("siomaToast");

  if (!toast) {

    toast =
      document.createElement("div");

    toast.id =
      "siomaToast";

    toast.className =
      "sioma-toast";

    document.body.appendChild(toast);

  }

  toast.textContent =
    message || "Done";

  toast.className =
    `sioma-toast ${type}`;

  toast.classList.add("show");

  clearTimeout(
    window.siomaToastTimer
  );

  window.siomaToastTimer =
    setTimeout(() => {

      toast.classList.remove("show");

    }, 3000);

}


/* =========================================================
   SUCCESS MESSAGE
   ========================================================= */

function showSuccess(message) {

  showToast(
    message || "Success",
    "success"
  );

}


/* =========================================================
   ERROR MESSAGE
   ========================================================= */

function showError(message) {

  showToast(
    message || "Something went wrong.",
    "error"
  );

}


/* =========================================================
   GENERAL ERROR LOGGER
   ========================================================= */

function handleAppError(
  error,
  fallbackMessage = "Something went wrong."
) {

  console.error(
    "SiomaMarket error:",
    error
  );

  showError(
    fallbackMessage
  );

}


/* =========================================================
   ONLINE / OFFLINE STATUS
   ========================================================= */

function updateConnectionStatus() {

  if (navigator.onLine) {

    console.log(
      "SiomaMarket: Online"
    );

  } else {

    console.warn(
      "SiomaMarket: Offline"
    );

    showToast(
      "You are offline.",
      "error"
    );

  }

}


window.addEventListener(
  "online",
  updateConnectionStatus
);


window.addEventListener(
  "offline",
  updateConnectionStatus
);


/* =========================================================
   PREVENT DOUBLE FORM SUBMISSION
   ========================================================= */

function preventDoubleSubmit(form) {

  if (!form) {
    return;
  }

  form.addEventListener(
    "submit",
    function () {

      const submitButton =
        form.querySelector(
          'button[type="submit"]'
        );

      if (!submitButton) {
        return;
      }

      if (
        submitButton.dataset.submitting === "true"
      ) {

        return;

      }

      submitButton.dataset.submitting =
        "true";

      submitButton.disabled =
        true;

      setTimeout(() => {

        submitButton.disabled =
          false;

        submitButton.dataset.submitting =
          "false";

      }, 5000);

    }
  );

}


/* =========================================================
   SET DEFAULT LOCATION
   ========================================================= */

function setDefaultLocation() {

  const locationInputs =
    document.querySelectorAll(
      'input[name="location"], select[name="location"]'
    );

  locationInputs.forEach(input => {

    if (!input.value) {

      input.value =
        DEFAULT_LOCATION;

    }

  });

}


/* =========================================================
   PAGE READY CHECK
   ========================================================= */

function markAppReady() {

  document.body.classList.add(
    "sioma-app-ready"
  );

  setDefaultLocation();

  const forms =
    document.querySelectorAll(
      "form"
    );

  forms.forEach(form => {

    preventDoubleSubmit(form);

  });

  console.log(
    "SiomaMarket initialized successfully."
  );

}


/* =========================================================
   FINAL INITIALIZATION
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    markAppReady();

  }
);
