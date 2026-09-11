/* =========================================================
   SIOMAMARKET - SCRIPT.JS
   CLEAN CONSOLIDATED VERSION
   PART 1
   SUPABASE + GLOBAL STATE + IMAGE SYSTEM + HELPERS
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
   APP CONFIGURATION
========================================================= */

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

let favoritesCache = [];

let sessionLoaded = false;

let searchTimer = null;


/* =========================================================
   MESSAGING STATE
========================================================= */

let currentConversationId = null;

let currentConversationListingId = null;

let messageRefreshTimer = null;


/* =========================================================
   MESSAGE READ STATE
========================================================= */

const MESSAGE_READ_KEY =
  "siomaMarket_message_reads";

let messageReadState = {};


/* =========================================================
   THREE-PHOTO PRODUCT SYSTEM
========================================================= */

let selectedProductImages = [];

const MAX_PRODUCT_IMAGES = 3;

const MAX_IMAGE_SIZE =
  6 * 1024 * 1024;


/* =========================================================
   GET PRODUCT IMAGES
========================================================= */

function getProductImages(item) {

  if (!item) {
    return [];
  }

  const value = item.image_url;

  if (!value) {
    return [];
  }

  /* Already an array */

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }


  /* JSON array stored as text */

  if (
    typeof value === "string" &&
    value.trim().startsWith("[")
  ) {

    try {

      const parsed =
        JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }

    } catch (error) {

      console.warn(
        "Could not parse image_url:",
        error
      );

    }
  }


  /* Single image URL */

  if (
    typeof value === "string" &&
    value.trim()
  ) {

    return [value.trim()];

  }


  return [];
}


/* =========================================================
   GET PRIMARY IMAGE
========================================================= */

function getPrimaryImage(item) {

  const images =
    getProductImages(item);

  return (
    images[0] ||
    DEFAULT_IMAGE
  );
}


/* =========================================================
   PREPARE IMAGE VALUE FOR DATABASE
========================================================= */

function getImageStorageValue(images) {

  if (
    !Array.isArray(images) ||
    images.length === 0
  ) {

    return null;

  }


  const cleanImages =
    images.filter(Boolean);


  if (cleanImages.length === 0) {
    return null;
  }


  /* Keep one image as a normal URL */

  if (cleanImages.length === 1) {
    return cleanImages[0];
  }


  /* Store multiple images as JSON */

  return JSON.stringify(cleanImages);
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";

  }


  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================================================
   ESCAPE HTML ATTRIBUTE
========================================================= */

function escapeAttribute(value) {

  return escapeHTML(value)
    .replace(/`/g, "&#096;");
}


/* =========================================================
   FORMAT PRICE
========================================================= */

function formatPrice(price) {

  const number =
    Number(price);

  if (
    !Number.isFinite(number)
  ) {

    return "K0";

  }


  return "K" +
    number.toLocaleString(
      "en-ZM",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }
    );
}


/* =========================================================
   SIOMA LOCATION CHECK
========================================================= */

function isSioma(location) {

  if (!location) {
    return false;
  }

  return String(location)
    .trim()
    .toLowerCase()
    .includes("sioma");
}


/* =========================================================
   SAFE ELEMENT HELPER
========================================================= */

function getElement(id) {

  return document.getElementById(id);

}


/* =========================================================
   SHOW MESSAGE HELPER
========================================================= */

function showMessage(
  elementId,
  message,
  type = "info"
) {

  const element =
    getElement(elementId);

  if (!element) {
    return;
  }

  element.innerText =
    message || "";

  element.className =
    "message " + type;

}


/* =========================================================
   CLEAR MESSAGE HELPER
========================================================= */

function clearMessage(elementId) {

  const element =
    getElement(elementId);

  if (!element) {
    return;
  }

  element.innerText = "";

  element.className =
    "message";

}
/* =========================================================
   PART 2
   AUTHENTICATION + SESSION + ACCOUNT UI
========================================================= */


/* =========================================================
   AUTH MODAL
========================================================= */

function openAuthModal() {

  const modal =
    getElement("authModal");

  if (!modal) return;

  modal.classList.add("show");

  showLogin();

}


function closeAuthModal() {

  const modal =
    getElement("authModal");

  if (!modal) return;

  modal.classList.remove("show");

}


function showLogin() {

  const loginForm =
    getElement("loginForm");

  const registerForm =
    getElement("registerForm");

  const loginTab =
    getElement("loginTab");

  const registerTab =
    getElement("registerTab");

  if (loginForm) {
    loginForm.style.display = "block";
  }

  if (registerForm) {
    registerForm.style.display = "none";
  }

  if (loginTab) {
    loginTab.classList.add("active");
  }

  if (registerTab) {
    registerTab.classList.remove("active");
  }

  clearMessage("authMessage");

}


function showRegister() {

  const loginForm =
    getElement("loginForm");

  const registerForm =
    getElement("registerForm");

  const loginTab =
    getElement("loginTab");

  const registerTab =
    getElement("registerTab");

  if (loginForm) {
    loginForm.style.display = "none";
  }

  if (registerForm) {
    registerForm.style.display = "block";
  }

  if (loginTab) {
    loginTab.classList.remove("active");
  }

  if (registerTab) {
    registerTab.classList.add("active");
  }

  clearMessage("authMessage");

}


/* =========================================================
   ACCOUNT BUTTON
========================================================= */

function openAccount() {

  if (currentUser) {

    logoutSeller();

  } else {

    openAuthModal();

  }

}


/* =========================================================
   LOAD CURRENT SESSION
========================================================= */

async function loadAuthSession() {

  try {

    const {
      data,
      error
    } =
      await supabaseClient.auth.getSession();


    if (error) {

      console.error(
        "Session error:",
        error
      );

      currentUser = null;

    } else {

      currentUser =
        data?.session?.user || null;

    }


    sessionLoaded = true;

    updateAccountUI();

    if (currentUser) {

      await loadSellerProfile();

    }

  } catch (error) {

    console.error(
      "Could not load session:",
      error
    );

    currentUser = null;

    sessionLoaded = true;

    updateAccountUI();

  }

}


/* =========================================================
   AUTH STATE CHANGES
========================================================= */

supabaseClient.auth.onAuthStateChange(
  async (event, session) => {

    currentUser =
      session?.user || null;

    sessionLoaded = true;

    updateAccountUI();


    if (currentUser) {

      await loadSellerProfile();

    }

  }
);


/* =========================================================
   ADMIN CHECK
========================================================= */

async function isAdmin() {

  if (!currentUser) {
    return false;
  }


  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("admin_users")
        .select("user_id")
        .eq("user_id", currentUser.id)
        .maybeSingle();


    if (error) {

      console.error(
        "Admin check error:",
        error
      );

      return false;

    }


    return !!data;

  } catch (error) {

    console.error(
      "Admin check failed:",
      error
    );

    return false;

  }

}


/* =========================================================
   UPDATE ACCOUNT UI
========================================================= */

async function updateAccountUI() {

  const accountButton =
    getElement("accountButton");

  const dashboardButton =
    getElement("dashboardButton");

  const adminButton =
    getElement("adminButton");

  const messagesButton =
    getElement("messagesButton");


  /* Account button */

  if (accountButton) {

    accountButton.innerText =
      currentUser
        ? "Logout"
        : "Account";

  }


  /* Logged-in controls */

  if (dashboardButton) {

    dashboardButton.style.display =
      currentUser
        ? ""
        : "none";

  }


  if (messagesButton) {

    messagesButton.style.display =
      currentUser
        ? ""
        : "none";

  }


  /* Admin control */

  if (adminButton) {

    adminButton.style.display =
      "none";


    if (currentUser) {

      const admin =
        await isAdmin();

      if (admin) {
        adminButton.style.display = "";
      }

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

  if (!userId) {
    return false;
  }


  try {

    const {
      error
    } =
      await supabaseClient
        .from("seller_profiles")
        .upsert(
          {
            id: userId,
            full_name:
              name || "",
            phone:
              phone || "",
            location:
              location || "Sioma"
          },
          {
            onConflict: "id"
          }
        );


    if (error) {

      console.error(
        "Seller profile error:",
        error
      );

      return false;

    }


    return true;

  } catch (error) {

    console.error(
      "Seller profile failed:",
      error
    );

    return false;

  }

}


/* =========================================================
   LOAD SELLER PROFILE
========================================================= */

async function loadSellerProfile() {

  if (!currentUser) {
    return null;
  }


  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("seller_profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();


    if (error) {

      console.error(
        "Profile load error:",
        error
      );

      return null;

    }


    if (!data) {
      return null;
    }


    const nameInput =
      getElement("sellerName");

    const phoneInput =
      getElement("sellerPhone");

    const locationInput =
      getElement("sellLocation");


    if (nameInput) {

      nameInput.value =
        data.full_name || "";

    }


    if (phoneInput) {

      phoneInput.value =
        data.phone || "";

    }


    if (locationInput) {

      locationInput.value =
        data.location || "Sioma";

    }


    return data;

  } catch (error) {

    console.error(
      "Could not load seller profile:",
      error
    );

    return null;

  }

}


/* =========================================================
   REGISTER
========================================================= */

const registerForm =
  getElement("registerForm");


if (registerForm) {

  registerForm.addEventListener(
    "submit",
    async function(event) {

      event.preventDefault();


      const name =
        getElement("registerName")
          ?.value
          .trim();

      const phone =
        getElement("registerPhone")
          ?.value
          .trim();

      const location =
        getElement("registerLocation")
          ?.value
          .trim() ||
        "Sioma";

      const email =
        getElement("registerEmail")
          ?.value
          .trim();

      const password =
        getElement("registerPassword")
          ?.value;


      if (!name ||
          !phone ||
          !email ||
          !password) {

        showMessage(
          "authMessage",
          "Please complete all required fields.",
          "error"
        );

        return;

      }


      if (!isSioma(location)) {

        showMessage(
          "authMessage",
          "SiomaMarket is currently available in Sioma only.",
          "error"
        );

        return;

      }


      const button =
        getElement("registerButton");

      if (button) {

        button.disabled = true;

        button.innerText =
          "Creating account...";

      }


      clearMessage("authMessage");


      try {

        const {
          data,
          error
        } =
          await supabaseClient.auth.signUp({

            email: email,

            password: password,

            options: {

              emailRedirectTo:
                EMAIL_REDIRECT_URL,

              data: {

                full_name: name,

                phone: phone,

                location: location

              }

            }

          });


        if (error) {

          throw error;

        }


        currentUser =
          data?.user || null;


        /* If email confirmation is disabled */

        if (data?.session &&
            data?.user) {

          await createSellerProfile(
            data.user.id,
            name,
            phone,
            location
          );

          currentUser =
            data.user;

          updateAccountUI();

          closeAuthModal();

          if (typeof sellNow === "function") {
            sellNow();
          }

        } else {

          showMessage(
            "authMessage",
            "Account created. Please check your email to confirm your account.",
            "success"
          );

        }

      } catch (error) {

        console.error(
          "Registration error:",
          error
        );

        showMessage(
          "authMessage",
          error.message ||
          "Registration failed. Please try again.",
          "error"
        );

      } finally {

        if (button) {

          button.disabled = false;

          button.innerText =
            "Create Account";

        }

      }

    }
  );

}


/* =========================================================
   LOGIN
========================================================= */

const loginForm =
  getElement("loginForm");


if (loginForm) {

  loginForm.addEventListener(
    "submit",
    async function(event) {

      event.preventDefault();


      const email =
        getElement("loginEmail")
          ?.value
          .trim();

      const password =
        getElement("loginPassword")
          ?.value;


      if (!email || !password) {

        showMessage(
          "authMessage",
          "Please enter your email and password.",
          "error"
        );

        return;

      }


      const button =
        getElement("loginButton");

      if (button) {

        button.disabled = true;

        button.innerText =
          "Signing in...";

      }


      clearMessage("authMessage");


      try {

        const {
          data,
          error
        } =
          await supabaseClient.auth
            .signInWithPassword({
              email: email,
              password: password
            });


        if (error) {

          throw error;

        }


        currentUser =
          data?.user || null;

        updateAccountUI();

        await loadSellerProfile();

        closeAuthModal();


      } catch (error) {

        console.error(
          "Login error:",
          error
        );

        showMessage(
          "authMessage",
          error.message ||
          "Login failed. Please check your details.",
          "error"
        );

      } finally {

        if (button) {

          button.disabled = false;

          button.innerText =
            "Login";

        }

      }

    }
  );

}


/* =========================================================
   LOGOUT
========================================================= */

async function logoutSeller() {

  const confirmed =
    window.confirm(
      "Are you sure you want to logout?"
    );


  if (!confirmed) {
    return;
  }


  try {

    const {
      error
    } =
      await supabaseClient.auth.signOut();


    if (error) {

      throw error;

    }


    currentUser = null;

    currentListingId = null;

    sellerListingsCache = [];

    favoritesCache = [];

    updateAccountUI();

    closeAuthModal();


    /* Close application pages */

    const pages = [
      "sellPage",
      "sellerDashboard",
      "adminDashboard",
      "productPage",
      "favoritesPage",
      "messagesPage"
    ];


    pages.forEach(function(id) {

      const element =
        getElement(id);

      if (element) {

        element.classList.remove("show");

        element.style.display =
          "none";

      }

    });


    window.scrollTo(0, 0);


  } catch (error) {

    console.error(
      "Logout error:",
      error
    );

    alert(
      error.message ||
      "Could not logout."
    );

  }

}
/* =========================================================
   PART 3
   SELL PAGE + THREE-PHOTO UPLOAD SYSTEM
========================================================= */


/* =========================================================
   OPEN SELL PAGE
========================================================= */

async function sellNow() {

  /* Make sure we know the current session */

  if (!sessionLoaded) {
    await loadAuthSession();
  }


  /* User must be logged in */

  if (!currentUser) {

    openAuthModal();

    return;

  }


  /* Load seller information */

  await loadSellerProfile();


  const sellPage =
    getElement("sellPage");


  if (!sellPage) {
    return;
  }


  sellPage.classList.add("show");

  sellPage.style.display =
    "block";


  window.scrollTo(
    0,
    0
  );

}


/* =========================================================
   CLOSE SELL PAGE
========================================================= */

function closeSellPage() {

  const sellPage =
    getElement("sellPage");


  if (sellPage) {

    sellPage.classList.remove("show");

    sellPage.style.display =
      "none";

  }


  /* Clear selected photos */

  selectedProductImages = [];


  const imageInput =
    getElement("sellImage");


  if (imageInput) {
    imageInput.value = "";
  }


  renderImagePreviews();

}


/* =========================================================
   PRODUCT IMAGE INPUT
========================================================= */

const sellImageInput =
  getElement("sellImage");


if (sellImageInput) {

  sellImageInput.addEventListener(
    "change",
    function(event) {

      const files =
        Array.from(
          event.target.files || []
        );


      if (!files.length) {
        return;
      }


      /* Maximum of 3 photos */

      if (
        selectedProductImages.length +
        files.length >
        MAX_PRODUCT_IMAGES
      ) {

        alert(
          "You can upload a maximum of 3 photos."
        );

        event.target.value = "";

        return;

      }


      for (
        const file of files
      ) {

        /* Check image type */

        if (
          !file.type.startsWith(
            "image/"
          )
        ) {

          alert(
            file.name +
            " is not a valid image."
          );

          continue;

        }


        /* Check file size */

        if (
          file.size >
          MAX_IMAGE_SIZE
        ) {

          alert(
            file.name +
            " is too large. Maximum size is 6 MB."
          );

          continue;

        }


        selectedProductImages.push(
          file
        );

      }


      renderImagePreviews();


      /* Reset input so the same photo can be selected again */

      event.target.value = "";

    }
  );

}


/* =========================================================
   RENDER IMAGE PREVIEWS
========================================================= */

function renderImagePreviews() {

  const preview =
    getElement("imagePreview");

  const counter =
    getElement("photoCounter");


  if (!preview) {
    return;
  }


  preview.innerHTML = "";


  /* Photo counter */

  if (counter) {

    counter.innerText =
      selectedProductImages.length +
      "/" +
      MAX_PRODUCT_IMAGES +
      " photos";

  }


  if (
    selectedProductImages.length === 0
  ) {

    return;

  }


  selectedProductImages.forEach(
    function(file, index) {

      const card =
        document.createElement("div");

      card.className =
        "image-preview-card";


      const image =
        document.createElement("img");


      const objectURL =
        URL.createObjectURL(file);


      image.src =
        objectURL;

      image.alt =
        "Product photo " +
        (index + 1);


      image.onload =
        function() {

          URL.revokeObjectURL(
            objectURL
          );

        };


      const number =
        document.createElement("span");

      number.className =
        "photo-number";

      number.innerText =
        index + 1;


      const removeButton =
        document.createElement("button");

      removeButton.type =
        "button";

      removeButton.className =
        "remove-photo";

      removeButton.innerText =
        "×";

      removeButton.title =
        "Remove photo";


      removeButton.onclick =
        function() {

          removeProductImage(
            index
          );

        };


      card.appendChild(image);

      card.appendChild(number);

      card.appendChild(
        removeButton
      );


      /* First image is the main photo */

      if (index === 0) {

        const mainLabel =
          document.createElement(
            "span"
          );

        mainLabel.className =
          "main-photo-label";

        mainLabel.innerText =
          "MAIN PHOTO";

        card.appendChild(
          mainLabel
        );

      }


      preview.appendChild(card);

    }
  );

}


/* =========================================================
   REMOVE PRODUCT IMAGE
========================================================= */

function removeProductImage(index) {

  if (
    index < 0 ||
    index >= selectedProductImages.length
  ) {

    return;

  }


  selectedProductImages.splice(
    index,
    1
  );


  renderImagePreviews();

}


/* =========================================================
   UPLOAD ONE PRODUCT IMAGE
========================================================= */

async function uploadProductImage(file) {

  if (!file) {
    throw new Error(
      "No image selected."
    );
  }


  /* Validate file type */

  if (
    !file.type.startsWith(
      "image/"
    )
  ) {

    throw new Error(
      "Only image files are allowed."
    );

  }


  /* Validate file size */

  if (
    file.size >
    MAX_IMAGE_SIZE
  ) {

    throw new Error(
      "Each image must be 6 MB or smaller."
    );

  }


  /* Create a safe file extension */

  let extension =
    "jpg";


  if (
    file.type ===
    "image/png"
  ) {

    extension = "png";

  } else if (
    file.type ===
    "image/webp"
  ) {

    extension = "webp";

  } else if (
    file.type ===
    "image/gif"
  ) {

    extension = "gif";

  }


  /* Unique storage filename */

  const fileName =
    "products/" +
    Date.now() +
    "-" +
    Math.random()
      .toString(36)
      .substring(2, 10) +
    "." +
    extension;


  /* Upload to Supabase Storage */

  const {
    error
  } =
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


  if (error) {

    console.error(
      "Image upload error:",
      error
    );

    throw error;

  }


  /* Get public URL */

  const {
    data
  } =
    supabaseClient
      .storage
      .from("Product-images")
      .getPublicUrl(
        fileName
      );


  if (
    !data ||
    !data.publicUrl
  ) {

    throw new Error(
      "Could not create image URL."
    );

  }


  return data.publicUrl;

}


/* =========================================================
   UPLOAD ALL PRODUCT IMAGES
========================================================= */

async function uploadProductImages(
  files
) {

  if (
    !Array.isArray(files) ||
    files.length === 0
  ) {

    return [];

  }


  if (
    files.length >
    MAX_PRODUCT_IMAGES
  ) {

    throw new Error(
      "You can upload a maximum of 3 photos."
    );

  }


  const publishButton =
    getElement(
      "publishButton"
    );


  const uploadedURLs = [];


  try {

    for (
      let i = 0;
      i < files.length;
      i++
    ) {

      if (publishButton) {

        publishButton.innerText =
          "Uploading photo " +
          (i + 1) +
          " of " +
          files.length +
          "...";

      }


      const url =
        await uploadProductImage(
          files[i]
        );


      uploadedURLs.push(
        url
      );

    }


    return uploadedURLs;

  } finally {

    if (publishButton) {

      publishButton.innerText =
        "Publish Listing";

    }

  }

         }
 /* =========================================================
   SIOMAMARKET - SCRIPT.JS
   PART 4
   PUBLISH LISTING + DATABASE + SEARCH + CATEGORIES
========================================================= */


/* =========================================================
   PUBLISH LISTING
========================================================= */

const sellForm =
  getElement("sellForm");

if (sellForm) {

  sellForm.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();

      await loadAuthSession();

      if (!currentUser) {

        openAuthModal();
        showLogin();

        showMessage(
          "authMessage",
          "🔐 Please login before publishing.",
          "error"
        );

        return;
      }

      const title =
        getElement("sellTitle")?.value.trim();

      const description =
        getElement("sellDescription")?.value.trim();

      const price =
        Number(
          getElement("sellPrice")?.value
        );

      const category =
        getElement("sellCategory")?.value;

      const location =
        getElement("sellLocation")?.value ||
        "Sioma";

      const sellerName =
        getElement("sellerName")?.value.trim();

      const sellerPhone =
        getElement("sellerPhone")?.value.trim();

      const publishButton =
        getElement("publishButton");

      clearMessage("sellMessage");


      /* ===============================
         VALIDATION
      =============================== */

      if (!title) {

        showMessage(
          "sellMessage",
          "Please enter a product name.",
          "error"
        );

        return;
      }

      if (
        !Number.isFinite(price) ||
        price < 0
      ) {

        showMessage(
          "sellMessage",
          "Please enter a valid price.",
          "error"
        );

        return;
      }

      if (!category) {

        showMessage(
          "sellMessage",
          "Please select a category.",
          "error"
        );

        return;
      }

      if (!isSioma(location)) {

        showMessage(
          "sellMessage",
          "SiomaMarket is currently for Sioma listings only.",
          "error"
        );

        return;
      }

      if (!sellerName) {

        showMessage(
          "sellMessage",
          "Please enter the seller name.",
          "error"
        );

        return;
      }

      if (!sellerPhone) {

        showMessage(
          "sellMessage",
          "Please enter a phone or WhatsApp number.",
          "error"
        );

        return;
      }

      if (
        !selectedProductImages.length
      ) {

        showMessage(
          "sellMessage",
          "Please add at least one product photo.",
          "error"
        );

        return;
      }


      /* ===============================
         DISABLE BUTTON
      =============================== */

      if (publishButton) {

        publishButton.disabled = true;

        publishButton.textContent =
          "Uploading photos...";

      }


      try {

        /* ===============================
           UPLOAD PHOTOS
        =============================== */

        const imageURLs =
          await uploadProductImages(
            selectedProductImages
          );

        if (
          !imageURLs ||
          !imageURLs.length
        ) {

          throw new Error(
            "Photo upload failed."
          );

        }


        if (publishButton) {
          publishButton.textContent =
            "Publishing...";
        }


        /* ===============================
           SAVE LISTING
           USE user_id
        =============================== */

        const listingData = {

          title: title,

          description: description || "",

          price: price,

          category: category,

          location: "Sioma",

          image_url:
            getImageStorageValue(
              imageURLs
            ),

          seller_name: sellerName,

          seller_phone: sellerPhone,

          status: "active",

          user_id: currentUser.id

        };


        const { data, error } =
          await supabaseClient
            .from("listings")
            .insert(listingData)
            .select()
            .single();


        if (error) {

          console.error(
            "Listing publish error:",
            error
          );

          throw error;
        }


        /* ===============================
           UPDATE SELLER PROFILE
        =============================== */

        try {

          await createSellerProfile(
            currentUser.id,
            sellerName,
            sellerPhone,
            "Sioma"
          );

        } catch (profileError) {

          console.warn(
            "Seller profile update warning:",
            profileError
          );

        }


        /* ===============================
           SUCCESS
        =============================== */

        showMessage(
          "sellMessage",
          "✅ Product published successfully!",
          "success"
        );


        sellForm.reset();

        selectedProductImages = [];

        renderImagePreviews();


        if (publishButton) {

          publishButton.disabled = false;

          publishButton.textContent =
            "Publish Product";

        }


        /* ===============================
           REFRESH MARKET
        =============================== */

        await loadLatestProducts();


        if (
          typeof loadSellerDashboard ===
          "function"
        ) {

          await loadSellerDashboard();

        }


        /* ===============================
           CLOSE SELL PAGE
        =============================== */

        setTimeout(
          function () {

            if (
              typeof closeSellPage ===
              "function"
            ) {

              closeSellPage();

            }

          },
          1200
        );


      } catch (error) {

        console.error(
          "Publish listing error:",
          error
        );

        showMessage(
          "sellMessage",
          "❌ Unable to publish product. Please try again.",
          "error"
        );


        if (publishButton) {

          publishButton.disabled = false;

          publishButton.textContent =
            "Publish Product";

        }

      }

    }
  );

}


/* =========================================================
   LOAD LATEST PRODUCTS
========================================================= */

async function loadLatestProducts() {

  const container =
    getElement("productsGrid");

  if (!container) return;

  try {

    const { data, error } =
      await supabaseClient
        .from("listings")
        .select("*")
        .eq("status", "active")
        .eq("location", "Sioma")
        .order("created_at", {
          ascending: false
        })
        .limit(30);

    if (error) {

      console.error(
        "Latest products error:",
        error
      );

      return;
    }

    renderProductCards(
      data || [],
      container
    );

  } catch (error) {

    console.error(
      "Latest products error:",
      error
    );

  }

}


/* =========================================================
   RENDER PRODUCT CARDS
========================================================= */

function renderProductCards(
  listings,
  container
) {

  if (!container) return;

  if (!listings.length) {

    container.innerHTML =
      `<div class="no-results">
         No products found in Sioma yet.
       </div>`;

    return;
  }


  container.innerHTML =
    listings.map(function (item) {

      const id =
        escapeAttribute(item.id);

      const images =
        getProductImages(item);

      const image =
        images[0] ||
        DEFAULT_IMAGE;

      const title =
        escapeHTML(
          item.title ||
          "Untitled product"
        );

      const category =
        escapeHTML(
          item.category ||
          "Other"
        );

      const seller =
        escapeHTML(
          item.seller_name ||
          "Sioma Seller"
        );

      const location =
        escapeHTML(
          item.location ||
          "Sioma"
        );

      const saved =
        isFavorite(item.id);

      return `
        <article class="result-card">

          <div class="product-image-wrap">

            <img
              src="${escapeAttribute(image)}"
              alt="${title}"
              loading="lazy"
              onerror="this.src='${escapeAttribute(DEFAULT_IMAGE)}'"
            >

            <button
              class="favorite-card favorite-heart ${saved ? "saved" : ""}"
              type="button"
              aria-label="Save ${title}"
              onclick="toggleFavorite('${id}')"
            >
              ${saved ? "❤️" : "♡"}
            </button>

            ${
              images.length > 1
                ? `<span class="photo-count-badge">
                     📸 ${images.length} photos
                   </span>`
                : ""
            }

          </div>

          <div class="result-info">

            <span class="category-badge">
              ${category}
            </span>

            <span class="sioma-badge">
              📍 SIOMA
            </span>

            <h3>
              ${title}
            </h3>

            <div class="result-price">
              ${formatPrice(item.price)}
            </div>

            <div class="result-location">
              📍 ${location}
            </div>

            <div class="result-seller">
              ${seller}
            </div>

            <button
              class="buy-result"
              type="button"
              onclick="openProductDetails('${id}')"
            >
              👀 VIEW PRODUCT
            </button>

          </div>

        </article>
      `;

    }).join("");

}


/* =========================================================
   SEARCH MARKET
========================================================= */

async function searchMarket() {

  const input =
    getElement("searchInput") ||
    getElement("marketSearch");

  const container =
    getElement("searchResultsGrid");

  const resultsSection =
    getElement("searchResults");

  if (!input || !container) return;

  const searchTerm =
    input.value.trim();

  if (!searchTerm) {

    if (resultsSection) {
      resultsSection.hidden = true;
    }

    await loadLatestProducts();

    return;
  }


  clearTimeout(searchTimer);

  try {

    const { data, error } =
      await supabaseClient
        .from("listings")
        .select("*")
        .eq("status", "active")
        .eq("location", "Sioma")
        .ilike(
          "title",
          `%${searchTerm}%`
        )
        .order("created_at", {
          ascending: false
        });


    if (error) {

      console.error(
        "Search error:",
        error
      );

      container.innerHTML =
        `<div class="no-results">
           Unable to search right now.
         </div>`;

      return;
    }


    if (resultsSection) {
      resultsSection.hidden = false;
    }

    renderProductCards(
      data || [],
      container
    );


  } catch (error) {

    console.error(
      "Search error:",
      error
    );

  }

}


/* =========================================================
   SEARCH BY CATEGORY
========================================================= */

async function searchCategory(
  category
) {

  const container =
    getElement("searchResultsGrid");

  const resultsSection =
    getElement("searchResults");

  if (!container) return;

  try {

    const { data, error } =
      await supabaseClient
        .from("listings")
        .select("*")
        .eq("status", "active")
        .eq("location", "Sioma")
        .eq("category", category)
        .order("created_at", {
          ascending: false
        });


    if (error) {

      console.error(
        "Category search error:",
        error
      );

      container.innerHTML =
        `<div class="no-results">
           Unable to load this category.
         </div>`;

      return;
    }


    if (resultsSection) {
      resultsSection.hidden = false;
    }

    renderProductCards(
      data || [],
      container
    );


    if (resultsSection) {

      resultsSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

    }


  } catch (error) {

    console.error(
      "Category search error:",
      error
    );

  }

}


/* =========================================================
   CATEGORY BUTTONS
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    document
      .querySelectorAll(
        "[data-category]"
      )
      .forEach(function (button) {

        button.addEventListener(
          "click",
          function () {

            const category =
              this.dataset.category;

            if (category) {

              searchCategory(
                category
              );

            }

          }
        );

      });

  }
);


/* =========================================================
   END PART 4
========================================================= */        
/* =========================================================
   SIOMAMARKET - SCRIPT.JS
   PART 5
   PRODUCT DETAILS + GALLERY + CONTACT + FAVORITES
========================================================= */


/* =========================================================
   FAVORITES STORAGE
========================================================= */

const FAVORITES_KEY = "siomaMarket_favorites";


function getFavorites() {
  try {
    const saved =
      localStorage.getItem(FAVORITES_KEY);

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed)
      ? parsed
      : [];

  } catch (error) {
    console.error(
      "Unable to load favorites:",
      error
    );

    return [];
  }
}


function saveFavorites(list) {
  try {
    localStorage.setItem(
      FAVORITES_KEY,
      JSON.stringify(list)
    );
  } catch (error) {
    console.error(
      "Unable to save favorites:",
      error
    );
  }
}


function isFavorite(id) {
  const favorites = getFavorites();

  return favorites.some(
    item => String(item) === String(id)
  );
}


/* =========================================================
   TOGGLE FAVORITE
========================================================= */

function toggleFavorite(id) {

  if (!id) {
    return;
  }

  let favorites = getFavorites();

  const exists = favorites.some(
    item => String(item) === String(id)
  );

  if (exists) {

    favorites =
      favorites.filter(
        item =>
          String(item) !== String(id)
      );

  } else {

    favorites.push(String(id));
  }

  saveFavorites(favorites);

  favoritesCache = favorites;

  updateFavoriteButtons();

  renderFavoritesPage();
}


/* =========================================================
   SAVE FAVORITE FROM PRODUCT PAGE
========================================================= */

function saveFavorite() {

  if (!currentListingId) {
    return;
  }

  toggleFavorite(currentListingId);
}


/* =========================================================
   UPDATE HEART BUTTONS
========================================================= */

function updateFavoriteButtons() {

  document
    .querySelectorAll(".favorite-heart")
    .forEach(button => {

      const id =
        button.dataset.id;

      if (!id) {
        return;
      }

      const active =
        isFavorite(id);

      button.textContent =
        active ? "♥" : "♡";

      button.classList.toggle(
        "active",
        active
      );

      button.setAttribute(
        "aria-label",
        active
          ? "Remove from favorites"
          : "Add to favorites"
      );
    });


  const favoriteButton =
    getElement("favoriteButton");

  if (favoriteButton &&
      currentListingId) {

    const active =
      isFavorite(currentListingId);

    favoriteButton.textContent =
      active
        ? "♥ Saved"
        : "♡ Favorite";

    favoriteButton.classList.toggle(
      "active",
      active
    );
  }
}


/* =========================================================
   LOAD PRODUCT DETAILS
========================================================= */

async function openProductDetails(id) {

  if (!id) {
    return;
  }

  currentListingId = id;

  const page =
    getElement("productPage");

  if (!page) {
    console.error(
      "productPage element not found."
    );

    return;
  }

  page.classList.add("active");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });


  const image =
    getElement("detailsImage");

  const thumbnails =
    getElement("detailsThumbnails");

  const category =
    getElement("detailsCategory");

  const title =
    getElement("detailsTitle");

  const price =
    getElement("detailsPrice");

  const location =
    getElement("detailsLocation");

  const description =
    getElement("detailsDescription");

  const seller =
    getElement("detailsSeller");

  const phone =
    getElement("detailsPhone");


  if (title) {
    title.innerText = "Loading...";
  }

  if (description) {
    description.innerText =
      "Loading product details...";
  }


  const {
    data,
    error
  } = await supabaseClient
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();


  if (error || !data) {

    console.error(
      "Product loading error:",
      error
    );

    if (title) {
      title.innerText =
        "Product not found";
    }

    if (description) {
      description.innerText =
        "This product is no longer available.";
    }

    return;
  }


  const images =
    getProductImages(data);


  /* =======================================================
     MAIN IMAGE
  ======================================================= */

  if (image) {

    image.src =
      images[0] || DEFAULT_IMAGE;

    image.alt =
      data.title || "Product image";

    image.dataset.index = "0";
  }


  /* =======================================================
     THUMBNAILS
  ======================================================= */

  if (thumbnails) {

    if (images.length === 0) {

      thumbnails.innerHTML = "";

    } else {

      thumbnails.innerHTML =
        images.map(
          (url, index) => `
            <button
              type="button"
              class="details-thumbnail ${
                index === 0 ? "active" : ""
              }"
              onclick="changeProductImage(
                ${index}
              )"
              aria-label="View product photo ${
                index + 1
              }"
            >
              <img
                src="${escapeAttribute(url)}"
                alt="Product photo ${
                  index + 1
                }"
              >
            </button>
          `
        ).join("");
    }
  }


  /* =======================================================
     PRODUCT INFORMATION
  ======================================================= */

  if (category) {
    category.innerText =
      data.category || "Other";
  }

  if (title) {
    title.innerText =
      data.title || "Untitled product";
  }

  if (price) {
    price.innerText =
      formatPrice(data.price);
  }

  if (location) {
    location.innerText =
      data.location || "Sioma";
  }

  if (description) {
    description.innerText =
      data.description ||
      "No description provided.";
  }

  if (seller) {
    seller.innerText =
      data.seller_name ||
      "Sioma Seller";
  }

  if (phone) {
    phone.innerText =
      data.seller_phone ||
      "Phone number unavailable";
  }


  /* =======================================================
     CONTACT BUTTONS
  ======================================================= */

  const whatsappButton =
    getElement("whatsappButton");

  const callButton =
    getElement("callButton");

  const messageButton =
    getElement("messageButton");


  const sellerPhone =
    data.seller_phone || "";


  if (whatsappButton) {

    if (sellerPhone) {

      whatsappButton.style.display =
        "inline-flex";

      whatsappButton.onclick =
        function () {
          openWhatsApp(
            sellerPhone,
            data.title
          );
        };

    } else {

      whatsappButton.style.display =
        "none";
    }
  }


  if (callButton) {

    if (sellerPhone) {

      callButton.style.display =
        "inline-flex";

      callButton.onclick =
        function () {
          callSeller(sellerPhone);
        };

    } else {

      callButton.style.display =
        "none";
    }
  }


  if (messageButton) {

    messageButton.onclick =
      function () {
        openMessageFromProduct(data);
      };
  }


  updateFavoriteButtons();
}


/* =========================================================
   CHANGE MAIN PRODUCT IMAGE
========================================================= */

function changeProductImage(index) {

  const image =
    getElement("detailsImage");

  const thumbnails =
    getElement("detailsThumbnails");

  if (!image || !thumbnails) {
    return;
  }


  const buttons =
    thumbnails.querySelectorAll(
      ".details-thumbnail"
    );


  if (
    index < 0 ||
    index >= buttons.length
  ) {
    return;
  }


  const selected =
    buttons[index].querySelector("img");

  if (!selected) {
    return;
  }


  image.src =
    selected.src;

  image.dataset.index =
    String(index);


  buttons.forEach(
    (button, buttonIndex) => {

      button.classList.toggle(
        "active",
        buttonIndex === index
      );
    }
  );
}


/* =========================================================
   CLOSE PRODUCT PAGE
========================================================= */

function closeProductPage() {

  const page =
    getElement("productPage");

  if (page) {
    page.classList.remove("active");
  }

  currentListingId = null;

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   WHATSAPP
========================================================= */

function openWhatsApp(
  phoneNumber,
  productTitle = ""
) {

  if (!phoneNumber) {
    return;
  }


  const digits =
    String(phoneNumber)
      .replace(/\D/g, "");


  if (!digits) {
    alert(
      "The seller's phone number is unavailable."
    );

    return;
  }


  const message =
    productTitle
      ? `Hello, I am interested in "${productTitle}" on SiomaMarket. Is it still available?`
      : "Hello, I am interested in your product on SiomaMarket. Is it still available?";


  const url =
    "https://wa.me/" +
    digits +
    "?text=" +
    encodeURIComponent(message);


  window.open(
    url,
    "_blank"
  );
}


/* =========================================================
   PHONE CALL
========================================================= */

function callSeller(phoneNumber) {

  if (!phoneNumber) {
    return;
  }


  window.location.href =
    "tel:" +
    String(phoneNumber).trim();
}


/* =========================================================
   OPEN MESSAGE FROM PRODUCT
========================================================= */

function openMessageFromProduct(data) {

  if (!data) {
    return;
  }


  if (!currentUser) {

    alert(
      "Please log in to message the seller."
    );

    openAuthModal();

    return;
  }


  /*
     Part 7 will connect this button
     to the full messaging system.
  */

  if (
    typeof startConversation ===
    "function"
  ) {

    startConversation(data);

  } else {

    alert(
      "Messaging is loading. Please try again."
    );
  }
}


/* =========================================================
   FAVORITES PAGE
========================================================= */

async function renderFavoritesPage() {

  const container =
    getElement("favoritesResults");

  if (!container) {
    return;
  }


  const favorites =
    getFavorites();


  favoritesCache =
    favorites;


  if (favorites.length === 0) {

    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">♡</div>
        <h3>No saved products yet</h3>
        <p>
          Products you save will appear here.
        </p>
      </div>
    `;

    return;
  }


  const {
    data,
    error
  } = await supabaseClient
    .from("listings")
    .select("*")
    .in("id", favorites)
    .eq("status", "active");


  if (error) {

    console.error(
      "Favorites loading error:",
      error
    );

    container.innerHTML = `
      <div class="empty-state">
        <h3>Unable to load favorites</h3>
        <p>Please try again.</p>
      </div>
    `;

    return;
  }


  if (!data || data.length === 0) {

    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">♡</div>
        <h3>No saved products available</h3>
        <p>
          Some saved products may have
          already been removed.
        </p>
      </div>
    `;

    return;
  }


  /*
     Keep the same order as the
     user's saved favorites.
  */

  const ordered =
    favorites
      .map(id =>
        data.find(
          item =>
            String(item.id) ===
            String(id)
        )
      )
      .filter(Boolean);


  renderProductCards(
    ordered,
    container
  );


  updateFavoriteButtons();
}


/* =========================================================
   OPEN FAVORITES PAGE
========================================================= */

function openFavorites() {

  const page =
    getElement("favoritesPage");

  if (!page) {
    return;
  }


  page.classList.add("active");

  renderFavoritesPage();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   CLOSE FAVORITES PAGE
========================================================= */

function closeFavorites() {

  const page =
    getElement("favoritesPage");

  if (page) {
    page.classList.remove("active");
  }


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   INITIALIZE FAVORITES
========================================================= */

favoritesCache =
  getFavorites();


document.addEventListener(
  "DOMContentLoaded",
  function () {

    updateFavoriteButtons();

  }
);
/* =========================================================
   SIOMAMARKET - SCRIPT.JS
   PART 6
   PAGE NAVIGATION + UI CONTROLS
========================================================= */


/* =========================================================
   HIDE ALL FULL-SCREEN PAGES
========================================================= */

function hideAllPages() {

  const pages = [
    "sellPage",
    "productPage",
    "favoritesPage",
    "messagesPage",
    "adminDashboard"
  ];

  pages.forEach(function (id) {

    const page = getElement(id);

    if (page) {
      page.classList.remove("active");
    }

  });
}


/* =========================================================
   SHOW HOME PAGE
========================================================= */

function showHome() {

  hideAllPages();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  loadLatestProducts();
}


/* =========================================================
   OPEN SELL PAGE
========================================================= */

function openSellPage() {

  sellNow();
}


/* =========================================================
   ACCOUNT BUTTON
========================================================= */

function accountButtonAction() {

  if (currentUser) {

    logoutSeller();

  } else {

    openAccount();
  }
}


/* =========================================================
   BOTTOM NAVIGATION
========================================================= */

function openFavoritesFromNav() {

  hideAllPages();

  openFavorites();
}


function openAccountFromNav() {

  if (currentUser) {

    openAccount();

  } else {

    openAuthModal();
  }
}


function openMessagesFromNav() {

  if (!currentUser) {

    alert(
      "Please log in to view your messages."
    );

    openAuthModal();

    return;
  }

  hideAllPages();

  const page =
    getElement("messagesPage");

  if (page) {

    page.classList.add("active");

    loadConversations();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }
}


/* =========================================================
   ADMIN PAGE
========================================================= */

async function openAdminDashboard() {

  if (!currentUser) {

    openAuthModal();

    return;
  }


  const admin =
    await isAdmin();


  if (!admin) {

    alert(
      "You do not have administrator access."
    );

    return;
  }


  hideAllPages();


  const page =
    getElement("adminDashboard");

  if (page) {

    page.classList.add("active");

    loadAdminDashboard();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }
}


/* =========================================================
   DASHBOARD PAGE
========================================================= */

async function openSellerDashboard() {

  if (!currentUser) {

    openAuthModal();

    return;
  }


  hideAllPages();


  const dashboard =
    getElement("sellerDashboard");


  if (dashboard) {

    dashboard.classList.add("active");

    await loadSellerDashboard();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }
}


/* =========================================================
   CLOSE GENERIC PAGE
========================================================= */

function closePage(id) {

  const page =
    getElement(id);

  if (page) {

    page.classList.remove("active");
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   SEARCH BOX CLEAR
========================================================= */

function clearSearch() {

  const input =
    getElement("marketSearch");

  if (input) {

    input.value = "";

    loadLatestProducts();
  }
}


/* =========================================================
   SEARCH WHEN ENTER IS PRESSED
========================================================= */

document.addEventListener(
  "keydown",
  function (event) {

    if (
      event.key !== "Enter"
    ) {
      return;
    }


    const target =
      event.target;


    if (
      target &&
      target.id === "marketSearch"
    ) {

      searchMarket();
    }

  }
);


/* =========================================================
   CATEGORY BUTTON HELPERS
========================================================= */

function openCategory(category) {

  if (!category) {
    return;
  }

  hideAllPages();

  searchCategory(category);
}


/* =========================================================
   REFRESH MARKET
========================================================= */

async function refreshMarket() {

  const container =
    getElement("homeProducts");

  if (container) {

    container.innerHTML = `
      <div class="loading-state">
        Loading latest products...
      </div>
    `;
  }


  await loadLatestProducts();
}


/* =========================================================
   SCROLL TO PRODUCTS
========================================================= */

function scrollToProducts() {

  const section =
    getElement("homeProducts");


  if (section) {

    section.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}


/* =========================================================
   SCROLL TO CATEGORIES
========================================================= */

function scrollToCategories() {

  const section =
    getElement("categories");


  if (section) {

    section.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}


/* =========================================================
   UPDATE FAVORITE COUNT
========================================================= */

function updateFavoriteCount() {

  const favorites =
    getFavorites();


  const count =
    favorites.length;


  document
    .querySelectorAll(
      ".favorite-count"
    )
    .forEach(function (element) {

      element.innerText =
        String(count);

      element.style.display =
        count > 0
          ? "inline-flex"
          : "none";

    });
}


/* =========================================================
   MOBILE MENU
========================================================= */

function toggleMobileMenu() {

  const menu =
    getElement("mobileMenu");


  if (!menu) {
    return;
  }


  menu.classList.toggle("active");
}


function closeMobileMenu() {

  const menu =
    getElement("mobileMenu");


  if (menu) {

    menu.classList.remove(
      "active"
    );
  }
}


/* =========================================================
   CLOSE MENU WHEN LINK IS CLICKED
========================================================= */

document.addEventListener(
  "click",
  function (event) {

    const link =
      event.target.closest(
        "#mobileMenu a"
      );


    if (link) {

      closeMobileMenu();
    }

  }
);


/* =========================================================
   ESC KEY
========================================================= */

document.addEventListener(
  "keydown",
  function (event) {

    if (
      event.key !== "Escape"
    ) {
      return;
    }


    closeMobileMenu();

    closeProductPage();

    closeFavorites();

    closeMessages();

    closeSellPage();

  }
);


/* =========================================================
   UPDATE UI AFTER FAVORITE CHANGES
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    favoritesCache =
      getFavorites();

    updateFavoriteButtons();

    updateFavoriteCount();

  }
);


/* =========================================================
   KEEP FAVORITE COUNT UPDATED
========================================================= */

const originalToggleFavorite =
  toggleFavorite;


toggleFavorite = function (id) {

  originalToggleFavorite(id);

  updateFavoriteCount();
};


/* =========================================================
   BASIC ONLINE / OFFLINE STATUS
========================================================= */

function updateConnectionStatus() {

  const indicator =
    getElement("connectionStatus");


  if (!indicator) {
    return;
  }


  if (navigator.onLine) {

    indicator.innerText =
      "Online";

    indicator.classList.remove(
      "offline"
    );

  } else {

    indicator.innerText =
      "Offline";

    indicator.classList.add(
      "offline"
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


document.addEventListener(
  "DOMContentLoaded",
  updateConnectionStatus
);


/* =========================================================
   IMAGE ERROR FALLBACK
========================================================= */

document.addEventListener(
  "error",
  function (event) {

    const element =
      event.target;


    if (
      element &&
      element.tagName === "IMG"
    ) {

      if (
        element.dataset.fallbackApplied
      ) {
        return;
      }


      element.dataset.fallbackApplied =
        "true";


      element.src =
        DEFAULT_IMAGE;
    }

  },
  true
);
/* =========================================================
   SIOMAMARKET - SCRIPT.JS
   PART 7
   MESSAGING SYSTEM
========================================================= */


/* =========================================================
   OPEN MESSAGES PAGE
========================================================= */

function openMessages() {

  if (!currentUser) {

    openAuthModal();

    return;
  }


  hideAllPages();


  const page =
    getElement("messagesPage");


  if (!page) {
    return;
  }


  page.classList.add("active");


  loadConversations();


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   START CONVERSATION
========================================================= */

async function startConversation(listing) {

  if (!currentUser) {

    openAuthModal();

    return;
  }


  if (!listing) {
    return;
  }


  const sellerId =
    listing.seller_id || null;


  /*
     Prevent a seller from messaging
     themselves when seller_id exists.
  */

  if (
    sellerId &&
    String(sellerId) ===
    String(currentUser.id)
  ) {

    alert(
      "You cannot message yourself."
    );

    return;
  }


  /*
     Open the messaging page first.
  */

  hideAllPages();


  const page =
    getElement("messagesPage");


  if (page) {
    page.classList.add("active");
  }


  currentConversationId = null;

  currentConversationListingId =
    listing.id;


  /*
     Look for an existing conversation.
  */

  let query =
    supabaseClient
      .from("conversations")
      .select("*")
      .eq("listing_id", listing.id);


  if (sellerId) {

    query = query
      .eq("seller_id", sellerId)
      .eq(
        "buyer_id",
        currentUser.id
      );

  } else {

    query = query
      .eq(
        "buyer_id",
        currentUser.id
      );
  }


  const {
    data: existing,
    error
  } = await query
    .limit(1);


  if (error) {

    console.error(
      "Conversation lookup error:",
      error
    );

    /*
       If the conversations table
       is not configured yet, show
       a useful message instead of
       breaking the whole website.
    */

    alert(
      "Messaging is not available yet. Please try again later."
    );

    return;
  }


  if (
    existing &&
    existing.length > 0
  ) {

    currentConversationId =
      existing[0].id;

  } else {

    /*
       Create a new conversation.
    */

    const conversationData = {
      listing_id: listing.id,
      buyer_id: currentUser.id,
      seller_id: sellerId,
      last_message: null
    };


    const {
      data: created,
      error: createError
    } = await supabaseClient
      .from("conversations")
      .insert(
        conversationData
      )
      .select()
      .single();


    if (createError) {

      console.error(
        "Conversation creation error:",
        createError
      );

      alert(
        "Unable to start the conversation."
      );

      return;
    }


    currentConversationId =
      created.id;
  }


  /*
     Display the chat.
  */

  await loadConversationMessages(
    currentConversationId,
    listing
  );


  loadConversations();
}


/* =========================================================
   LOAD CONVERSATIONS
========================================================= */

async function loadConversations() {

  const list =
    getElement("conversationList");


  if (!list || !currentUser) {
    return;
  }


  list.innerHTML = `
    <div class="loading-state">
      Loading conversations...
    </div>
  `;


  const {
    data,
    error
  } = await supabaseClient
    .from("conversations")
    .select("*")
    .or(
      "buyer_id.eq." +
      currentUser.id +
      ",seller_id.eq." +
      currentUser.id
    )
    .order(
      "updated_at",
      {
        ascending: false
      }
    );


  if (error) {

    console.error(
      "Conversation loading error:",
      error
    );


    list.innerHTML = `
      <div class="empty-state">
        <h3>Messages unavailable</h3>
        <p>
          We could not load your conversations.
        </p>
      </div>
    `;

    return;
  }


  if (!data || data.length === 0) {

    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">💬</div>
        <h3>No messages yet</h3>
        <p>
          When you contact a seller,
          your conversations will appear here.
        </p>
      </div>
    `;

    return;
  }


  list.innerHTML =
    data.map(
      conversation =>
        createConversationHTML(
          conversation
        )
    ).join("");


  updateUnreadBadges();
}


/* =========================================================
   CONVERSATION HTML
========================================================= */

function createConversationHTML(
  conversation
) {

  const id =
    conversation.id;


  const title =
    conversation.listing_title ||
    conversation.title ||
    "Marketplace conversation";


  const lastMessage =
    conversation.last_message ||
    "No messages yet";


  const unread =
    Number(
      conversation.unread_count || 0
    );


  return `
    <button
      type="button"
      class="conversation-item"
      onclick="openConversation('${escapeAttribute(id)}')"
    >

      <div class="conversation-avatar">
        💬
      </div>

      <div class="conversation-content">

        <div class="conversation-title">
          ${escapeHTML(title)}
        </div>

        <div class="conversation-preview">
          ${escapeHTML(lastMessage)}
        </div>

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


/* =========================================================
   OPEN EXISTING CONVERSATION
========================================================= */

async function openConversation(
  conversationId
) {

  if (!conversationId) {
    return;
  }


  currentConversationId =
    conversationId;


  const {
    data: conversation,
    error
  } = await supabaseClient
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .single();


  if (error || !conversation) {

    console.error(
      "Conversation error:",
      error
    );

    return;
  }


  currentConversationListingId =
    conversation.listing_id ||
    null;


  let listing = null;


  if (conversation.listing_id) {

    const result =
      await supabaseClient
        .from("listings")
        .select("*")
        .eq(
          "id",
          conversation.listing_id
        )
        .maybeSingle();


    listing =
      result.data || null;
  }


  await loadConversationMessages(
    conversationId,
    listing
  );


  markConversationRead(
    conversationId
  );
}


/* =========================================================
   LOAD CHAT MESSAGES
========================================================= */

async function loadConversationMessages(
  conversationId,
  listing = null
) {

  const messageList =
    getElement("messageList");


  if (!messageList) {
    return;
  }


  currentConversationId =
    conversationId;


  const header =
    getElement("chatHeader");


  if (header) {

    header.innerHTML = `
      <div class="chat-header-title">
        ${
          escapeHTML(
            listing?.title ||
            "SiomaMarket Chat"
          )
        }
      </div>

      <div class="chat-header-subtitle">
        ${
          escapeHTML(
            listing?.seller_name ||
            "Marketplace conversation"
          )
        }
      </div>
    `;
  }


  messageList.innerHTML = `
    <div class="loading-state">
      Loading messages...
    </div>
  `;


  const {
    data,
    error
  } = await supabaseClient
    .from("messages")
    .select("*")
    .eq(
      "conversation_id",
      conversationId
    )
    .order(
      "created_at",
      {
        ascending: true
      }
    );


  if (error) {

    console.error(
      "Messages loading error:",
      error
    );


    messageList.innerHTML = `
      <div class="empty-state">
        <p>
          Unable to load messages.
        </p>
      </div>
    `;

    return;
  }


  if (!data || data.length === 0) {

    messageList.innerHTML = `
      <div class="empty-chat">
        <p>
          No messages yet.
        </p>

        <p>
          Start the conversation below.
        </p>
      </div>
    `;

  } else {

    messageList.innerHTML =
      data.map(
        message =>
          createMessageHTML(message)
      ).join("");
  }


  scrollChatToBottom();


  startMessageRefresh();
}


/* =========================================================
   MESSAGE HTML
========================================================= */

function createMessageHTML(
  message
) {

  const isMine =
    String(message.sender_id) ===
    String(currentUser?.id);


  const text =
    message.message ||
    message.content ||
    "";


  const time =
    formatMessageTime(
      message.created_at
    );


  return `
    <div
      class="chat-message-row ${
        isMine
          ? "mine"
          : "theirs"
      }"
    >

      <div
        class="chat-message ${
          isMine
            ? "message-mine"
            : "message-theirs"
        }"
      >

        <div class="message-text">
          ${escapeHTML(text)}
        </div>

        <div class="message-time">
          ${escapeHTML(time)}
        </div>

      </div>

    </div>
  `;
}


/* =========================================================
   FORMAT MESSAGE TIME
========================================================= */

function formatMessageTime(
  value
) {

  if (!value) {
    return "";
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }


  return date.toLocaleTimeString(
    [],
    {
      hour: "numeric",
      minute: "2-digit"
    }
  );
}


/* =========================================================
   SEND MESSAGE
========================================================= */

async function sendMessage() {

  if (!currentUser) {

    openAuthModal();

    return;
  }


  if (!currentConversationId) {

    alert(
      "Please select a conversation first."
    );

    return;
  }


  const input =
    getElement("messageInput");


  if (!input) {
    return;
  }


  const text =
    input.value.trim();


  if (!text) {
    return;
  }


  const sendButton =
    document.querySelector(
      "[onclick*='sendMessage']"
    );


  if (sendButton) {
    sendButton.disabled = true;
  }


  const {
    data,
    error
  } = await supabaseClient
    .from("messages")
    .insert({
      conversation_id:
        currentConversationId,

      sender_id:
        currentUser.id,

      message:
        text
    })
    .select()
    .single();


  if (error) {

    console.error(
      "Send message error:",
      error
    );


    alert(
      "Unable to send your message."
    );


    if (sendButton) {
      sendButton.disabled = false;
    }

    return;
  }


  input.value = "";


  /*
     Update conversation preview.
  */

  await supabaseClient
    .from("conversations")
    .update({
      last_message: text,
      updated_at:
        new Date().toISOString()
    })
    .eq(
      "id",
      currentConversationId
    );


  await loadConversationMessages(
    currentConversationId
  );


  loadConversations();


  if (sendButton) {
    sendButton.disabled = false;
  }
}


/* =========================================================
   ENTER TO SEND
========================================================= */

document.addEventListener(
  "keydown",
  function (event) {

    const input =
      event.target;


    if (
      input &&
      input.id === "messageInput" &&
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      sendMessage();
    }

  }
);


/* =========================================================
   SCROLL CHAT TO BOTTOM
========================================================= */

function scrollChatToBottom() {

  const messageList =
    getElement("messageList");


  if (!messageList) {
    return;
  }


  messageList.scrollTop =
    messageList.scrollHeight;
}


/* =========================================================
   MARK CONVERSATION AS READ
========================================================= */

function markConversationRead(
  conversationId
) {

  if (!conversationId) {
    return;
  }


  try {

    messageReadState =
      JSON.parse(
        localStorage.getItem(
          MESSAGE_READ_KEY
        ) || "{}"
      );

  } catch (error) {

    messageReadState = {};
  }


  messageReadState[
    String(conversationId)
  ] = Date.now();


  localStorage.setItem(
    MESSAGE_READ_KEY,
    JSON.stringify(
      messageReadState
    )
  );


  updateUnreadBadges();
}


/* =========================================================
   UPDATE UNREAD BADGES
========================================================= */

function updateUnreadBadges() {

  const badges =
    document.querySelectorAll(
      ".unread-badge"
    );


  if (!badges.length) {
    return;
  }
}


/* =========================================================
   MESSAGE REFRESH
========================================================= */

function startMessageRefresh() {

  stopMessageRefresh();


  messageRefreshTimer =
    setInterval(
      async function () {

        if (
          !currentConversationId ||
          !currentUser
        ) {
          return;
        }


        await loadConversationMessages(
          currentConversationId
        );

      },
      10000
    );
}


function stopMessageRefresh() {

  if (
    messageRefreshTimer
  ) {

    clearInterval(
      messageRefreshTimer
    );

    messageRefreshTimer = null;
  }
}


/* =========================================================
   CLOSE MESSAGES
========================================================= */

function closeMessages() {

  stopMessageRefresh();


  const page =
    getElement("messagesPage");


  if (page) {

    page.classList.remove(
      "active"
    );
  }


  currentConversationId =
    null;

  currentConversationListingId =
    null;


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   MESSAGE PAGE CLEANUP
========================================================= */

window.addEventListener(
  "beforeunload",
  function () {

    stopMessageRefresh();

  }
);
/* =========================================================
   SIOMAMARKET - SCRIPT.JS
   PART 8
   SELLER DASHBOARD + EDIT + DELETE
========================================================= */


/* =========================================================
   LOAD SELLER DASHBOARD
========================================================= */

async function loadSellerDashboard() {

  if (!currentUser) {
    alert("Please login first.");
    return;
  }

  const dashboard = document.getElementById(
    "sellerDashboard"
  );

  if (dashboard) {
    dashboard.style.display = "block";
  }

  const { data, error } = await supabaseClient
    .from("listings")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", {
      ascending: false
    });

  if (error) {

    console.error(
      "Seller dashboard error:",
      error
    );

    alert(
      "Unable to load your listings."
    );

    return;
  }

  sellerListingsCache = data || [];

  renderSellerListings(
    sellerListingsCache
  );

  updateSellerDashboardStats(
    sellerListingsCache
  );
}


/* =========================================================
   SELLER DASHBOARD STATISTICS
========================================================= */

function updateSellerDashboardStats(
  listings
) {

  const total =
    listings.length;

  const active =
    listings.filter(
      item =>
        String(item.status || "")
          .toLowerCase() === "active"
    ).length;

  const totalValue =
    listings.reduce(
      (sum, item) =>
        sum + Number(item.price || 0),
      0
    );


  const totalElement =
    document.getElementById(
      "sellerTotalListings"
    );

  const activeElement =
    document.getElementById(
      "sellerActiveListings"
    );

  const valueElement =
    document.getElementById(
      "sellerValue"
    );


  if (totalElement) {
    totalElement.innerText =
      total;
  }

  if (activeElement) {
    activeElement.innerText =
      active;
  }

  if (valueElement) {

    valueElement.innerText =
      formatPrice(totalValue);
  }
}


/* =========================================================
   RENDER SELLER LISTINGS
========================================================= */

function renderSellerListings(
  listings
) {

  const container =
    document.getElementById(
      "sellerListings"
    );

  if (!container) {
    return;
  }


  if (!listings.length) {

    container.innerHTML = `
      <div class="empty-state">
        <h3>No listings yet</h3>
        <p>
          Products you publish will appear here.
        </p>

        <button
          type="button"
          onclick="openSellPage()"
          class="gold"
        >
          Sell Something
        </button>
      </div>
    `;

    return;
  }


  container.innerHTML =
    listings
      .map(createSellerListingHTML)
      .join("");
}


/* =========================================================
   SELLER LISTING CARD
========================================================= */

function createSellerListingHTML(
  item
) {

  const image =
    escapeAttribute(
      getPrimaryImage(item)
    );

  const title =
    escapeHTML(
      item.title || "Untitled"
    );

  const category =
    escapeHTML(
      item.category || "Other"
    );

  const location =
    escapeHTML(
      item.location || "Sioma"
    );

  const status =
    String(
      item.status || "active"
    ).toLowerCase();

  const statusLabel =
    escapeHTML(status);


  return `
    <div
      class="seller-listing-card"
      data-listing-id="${escapeAttribute(item.id)}"
    >

      <div class="seller-listing-image">

        <img
          src="${image}"
          alt="${title}"
          loading="lazy"
          onerror="this.src='${escapeAttribute(DEFAULT_IMAGE)}'"
        >

      </div>


      <div class="seller-listing-info">

        <div class="seller-listing-top">

          <span class="category-badge">
            ${category}
          </span>

          <span class="status-badge status-${escapeAttribute(status)}">
            ${statusLabel}
          </span>

        </div>


        <h3>
          ${title}
        </h3>


        <strong>
          ${formatPrice(item.price)}
        </strong>


        <p>
          📍 ${location}
        </p>


        <div class="seller-listing-actions">

          <button
            type="button"
            onclick="openProductDetails('${escapeAttribute(item.id)}')"
          >
            View
          </button>

          <button
            type="button"
            onclick="openEditListing('${escapeAttribute(item.id)}')"
          >
            Edit
          </button>

          <button
            type="button"
            onclick="deleteListing('${escapeAttribute(item.id)}')"
            class="danger"
          >
            Delete
          </button>

        </div>

      </div>

    </div>
  `;
}


/* =========================================================
   OPEN EDIT LISTING
========================================================= */

async function openEditListing(
  listingId
) {

  if (!currentUser) {
    alert("Please login first.");
    return;
  }


  const { data, error } =
    await supabaseClient
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .eq("user_id", currentUser.id)
      .single();


  if (error || !data) {

    console.error(
      "Edit listing error:",
      error
    );

    alert(
      "Listing not found or you do not have permission to edit it."
    );

    return;
  }


  const titleInput =
    document.getElementById(
      "editTitle"
    );

  const descriptionInput =
    document.getElementById(
      "editDescription"
    );

  const priceInput =
    document.getElementById(
      "editPrice"
    );

  const categoryInput =
    document.getElementById(
      "editCategory"
    );


  if (titleInput) {
    titleInput.value =
      data.title || "";
  }

  if (descriptionInput) {
    descriptionInput.value =
      data.description || "";
  }

  if (priceInput) {
    priceInput.value =
      data.price || "";
  }

  if (categoryInput) {
    categoryInput.value =
      data.category || "";
  }


  currentListingId =
    listingId;


  const modal =
    document.getElementById(
      "editListingModal"
    );

  if (modal) {

    modal.style.display =
      "flex";

    modal.classList.add(
      "active"
    );
  }
}


/* =========================================================
   CLOSE EDIT MODAL
========================================================= */

function closeEditModal() {

  const modal =
    document.getElementById(
      "editListingModal"
    );

  if (modal) {

    modal.style.display =
      "none";

    modal.classList.remove(
      "active"
    );
  }

  currentListingId =
    null;
}


/* =========================================================
   SAVE EDITED LISTING
========================================================= */

async function saveEditedListing() {

  if (!currentUser) {
    alert("Please login first.");
    return;
  }

  if (!currentListingId) {
    alert("No listing selected.");
    return;
  }


  const titleInput =
    document.getElementById(
      "editTitle"
    );

  const descriptionInput =
    document.getElementById(
      "editDescription"
    );

  const priceInput =
    document.getElementById(
      "editPrice"
    );

  const categoryInput =
    document.getElementById(
      "editCategory"
    );


  const title =
    titleInput
      ? titleInput.value.trim()
      : "";

  const description =
    descriptionInput
      ? descriptionInput.value.trim()
      : "";

  const price =
    priceInput
      ? Number(priceInput.value)
      : NaN;

  const category =
    categoryInput
      ? categoryInput.value.trim()
      : "";


  if (!title) {
    alert("Please enter a product title.");
    return;
  }


  if (
    Number.isNaN(price) ||
    price < 0
  ) {

    alert(
      "Please enter a valid price."
    );

    return;
  }


  if (!category) {
    alert("Please select a category.");
    return;
  }


  const { error } =
    await supabaseClient
      .from("listings")
      .update({

        title:
          title,

        description:
          description,

        price:
          price,

        category:
          category

      })
      .eq(
        "id",
        currentListingId
      )
      .eq(
        "user_id",
        currentUser.id
      );


  if (error) {

    console.error(
      "Save listing error:",
      error
    );

    alert(
      "Unable to save changes."
    );

    return;
  }


  alert(
    "Listing updated successfully."
  );


  closeEditModal();


  await loadSellerDashboard();

  await loadLatestProducts();
}


/* =========================================================
   DELETE LISTING
========================================================= */

async function deleteListing(
  listingId
) {

  if (!currentUser) {
    alert("Please login first.");
    return;
  }


  const confirmed =
    confirm(
      "Are you sure you want to delete this listing?"
    );


  if (!confirmed) {
    return;
  }


  const { error } =
    await supabaseClient
      .from("listings")
      .delete()
      .eq(
        "id",
        listingId
      )
      .eq(
        "user_id",
        currentUser.id
      );


  if (error) {

    console.error(
      "Delete listing error:",
      error
    );

    alert(
      "Unable to delete listing."
    );

    return;
  }


  sellerListingsCache =
    sellerListingsCache.filter(
      item =>
        String(item.id) !==
        String(listingId)
    );


  renderSellerListings(
    sellerListingsCache
  );

  updateSellerDashboardStats(
    sellerListingsCache
  );


  await loadLatestProducts();


  alert(
    "Listing deleted successfully."
  );
}


/* =========================================================
   REFRESH SELLER DASHBOARD
========================================================= */

async function refreshSellerDashboard() {

  await loadSellerDashboard();
}


/* =========================================================
   CLOSE SELLER DASHBOARD
========================================================= */

function closeSellerDashboard() {

  const dashboard =
    document.getElementById(
      "sellerDashboard"
    );

  if (dashboard) {

    dashboard.style.display =
      "none";
  }
}
/* =========================================================
   SIOMAMARKET - SCRIPT.JS
   PART 9
   ADMIN DASHBOARD + LISTING MANAGEMENT
========================================================= */


/* =========================================================
   LOAD ADMIN DASHBOARD
========================================================= */

async function loadAdminDashboard() {

  if (!(await isAdmin())) {
    alert("Admin access required.");
    return;
  }

  const totalEl =
    getElement("adminTotalListings");

  const activeEl =
    getElement("adminActiveListings");

  const sellerEl =
    getElement("adminSellerCount");

  const valueEl =
    getElement("adminMarketValue");

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
        "Admin dashboard error:",
        error
      );

      alert(
        "Unable to load admin dashboard."
      );

      return;
    }

    adminListingsCache = data || [];

    const total =
      adminListingsCache.length;

    const activeListings =
      adminListingsCache.filter(
        item =>
          String(item.status || "")
            .toLowerCase() === "active"
      );

    const marketValue =
      activeListings.reduce(
        (sum, item) =>
          sum + (Number(item.price) || 0),
        0
      );

    const sellers = new Set();

    adminListingsCache.forEach(item => {

      if (item.seller_id) {

        sellers.add(
          String(item.seller_id)
        );

      } else if (item.seller_phone) {

        sellers.add(
          String(item.seller_phone)
        );

      } else if (item.seller_name) {

        sellers.add(
          String(item.seller_name)
        );

      }

    });

    if (totalEl) {
      totalEl.textContent =
        total.toLocaleString("en-ZM");
    }

    if (activeEl) {
      activeEl.textContent =
        activeListings.length
          .toLocaleString("en-ZM");
    }

    if (sellerEl) {
      sellerEl.textContent =
        sellers.size
          .toLocaleString("en-ZM");
    }

    if (valueEl) {
      valueEl.textContent =
        formatPrice(marketValue);
    }

    await loadAdminListings("all");

  } catch (error) {

    console.error(
      "Admin dashboard error:",
      error
    );

    alert(
      "Something went wrong loading admin data."
    );
  }
}


/* =========================================================
   LOAD ADMIN LISTINGS
========================================================= */

async function loadAdminListings(
  statusFilter = "all"
) {

  if (!(await isAdmin())) {
    alert("Admin access required.");
    return;
  }

  const container =
    getElement("adminListingsBody");

  if (!container) return;

  container.innerHTML =
    `<tr>
       <td colspan="7">
         Loading listings...
       </td>
     </tr>`;

  try {

    let query =
      supabaseClient
        .from("listings")
        .select("*")
        .order("created_at", {
          ascending: false
        });

    if (
      statusFilter &&
      statusFilter !== "all"
    ) {
      query =
        query.eq(
          "status",
          statusFilter
        );
    }

    const { data, error } =
      await query;

    if (error) {
      console.error(
        "Admin listings error:",
        error
      );

      container.innerHTML =
        `<tr>
           <td colspan="7">
             Unable to load listings.
           </td>
         </tr>`;

      return;
    }

    adminListingsCache = data || [];

    renderAdminListings(
      adminListingsCache,
      container
    );

  } catch (error) {

    console.error(
      "Admin listings error:",
      error
    );

    container.innerHTML =
      `<tr>
         <td colspan="7">
           Error loading listings.
         </td>
       </tr>`;
  }
}


/* =========================================================
   RENDER ADMIN LISTINGS
========================================================= */

function renderAdminListings(
  listings,
  container
) {

  if (!listings.length) {

    container.innerHTML =
      `<tr>
         <td colspan="7">
           No listings found.
         </td>
       </tr>`;

    return;
  }

  container.innerHTML =
    listings.map(item => {

      const images =
        getProductImages(item);

      const image =
        images[0] ||
        DEFAULT_IMAGE;

      const title =
        escapeHTML(
          item.title || "Untitled"
        );

      const seller =
        escapeHTML(
          item.seller_name ||
          "Unknown seller"
        );

      const location =
        escapeHTML(
          item.location || "Sioma"
        );

      const status =
        String(
          item.status || "active"
        ).toLowerCase();

      const id =
        escapeAttribute(item.id);

      return `
        <tr>

          <td>
            <img
              src="${escapeAttribute(image)}"
              alt="${title}"
              class="admin-listing-image"
              onerror="this.src='${escapeAttribute(DEFAULT_IMAGE)}'"
            >
          </td>

          <td>
            <strong>${title}</strong>
          </td>

          <td>
            ${formatPrice(item.price)}
          </td>

          <td>
            ${seller}
          </td>

          <td>
            ${location}
          </td>

          <td>

            <select
              onchange="updateListingStatus('${id}', this.value)"
            >

              <option
                value="active"
                ${status === "active" ? "selected" : ""}
              >
                Active
              </option>

              <option
                value="sold"
                ${status === "sold" ? "selected" : ""}
              >
                Sold
              </option>

              <option
                value="hidden"
                ${status === "hidden" ? "selected" : ""}
              >
                Hidden
              </option>

            </select>

          </td>

          <td>

            <button
              type="button"
              onclick="openProductDetails('${id}')"
            >
              View
            </button>

            <button
              type="button"
              onclick="deleteAdminListing('${id}')"
            >
              Delete
            </button>

          </td>

        </tr>
      `;

    }).join("");
}


/* =========================================================
   UPDATE LISTING STATUS
========================================================= */

async function updateListingStatus(
  listingId,
  newStatus
) {

  if (!(await isAdmin())) {
    alert("Admin access required.");
    return;
  }

  const allowedStatuses = [
    "active",
    "sold",
    "hidden"
  ];

  if (
    !allowedStatuses.includes(
      String(newStatus).toLowerCase()
    )
  ) {
    alert("Invalid listing status.");
    return;
  }

  try {

    const { error } =
      await supabaseClient
        .from("listings")
        .update({
          status:
            String(newStatus).toLowerCase()
        })
        .eq("id", listingId);

    if (error) {

      console.error(
        "Status update error:",
        error
      );

      alert(
        "Unable to update listing status."
      );

      return;
    }

    await loadAdminDashboard();

  } catch (error) {

    console.error(
      "Status update error:",
      error
    );

    alert(
      "Something went wrong updating the listing."
    );
  }
}


/* =========================================================
   SHOW ALL ADMIN LISTINGS
========================================================= */

async function showAllAdminListings() {

  await loadAdminListings("all");

}


/* =========================================================
   SHOW ACTIVE ADMIN LISTINGS
========================================================= */

async function showActiveAdminListings() {

  await loadAdminListings("active");

}


/* =========================================================
   DELETE LISTING FROM ADMIN
========================================================= */

async function deleteAdminListing(
  listingId
) {

  if (!(await isAdmin())) {
    alert("Admin access required.");
    return;
  }

  const confirmed =
    confirm(
      "Delete this listing permanently?"
    );

  if (!confirmed) return;

  try {

    const { error } =
      await supabaseClient
        .from("listings")
        .delete()
        .eq("id", listingId);

    if (error) {

      console.error(
        "Admin delete error:",
        error
      );

      alert(
        "Unable to delete listing."
      );

      return;
    }

    favoritesCache =
      getFavorites()
        .filter(
          id =>
            String(id) !==
            String(listingId)
        );

    saveFavorites(
      favoritesCache
    );

    await loadAdminDashboard();

    await loadLatestProducts();

    await renderFavoritesPage();

  } catch (error) {

    console.error(
      "Admin delete error:",
      error
    );

    alert(
      "Something went wrong deleting the listing."
    );
  }
}


/* =========================================================
   ADMIN BUTTON EVENTS
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    const loadButton =
      getElement("loadAdminListings");

    const allButton =
      getElement("showAllAdminListings");

    const activeButton =
      getElement("showActiveAdminListings");

    if (loadButton) {

      loadButton.addEventListener(
        "click",
        function () {

          loadAdminListings("all");

        }
      );

    }

    if (allButton) {

      allButton.addEventListener(
        "click",
        function () {

          showAllAdminListings();

        }
      );

    }

    if (activeButton) {

      activeButton.addEventListener(
        "click",
        function () {

          showActiveAdminListings();

        }
      );

    }

  }
);


/* =========================================================
   END PART 9
========================================================= */
/* =========================================================
   SIOMAMARKET - SCRIPT.JS
   PART 10
   FINAL INITIALIZATION + SAFETY CHECKS
========================================================= */


/* =========================================================
   SAFE PAGE INITIALIZATION
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async function () {

    console.log(
      "SiomaMarket JavaScript loaded."
    );

    try {

      await loadAuthSession();

    } catch (error) {

      console.error(
        "Session initialization error:",
        error
      );

    }

    try {

      await loadLatestProducts();

    } catch (error) {

      console.error(
        "Product initialization error:",
        error
      );

    }

    try {

      updateFavoriteButtons();
      updateFavoriteCount();

    } catch (error) {

      console.error(
        "Favorite initialization error:",
        error
      );

    }

    try {

      loadSellerProfile();

    } catch (error) {

      console.error(
        "Seller profile initialization error:",
        error
      );

    }

  }
);


/* =========================================================
   SEARCH INPUT SAFETY
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    const searchInput =
      getElement("marketSearch");

    if (!searchInput) return;

    searchInput.addEventListener(
      "input",
      function () {

        clearTimeout(searchTimer);

        searchTimer =
          setTimeout(
            function () {

              searchMarket();

            },
            250
          );

      }
    );

  }
);


/* =========================================================
   ONLINE / OFFLINE MESSAGE
========================================================= */

window.addEventListener(
  "online",
  function () {

    console.log(
      "SiomaMarket: Internet connection restored."
    );

  }
);

window.addEventListener(
  "offline",
  function () {

    console.log(
      "SiomaMarket: Internet connection lost."
    );

  }
);


/* =========================================================
   PREVENT BROKEN IMAGE DISPLAY
========================================================= */

document.addEventListener(
  "error",
  function (event) {

    const element =
      event.target;

    if (
      element &&
      element.tagName === "IMG"
    ) {

      if (
        !element.dataset.fallbackApplied
      ) {

        element.dataset.fallbackApplied =
          "true";

        element.src =
          DEFAULT_IMAGE;
      }

    }

  },
  true
);


/* =========================================================
   CLEANUP MESSAGE REFRESH
========================================================= */

window.addEventListener(
  "beforeunload",
  function () {

    if (
      typeof stopMessageRefresh ===
      "function"
    ) {

      stopMessageRefresh();

    }

  }
);


/* =========================================================
   SUPABASE CONNECTION CHECK
========================================================= */

async function checkSupabaseConnection() {

  try {

    const { error } =
      await supabaseClient
        .from("listings")
        .select("id")
        .eq("location", "Sioma")
        .limit(1);

    if (error) {

      console.error(
        "Supabase connection check failed:",
        error
      );

      return false;
    }

    console.log(
      "Supabase connection successful."
    );

    return true;

  } catch (error) {

    console.error(
      "Supabase connection error:",
      error
    );

    return false;
  }

}


/* =========================================================
   GLOBAL ERROR REPORTING
========================================================= */

window.addEventListener(
  "error",
  function (event) {

    console.error(
      "SiomaMarket error:",
      event.error ||
      event.message
    );

  }
);

window.addEventListener(
  "unhandledrejection",
  function (event) {

    console.error(
      "SiomaMarket promise error:",
      event.reason
    );

  }
);


/* =========================================================
   FINAL STARTUP
========================================================= */

console.log(
  "SiomaMarket V2.3 JavaScript ready."
);


/* =========================================================
   END PART 10
========================================================= */
