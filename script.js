/* =========================================================
   SIOMAMARKET
   CLEAN REPLACEMENT SCRIPT.JS
   PART 1 — SUPABASE + GLOBAL STATE + UTILITIES + AUTH
   ========================================================= */


/* =========================================================
   1. SUPABASE
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
   2. APP SETTINGS
   ========================================================= */

const ADMIN_EMAIL =
  "silumesi710@gmail.com";

const EMAIL_REDIRECT_URL =
  "https://silumesi710-netizen.github.io/sioma-market/";

const DEFAULT_IMAGE =
  "https://via.placeholder.com/600x400?text=SiomaMarket";

const MAX_PRODUCT_IMAGES = 3;

const MAX_IMAGE_SIZE =
  6 * 1024 * 1024;

const MESSAGE_READ_KEY =
  "siomaMarket_message_reads";


/* =========================================================
   3. GLOBAL STATE
   ========================================================= */

let currentUser = null;

let currentListingId = null;

let currentListingData = null;

let currentConversationId = null;

let currentConversationListingId = null;

let selectedProductImages = [];

let favoritesCache = new Set();

let sellerListingsCache = [];

let adminListingsCache = [];

let messageReadState = {};

let messageRefreshTimer = null;

let sessionLoaded = false;


/* =========================================================
   4. DOM HELPER
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}


/* =========================================================
   5. ESCAPE HTML
   ========================================================= */

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function escapeAttribute(value) {
  return escapeHTML(value);
}


/* =========================================================
   6. PRICE
   ========================================================= */

function formatPrice(value) {
  const number = Number(value || 0);

  return "K" +
    number.toLocaleString("en-ZM");
}


/* =========================================================
   7. SIOMA CHECK
   ========================================================= */

function isSioma(location) {
  return String(location || "")
    .toLowerCase()
    .includes("sioma");
}


/* =========================================================
   8. PRODUCT IMAGES
   ========================================================= */

function getProductImages(item) {

  if (!item || !item.image_url) {
    return [];
  }

  const raw = item.image_url;

  if (Array.isArray(raw)) {
    return raw.filter(Boolean);
  }

  if (typeof raw === "string") {

    try {

      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }

    } catch (_) {
      /* Normal single URL */
    }

    return raw.trim()
      ? [raw.trim()]
      : [];
  }

  return [];
}


function getPrimaryImage(item) {

  const images =
    getProductImages(item);

  return images[0] || DEFAULT_IMAGE;
}


function getImageStorageValue(images) {

  if (!images || !images.length) {
    return null;
  }

  if (images.length === 1) {
    return images[0];
  }

  return JSON.stringify(images);
}


/* =========================================================
   9. MESSAGE HELPER
   ========================================================= */

function showMessage(
  element,
  message,
  success = false
) {

  if (!element) {
    return;
  }

  element.style.color =
    success
      ? "#087f3d"
      : "#c62828";

  element.innerText = message;
}


/* =========================================================
   10. PAGE CONTROL
   ========================================================= */

function openPage(id) {

  const page = $(id);

  if (!page) {
    return;
  }

  page.style.display = "block";

  page.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.style.overflow =
    "hidden";
}


function closePage(id) {

  const page = $(id);

  if (!page) {
    return;
  }

  page.style.display = "none";

  page.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.style.overflow =
    "auto";
}


/* =========================================================
   11. AUTH SESSION
   ========================================================= */

async function loadAuthSession() {

  if (sessionLoaded) {
    return currentUser;
  }

  try {

    const {
      data,
      error
    } = await supabaseClient.auth.getSession();

    if (error) {
      throw error;
    }

    currentUser =
      data?.session?.user || null;

  } catch (error) {

    console.error(
      "Session error:",
      error
    );

    currentUser = null;

  }

  sessionLoaded = true;

  await updateAccountUI();

  return currentUser;
}


/* =========================================================
   12. ADMIN CHECK
   ========================================================= */

async function isAdmin() {

  if (!currentUser) {
    return false;
  }

  try {

    const result =
      await supabaseClient
        .from("admin_users")
        .select("user_id")
        .eq(
          "user_id",
          currentUser.id
        )
        .maybeSingle();

    if (
      !result.error &&
      result.data
    ) {
      return true;
    }

  } catch (_) {
    /* Continue to email check */
  }

  return (
    currentUser.email &&
    currentUser.email.toLowerCase() ===
      ADMIN_EMAIL.toLowerCase()
  );
}


/* =========================================================
   13. ACCOUNT UI
   ========================================================= */

async function updateAccountUI() {

  const accountButton =
    $("accountButton");

  const messagesButton =
    $("messagesButton");

  const messageBadge =
    $("messageBadge");

  if (!accountButton) {
    return;
  }

  if (currentUser) {

    accountButton.innerText =
      "🚪 Logout";

    if (messagesButton) {
      messagesButton.style.display =
        "block";
    }

    if (messageBadge) {
      messageBadge.style.display =
        "none";
    }

    setTimeout(
      updateMessageBadge,
      300
    );

  } else {

    accountButton.innerText =
      "🔐 Login";

    if (messagesButton) {
      messagesButton.style.display =
        "none";
    }

    if (messageBadge) {
      messageBadge.style.display =
        "none";
    }
  }
}


/* =========================================================
   14. AUTH STATE LISTENER
   ========================================================= */

supabaseClient.auth.onAuthStateChange(
  (event, session) => {

    currentUser =
      session?.user || null;

    sessionLoaded = true;

    setTimeout(
      () => updateAccountUI(),
      0
    );

    if (currentUser) {

      setTimeout(
        () => loadFavoriteIds(),
        300
      );
    }
  }
);


/* =========================================================
   15. OPEN AUTH MODAL
   ========================================================= */

function openAuthModal() {

  const modal =
    $("authModal");

  if (!modal) {
    return;
  }

  modal.style.display =
    "flex";

  modal.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.style.overflow =
    "hidden";
}


/* =========================================================
   16. CLOSE AUTH MODAL
   ========================================================= */

function closeAuthModal() {

  const modal =
    $("authModal");

  if (!modal) {
    return;
  }

  modal.style.display =
    "none";

  modal.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.style.overflow =
    "auto";
}


/* =========================================================
   17. AUTH MODE
   ========================================================= */

let authMode = "login";


function setAuthMode(mode) {

  authMode =
    mode === "register"
      ? "register"
      : "login";

  const name =
    $("authName");

  const nameLabel =
    $("authNameLabel");

  const tabLogin =
    $("loginTab");

  const tabSignup =
    $("signupTab");

  const submit =
    $("authSubmit");

  const password =
    $("authPassword");

  if (
    !name ||
    !nameLabel ||
    !tabLogin ||
    !tabSignup ||
    !submit
  ) {
    return;
  }

  if (authMode === "register") {

    name.hidden = false;
    nameLabel.hidden = false;

    name.required = true;

    tabLogin.classList.remove(
      "active"
    );

    tabSignup.classList.add(
      "active"
    );

    submit.innerText =
      "Create account";

    if (password) {
      password.autocomplete =
        "new-password";
    }

  } else {

    name.hidden = true;
    nameLabel.hidden = true;

    name.required = false;

    tabLogin.classList.add(
      "active"
    );

    tabSignup.classList.remove(
      "active"
    );

    submit.innerText =
      "Login";

    if (password) {
      password.autocomplete =
        "current-password";
    }
  }

  const message =
    $("authMessage");

  if (message) {
    message.innerText = "";
  }
}


function showLogin() {
  setAuthMode("login");
}


function showRegister() {
  setAuthMode("register");
}


/* =========================================================
   18. ACCOUNT BUTTON
   ========================================================= */

function openAccount() {

  if (currentUser) {

    openDashboard();

  } else {

    openAuthModal();

    showLogin();
  }
}


/* =========================================================
   19. CREATE SELLER PROFILE
   ========================================================= */

async function createSellerProfile(
  userId,
  name,
  phone,
  location
) {

  return supabaseClient
    .from("seller_profiles")
    .upsert(
      {
        id: userId,
        full_name: name || "",
        phone: phone || "",
        location: location || "Sioma"
      },
      {
        onConflict: "id"
      }
    );
}


/* =========================================================
   20. REGISTER
   ========================================================= */

async function registerUser() {

  const email =
    $("authEmail")?.value.trim();

  const password =
    $("authPassword")?.value;

  const name =
    $("authName")?.value.trim();

  const message =
    $("authMessage");

  const button =
    $("authSubmit");

  if (!email ||
      !password ||
      !name) {

    showMessage(
      message,
      "Please complete all fields."
    );

    return;
  }

  button.disabled = true;

  button.innerText =
    "Creating account...";

  try {

    const result =
      await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            EMAIL_REDIRECT_URL,
          data: {
            full_name: name,
            location: "Sioma"
          }
        }
      });

    if (result.error) {
      throw result.error;
    }

    if (
      result.data?.session &&
      result.data?.user
    ) {

      currentUser =
        result.data.user;

      sessionLoaded = true;

      const profile =
        await createSellerProfile(
          currentUser.id,
          name,
          "",
          "Sioma"
        );

      if (profile.error) {
        throw profile.error;
      }

      showMessage(
        message,
        "Account created successfully!",
        true
      );

      await updateAccountUI();

      setTimeout(
        closeAuthModal,
        700
      );

    } else {

      showMessage(
        message,
        "Account created. Check your email to confirm your account.",
        true
      );
    }

  } catch (error) {

    console.error(
      "Registration error:",
      error
    );

    showMessage(
      message,
      "❌ " + error.message
    );

  } finally {

    button.disabled = false;

    button.innerText =
      authMode === "register"
        ? "Create account"
        : "Login";
  }
}


/* =========================================================
   END OF PART 1
   ========================================================= */
/* =========================================================
   PART 2 — LOGIN + LOGOUT + NAVIGATION + BUY/SELL
   ========================================================= */


/* =========================================================
   LOGIN
   ========================================================= */

async function loginUser() {
  const email = $("authEmail")?.value.trim();
  const password = $("authPassword")?.value;
  const message = $("authMessage");
  const button = $("authSubmit");

  if (!email || !password) {
    showMessage(
      message,
      "Please enter your email and password."
    );
    return;
  }

  button.disabled = true;
  button.innerText = "Logging in...";

  try {
    const result =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (result.error) {
      throw result.error;
    }

    currentUser =
      result.data?.user || null;

    sessionLoaded = true;

    showMessage(
      message,
      "Login successful!",
      true
    );

    await updateAccountUI();
    await loadFavoriteIds();

    setTimeout(() => {
      closeAuthModal();
      openDashboard();
    }, 500);

  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    showMessage(
      message,
      "❌ " + (
        error.message ||
        "Unable to login."
      )
    );

  } finally {
    button.disabled = false;

    button.innerText =
      authMode === "register"
        ? "Create account"
        : "Login";
  }
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logoutUser() {
  try {
    const result =
      await supabaseClient.auth.signOut();

    if (result.error) {
      throw result.error;
    }

    currentUser = null;
    sessionLoaded = true;

    favoritesCache.clear();
    sellerListingsCache = [];

    stopMessageRefresh();

    closePage("dashboardPage");
    closePage("messagesPage");
    closePage("sellPage");
    closePage("productPage");

    await updateAccountUI();

    showHome();

  } catch (error) {
    console.error(
      "Logout error:",
      error
    );

    alert(
      "Unable to logout. Please try again."
    );
  }
}


/* =========================================================
   HOME NAVIGATION
   ========================================================= */

function showHome() {
  closePage("sellPage");
  closePage("productPage");
  closePage("dashboardPage");
  closePage("messagesPage");
  closePage("adminPage");

  const searchResults =
    $("searchResults");

  if (searchResults) {
    searchResults.style.display = "none";
  }

  const hero =
    document.querySelector(".hero");

  const categories =
    $("categories");

  const latest =
    document.querySelector(
      ".latest-section"
    );

  if (hero) {
    hero.style.display = "";
  }

  if (categories) {
    categories.style.display = "";
  }

  if (latest) {
    latest.style.display = "";
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   BUY BUTTON
   ========================================================= */

function openBuyPage() {
  showHome();

  const searchInput =
    $("searchInput");

  if (searchInput) {
    searchInput.focus();
  }

  const searchForm =
    $("searchForm");

  if (searchForm) {
    searchForm.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }
}


/* =========================================================
   SELL PAGE
   ========================================================= */

async function openSellPage() {
  if (!currentUser) {
    openAuthModal();
    showLogin();

    showMessage(
      $("authMessage"),
      "Please login before posting an item."
    );

    return;
  }

  closePage("productPage");
  closePage("dashboardPage");
  closePage("messagesPage");
  closePage("adminPage");

  const page =
    $("sellPage");

  if (!page) return;

  page.style.display = "block";
  page.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.style.overflow =
    "hidden";

  resetSellForm();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   RESET SELL FORM
   ========================================================= */

function resetSellForm() {
  const form =
    $("sellForm");

  if (form) {
    form.reset();
  }

  selectedProductImages = [];

  const preview =
    $("imagePreviewGrid");

  if (preview) {
    preview.innerHTML = "";
  }

  const counter =
    $("photoCounter");

  if (counter) {
    counter.innerText =
      "0 / " +
      MAX_PRODUCT_IMAGES +
      " photos";
  }

  const message =
    $("sellMessage");

  if (message) {
    message.innerText = "";
  }

  const location =
    $("sellLocation");

  if (location) {
    location.value = "Sioma";
  }
}


/* =========================================================
   CLOSE SELL PAGE
   ========================================================= */

function closeSellPage() {
  closePage("sellPage");
}


/* =========================================================
   ACCOUNT / DASHBOARD
   ========================================================= */

async function openDashboard() {
  if (!currentUser) {
    openAuthModal();
    showLogin();
    return;
  }

  closePage("sellPage");
  closePage("productPage");
  closePage("messagesPage");
  closePage("adminPage");

  const page =
    $("dashboardPage");

  if (!page) return;

  page.style.display = "block";
  page.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.style.overflow =
    "hidden";

  const userDisplay =
    $("dashboardUser");

  if (userDisplay) {
    userDisplay.innerText =
      currentUser.email ||
      "SiomaMarket User";
  }

  await loadSellerDashboard();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   CLOSE DASHBOARD
   ========================================================= */

function closeDashboard() {
  closePage("dashboardPage");
}


/* =========================================================
   MESSAGES PAGE
   ========================================================= */

async function openMessagesPage() {
  if (!currentUser) {
    openAuthModal();
    showLogin();
    return;
  }

  closePage("sellPage");
  closePage("productPage");
  closePage("dashboardPage");
  closePage("adminPage");

  const page =
    $("messagesPage");

  if (!page) return;

  page.style.display = "block";
  page.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.style.overflow =
    "hidden";

  await loadConversations();

  startMessageRefresh();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   CLOSE MESSAGES
   ========================================================= */

function closeMessagesPage() {
  stopMessageRefresh();
  closePage("messagesPage");
}


/* =========================================================
   MOBILE NAVIGATION
   ========================================================= */

function goHome() {
  showHome();
}


function goSearch() {
  showHome();

  const searchForm =
    $("searchForm");

  if (searchForm) {
    searchForm.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }

  setTimeout(() => {
    $("searchInput")?.focus();
  }, 400);
}


function goSell() {
  openSellPage();
}


function goFavorites() {
  if (!currentUser) {
    openAuthModal();
    showLogin();

    showMessage(
      $("authMessage"),
      "Please login to view your favorites."
    );

    return;
  }

  showHome();

  const searchResults =
    $("searchResults");

  if (searchResults) {
    searchResults.style.display =
      "block";
  }

  loadFavoriteListings();
}


function goAccount() {
  openAccount();
}


/* =========================================================
   ADMIN PAGE
   ========================================================= */

async function openAdminPage() {
  if (!currentUser) {
    openAuthModal();
    showLogin();
    return;
  }

  const admin =
    await isAdmin();

  if (!admin) {
    alert(
      "You do not have permission to access the admin dashboard."
    );
    return;
  }

  closePage("sellPage");
  closePage("productPage");
  closePage("dashboardPage");
  closePage("messagesPage");

  const page =
    $("adminPage");

  if (!page) return;

  page.style.display = "block";
  page.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.style.overflow =
    "hidden";

  await loadAdminListings();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   CLOSE ADMIN
   ========================================================= */

function closeAdminPage() {
  closePage("adminPage");
}


/* =========================================================
   AUTH FORM SUBMISSION
   ========================================================= */

function handleAuthSubmit(event) {
  event.preventDefault();

  if (authMode === "register") {
    registerUser();
  } else {
    loginUser();
  }
}


/* =========================================================
   AUTH MODAL CLICK OUTSIDE
   ========================================================= */

function handleAuthModalClick(event) {
  const modal =
    $("authModal");

  if (
    modal &&
    event.target === modal
  ) {
    closeAuthModal();
  }
}


/* =========================================================
   GENERAL PAGE ESCAPE
   ========================================================= */

function handleEscapeKey(event) {
  if (event.key !== "Escape") {
    return;
  }

  closeAuthModal();
  closeSellPage();
  closeDashboard();
  closeMessagesPage();
  closeAdminPage();
  closePage("productPage");
}


/* =========================================================
   BUTTON EVENT CONNECTIONS
   ========================================================= */

function setupPart2Events() {

  $("loginButton")?.addEventListener(
    "click",
    () => {
      if (currentUser) {
        openDashboard();
      } else {
        openAuthModal();
        showLogin();
      }
    }
  );


  $("accountButton")?.addEventListener(
    "click",
    () => {
      openAccount();
    }
  );


  $("messagesButton")?.addEventListener(
    "click",
    () => {
      openMessagesPage();
    }
  );


  $("buyButton")?.addEventListener(
    "click",
    () => {
      openBuyPage();
    }
  );


  $("sellButton")?.addEventListener(
    "click",
    () => {
      openSellPage();
    }
  );


  $("authForm")?.addEventListener(
    "submit",
    handleAuthSubmit
  );


  $("authClose")?.addEventListener(
    "click",
    closeAuthModal
  );


  $("authModal")?.addEventListener(
    "click",
    handleAuthModalClick
  );


  $("loginTab")?.addEventListener(
    "click",
    () => {
      showLogin();
    }
  );


  $("signupTab")?.addEventListener(
    "click",
    () => {
      showRegister();
    }
  );


  $("logoutButton")?.addEventListener(
    "click",
    logoutUser
  );


  $("navHome")?.addEventListener(
    "click",
    goHome
  );


  $("navSearch")?.addEventListener(
    "click",
    goSearch
  );


  $("navSell")?.addEventListener(
    "click",
    goSell
  );


  $("navFavorites")?.addEventListener(
    "click",
    goFavorites
  );


  $("navAccount")?.addEventListener(
    "click",
    goAccount
  );


  $("adminRefreshButton")?.addEventListener(
    "click",
    loadAdminListings
  );


  $("adminExportButton")?.addEventListener(
    "click",
    exportAdminListings
  );


  document.addEventListener(
    "keydown",
    handleEscapeKey
  );
}


/* =========================================================
   INITIAL AUTH MODE
   ========================================================= */

setAuthMode("login");


/* =========================================================
   END PART 2
   ========================================================= */

/* =========================================================
   PART 3 — SEARCH + CATEGORIES + PRODUCT LISTINGS
   ========================================================= */


/* =========================================================
   LOAD LATEST PRODUCTS
   ========================================================= */

async function loadLatestListings() {
  const grid = $("productsGrid");

  if (!grid) return;

  grid.innerHTML =
    '<div class="loading-state">Loading products...</div>';

  try {
    const result =
      await supabaseClient
        .from("listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", {
          ascending: false
        })
        .limit(30);

    if (result.error) {
      throw result.error;
    }

    const listings =
      (result.data || [])
        .filter(item => isSioma(item.location));

    renderProductGrid(
      listings,
      grid
    );

  } catch (error) {
    console.error(
      "Latest listings error:",
      error
    );

    grid.innerHTML =
      '<div class="empty-state">Unable to load products right now.</div>';
  }
}


/* =========================================================
   SEARCH PRODUCTS
   ========================================================= */

async function searchMarket(query = null) {
  const input =
    $("searchInput");

  const searchQuery =
    String(
      query !== null
        ? query
        : input?.value || ""
    )
      .trim()
      .toLowerCase();

  const resultsSection =
    $("searchResults");

  const resultsGrid =
    $("searchResultsGrid");

  if (!resultsSection ||
      !resultsGrid) {
    return;
  }

  if (!searchQuery) {
    resultsSection.style.display =
      "none";

    loadLatestListings();
    return;
  }

  resultsSection.style.display =
    "block";

  resultsGrid.innerHTML =
    '<div class="loading-state">Searching SiomaMarket...</div>';

  try {
    const result =
      await supabaseClient
        .from("listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", {
          ascending: false
        })
        .limit(100);

    if (result.error) {
      throw result.error;
    }

    const listings =
      (result.data || [])
        .filter(item => {
          if (!isSioma(item.location)) {
            return false;
          }

          const title =
            String(
              item.title || ""
            ).toLowerCase();

          const description =
            String(
              item.description || ""
            ).toLowerCase();

          const category =
            String(
              item.category || ""
            ).toLowerCase();

          const location =
            String(
              item.location || ""
            ).toLowerCase();

          return (
            title.includes(searchQuery) ||
            description.includes(searchQuery) ||
            category.includes(searchQuery) ||
            location.includes(searchQuery)
          );
        });

    renderProductGrid(
      listings,
      resultsGrid
    );

  } catch (error) {
    console.error(
      "Search error:",
      error
    );

    resultsGrid.innerHTML =
      '<div class="empty-state">Search failed. Please try again.</div>';
  }
}


/* =========================================================
   CATEGORY SEARCH
   ========================================================= */

async function searchCategory(category) {
  const categoryName =
    String(category || "")
      .trim();

  if (!categoryName) return;

  const resultsSection =
    $("searchResults");

  const resultsGrid =
    $("searchResultsGrid");

  if (!resultsSection ||
      !resultsGrid) {
    return;
  }

  resultsSection.style.display =
    "block";

  resultsGrid.innerHTML =
    '<div class="loading-state">Loading ' +
    escapeHTML(categoryName) +
    '...</div>';

  try {
    const result =
      await supabaseClient
        .from("listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", {
          ascending: false
        })
        .limit(100);

    if (result.error) {
      throw result.error;
    }

    const wanted =
      categoryName.toLowerCase();

    const listings =
      (result.data || [])
        .filter(item => {
          if (!isSioma(item.location)) {
            return false;
          }

          return String(
            item.category || ""
          )
            .toLowerCase()
            .includes(wanted);
        });

    renderProductGrid(
      listings,
      resultsGrid
    );

    resultsSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  } catch (error) {
    console.error(
      "Category search error:",
      error
    );

    resultsGrid.innerHTML =
      '<div class="empty-state">Unable to load this category.</div>';
  }
}


/* =========================================================
   RENDER PRODUCT GRID
   ========================================================= */

function renderProductGrid(
  listings,
  container
) {
  if (!container) return;

  if (!listings ||
      !listings.length) {

    container.innerHTML =
      '<div class="empty-state">' +
      '<strong>No products found</strong>' +
      '<p>Try another search or category.</p>' +
      '</div>';

    return;
  }

  container.innerHTML =
    listings
      .map(item =>
        createProductCard(item)
      )
      .join("");

  attachProductCardEvents(
    container
  );
}


/* =========================================================
   CREATE PRODUCT CARD
   ========================================================= */

function createProductCard(item) {
  const id =
    escapeAttribute(
      item.id
    );

  const title =
    escapeHTML(
      item.title ||
      "Untitled product"
    );

  const price =
    formatPrice(
      item.price
    );

  const category =
    escapeHTML(
      item.category ||
      "Other"
    );

  const location =
    escapeHTML(
      item.location ||
      "Sioma"
    );

  const image =
    escapeAttribute(
      getPrimaryImage(item)
    );

  const favorite =
    favoritesCache.has(
      String(item.id)
    );

  return `
    <article
      class="result-card product-card"
      data-id="${id}"
    >

      <div
        class="product-image-wrap"
        data-action="view"
        data-id="${id}"
      >

        <img
          class="product-image"
          src="${image}"
          alt="${title}"
          loading="lazy"
          onerror="this.src='${escapeAttribute(DEFAULT_IMAGE)}'"
        >

        <button
          type="button"
          class="favorite-button ${
            favorite ? "active" : ""
          }"
          data-action="favorite"
          data-id="${id}"
          aria-label="${
            favorite
              ? "Remove from favorites"
              : "Add to favorites"
          }"
        >
          ${favorite ? "♥" : "♡"}
        </button>

        <span class="category-badge">
          ${category}
        </span>

      </div>

      <div class="product-info">

        <h3
          class="product-title"
          data-action="view"
          data-id="${id}"
        >
          ${title}
        </h3>

        <div class="product-price">
          ${price}
        </div>

        <div class="product-meta">
          <span>📍 ${location}</span>
          <span class="sioma-badge">
            Sioma
          </span>
        </div>

      </div>

    </article>
  `;
}


/* =========================================================
   PRODUCT CARD EVENTS
   ========================================================= */

function attachProductCardEvents(
  container
) {
  if (!container) return;

  container
    .querySelectorAll(
      '[data-action="view"]'
    )
    .forEach(element => {

      element.addEventListener(
        "click",
        () => {
          openProductDetails(
            element.dataset.id
          );
        }
      );

    });


  container
    .querySelectorAll(
      '[data-action="favorite"]'
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        event => {

          event.preventDefault();
          event.stopPropagation();

          toggleFavorite(
            button.dataset.id
          );

        }
      );

    });
}


/* =========================================================
   OPEN PRODUCT DETAILS
   ========================================================= */

async function openProductDetails(
  listingId
) {
  if (!listingId) return;

  currentListingId =
    String(listingId);

  closePage("sellPage");
  closePage("dashboardPage");
  closePage("messagesPage");
  closePage("adminPage");

  const page =
    $("productPage");

  if (!page) return;

  page.style.display =
    "block";

  page.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.style.overflow =
    "hidden";

  await loadProductDetails(
    currentListingId
  );
}


/* =========================================================
   LOAD PRODUCT DETAILS
   ========================================================= */

async function loadProductDetails(
  listingId
) {
  const placeholder =
    $("detailsPlaceholder");

  if (placeholder) {
    placeholder.style.display =
      "block";

    placeholder.innerText =
      "Loading product...";
  }

  try {
    const result =
      await supabaseClient
        .from("listings")
        .select("*")
        .eq("id", listingId)
        .maybeSingle();

    if (result.error) {
      throw result.error;
    }

    if (!result.data) {
      throw new Error(
        "Product not found."
      );
    }

    if (!isSioma(result.data.location)) {
      throw new Error(
        "This product is outside Sioma."
      );
    }

    currentListingData =
      result.data;

    renderProductDetails(
      result.data
    );

  } catch (error) {
    console.error(
      "Product details error:",
      error
    );

    if (placeholder) {
      placeholder.style.display =
        "block";

      placeholder.innerText =
        "Unable to load this product.";
    }
  }
}


/* =========================================================
   RENDER PRODUCT DETAILS
   ========================================================= */

function renderProductDetails(
  item
) {
  const title =
    item.title ||
    "Untitled product";

  const images =
    getProductImages(item);

  const primaryImage =
    images[0] ||
    DEFAULT_IMAGE;


  if ($("productPageTitle")) {
    $("productPageTitle").innerText =
      title;
  }


  if ($("detailsName")) {
    $("detailsName").innerText =
      title;
  }


  if ($("detailsPrice")) {
    $("detailsPrice").innerText =
      formatPrice(item.price);
  }


  if ($("detailsCategory")) {
    $("detailsCategory").innerText =
      item.category ||
      "Other";
  }


  if ($("detailsLocation")) {
    $("detailsLocation").innerText =
      item.location ||
      "Sioma";
  }


  if ($("detailsDescription")) {
    $("detailsDescription").innerText =
      item.description ||
      "No description provided.";
  }


  if ($("detailsSeller")) {
    $("detailsSeller").innerText =
      item.seller_name ||
      "Sioma Seller";
  }


  const mainImage =
    $("detailsMainImage");

  if (mainImage) {
    mainImage.src =
      primaryImage;

    mainImage.alt =
      title;

    mainImage.onerror =
      () => {
        mainImage.src =
          DEFAULT_IMAGE;
      };
  }


  renderProductThumbnails(
    images
  );


  updateDetailsFavoriteButton(
    item.id
  );


  const placeholder =
    $("detailsPlaceholder");

  if (placeholder) {
    placeholder.style.display =
      "none";
  }
}


/* =========================================================
   PRODUCT THUMBNAILS
   ========================================================= */

function renderProductThumbnails(
  images
) {
  const container =
    $("detailsThumbnails");

  if (!container) return;

  container.innerHTML = "";

  if (!images ||
      images.length <= 1) {
    return;
  }

  images.forEach(
    (image, index) => {

      const button =
        document.createElement(
          "button"
        );

      button.type =
        "button";

      button.className =
        "detail-thumbnail" +
        (
          index === 0
            ? " active"
            : ""
        );

      button.innerHTML = `
        <img
          src="${escapeAttribute(image)}"
          alt="Product photo ${index + 1}"
          loading="lazy"
        >
      `;

      button.addEventListener(
        "click",
        () => {

          const main =
            $("detailsMainImage");

          if (main) {
            main.src =
              image;
          }

          container
            .querySelectorAll(
              ".detail-thumbnail"
            )
            .forEach(
              item =>
                item.classList.remove(
                  "active"
                )
            );

          button.classList.add(
            "active"
          );
        }
      );

      container.appendChild(
        button
      );
    }
  );
}


/* =========================================================
   CLOSE PRODUCT PAGE
   ========================================================= */

function closeProductPage() {
  closePage("productPage");

  currentListingId =
    null;

  currentListingData =
    null;
}


/* =========================================================
   SEARCH FORM EVENTS
   ========================================================= */

function setupSearchEvents() {

  $("searchForm")?.addEventListener(
    "submit",
    event => {

      event.preventDefault();

      searchMarket();
    }
  );


  $("searchButton")?.addEventListener(
    "click",
    event => {

      event.preventDefault();

      searchMarket();
    }
  );


  $("searchInput")?.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Enter"
      ) {
        event.preventDefault();

        searchMarket();
      }

    }
  );


  document
    .querySelectorAll(
      ".category"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          searchCategory(
            button.dataset.category ||
            button.innerText
          );

        }
      );

    });
}


/* =========================================================
   PRODUCT PAGE BUTTON EVENTS
   ========================================================= */

function setupProductEvents() {

  $("detailsFavoriteButton")
    ?.addEventListener(
      "click",
      () => {

        if (
          currentListingId
        ) {
          toggleFavorite(
            currentListingId
          );
        }

      }
    );


  $("whatsappButton")
    ?.addEventListener(
      "click",
      () => {

        openWhatsAppForListing();

      }
    );


  $("callButton")
    ?.addEventListener(
      "click",
      () => {

        callListingSeller();

      }
    );


  $("detailsMessageButton")
    ?.addEventListener(
      "click",
      () => {

        messageListingSeller();

      }
    );

}


/* =========================================================
   END PART 3
   ========================================================= */
/* =========================================================
   PART 4 — FAVORITES + 3-PHOTO UPLOAD
   ========================================================= */


/* =========================================================
   LOAD FAVORITE IDS
   ========================================================= */

async function loadFavoriteIds() {
  favoritesCache.clear();

  if (!currentUser) {
    return;
  }

  try {
    const result =
      await supabaseClient
        .from("favorites")
        .select("listing_id")
        .eq("user_id", currentUser.id);

    if (result.error) {
      console.warn(
        "Favorites table unavailable:",
        result.error.message
      );
      return;
    }

    (result.data || []).forEach(item => {
      if (item.listing_id) {
        favoritesCache.add(
          String(item.listing_id)
        );
      }
    });

  } catch (error) {
    console.error(
      "Load favorites error:",
      error
    );
  }
}


/* =========================================================
   TOGGLE FAVORITE
   ========================================================= */

async function toggleFavorite(listingId) {
  if (!listingId) return;

  if (!currentUser) {
    openAuthModal();
    showLogin();

    showMessage(
      $("authMessage"),
      "Please login to save favorites."
    );

    return;
  }

  const id =
    String(listingId);

  const alreadyFavorite =
    favoritesCache.has(id);

  try {

    if (alreadyFavorite) {

      const result =
        await supabaseClient
          .from("favorites")
          .delete()
          .eq(
            "user_id",
            currentUser.id
          )
          .eq(
            "listing_id",
            listingId
          );

      if (result.error) {
        throw result.error;
      }

      favoritesCache.delete(id);

    } else {

      const result =
        await supabaseClient
          .from("favorites")
          .insert({
            user_id:
              currentUser.id,
            listing_id:
              listingId
          });

      if (result.error) {
        throw result.error;
      }

      favoritesCache.add(id);
    }

    refreshFavoriteButtons(id);

  } catch (error) {
    console.error(
      "Favorite error:",
      error
    );

    alert(
      "Unable to update favorite. Please try again."
    );
  }
}


/* =========================================================
   REFRESH FAVORITE BUTTONS
   ========================================================= */

function refreshFavoriteButtons(
  listingId
) {
  const id =
    String(listingId);

  document
    .querySelectorAll(
      '[data-action="favorite"]'
    )
    .forEach(button => {

      if (
        String(button.dataset.id) !== id
      ) {
        return;
      }

      const active =
        favoritesCache.has(id);

      button.classList.toggle(
        "active",
        active
      );

      button.innerText =
        active ? "♥" : "♡";

      button.setAttribute(
        "aria-label",
        active
          ? "Remove from favorites"
          : "Add to favorites"
      );
    });

  updateDetailsFavoriteButton(id);
}


/* =========================================================
   PRODUCT DETAILS FAVORITE BUTTON
   ========================================================= */

function updateDetailsFavoriteButton(
  listingId
) {
  const button =
    $("detailsFavoriteButton");

  if (!button) return;

  const active =
    favoritesCache.has(
      String(listingId)
    );

  button.classList.toggle(
    "active",
    active
  );

  button.innerText =
    active
      ? "♥ Saved"
      : "♡ Favorite";
}


/* =========================================================
   LOAD FAVORITE LISTINGS
   ========================================================= */

async function loadFavoriteListings() {
  const grid =
    $("searchResultsGrid");

  const section =
    $("searchResults");

  if (!grid || !section) {
    return;
  }

  section.style.display =
    "block";

  grid.innerHTML =
    '<div class="loading-state">Loading favorites...</div>';

  if (!currentUser) {
    grid.innerHTML =
      '<div class="empty-state">Please login to view favorites.</div>';
    return;
  }

  try {
    await loadFavoriteIds();

    if (!favoritesCache.size) {
      grid.innerHTML =
        '<div class="empty-state">' +
        '<strong>No favorites yet</strong>' +
        '<p>Tap the heart on a product to save it.</p>' +
        '</div>';
      return;
    }

    const ids =
      Array.from(
        favoritesCache
      );

    const result =
      await supabaseClient
        .from("listings")
        .select("*")
        .in("id", ids)
        .eq("status", "active");

    if (result.error) {
      throw result.error;
    }

    const listings =
      (result.data || [])
        .filter(item =>
          isSioma(item.location)
        );

    renderProductGrid(
      listings,
      grid
    );

    section.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  } catch (error) {
    console.error(
      "Favorite listings error:",
      error
    );

    grid.innerHTML =
      '<div class="empty-state">Unable to load favorites.</div>';
  }
}


/* =========================================================
   PHOTO INPUT
   ========================================================= */

function handlePhotoSelection(event) {
  const input =
    event.target;

  if (!input ||
      !input.files) {
    return;
  }

  const files =
    Array.from(input.files);

  if (!files.length) {
    return;
  }

  const remaining =
    MAX_PRODUCT_IMAGES -
    selectedProductImages.length;

  const filesToAdd =
    files.slice(
      0,
      Math.max(0, remaining)
    );

  if (!filesToAdd.length) {
    alert(
      "You can upload up to " +
      MAX_PRODUCT_IMAGES +
      " photos."
    );

    input.value = "";
    return;
  }

  for (const file of filesToAdd) {

    if (!file.type.startsWith("image/")) {
      alert(
        file.name +
        " is not an image."
      );
      continue;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      alert(
        file.name +
        " is too large. Maximum size is 6MB."
      );
      continue;
    }

    selectedProductImages.push(
      file
    );
  }

  input.value = "";

  renderImagePreviews();
}


/* =========================================================
   IMAGE PREVIEWS
   ========================================================= */

function renderImagePreviews() {
  const grid =
    $("imagePreviewGrid");

  if (!grid) return;

  grid.innerHTML = "";

  selectedProductImages.forEach(
    (file, index) => {

      const wrapper =
        document.createElement(
          "div"
        );

      wrapper.className =
        "image-preview-item";

      const image =
        document.createElement(
          "img"
        );

      image.alt =
        "Selected product photo " +
        (index + 1);

      const remove =
        document.createElement(
          "button"
        );

      remove.type =
        "button";

      remove.className =
        "remove-photo";

      remove.innerText =
        "×";

      remove.setAttribute(
        "aria-label",
        "Remove photo " +
        (index + 1)
      );

      remove.addEventListener(
        "click",
        () => {

          selectedProductImages
            .splice(index, 1);

          renderImagePreviews();
        }
      );

      wrapper.appendChild(
        image
      );

      wrapper.appendChild(
        remove
      );

      grid.appendChild(
        wrapper
      );

      const reader =
        new FileReader();

      reader.onload =
        event => {
          image.src =
            event.target.result;
        };

      reader.readAsDataURL(
        file
      );
    }
  );

  updatePhotoCounter();
}


/* =========================================================
   PHOTO COUNTER
   ========================================================= */

function updatePhotoCounter() {
  const counter =
    $("photoCounter");

  if (!counter) return;

  counter.innerText =
    selectedProductImages.length +
    " / " +
    MAX_PRODUCT_IMAGES +
    " photos";
}


/* =========================================================
   UPLOAD PRODUCT IMAGES
   ========================================================= */

async function uploadProductImages() {
  if (!selectedProductImages.length) {
    return [];
  }

  const uploadedUrls = [];

  for (
    let index = 0;
    index < selectedProductImages.length;
    index++
  ) {

    const file =
      selectedProductImages[index];

    const extension =
      (
        file.name
          .split(".")
          .pop() ||
        "jpg"
      )
        .toLowerCase()
        .replace(
          /[^a-z0-9]/g,
          ""
        );

    const fileName =
      currentUser.id +
      "/" +
      Date.now() +
      "_" +
      index +
      "_" +
      Math.random()
        .toString(36)
        .slice(2) +
      "." +
      extension;

    const upload =
      await supabaseClient
        .storage
        .from("Product-images")
        .upload(
          fileName,
          file,
          {
            cacheControl:
              "3600",
            upsert: false,
            contentType:
              file.type
          }
        );

    if (upload.error) {
      throw upload.error;
    }

    const publicResult =
      supabaseClient
        .storage
        .from("Product-images")
        .getPublicUrl(
          fileName
        );

    const publicUrl =
      publicResult?.data?.publicUrl;

    if (!publicUrl) {
      throw new Error(
        "Unable to create image URL."
      );
    }

    uploadedUrls.push(
      publicUrl
    );
  }

  return uploadedUrls;
}


/* =========================================================
   PHOTO INPUT EVENTS
   ========================================================= */

function setupPhotoUpload() {

  $("photoInput")?.addEventListener(
    "change",
    handlePhotoSelection
  );

}


/* =========================================================
   END PART 4
   ========================================================= */
/* =========================================================
   SIOMA MARKET — PART 5
   PUBLISH LISTING + SELLER PROFILE + VALIDATION
========================================================= */


/* =========================================================
   GET SELLER PROFILE
========================================================= */

async function getSellerProfile() {

  if (!currentUser) {
    return {
      name: currentUser?.user_metadata?.full_name || "",
      phone: currentUser?.user_metadata?.phone || "",
      location: "Sioma"
    };
  }

  const { data, error } =
    await supabaseClient
      .from("seller_profiles")
      .select("full_name, phone, location")
      .eq("id", currentUser.id)
      .maybeSingle();

  if (error) {
    console.warn(
      "Seller profile could not be loaded:",
      error.message
    );
  }

  return {
    name:
      data?.full_name ||
      currentUser.user_metadata?.full_name ||
      currentUser.email?.split("@")[0] ||
      "Sioma Seller",

    phone:
      data?.phone ||
      currentUser.user_metadata?.phone ||
      "",

    location:
      data?.location ||
      "Sioma"
  };
}


/* =========================================================
   VALIDATE SELL FORM
========================================================= */

function validateSellForm() {

  const title =
    $("sellTitle")?.value.trim() || "";

  const category =
    $("sellCategory")?.value.trim() || "";

  const priceText =
    $("sellPrice")?.value.trim() || "";

  const location =
    $("sellLocation")?.value.trim() || "";

  const description =
    $("sellDescription")?.value.trim() || "";

  const price =
    Number(priceText);

  if (!currentUser) {
    return {
      valid: false,
      message: "Please log in before publishing a product."
    };
  }

  if (!title) {
    return {
      valid: false,
      message: "Please enter a product title."
    };
  }

  if (title.length < 2) {
    return {
      valid: false,
      message: "Product title is too short."
    };
  }

  if (!category) {
    return {
      valid: false,
      message: "Please choose a category."
    };
  }

  if (!priceText || !Number.isFinite(price) || price <= 0) {
    return {
      valid: false,
      message: "Please enter a valid price."
    };
  }

  /*
     SiomaMarket currently serves Sioma only.
     We force the listing location to Sioma.
  */

  if (
    location &&
    !isSioma(location)
  ) {
    return {
      valid: false,
      message: "Listings must be located in Sioma."
    };
  }

  if (!selectedProductImages.length) {
    return {
      valid: false,
      message: "Please add at least one product photo."
    };
  }

  if (selectedProductImages.length > MAX_PRODUCT_IMAGES) {
    return {
      valid: false,
      message:
        "You can upload a maximum of " +
        MAX_PRODUCT_IMAGES +
        " photos."
    };
  }

  return {
    valid: true,
    title,
    category,
    price,
    location: "Sioma",
    description
  };
}


/* =========================================================
   DISABLE / ENABLE PUBLISH BUTTON
========================================================= */

function setPublishLoading(isLoading) {

  const button =
    $("publishButton");

  if (!button) return;

  if (isLoading) {

    button.disabled = true;

    button.dataset.originalText =
      button.textContent;

    button.textContent =
      "Publishing...";

  } else {

    button.disabled = false;

    button.textContent =
      button.dataset.originalText ||
      "Publish";

  }
}


/* =========================================================
   PUBLISH LISTING
========================================================= */

async function publishListing(event) {

  if (event) {
    event.preventDefault();
  }

  const messageElement =
    $("sellMessage");

  const validation =
    validateSellForm();

  if (!validation.valid) {

    showMessage(
      messageElement,
      validation.message,
      false
    );

    return;
  }

  setPublishLoading(true);

  try {

    showMessage(
      messageElement,
      "Preparing your listing...",
      false
    );


    /* -----------------------------------------
       GET SELLER INFORMATION
    ----------------------------------------- */

    const seller =
      await getSellerProfile();


    /* -----------------------------------------
       MAKE SURE SELLER PROFILE EXISTS
    ----------------------------------------- */

    const profileResult =
      await createSellerProfile(
        currentUser.id,
        seller.name,
        seller.phone,
        "Sioma"
      );

    if (profileResult.error) {

      console.warn(
        "Seller profile warning:",
        profileResult.error.message
      );

    }


    /* -----------------------------------------
       UPLOAD PRODUCT PHOTOS
    ----------------------------------------- */

    showMessage(
      messageElement,
      "Uploading product photos...",
      false
    );

    const uploadedImages =
      await uploadProductImages();

    if (
      !uploadedImages ||
      !uploadedImages.length
    ) {

      throw new Error(
        "No product photos were uploaded."
      );
    }


    /* -----------------------------------------
       PREPARE LISTING DATA
    ----------------------------------------- */

    const listingData = {

      title:
        validation.title,

      price:
        validation.price,

      category:
        validation.category,

      location:
        "Sioma",

      image_url:
        getImageStorageValue(
          uploadedImages
        ),

      seller_name:
        seller.name ||
        "Sioma Seller",

      seller_phone:
        seller.phone || "",

      status:
        "active"

    };


    /*
       Add description only when supplied.

       This keeps the insert safer if your
       current Supabase table does not yet
       contain a description column.
    */

    if (validation.description) {

      listingData.description =
        validation.description;

    }


    /* -----------------------------------------
       SAVE LISTING TO SUPABASE
    ----------------------------------------- */

    showMessage(
      messageElement,
      "Publishing your listing...",
      false
    );

    const {
      data,
      error
    } =
      await supabaseClient
        .from("listings")
        .insert(listingData)
        .select()
        .single();

    if (error) {
      throw error;
    }


    /* -----------------------------------------
       SUCCESS
    ----------------------------------------- */

    showMessage(
      messageElement,
      "Your product has been published successfully!",
      true
    );


    /* Save returned listing */
    if (data?.id) {
      currentListingId =
        data.id;

      currentListingData =
        data;
    }


    /* -----------------------------------------
       RESET FORM
    ----------------------------------------- */

    if ($("sellForm")) {
      $("sellForm").reset();
    }

    selectedProductImages = [];

    renderImagePreviews();
    updatePhotoCounter();


    /* -----------------------------------------
       REFRESH MARKETPLACE
    ----------------------------------------- */

    await loadLatestListings();


    /* -----------------------------------------
       CLOSE SELL PAGE
       Small delay lets user see success
       message before returning home.
    ----------------------------------------- */

    setTimeout(() => {

      closeSellPage();

      showHome();

    }, 900);

  } catch (error) {

    console.error(
      "Publish listing error:",
      error
    );

    showMessage(
      messageElement,
      error?.message ||
      "Unable to publish your listing. Please try again.",
      false
    );

  } finally {

    setPublishLoading(false);

  }
}


/* =========================================================
   SELL FORM EVENTS
========================================================= */

function setupSellFormEvents() {

  const form =
    $("sellForm");

  if (!form) return;

  /*
     Prevent duplicate listeners.
  */

  if (
    form.dataset.eventsReady === "true"
  ) {
    return;
  }

  form.addEventListener(
    "submit",
    publishListing
  );

  form.dataset.eventsReady =
    "true";
}


/* =========================================================
   FORCE SIOMA LOCATION
========================================================= */

function setupSellLocation() {

  const location =
    $("sellLocation");

  if (!location) return;

  /*
     SiomaMarket is currently focused
     on sellers and buyers in Sioma.
  */

  location.value = "Sioma";

  location.setAttribute(
    "readonly",
    "readonly"
  );

  location.addEventListener(
    "input",
    () => {
      location.value = "Sioma";
    }
  );
}


/* =========================================================
   PART 5 SETUP
========================================================= */

function setupPart5Events() {

  setupSellFormEvents();

  setupSellLocation();

}
/* =========================================================
   SIOMA MARKET — PART 6
   SELLER DASHBOARD
========================================================= */


/* =========================================================
   LOAD SELLER LISTINGS
========================================================= */

async function loadSellerDashboard() {

  const container =
    $("dashboardListings");

  if (!container) return;

  if (!currentUser) {

    container.innerHTML = `
      <div class="empty-state">
        <p>Please log in to view your listings.</p>
      </div>
    `;

    return;
  }

  container.innerHTML = `
    <div class="loading-state">
      Loading your listings...
    </div>
  `;


  try {

    const { data, error } =
      await supabaseClient
        .from("listings")
        .select("*")
        .eq("seller_name", await getDashboardSellerName())
        .order("created_at", {
          ascending: false
        });

    if (error) {
      throw error;
    }

    sellerListingsCache =
      data || [];

    renderSellerDashboard(
      sellerListingsCache
    );

  } catch (error) {

    console.error(
      "Dashboard loading error:",
      error
    );

    container.innerHTML = `
      <div class="empty-state">
        <p>Unable to load your listings.</p>
        <button type="button"
                onclick="loadSellerDashboard()">
          Try Again
        </button>
      </div>
    `;
  }
}


/* =========================================================
   GET DASHBOARD SELLER NAME
========================================================= */

async function getDashboardSellerName() {

  if (!currentUser) {
    return "";
  }

  const profile =
    await getSellerProfile();

  return (
    profile.name ||
    currentUser.email?.split("@")[0] ||
    "Sioma Seller"
  );
}


/* =========================================================
   RENDER DASHBOARD
========================================================= */

function renderSellerDashboard(
  listings
) {

  const container =
    $("dashboardListings");

  if (!container) return;


  /* -----------------------------------------
     UPDATE USER NAME
  ----------------------------------------- */

  const dashboardUser =
    $("dashboardUser");

  if (dashboardUser) {

    dashboardUser.textContent =
      currentUser?.user_metadata?.full_name ||
      currentUser?.email ||
      "Sioma Seller";
  }


  /* -----------------------------------------
     CALCULATE STATS
  ----------------------------------------- */

  const totalListings =
    listings.length;

  const activeListings =
    listings.filter(
      item =>
        String(item.status || "")
          .toLowerCase() === "active"
    ).length;


  /* -----------------------------------------
     UPDATE LISTING COUNT
  ----------------------------------------- */

  if ($("statListings")) {

    $("statListings").textContent =
      totalListings;
  }


  /* -----------------------------------------
     FAVORITES COUNT
  ----------------------------------------- */

  updateDashboardFavoriteCount();


  /* -----------------------------------------
     MESSAGES COUNT
  ----------------------------------------- */

  updateDashboardMessageCount();


  /* -----------------------------------------
     VIEWS
     
     If a views column exists later,
     this will use it. Otherwise it
     safely displays 0.
  ----------------------------------------- */

  const totalViews =
    listings.reduce(
      (sum, item) =>
        sum + Number(item.views || 0),
      0
    );

  if ($("statViews")) {

    $("statViews").textContent =
      totalViews;
  }


  /* -----------------------------------------
     NO LISTINGS
  ----------------------------------------- */

  if (!listings.length) {

    container.innerHTML = `
      <div class="empty-state">
        <h3>No listings yet</h3>
        <p>
          Start selling by adding your first
          product on SiomaMarket.
        </p>

        <button
          type="button"
          class="primary-button"
          onclick="openSellPage()">
          Sell Something
        </button>
      </div>
    `;

    return;
  }


  /* -----------------------------------------
     RENDER LISTINGS
  ----------------------------------------- */

  container.innerHTML =
    listings.map(
      createDashboardListingCard
    ).join("");

  attachDashboardEvents(
    container
  );
}


/* =========================================================
   DASHBOARD LISTING CARD
========================================================= */

function createDashboardListingCard(
  item
) {

  const image =
    getPrimaryImage(item);

  const title =
    escapeHTML(
      item.title ||
      "Untitled Product"
    );

  const category =
    escapeHTML(
      item.category ||
      "Other"
    );

  const status =
    String(item.status || "active")
      .toLowerCase();

  const statusLabel =
    escapeHTML(
      status.charAt(0).toUpperCase() +
      status.slice(1)
    );

  const price =
    formatPrice(item.price);

  const listingId =
    escapeAttribute(item.id);

  return `
    <article
      class="dashboard-listing"
      data-listing-id="${listingId}">

      <div class="dashboard-listing-image">
        <img
          src="${escapeAttribute(image)}"
          alt="${title}"
          loading="lazy"
          onerror="this.src='${escapeAttribute(DEFAULT_IMAGE)}'">
      </div>

      <div class="dashboard-listing-info">

        <div class="dashboard-listing-top">

          <span class="category-badge">
            ${category}
          </span>

          <span class="listing-status status-${escapeAttribute(status)}">
            ${statusLabel}
          </span>

        </div>

        <h3>
          ${title}
        </h3>

        <strong class="dashboard-price">
          ${price}
        </strong>

        <p class="dashboard-location">
          ${escapeHTML(item.location || "Sioma")}
        </p>

        <div class="dashboard-actions">

          <button
            type="button"
            class="secondary-button"
            data-action="view"
            data-id="${listingId}">
            View
          </button>

          <button
            type="button"
            class="secondary-button"
            data-action="edit"
            data-id="${listingId}">
            Edit
          </button>

          <button
            type="button"
            class="danger-button"
            data-action="delete"
            data-id="${listingId}">
            Delete
          </button>

        </div>

      </div>

    </article>
  `;
}


/* =========================================================
   DASHBOARD EVENTS
========================================================= */

function attachDashboardEvents(
  container
) {

  container
    .querySelectorAll("[data-action]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const action =
            button.dataset.action;

          const id =
            button.dataset.id;

          if (action === "view") {

            openProductDetails(id);

          } else if (action === "edit") {

            editSellerListing(id);

          } else if (action === "delete") {

            deleteSellerListing(id);

          }

        }
      );

    });
}


/* =========================================================
   EDIT SELLER LISTING
========================================================= */

function editSellerListing(
  listingId
) {

  const listing =
    sellerListingsCache.find(
      item =>
        String(item.id) ===
        String(listingId)
    );

  if (!listing) {

    alert(
      "Listing could not be found."
    );

    return;
  }


  openSellPage();


  setTimeout(() => {

    if ($("sellTitle")) {

      $("sellTitle").value =
        listing.title || "";
    }

    if ($("sellCategory")) {

      $("sellCategory").value =
        listing.category || "";
    }

    if ($("sellPrice")) {

      $("sellPrice").value =
        listing.price || "";
    }

    if ($("sellLocation")) {

      $("sellLocation").value =
        "Sioma";
    }

    if ($("sellDescription")) {

      $("sellDescription").value =
        listing.description || "";
    }


    /*
       Existing remote images are displayed
       for reference. They are not placed
       back into the file input because
       browsers do not allow that safely.
    */

    const images =
      getProductImages(listing);

    const preview =
      $("imagePreviewGrid");

    if (preview && images.length) {

      preview.innerHTML =
        images.map(
          image => `
            <div class="image-preview existing-image">
              <img
                src="${escapeAttribute(image)}"
                alt="Existing product photo">
            </div>
          `
        ).join("");
    }

  }, 100);

}


/* =========================================================
   DELETE SELLER LISTING
========================================================= */

async function deleteSellerListing(
  listingId
) {

  if (!currentUser) {

    alert(
      "Please log in first."
    );

    return;
  }


  const listing =
    sellerListingsCache.find(
      item =>
        String(item.id) ===
        String(listingId)
    );

  if (!listing) {

    alert(
      "Listing could not be found."
    );

    return;
  }


  const confirmed =
    window.confirm(
      `Delete "${listing.title || "this listing"}"?`
    );

  if (!confirmed) {
    return;
  }


  try {

    const { error } =
      await supabaseClient
        .from("listings")
        .delete()
        .eq("id", listingId);

    if (error) {
      throw error;
    }


    sellerListingsCache =
      sellerListingsCache.filter(
        item =>
          String(item.id) !==
          String(listingId)
      );


    renderSellerDashboard(
      sellerListingsCache
    );

    await loadLatestListings();


    alert(
      "Listing deleted successfully."
    );

  } catch (error) {

    console.error(
      "Delete listing error:",
      error
    );

    alert(
      error?.message ||
      "Unable to delete listing."
    );
  }
}


/* =========================================================
   DASHBOARD FAVORITE COUNT
========================================================= */

async function updateDashboardFavoriteCount() {

  const element =
    $("statFavorites");

  if (!element) return;

  if (!currentUser) {

    element.textContent =
      "0";

    return;
  }


  try {

    const { count, error } =
      await supabaseClient
        .from("favorites")
        .select(
          "*",
          {
            count: "exact",
            head: true
          }
        )
        .eq(
          "user_id",
          currentUser.id
        );

    if (error) {
      throw error;
    }

    element.textContent =
      count || 0;

  } catch (error) {

    console.warn(
      "Favorite count error:",
      error.message
    );

    element.textContent =
      favoritesCache.size || 0;
  }
}


/* =========================================================
   DASHBOARD MESSAGE COUNT
========================================================= */

async function updateDashboardMessageCount() {

  const element =
    $("statMessages");

  if (!element) return;

  if (!currentUser) {

    element.textContent =
      "0";

    return;
  }


  /*
     This checks the messages table if
     available. If your table uses a
     different structure, it safely falls
     back to zero.
  */

  try {

    const { count, error } =
      await supabaseClient
        .from("messages")
        .select(
          "*",
          {
            count: "exact",
            head: true
          }
        )
        .eq(
          "receiver_id",
          currentUser.id
        )
        .eq(
          "read",
          false
        );

    if (error) {
      throw error;
    }

    element.textContent =
      count || 0;

  } catch (error) {

    console.warn(
      "Message count unavailable:",
      error.message
    );

    element.textContent =
      "0";
  }
}


/* =========================================================
   REFRESH DASHBOARD
========================================================= */

async function refreshSellerDashboard() {

  await loadSellerDashboard();

}


/* =========================================================
   PART 6 SETUP
========================================================= */

function setupPart6Events() {

  /*
     Dashboard buttons are attached when
     dashboard content is rendered.

     This function exists so the final
     initializer can call Part 6 safely.
  */

}
/* =========================================================
   SIOMA MARKET — PART 7
   MESSAGING + CONVERSATIONS
========================================================= */


/* =========================================================
   LOAD CONVERSATIONS
========================================================= */

async function loadConversations() {

  const container =
    $("conversationList");

  if (!container) return;

  if (!currentUser) {

    container.innerHTML = `
      <div class="empty-state">
        <p>Please log in to view your messages.</p>
      </div>
    `;

    return;
  }

  container.innerHTML = `
    <div class="loading-state">
      Loading conversations...
    </div>
  `;


  try {

    /*
       Get messages involving the current user.

       We avoid depending on a separate
       conversations table so the messaging
       system can work with a simple
       messages table.
    */

    const { data, error } =
      await supabaseClient
        .from("messages")
        .select("*")
        .or(
          `sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`
        )
        .order("created_at", {
          ascending: false
        });

    if (error) {
      throw error;
    }


    const messages =
      data || [];

    const conversations =
      buildConversationList(messages);

    renderConversationList(
      conversations
    );

  } catch (error) {

    console.error(
      "Conversation loading error:",
      error
    );

    container.innerHTML = `
      <div class="empty-state">
        <p>Unable to load messages.</p>
        <button
          type="button"
          onclick="loadConversations()">
          Try Again
        </button>
      </div>
    `;
  }
}


/* =========================================================
   BUILD CONVERSATION LIST
========================================================= */

function buildConversationList(
  messages
) {

  const map =
    new Map();

  messages.forEach(message => {

    const senderId =
      message.sender_id;

    const receiverId =
      message.receiver_id;

    if (!senderId || !receiverId) {
      return;
    }

    const otherUserId =
      String(senderId) ===
      String(currentUser.id)
        ? receiverId
        : senderId;


    /*
       Prefer conversation_id when available.
       Otherwise use the two user IDs as a
       stable fallback.
    */

    const conversationId =
      message.conversation_id ||
      [
        String(currentUser.id),
        String(otherUserId)
      ]
        .sort()
        .join("_");


    if (!map.has(conversationId)) {

      map.set(
        conversationId,
        {
          id: conversationId,
          otherUserId,
          listingId:
            message.listing_id || null,
          lastMessage:
            message,
          unread: 0
        }
      );

    }


    const conversation =
      map.get(conversationId);


    /*
       Keep the newest message.
    */

    if (
      new Date(message.created_at || 0) >
      new Date(
        conversation.lastMessage?.created_at || 0
      )
    ) {

      conversation.lastMessage =
        message;
    }


    /*
       Count unread messages received
       by the current user.
    */

    if (
      String(message.receiver_id) ===
        String(currentUser.id) &&
      !message.read
    ) {

      conversation.unread++;
    }

  });


  return Array.from(
    map.values()
  ).sort(
    (a, b) =>
      new Date(
        b.lastMessage?.created_at || 0
      ) -
      new Date(
        a.lastMessage?.created_at || 0
      )
  );
}


/* =========================================================
   RENDER CONVERSATIONS
========================================================= */

function renderConversationList(
  conversations
) {

  const container =
    $("conversationList");

  if (!container) return;


  if (!conversations.length) {

    container.innerHTML = `
      <div class="empty-state">
        <h3>No messages yet</h3>
        <p>
          Your conversations with buyers and
          sellers will appear here.
        </p>
      </div>
    `;

    return;
  }


  container.innerHTML =
    conversations
      .map(
        conversation =>
          createConversationCard(
            conversation
          )
      )
      .join("");


  container
    .querySelectorAll(
      "[data-conversation-id]"
    )
    .forEach(element => {

      element.addEventListener(
        "click",
        () => {

          openConversation(
            element.dataset.conversationId,
            element.dataset.userId,
            element.dataset.listingId || null
          );

        }
      );

    });
}


/* =========================================================
   CONVERSATION CARD
========================================================= */

function createConversationCard(
  conversation
) {

  const message =
    conversation.lastMessage || {};

  const preview =
    String(
      message.message ||
      message.content ||
      ""
    );


  const otherUser =
    message.sender_id === currentUser.id
      ? "Buyer"
      : "Seller";


  const listingId =
    conversation.listingId || "";


  return `
    <button
      type="button"
      class="conversation-item"
      data-conversation-id="${escapeAttribute(conversation.id)}"
      data-user-id="${escapeAttribute(conversation.otherUserId)}"
      data-listing-id="${escapeAttribute(listingId)}">

      <div class="conversation-avatar">
        ${escapeHTML(
          otherUser
            .charAt(0)
            .toUpperCase()
        )}
      </div>

      <div class="conversation-content">

        <strong>
          ${escapeHTML(otherUser)}
        </strong>

        <p>
          ${escapeHTML(
            preview || "No message"
          )}
        </p>

      </div>

      ${
        conversation.unread > 0
          ? `
            <span class="message-unread">
              ${conversation.unread}
            </span>
          `
          : ""
      }

    </button>
  `;
}


/* =========================================================
   OPEN CONVERSATION
========================================================= */

async function openConversation(
  conversationId,
  otherUserId,
  listingId = null
) {

  currentConversationId =
    conversationId;

  currentConversationListingId =
    listingId;


  const sellerElement =
    $("chatSeller");

  const productElement =
    $("chatProduct");


  if (sellerElement) {

    sellerElement.textContent =
      "Conversation";
  }

  if (productElement) {

    productElement.textContent =
      "";
  }


  /*
     If the conversation belongs to a
     listing, retrieve the listing title.
  */

  if (listingId) {

    try {

      const { data } =
        await supabaseClient
          .from("listings")
          .select("title, seller_name")
          .eq("id", listingId)
          .maybeSingle();

      if (data) {

        if (sellerElement) {

          sellerElement.textContent =
            data.seller_name ||
            "Seller";
        }

        if (productElement) {

          productElement.textContent =
            data.title ||
            "";
        }
      }

    } catch (error) {

      console.warn(
        "Listing information unavailable:",
        error.message
      );
    }
  }


  await loadConversationMessages(
    otherUserId,
    listingId
  );
}


/* =========================================================
   LOAD CONVERSATION MESSAGES
========================================================= */

async function loadConversationMessages(
  otherUserId,
  listingId = null
) {

  const container =
    $("messagesList");

  if (!container) return;

  if (!currentUser) return;


  container.innerHTML = `
    <div class="loading-state">
      Loading messages...
    </div>
  `;


  try {

    let query =
      supabaseClient
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`
        )
        .order("created_at", {
          ascending: true
        });


    if (listingId) {

      query =
        query.eq(
          "listing_id",
          listingId
        );
    }


    const { data, error } =
      await query;

    if (error) {
      throw error;
    }


    renderMessages(
      data || []
    );


    await markConversationAsRead(
      otherUserId,
      listingId
    );


  } catch (error) {

    console.error(
      "Message loading error:",
      error
    );

    container.innerHTML = `
      <div class="empty-state">
        <p>Unable to load this conversation.</p>
      </div>
    `;
  }
}


/* =========================================================
   RENDER MESSAGES
========================================================= */

function renderMessages(
  messages
) {

  const container =
    $("messagesList");

  if (!container) return;


  if (!messages.length) {

    container.innerHTML = `
      <div class="empty-state">
        <p>
          No messages in this conversation yet.
        </p>
      </div>
    `;

    return;
  }


  container.innerHTML =
    messages
      .map(message => {

        const mine =
          String(message.sender_id) ===
          String(currentUser.id);


        const text =
          message.message ||
          message.content ||
          "";


        const date =
          message.created_at
            ? new Date(
                message.created_at
              ).toLocaleString(
                "en-ZM",
                {
                  dateStyle: "short",
                  timeStyle: "short"
                }
              )
            : "";


        return `
          <div
            class="message-row ${mine ? "mine" : "theirs"}">

            <div class="message-bubble">

              <p>
                ${escapeHTML(text)}
              </p>

              <small>
                ${escapeHTML(date)}
              </small>

            </div>

          </div>
        `;

      })
      .join("");


  /*
     Scroll to the newest message.
  */

  container.scrollTop =
    container.scrollHeight;
}


/* =========================================================
   SEND MESSAGE
========================================================= */

async function sendMessage() {

  if (!currentUser) {

    openAuthModal();
    return;
  }


  const input =
    $("messageInput");

  if (!input) return;


  const text =
    input.value.trim();

  if (!text) {
    return;
  }


  /*
     We need a recipient.
     If no conversation is selected,
     don't send an incomplete message.
  */

  if (!currentConversationId) {

    showMessage(
      $("sellMessage"),
      "Please open a conversation first.",
      false
    );

    return;
  }


  const recipientId =
    getConversationRecipient();


  if (!recipientId) {

    alert(
      "Unable to identify the recipient."
    );

    return;
  }


  input.disabled = true;


  try {

    const messageData = {

      sender_id:
        currentUser.id,

      receiver_id:
        recipientId,

      message:
        text,

      read:
        false

    };


    if (
      currentConversationListingId
    ) {

      messageData.listing_id =
        currentConversationListingId;
    }


    /*
       Include conversation_id only when
       one was created by the database/UI.
    */

    if (
      currentConversationId &&
      !String(currentConversationId)
        .includes("_")
    ) {

      messageData.conversation_id =
        currentConversationId;
    }


    const { error } =
      await supabaseClient
        .from("messages")
        .insert(messageData);

    if (error) {
      throw error;
    }


    input.value = "";


    await loadConversationMessages(
      recipientId,
      currentConversationListingId
    );

    await loadConversations();

  } catch (error) {

    console.error(
      "Send message error:",
      error
    );

    alert(
      error?.message ||
      "Unable to send message."
    );

  } finally {

    input.disabled = false;

    input.focus();

  }
}


/* =========================================================
   CURRENT CONVERSATION RECIPIENT
========================================================= */

function getConversationRecipient() {

  const conversationId =
    currentConversationId;

  if (!conversationId) {
    return null;
  }


  /*
     If we have a generated fallback
     conversation ID, find the other user
     from the conversation list.
  */

  const items =
    document.querySelectorAll(
      "[data-conversation-id]"
    );


  for (const item of items) {

    if (
      item.dataset.conversationId ===
      String(conversationId)
    ) {

      return item.dataset.userId || null;
    }
  }


  /*
     Some conversation IDs may represent
     the other user's UUID directly.
  */

  if (
    !String(conversationId)
      .includes("_")
  ) {

    return conversationId;
  }


  return null;
}


/* =========================================================
   MARK CONVERSATION AS READ
========================================================= */

async function markConversationAsRead(
  otherUserId,
  listingId = null
) {

  if (!currentUser || !otherUserId) {
    return;
  }


  try {

    let query =
      supabaseClient
        .from("messages")
        .update({
          read: true
        })
        .eq(
          "receiver_id",
          currentUser.id
        )
        .eq(
          "sender_id",
          otherUserId
        )
        .eq(
          "read",
          false
        );


    if (listingId) {

      query =
        query.eq(
          "listing_id",
          listingId
        );
    }


    const { error } =
      await query;

    if (error) {
      throw error;
    }


    await loadConversations();

  } catch (error) {

    console.warn(
      "Mark read error:",
      error.message
    );
  }
}


/* =========================================================
   OPEN MESSAGE SELLER FROM PRODUCT
========================================================= */

async function messageSeller(
  listingId
) {

  if (!currentUser) {

    openAuthModal();
    return;
  }


  try {

    const { data: listing, error } =
      await supabaseClient
        .from("listings")
        .select(
          "id, title, seller_name, seller_phone"
        )
        .eq("id", listingId)
        .maybeSingle();

    if (error) {
      throw error;
    }

    if (!listing) {

      alert(
        "Product could not be found."
      );

      return;
    }


    /*
       Find seller by seller profile
       when possible.
    */

    const { data: sellerProfile } =
      await supabaseClient
        .from("seller_profiles")
        .select("id, full_name")
        .eq(
          "full_name",
          listing.seller_name
        )
        .maybeSingle();


    if (
      sellerProfile?.id &&
      String(sellerProfile.id) !==
        String(currentUser.id)
    ) {

      currentConversationId =
        sellerProfile.id;

    } else {

      /*
         If the seller profile cannot be
         identified, keep the listing open
         rather than creating a broken
         conversation.
      */

      alert(
        "The seller's messaging profile could not be found yet."
      );

      return;
    }


    currentConversationListingId =
      listing.id;


    if ($("chatSeller")) {

      $("chatSeller").textContent =
        listing.seller_name ||
        "Seller";
    }

    if ($("chatProduct")) {

      $("chatProduct").textContent =
        listing.title ||
        "";
    }


    openMessagesPage();


    await loadConversationMessages(
      sellerProfile.id,
      listing.id
    );

  } catch (error) {

    console.error(
      "Message seller error:",
      error
    );

    alert(
      error?.message ||
      "Unable to open seller messaging."
    );
  }
}


/* =========================================================
   MESSAGE REFRESH
========================================================= */

function startMessageRefresh() {

  stopMessageRefresh();


  messageRefreshTimer =
    setInterval(
      async () => {

        if (!currentUser) {
          return;
        }


        if (
          $("messagesPage") &&
          !$("messagesPage").hidden
        ) {

          await loadConversations();


          if (
            currentConversationId &&
            currentConversationListingId
          ) {

            const recipient =
              getConversationRecipient();

            if (recipient) {

              await loadConversationMessages(
                recipient,
                currentConversationListingId
              );
            }
          }
        }

      },
      10000
    );
}


/* =========================================================
   STOP MESSAGE REFRESH
========================================================= */

function stopMessageRefresh() {

  if (messageRefreshTimer) {

    clearInterval(
      messageRefreshTimer
    );

    messageRefreshTimer =
      null;
  }
}


/* =========================================================
   MESSAGE FORM EVENTS
========================================================= */

function setupMessageEvents() {

  const form =
    $("messageForm");

  if (
    form &&
    form.dataset.eventsReady !== "true"
  ) {

    form.addEventListener(
      "submit",
      event => {

        event.preventDefault();

        sendMessage();

      }
    );

    form.dataset.eventsReady =
      "true";
  }


  const input =
    $("messageInput");

  if (
    input &&
    input.dataset.eventsReady !== "true"
  ) {

    input.addEventListener(
      "keydown",
      event => {

        if (
          event.key === "Enter" &&
          !event.shiftKey
        ) {

          event.preventDefault();

          sendMessage();
        }

      }
    );

    input.dataset.eventsReady =
      "true";
  }
}


/* =========================================================
   PART 7 SETUP
========================================================= */

function setupPart7Events() {

  setupMessageEvents();

                   }
/* =========================================================
   SIOMA MARKET — PART 8
   ADMIN DASHBOARD + LISTING MANAGEMENT
========================================================= */


/* =========================================================
   CHECK ADMIN ACCESS
========================================================= */

async function requireAdmin() {

  if (!currentUser) {
    return false;
  }

  const admin =
    await isAdmin();

  if (!admin) {

    alert(
      "You do not have permission to access the admin dashboard."
    );

    return false;
  }

  return true;
}


/* =========================================================
   LOAD ADMIN LISTINGS
========================================================= */

async function loadAdminListings() {

  const tableBody =
    $("adminTableBody");

  if (!tableBody) return;


  const allowed =
    await requireAdmin();

  if (!allowed) {

    tableBody.innerHTML = `
      <tr>
        <td colspan="7">
          Access denied.
        </td>
      </tr>
    `;

    return;
  }


  tableBody.innerHTML = `
    <tr>
      <td colspan="7">
        Loading listings...
      </td>
    </tr>
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
      throw error;
    }


    adminListingsCache =
      data || [];


    renderAdminListings(
      adminListingsCache
    );

  } catch (error) {

    console.error(
      "Admin listings error:",
      error
    );

    tableBody.innerHTML = `
      <tr>
        <td colspan="7">
          Unable to load listings.
        </td>
      </tr>
    `;
  }
}


/* =========================================================
   RENDER ADMIN TABLE
========================================================= */

function renderAdminListings(
  listings
) {

  const tableBody =
    $("adminTableBody");

  if (!tableBody) return;


  if (!listings.length) {

    tableBody.innerHTML = `
      <tr>
        <td colspan="7">
          No listings found.
        </td>
      </tr>
    `;

    return;
  }


  tableBody.innerHTML =
    listings
      .map(
        createAdminListingRow
      )
      .join("");


  tableBody
    .querySelectorAll(
      "[data-admin-action]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const action =
            button.dataset.adminAction;

          const id =
            button.dataset.id;


          if (
            action === "view"
          ) {

            openProductDetails(id);

          } else if (
            action === "activate"
          ) {

            updateListingStatus(
              id,
              "active"
            );

          } else if (
            action === "pause"
          ) {

            updateListingStatus(
              id,
              "inactive"
            );

          } else if (
            action === "delete"
          ) {

            adminDeleteListing(id);

          }

        }
      );

    });
}


/* =========================================================
   CREATE ADMIN ROW
========================================================= */

function createAdminListingRow(
  item
) {

  const id =
    escapeAttribute(item.id);

  const title =
    escapeHTML(
      item.title ||
      "Untitled"
    );

  const seller =
    escapeHTML(
      item.seller_name ||
      "Unknown seller"
    );

  const category =
    escapeHTML(
      item.category ||
      "Other"
    );

  const location =
    escapeHTML(
      item.location ||
      "Sioma"
    );

  const price =
    formatPrice(item.price);

  const status =
    String(
      item.status ||
      "active"
    ).toLowerCase();


  return `
    <tr>

      <td>
        ${title}
      </td>

      <td>
        ${seller}
      </td>

      <td>
        ${category}
      </td>

      <td>
        ${price}
      </td>

      <td>
        ${location}
      </td>

      <td>
        <span class="listing-status status-${escapeAttribute(status)}">
          ${escapeHTML(status)}
        </span>
      </td>

      <td class="admin-actions">

        <button
          type="button"
          data-admin-action="view"
          data-id="${id}">
          View
        </button>

        ${
          status === "active"
            ? `
              <button
                type="button"
                data-admin-action="pause"
                data-id="${id}">
                Pause
              </button>
            `
            : `
              <button
                type="button"
                data-admin-action="activate"
                data-id="${id}">
                Activate
              </button>
            `
        }

        <button
          type="button"
          class="danger-button"
          data-admin-action="delete"
          data-id="${id}">
          Delete
        </button>

      </td>

    </tr>
  `;
}


/* =========================================================
   UPDATE LISTING STATUS
========================================================= */

async function updateListingStatus(
  listingId,
  newStatus
) {

  const allowed =
    await requireAdmin();

  if (!allowed) return;


  try {

    const { error } =
      await supabaseClient
        .from("listings")
        .update({
          status: newStatus
        })
        .eq(
          "id",
          listingId
        );


    if (error) {
      throw error;
    }


    /*
       Update local cache.
    */

    adminListingsCache =
      adminListingsCache.map(
        item => {

          if (
            String(item.id) ===
            String(listingId)
          ) {

            return {
              ...item,
              status: newStatus
            };
          }

          return item;
        }
      );


    renderAdminListings(
      adminListingsCache
    );


    await loadLatestListings();

  } catch (error) {

    console.error(
      "Status update error:",
      error
    );

    alert(
      error?.message ||
      "Unable to update listing status."
    );
  }
}


/* =========================================================
   ADMIN DELETE LISTING
========================================================= */

async function adminDeleteListing(
  listingId
) {

  const allowed =
    await requireAdmin();

  if (!allowed) return;


  const listing =
    adminListingsCache.find(
      item =>
        String(item.id) ===
        String(listingId)
    );


  if (!listing) {

    alert(
      "Listing could not be found."
    );

    return;
  }


  const confirmed =
    window.confirm(
      `Delete "${listing.title || "this listing"}"?`
    );


  if (!confirmed) {
    return;
  }


  try {

    const { error } =
      await supabaseClient
        .from("listings")
        .delete()
        .eq(
          "id",
          listingId
        );


    if (error) {
      throw error;
    }


    adminListingsCache =
      adminListingsCache.filter(
        item =>
          String(item.id) !==
          String(listingId)
      );


    renderAdminListings(
      adminListingsCache
    );


    await loadLatestListings();


  } catch (error) {

    console.error(
      "Admin delete error:",
      error
    );

    alert(
      error?.message ||
      "Unable to delete listing."
    );
  }
}


/* =========================================================
   ADMIN REFRESH
========================================================= */

async function refreshAdminListings() {

  await loadAdminListings();

}


/* =========================================================
   EXPORT ADMIN LISTINGS
========================================================= */

async function exportAdminListings() {

  const allowed =
    await requireAdmin();

  if (!allowed) return;


  if (!adminListingsCache.length) {

    await loadAdminListings();
  }


  if (!adminListingsCache.length) {

    alert(
      "There are no listings to export."
    );

    return;
  }


  try {

    const headers = [
      "ID",
      "Title",
      "Price",
      "Category",
      "Location",
      "Seller",
      "Seller Phone",
      "Status",
      "Created At"
    ];


    const rows =
      adminListingsCache.map(
        item => [

          item.id || "",

          item.title || "",

          item.price || "",

          item.category || "",

          item.location || "",

          item.seller_name || "",

          item.seller_phone || "",

          item.status || "",

          item.created_at || ""

        ]
      );


    const csv = [
      headers,
      ...rows
    ]
      .map(
        row =>
          row
            .map(
              value =>
                `"${String(value)
                  .replace(/"/g, '""')}"`
            )
            .join(",")
      )
      .join("\n");


    const blob =
      new Blob(
        [csv],
        {
          type:
            "text/csv;charset=utf-8;"
        }
      );


    const url =
      URL.createObjectURL(blob);


    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      "siomamarket-listings.csv";

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();

    URL.revokeObjectURL(url);


  } catch (error) {

    console.error(
      "Export error:",
      error
    );

    alert(
      "Unable to export listings."
    );
  }
}


/* =========================================================
   ADMIN BUTTON EVENTS
========================================================= */

function setupAdminEvents() {

  const refreshButton =
    $("adminRefreshButton");

  if (
    refreshButton &&
    refreshButton.dataset.eventsReady !== "true"
  ) {

    refreshButton.addEventListener(
      "click",
      refreshAdminListings
    );

    refreshButton.dataset.eventsReady =
      "true";
  }


  const exportButton =
    $("adminExportButton");

  if (
    exportButton &&
    exportButton.dataset.eventsReady !== "true"
  ) {

    exportButton.addEventListener(
      "click",
      exportAdminListings
    );

    exportButton.dataset.eventsReady =
      "true";
  }
}


/* =========================================================
   PART 8 SETUP
========================================================= */

function setupPart8Events() {

  setupAdminEvents();

        }
/* =========================================================
   PART 9 — UI STATE + COUNTERS + FINAL HELPERS
   ========================================================= */


/* =========================================================
   GLOBAL UI MESSAGE
   ========================================================= */

function showGlobalNotice(message, type = "info") {

  let notice = document.getElementById("globalNotice");

  if (!notice) {

    notice = document.createElement("div");

    notice.id = "globalNotice";

    notice.style.position = "fixed";
    notice.style.left = "16px";
    notice.style.right = "16px";
    notice.style.bottom = "78px";
    notice.style.zIndex = "9999";
    notice.style.padding = "12px 14px";
    notice.style.borderRadius = "12px";
    notice.style.fontSize = "14px";
    notice.style.fontWeight = "600";
    notice.style.boxShadow = "0 8px 24px rgba(0,0,0,.15)";
    notice.style.display = "none";

    document.body.appendChild(notice);
  }

  notice.textContent = message;

  if (type === "success") {
    notice.style.background = "#087f3d";
    notice.style.color = "#ffffff";
  } else if (type === "error") {
    notice.style.background = "#b42318";
    notice.style.color = "#ffffff";
  } else {
    notice.style.background = "#14221a";
    notice.style.color = "#ffffff";
  }

  notice.style.display = "block";

  clearTimeout(notice._timer);

  notice._timer = setTimeout(() => {
    notice.style.display = "none";
  }, 3000);
}


/* =========================================================
   FAVORITE COUNT
   ========================================================= */

async function updateFavoriteCount() {

  const countElements = [
    $("favoriteCount"),
    $("favoritesCount"),
    $("statFavorites")
  ].filter(Boolean);

  if (!currentUser) {

    countElements.forEach(element => {
      element.textContent = "0";
    });

    return 0;
  }

  try {

    const { count, error } =
      await supabaseClient
        .from("favorites")
        .select("id", {
          count: "exact",
          head: true
        })
        .eq("user_id", currentUser.id);

    if (error) {
      console.error("Favorite count error:", error);
      return 0;
    }

    const total = count || 0;

    countElements.forEach(element => {
      element.textContent = String(total);
    });

    return total;

  } catch (error) {

    console.error("Favorite count failed:", error);

    return 0;
  }
}


/* =========================================================
   MESSAGE COUNT
   ========================================================= */

async function updateMessageCount() {

  const badgeElements = [
    $("messageBadge"),
    $("messageCount"),
    $("messagesCount"),
    $("statMessages")
  ].filter(Boolean);

  if (!currentUser) {

    badgeElements.forEach(element => {
      element.textContent = "0";
    });

    return 0;
  }

  try {

    const { count, error } =
      await supabaseClient
        .from("messages")
        .select("id", {
          count: "exact",
          head: true
        })
        .eq("receiver_id", currentUser.id)
        .eq("read", false);

    if (error) {

      console.error("Message count error:", error);

      return 0;
    }

    const total = count || 0;

    badgeElements.forEach(element => {

      element.textContent = String(total);

      if (element.id === "messageBadge") {
        element.style.display =
          total > 0 ? "inline-flex" : "none";
      }
    });

    return total;

  } catch (error) {

    console.error("Message count failed:", error);

    return 0;
  }
}


/* =========================================================
   UPDATE ALL COUNTERS
   ========================================================= */

async function updateAllCounters() {

  await Promise.allSettled([
    updateFavoriteCount(),
    updateMessageCount(),
    updateDashboardFavoriteCount(),
    updateDashboardMessageCount()
  ]);
}


/* =========================================================
   ACTIVE MOBILE NAVIGATION
   ========================================================= */

function updateMobileNavigation(activeId) {

  const navIds = [
    "navHome",
    "navSearch",
    "navSell",
    "navFavorites",
    "navAccount"
  ];

  navIds.forEach(id => {

    const element = $(id);

    if (!element) return;

    element.classList.remove("active");

    element.removeAttribute("aria-current");
  });

  const active = $(activeId);

  if (active) {

    active.classList.add("active");

    active.setAttribute(
      "aria-current",
      "page"
    );
  }
}


/* =========================================================
   PAGE STATE
   ========================================================= */

function updatePageState(page) {

  switch (page) {

    case "home":
      updateMobileNavigation("navHome");
      break;

    case "search":
      updateMobileNavigation("navSearch");
      break;

    case "sell":
      updateMobileNavigation("navSell");
      break;

    case "favorites":
      updateMobileNavigation("navFavorites");
      break;

    case "account":
    case "dashboard":
      updateMobileNavigation("navAccount");
      break;

    default:
      break;
  }
}


/* =========================================================
   SAFE BUTTON LOADING
   ========================================================= */

function setButtonLoading(button, loading, loadingText = "Loading...") {

  if (!button) return;

  if (loading) {

    if (!button.dataset.originalText) {
      button.dataset.originalText =
        button.textContent;
    }

    button.disabled = true;

    button.textContent = loadingText;

  } else {

    button.disabled = false;

    if (button.dataset.originalText) {

      button.textContent =
        button.dataset.originalText;

      delete button.dataset.originalText;
    }
  }
}


/* =========================================================
   EMPTY STATE HELPER
   ========================================================= */

function renderEmptyState(
  container,
  title = "Nothing here yet",
  message = "No items are available right now."
) {

  if (!container) return;

  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">⌂</div>
      <h3>${escapeHTML(title)}</h3>
      <p>${escapeHTML(message)}</p>
    </div>
  `;
}


/* =========================================================
   ERROR STATE HELPER
   ========================================================= */

function renderErrorState(
  container,
  message = "Something went wrong. Please try again."
) {

  if (!container) return;

  container.innerHTML = `
    <div class="empty-state error-state">
      <div class="empty-state-icon">!</div>
      <h3>Unable to load</h3>
      <p>${escapeHTML(message)}</p>
      <button
        type="button"
        class="primary-button"
        onclick="location.reload()"
      >
        Try Again
      </button>
    </div>
  `;
}


/* =========================================================
   SAFE CLICK HANDLER
   ========================================================= */

function addSafeClick(id, handler) {

  const element = $(id);

  if (!element) return;

  if (element.dataset.clickReady === "true") {
    return;
  }

  element.addEventListener("click", handler);

  element.dataset.clickReady = "true";
}


/* =========================================================
   PART 9 EVENT SETUP
   ========================================================= */

function setupPart9Events() {

  if (document.body.dataset.part9Ready === "true") {
    return;
  }

  document.body.dataset.part9Ready = "true";

  addSafeClick(
    "navHome",
    () => {
      goHome();
      updatePageState("home");
    }
  );

  addSafeClick(
    "navSearch",
    () => {
      goSearch();
      updatePageState("search");
    }
  );

  addSafeClick(
    "navSell",
    () => {
      goSell();
      updatePageState("sell");
    }
  );

  addSafeClick(
    "navFavorites",
    () => {
      goFavorites();
      updatePageState("favorites");
    }
  );

  addSafeClick(
    "navAccount",
    () => {
      goAccount();
      updatePageState("account");
    }
  );
}


/* =========================================================
   REFRESH UI AFTER AUTH CHANGE
   ========================================================= */

async function refreshUserInterface() {

  await updateAccountUI();

  if (currentUser) {
    await loadFavoriteIds();
  }

  await updateAllCounters();
}


/* =========================================================
   AUTH STATE UI REFRESH
   ========================================================= */

async function handleUserSessionChanged() {

  await refreshUserInterface();

  if (!currentUser) {

    stopMessageRefresh();

    if ($("dashboardPage")) {
      $("dashboardPage").classList.remove("active");
    }

    if ($("messagesPage")) {
      $("messagesPage").classList.remove("active");
    }
  }
}


/* =========================================================
   PERIODIC COUNTER REFRESH
   ========================================================= */

let counterRefreshTimer = null;

function startCounterRefresh() {

  if (counterRefreshTimer) {
    clearInterval(counterRefreshTimer);
  }

  counterRefreshTimer = setInterval(() => {

    if (!document.hidden && currentUser) {
      updateAllCounters();
    }

  }, 30000);
}


function stopCounterRefresh() {

  if (counterRefreshTimer) {

    clearInterval(counterRefreshTimer);

    counterRefreshTimer = null;
  }
}


/* =========================================================
   VISIBILITY CHANGE
   ========================================================= */

function handleVisibilityChange() {

  if (!document.hidden && currentUser) {

    updateAllCounters();

    if (
      currentConversationId &&
      $("messagesPage") &&
      $("messagesPage").classList.contains("active")
    ) {

      const recipient =
        getConversationRecipient();

      if (recipient) {
        loadConversationMessages(
          recipient.userId,
          recipient.listingId
        );
      }
    }
  }
}


/* =========================================================
   PART 9 VISIBILITY EVENT
   ========================================================= */

function setupVisibilityEvents() {

  if (
    document.body.dataset.visibilityReady === "true"
  ) {
    return;
  }

  document.body.dataset.visibilityReady = "true";

  document.addEventListener(
    "visibilitychange",
    handleVisibilityChange
  );
}


/* =========================================================
   GLOBAL ERROR PROTECTION
   ========================================================= */

function setupGlobalErrorProtection() {

  if (
    document.body.dataset.errorProtectionReady === "true"
  ) {
    return;
  }

  document.body.dataset.errorProtectionReady = "true";

  window.addEventListener("error", event => {

    console.error(
      "SiomaMarket error:",
      event.error || event.message
    );
  });

  window.addEventListener(
    "unhandledrejection",
    event => {

      console.error(
        "SiomaMarket promise error:",
        event.reason
      );
    }
  );
}


/* =========================================================
   PART 9 COMPLETE
   ========================================================= */
/* =========================================================
   PART 10 — FINAL INITIALIZATION
   ========================================================= */


/* =========================================================
   MAIN APP INITIALIZER
   ========================================================= */

async function initializeSiomaMarket() {

  if (document.body.dataset.appInitialized === "true") {
    return;
  }

  document.body.dataset.appInitialized = "true";

  console.log("SiomaMarket starting...");

  try {

    /* -----------------------------------------
       SESSION
    ----------------------------------------- */

    await loadAuthSession();


    /* -----------------------------------------
       EVENT SETUP
    ----------------------------------------- */

    setupPart2Events();

    setupSearchEvents();

    setupProductEvents();

    setupPhotoUpload();

    setupPart5Events();

    setupPart6Events();

    setupPart7Events();

    setupPart8Events();

    setupPart9Events();

    setupVisibilityEvents();

    setupGlobalErrorProtection();


    /* -----------------------------------------
       LOCATION
    ----------------------------------------- */

    if ($("sellLocation")) {
      $("sellLocation").value = "Sioma";
    }


    /* -----------------------------------------
       LOAD PRODUCTS
    ----------------------------------------- */

    await loadLatestListings();


    /* -----------------------------------------
       USER UI
    ----------------------------------------- */

    await updateAccountUI();


    /* -----------------------------------------
       USER-SPECIFIC DATA
    ----------------------------------------- */

    if (currentUser) {

      await loadFavoriteIds();

      await updateAllCounters();

    } else {

      await updateMessageCount();

      await updateFavoriteCount();
    }


    /* -----------------------------------------
       START COUNTER REFRESH
    ----------------------------------------- */

    if (currentUser) {
      startCounterRefresh();
    }


    /* -----------------------------------------
       DEFAULT PAGE
    ----------------------------------------- */

    showHome();

    updatePageState("home");


    console.log("SiomaMarket ready.");

  } catch (error) {

    console.error(
      "SiomaMarket initialization error:",
      error
    );

    showGlobalNotice(
      "Some features could not be loaded. Please refresh the page.",
      "error"
    );
  }
}


/* =========================================================
   AUTH STATE REFRESH
   ========================================================= */

supabaseClient.auth.onAuthStateChange(
  (event, session) => {

    currentUser =
      session?.user || null;

    sessionLoaded = true;

    setTimeout(async () => {

      try {

        await handleUserSessionChanged();

        if (currentUser) {
          startCounterRefresh();
        } else {
          stopCounterRefresh();
        }

      } catch (error) {

        console.error(
          "Auth UI refresh error:",
          error
        );
      }

    }, 0);
  }
);


/* =========================================================
   DOM READY
   ========================================================= */

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
   FINAL SAFETY CHECK
   ========================================================= */

window.addEventListener(
  "load",
  () => {

    if (
      document.body.dataset.appInitialized !== "true"
    ) {

      initializeSiomaMarket();

    }

  },
  { once: true }
);


/* =========================================================
   SIOMAMARKET SCRIPT COMPLETE
   ========================================================= */
