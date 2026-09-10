/* =========================================================
   SIOMAMARKET - SCRIPT.JS
   CLEAN CONSOLIDATED VERSION
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

const ADMIN_EMAIL =
  "silumesi710@gmail.com";

const EMAIL_REDIRECT_URL =
  "https://silumesi710-netizen.github.io/sioma-market/";

const DEFAULT_IMAGE =
  "https://via.placeholder.com/600x400?text=SiomaMarket";

/* =========================================================
   GLOBAL STATE
========================================================= */

let currentUser = null;
let currentListingId = null;

let sellerListingsCache = [];
let adminListingsCache = [];

let favoritesCache = new Set();

let sessionLoaded = false;
let searchTimer = null;

let currentConversationId = null;
let currentConversationListingId = null;

let messageRefreshTimer = null;

const MESSAGE_READ_KEY =
  "siomaMarket_message_reads";

let messageReadState = {};

/* =========================================================
   THREE PHOTO SYSTEM
========================================================= */

let selectedProductImages = [];

const MAX_PRODUCT_IMAGES = 3;
const MAX_IMAGE_SIZE = 6 * 1024 * 1024;

/*
Existing listings can have image_url as:
1. A normal URL
2. A JSON array containing multiple URLs
*/

function getProductImages(item) {
  if (!item) return [];

  const raw = item.image_url;

  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.filter(Boolean);
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }
    } catch (error) {
      // Normal single image URL
    }

    return [raw];
  }

  return [];
}

function getPrimaryImage(item) {
  const images = getProductImages(item);

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
   HELPERS
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

function formatPrice(value) {
  return (
    "K" +
    Number(value || 0).toLocaleString("en-ZM")
  );
}

function isSioma(location) {
  return String(location || "")
    .toLowerCase()
    .includes("sioma");
}

/* =========================================================
   AUTH MODAL
========================================================= */

function openAuthModal() {
  const modal =
    document.getElementById("authModal");

  if (!modal) return;

  modal.style.display = "block";
  document.body.style.overflow = "hidden";
}

function closeAuthModal() {
  const modal =
    document.getElementById("authModal");

  if (!modal) return;

  modal.style.display = "none";
  document.body.style.overflow = "auto";
}

function showLogin() {
  const loginForm =
    document.getElementById("loginForm");

  const registerForm =
    document.getElementById("registerForm");

  const loginTab =
    document.getElementById("loginTab");

  const registerTab =
    document.getElementById("registerTab");

  const message =
    document.getElementById("authMessage");

  loginForm.style.display = "block";
  registerForm.style.display = "none";

  loginTab.classList.add("active");
  registerTab.classList.remove("active");

  message.innerText = "";
}

function showRegister() {
  const loginForm =
    document.getElementById("loginForm");

  const registerForm =
    document.getElementById("registerForm");

  const loginTab =
    document.getElementById("loginTab");

  const registerTab =
    document.getElementById("registerTab");

  const message =
    document.getElementById("authMessage");

  loginForm.style.display = "none";
  registerForm.style.display = "block";

  loginTab.classList.remove("active");
  registerTab.classList.add("active");

  message.innerText = "";
}

function openAccount() {
  if (currentUser) {
    logoutSeller();
  } else {
    openAuthModal();
    showLogin();
  }
}

/* =========================================================
   SESSION
========================================================= */

async function loadAuthSession() {
  if (sessionLoaded) {
    return currentUser;
  }

  try {
    const result =
      await supabaseClient.auth.getSession();

    currentUser =
      result.data?.session?.user || null;

    sessionLoaded = true;

    await updateAccountUI();

    return currentUser;
  } catch (error) {
    console.error(error);

    currentUser = null;
    sessionLoaded = true;

    await updateAccountUI();

    return null;
  }
}

/* =========================================================
   AUTH STATE
========================================================= */

supabaseClient.auth.onAuthStateChange(
  (event, session) => {
    currentUser =
      session?.user || null;

    sessionLoaded = true;

    updateAccountUI();

    if (currentUser) {
      setTimeout(
        updateMessageBadge,
        500
      );
    }
  }
);

/* =========================================================
   ADMIN
========================================================= */

async function isAdmin() {
  if (!currentUser) return false;

  const result =
    await supabaseClient
      .from("admin_users")
      .select("user_id")
      .eq("user_id", currentUser.id)
      .maybeSingle();

  return !!result.data;
}

/* =========================================================
   ACCOUNT UI
========================================================= */

async function updateAccountUI() {
  const button =
    document.getElementById("accountButton");

  const dashboard =
    document.getElementById("dashboardButton");

  const admin =
    document.getElementById("adminButton");

  const messages =
    document.getElementById("messagesButton");

  if (!button) return;

  if (currentUser) {
    button.innerText = "🚪 Logout";

    if (dashboard) {
      dashboard.style.display = "block";
    }

    if (messages) {
      messages.style.display = "block";
    }

    const adminStatus =
      await isAdmin();

    if (admin) {
      admin.style.display =
        adminStatus ? "block" : "none";
    }

    setTimeout(
      updateMessageBadge,
      100
    );
  } else {
    button.innerText = "🔐 Login";

    if (dashboard) {
      dashboard.style.display = "none";
    }

    if (admin) {
      admin.style.display = "none";
    }

    if (messages) {
      messages.style.display = "none";
    }

    const badge =
      document.getElementById("messageBadge");

    if (badge) {
      badge.style.display = "none";
    }
  }
}

/* =========================================================
   SELLER PROFILE
========================================================= */

async function createSellerProfile(
  userId,
  name,
  phone,
  location
) {
  return await supabaseClient
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

async function loadSellerProfile() {
  if (!currentUser) return;

  const result =
    await supabaseClient
      .from("seller_profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

  if (!result.data) return;

  const sellerName =
    document.getElementById("sellerName");

  const sellerPhone =
    document.getElementById("sellerPhone");

  const sellLocation =
    document.getElementById("sellLocation");

  if (sellerName) {
    sellerName.value =
      result.data.full_name || "";
  }

  if (sellerPhone) {
    sellerPhone.value =
      result.data.phone || "";
  }

  if (sellLocation) {
    sellLocation.value =
      result.data.location || "Sioma";
  }
}

/* =========================================================
   REGISTER
========================================================= */

document
  .getElementById("registerForm")
  .addEventListener(
    "submit",
    async function (e) {
      e.preventDefault();

      const button =
        document.getElementById(
          "registerButton"
        );

      const message =
        document.getElementById(
          "authMessage"
        );

      const name =
        document
          .getElementById("registerName")
          .value.trim();

      const phone =
        document
          .getElementById("registerPhone")
          .value.trim();

      const location =
        document
          .getElementById("registerLocation")
          .value.trim();

      const email =
        document
          .getElementById("registerEmail")
          .value.trim();

      const password =
        document.getElementById(
          "registerPassword"
        ).value;

      button.disabled = true;
      button.innerText =
        "⏳ CREATING...";

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
                phone,
                location
              }
            }
          });

        if (result.error) {
          throw result.error;
        }

        if (result.data.session) {
          currentUser =
            result.data.user;

          sessionLoaded = true;

          const profile =
            await createSellerProfile(
              currentUser.id,
              name,
              phone,
              location
            );

          if (profile.error) {
            throw profile.error;
          }

          message.style.color =
            "#087f3d";

          message.innerText =
            "✅ Account created!";

          await updateAccountUI();

          setTimeout(() => {
            closeAuthModal();
            sellNow();
          }, 700);
        } else {
          message.style.color =
            "#087f3d";

          message.innerHTML =
            "✅ Account created!<br><br>" +
            "📧 Check your email and " +
            "confirm your account.";
        }
      } catch (error) {
        message.style.color =
          "#c62828";

        message.innerText =
          "❌ " + error.message;
      } finally {
        button.disabled = false;

        button.innerText =
          "📝 CREATE ACCOUNT";
      }
    }
  );

/* =========================================================
   LOGIN
========================================================= */

document
  .getElementById("loginForm")
  .addEventListener(
    "submit",
    async function (e) {
      e.preventDefault();

      const button =
        document.getElementById(
          "loginButton"
        );

      const message =
        document.getElementById(
          "authMessage"
        );

      button.disabled = true;
      button.innerText =
        "⏳ LOGGING IN...";

      try {
        const result =
          await supabaseClient.auth
            .signInWithPassword({
              email:
                document
                  .getElementById(
                    "loginEmail"
                  )
                  .value.trim(),

              password:
                document.getElementById(
                  "loginPassword"
                ).value
            });

        if (result.error) {
          throw result.error;
        }

        currentUser =
          result.data.user;

        sessionLoaded = true;

        await updateAccountUI();
        await loadSellerProfile();

        message.style.color =
          "#087f3d";

        message.innerText =
          "✅ Login successful!";

        setTimeout(
          closeAuthModal,
          500
        );
      } catch (error) {
        message.style.color =
          "#c62828";

        message.innerText =
          "❌ " + error.message;
      } finally {
        button.disabled = false;

        button.innerText =
          "🔐 LOGIN";
      }
    }
  );

/* =========================================================
   LOGOUT
========================================================= */

async function logoutSeller() {
  if (
    !confirm(
      "Are you sure you want to logout?"
    )
  ) {
    return;
  }

  const result =
    await supabaseClient.auth.signOut();

  if (result.error) {
    alert(
      "❌ " +
      result.error.message
    );

    return;
  }

  currentUser = null;
  sessionLoaded = true;

  favoritesCache.clear();

  closeSellerDashboard();
  closeAdminDashboard();
  closeFavorites();
  closeProductPage();
  closeSellPage();
  closeMessages();

  await updateAccountUI();

  alert(
    "✅ You have been logged out."
  );
}

/* =========================================================
   SELL PAGE
========================================================= */

async function sellNow() {
  await loadAuthSession();

  if (!currentUser) {
    openAuthModal();
    showLogin();

    const message =
      document.getElementById(
        "authMessage"
      );

    message.style.color =
      "#c62828";

    message.innerText =
      "🔐 Login or register before selling.";

    return;
  }

  await loadSellerProfile();

  const page =
    document.getElementById(
      "sellPage"
    );

  page.style.display = "block";

  document.body.style.overflow =
    "hidden";
}

function closeSellPage() {
  const page =
    document.getElementById(
      "sellPage"
    );

  page.style.display = "none";

  document.body.style.overflow =
    "auto";

  selectedProductImages = [];

  const input =
    document.getElementById(
      "sellImage"
    );

  if (input) {
    input.value = "";
  }

  renderImagePreviews();
}

/* =========================================================
   THREE IMAGE SELECTOR
========================================================= */

const sellImageInput =
  document.getElementById(
    "sellImage"
  );

if (sellImageInput) {
  sellImageInput.addEventListener(
    "change",
    function () {
      const files =
        Array.from(this.files || []);

      if (!files.length) return;

      if (
        selectedProductImages.length +
          files.length >
        MAX_PRODUCT_IMAGES
      ) {
        alert(
          "You can upload a maximum " +
          "of 3 photos per product."
        );

        this.value = "";

        return;
      }

      for (const file of files) {
        if (
          !file.type.startsWith(
            "image/"
          )
        ) {
          alert(
            "Only image files are allowed."
          );

          continue;
        }

        if (
          file.size >
          MAX_IMAGE_SIZE
        ) {
          alert(
            file.name +
            " is larger than 6MB."
          );

          continue;
        }

        selectedProductImages.push(
          file
        );
      }

      renderImagePreviews();

      this.value = "";
    }
  );
}

function renderImagePreviews() {
  const preview =
    document.getElementById(
      "imagePreview"
    );

  const counter =
    document.getElementById(
      "photoCounter"
    );

  if (!preview || !counter) {
    return;
  }

  preview.innerHTML = "";

  selectedProductImages.forEach(
    (file, index) => {
      const url =
        URL.createObjectURL(file);

      const item =
        document.createElement(
          "div"
        );

      item.className =
        "preview-item";

      item.innerHTML = `
        <img
          src="${escapeAttribute(url)}"
          alt="Product photo ${index + 1}"
        >

        <span class="preview-number">
          ${index + 1}
        </span>

        <button
          type="button"
          class="preview-remove"
          onclick="removeProductImage(${index})"
        >
          ×
        </button>

        ${
          index === 0
            ? `
              <span class="preview-main">
                ⭐ MAIN PHOTO
              </span>
            `
            : ""
        }
      `;

      preview.appendChild(item);
    }
  );

  counter.innerText =
    selectedProductImages.length +
    " / 3 photos selected";
}

function removeProductImage(index) {
  selectedProductImages.splice(
    index,
    1
  );

  renderImagePreviews();
}

/* =========================================================
   UPLOAD PRODUCT IMAGE
========================================================= */

async function uploadProductImage(
  file
) {
  if (!file) {
    throw new Error(
      "Please select a product photo."
    );
  }

  if (
    file.size >
    MAX_IMAGE_SIZE
  ) {
    throw new Error(
      "Maximum image size is 6MB."
    );
  }

  const extension =
    (
      file.name.split(".").pop() ||
      "jpg"
    )
      .toLowerCase()
      .replace(
        /[^a-z0-9]/g,
        ""
      ) || "jpg";

  const filePath =
    "products/" +
    Date.now() +
    "-" +
    Math.random()
      .toString(36)
      .substring(2) +
    "." +
    extension;

  const upload =
    await supabaseClient.storage
      .from("Product-images")
      .upload(
        filePath,
        file,
        {
          cacheControl: "3600",
          upsert: false,
          contentType:
            file.type
        }
      );

  if (upload.error) {
    throw upload.error;
  }

  return supabaseClient.storage
    .from("Product-images")
    .getPublicUrl(filePath)
    .data.publicUrl;
}

async function uploadProductImages(
  files
) {
  if (!files || !files.length) {
    throw new Error(
      "Please select at least one product photo."
    );
  }

  if (
    files.length >
    MAX_PRODUCT_IMAGES
  ) {
    throw new Error(
      "Maximum 3 photos are allowed."
    );
  }

  const urls = [];

  for (
    let i = 0;
    i < files.length;
    i++
  ) {
    const progress =
      document.getElementById(
        "publishButton"
      );

    progress.innerText =
      "⏳ UPLOADING PHOTO " +
      (i + 1) +
      " OF " +
      files.length +
      "...";

    const url =
      await uploadProductImage(
        files[i]
      );

    urls.push(url);
  }

  return urls;
         }
