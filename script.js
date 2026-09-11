/* =========================================================
   SIOMA MARKET — SCRIPT.JS
   Clean Corrected Baseline
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


/* =========================================================
   PAGE LOAD
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

  loadLatestProducts();

  setupSellForm();

});


/* =========================================================
   LOAD LATEST PRODUCTS
   ========================================================= */

async function loadLatestProducts() {

  const container =
    document.getElementById("homeProducts");

  if (!container) return;

  try {

    const { data, error } =
      await supabaseClient
        .from("listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", {
          ascending: false
        })
        .limit(8);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {

      container.innerHTML =
        `<p class="empty-message">
          No products available right now.
        </p>`;

      return;
    }

    renderGrid(container, data);

  } catch (error) {

    console.error(
      "LOAD PRODUCTS ERROR:",
      error
    );

    container.innerHTML =
      `<p class="error-message">
        Unable to load products.
      </p>`;
  }
}


/* =========================================================
   HOME PRODUCT GRID
   ========================================================= */

function renderGrid(container, products) {

  let html = "";

  products.forEach(function (product) {

    const id =
      encodeURIComponent(
        String(product.id ?? "")
      );

    const image =
      product.image_url ||
      "https://via.placeholder.com/600x400?text=SiomaMarket";

    const title =
      product.title || "Product";

    const location =
      product.location || "Sioma";

    const price =
      Number(product.price || 0);

    html += `

      <div
        class="product-card"
        onclick="viewListing('${id}')"
      >

        <div class="product-image-wrap">

          <img
            src="${escapeHTML(image)}"
            alt="${escapeHTML(title)}"
            loading="lazy"
            onerror="this.src='https://via.placeholder.com/600x400?text=SiomaMarket'"
          >

        </div>

        <div class="product-card-info">

          <h3>
            ${escapeHTML(title)}
          </h3>

          <p class="product-price">
            K${price.toLocaleString()}
          </p>

          <p class="product-location">
            📍 ${escapeHTML(location)}
          </p>

        </div>

      </div>

    `;
  });

  container.innerHTML = html;
}


/* =========================================================
   SEARCH
   ========================================================= */

async function searchMarket() {

  const input =
    document.getElementById("searchInput");

  const section =
    document.getElementById(
      "searchResultsSection"
    );

  const results =
    document.getElementById(
      "searchResults"
    );

  if (!input || !results) return;

  const search =
    input.value.trim();

  if (!search) {

    if (section) {
      section.style.display = "none";
    }

    return;
  }

  if (section) {
    section.style.display = "block";
  }

  results.innerHTML =
    `<p>🔎 Searching...</p>`;

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
      throw error;
    }

    if (!data || data.length === 0) {

      results.innerHTML =
        `<p>🔍 No products found for "${escapeHTML(search)}".</p>`;

      return;
    }

    displayProducts(
      data,
      `Search: "${search}"`
    );

    if (section) {
      section.scrollIntoView({
        behavior: "smooth"
      });
    }

  } catch (error) {

    console.error(
      "SEARCH ERROR:",
      error
    );

    results.innerHTML =
      `<p>❌ Search failed. Please try again.</p>`;
  }
}


/* =========================================================
   CATEGORY SEARCH
   ========================================================= */

async function searchCategory(category) {

  const section =
    document.getElementById(
      "searchResultsSection"
    );

  const results =
    document.getElementById(
      "searchResults"
    );

  if (!results) return;

  if (section) {
    section.style.display = "block";
  }

  results.innerHTML =
    `<p>🔎 Loading category...</p>`;

  try {

    const { data, error } =
      await supabaseClient
        .from("listings")
        .select("*")
        .eq("status", "active")
        .eq("category", category)
        .order("created_at", {
          ascending: false
        });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {

      results.innerHTML =
        `<p>
          🔍 No products in
          ${escapeHTML(category)}.
        </p>`;

      return;
    }

    displayProducts(
      data,
      `Category: ${category}`
    );

    if (section) {
      section.scrollIntoView({
        behavior: "smooth"
      });
    }

  } catch (error) {

    console.error(
      "CATEGORY ERROR:",
      error
    );

    results.innerHTML =
      `<p>
        ❌ Failed to load category.
      </p>`;
  }
}


/* =========================================================
   BUY NOW / ALL PRODUCTS
   ========================================================= */

async function buyNow() {

  const section =
    document.getElementById(
      "searchResultsSection"
    );

  const results =
    document.getElementById(
      "searchResults"
    );

  if (!results) return;

  if (section) {
    section.style.display = "block";
  }

  results.innerHTML =
    `<p>🔎 Loading products...</p>`;

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
      throw error;
    }

    if (!data || data.length === 0) {

      results.innerHTML =
        `<p>
          No products available right now.
        </p>`;

      return;
    }

    displayProducts(
      data,
      "🛒 All Products"
    );

    if (section) {
      section.scrollIntoView({
        behavior: "smooth"
      });
    }

  } catch (error) {

    console.error(
      "BUY NOW ERROR:",
      error
    );

    results.innerHTML =
      `<p>
        ❌ Unable to load products.
      </p>`;
  }
}


/* =========================================================
   DISPLAY SEARCH / CATEGORY PRODUCTS
   ========================================================= */

function displayProducts(
  products,
  heading
) {

  const results =
    document.getElementById(
      "searchResults"
    );

  if (!results) return;

  if (!products || products.length === 0) {

    results.innerHTML =
      `<p>No products found.</p>`;

    return;
  }

  let html = `

    <h2>
      ${escapeHTML(heading)}
    </h2>

    <div class="products-grid">

  `;

  products.forEach(function (product) {

    const id =
      encodeURIComponent(
        String(product.id ?? "")
      );

    const image =
      product.image_url ||
      "https://via.placeholder.com/600x400?text=SiomaMarket";

    const title =
      product.title || "Product";

    const price =
      Number(product.price || 0);

    const location =
      product.location || "Sioma";

    html += `

      <div
        class="product-card"
        onclick="viewListing('${id}')"
      >

        <div class="product-image-wrap">

          <img
            src="${escapeHTML(image)}"
            alt="${escapeHTML(title)}"
            loading="lazy"
            onerror="this.src='https://via.placeholder.com/600x400?text=SiomaMarket'"
          >

        </div>

        <div class="product-card-info">

          <h3>
            ${escapeHTML(title)}
          </h3>

          <p class="product-price">
            K${price.toLocaleString()}
          </p>

          <p class="product-location">
            📍 ${escapeHTML(location)}
          </p>

        </div>

      </div>

    `;
  });

  html += `
    </div>
  `;

  results.innerHTML = html;
}


/* =========================================================
   VIEW PRODUCT
   ========================================================= */

async function viewListing(encodedId) {

  const productPage =
    document.getElementById(
      "productPage"
    );

  if (!productPage) return;

  const id =
    decodeURIComponent(
      encodedId
    );

  productPage.style.display = "block";

  document.body.style.overflow =
    "hidden";

  try {

    const { data, error } =
      await supabaseClient
        .from("listings")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error(
        "Product not found"
      );
    }

    const image =
      document.getElementById(
        "detailsImage"
      );

    const title =
      document.getElementById(
        "detailsTitle"
      );

    const price =
      document.getElementById(
        "detailsPrice"
      );

    const category =
      document.getElementById(
        "detailsCategory"
      );

    const location =
      document.getElementById(
        "detailsLocation"
      );

    const description =
      document.getElementById(
        "detailsDescription"
      );

    const seller =
      document.getElementById(
        "detailsSeller"
      );

    const phone =
      document.getElementById(
        "detailsPhone"
      );


    if (image) {

      image.src =
        data.image_url ||
        "https://via.placeholder.com/800x500?text=SiomaMarket";

      image.onerror =
        function () {

          this.src =
            "https://via.placeholder.com/800x500?text=SiomaMarket";

        };
    }


    if (title) {

      title.textContent =
        data.title ||
        "Product";
    }


    if (price) {

      price.textContent =
        "K" +
        Number(
          data.price || 0
        ).toLocaleString();
    }


    if (category) {

      category.textContent =
        data.category ||
        "General";
    }


    if (location) {

      location.textContent =
        "📍 " +
        (data.location ||
          "Sioma");
    }


    if (description) {

      description.textContent =
        data.description ||
        "No description provided.";
    }


    if (seller) {

      seller.textContent =
        data.seller_name ||
        "Sioma Seller";
    }


    if (phone) {

      phone.textContent =
        data.seller_phone ||
        "No phone";
    }


    const whatsappButton =
      document.getElementById(
        "whatsappButton"
      );

    if (
      whatsappButton &&
      data.seller_phone
    ) {

      whatsappButton.onclick =
        function () {

          contactSeller(
            data.seller_phone,
            data.title || "product"
          );

        };
    }


    const callButton =
      document.getElementById(
        "callButton"
      );

    if (
      callButton &&
      data.seller_phone
    ) {

      callButton.onclick =
        function () {

          let number =
            String(
              data.seller_phone
            ).replace(
              /\D/g,
              ""
            );

          if (
            number.startsWith("0")
          ) {

            number =
              "260" +
              number.substring(1);
          }

          window.location.href =
            "tel:+" + number;
        };
    }

  } catch (error) {

    console.error(
      "VIEW LISTING ERROR:",
      error
    );

    alert(
      "Unable to load product details."
    );

    closeProductPage();
  }
}


/* =========================================================
   PRODUCT PAGE
   ========================================================= */

function closeProductPage() {

  const page =
    document.getElementById(
      "productPage"
    );

  if (page) {

    page.style.display =
      "none";
  }

  document.body.style.overflow =
    "auto";
}


/* =========================================================
   SELL PAGE
   ========================================================= */

function sellNow() {

  const page =
    document.getElementById(
      "sellPage"
    );

  if (!page) return;

  page.style.display =
    "block";

  document.body.style.overflow =
    "hidden";
}


function closeSellPage() {

  const page =
    document.getElementById(
      "sellPage"
    );

  if (page) {

    page.style.display =
      "none";
  }

  document.body.style.overflow =
    "auto";
}


/* =========================================================
   ACCOUNT / AUTH
   ========================================================= */

function openAccount() {

  const modal =
    document.getElementById(
      "authModal"
    );

  if (modal) {

    modal.style.display =
      "flex";
  }
}


function closeAuthModal() {

  const modal =
    document.getElementById(
      "authModal"
    );

  if (modal) {

    modal.style.display =
      "none";
  }
}


function showLogin() {

  const login =
    document.getElementById(
      "loginForm"
    );

  const register =
    document.getElementById(
      "registerForm"
    );

  const loginTab =
    document.getElementById(
      "loginTab"
    );

  const registerTab =
    document.getElementById(
      "registerTab"
    );


  if (login) {
    login.style.display =
      "flex";
  }

  if (register) {
    register.style.display =
      "none";
  }

  if (loginTab) {
    loginTab.classList.add(
      "active"
    );
  }

  if (registerTab) {
    registerTab.classList.remove(
      "active"
    );
  }
}


function showRegister() {

  const login =
    document.getElementById(
      "loginForm"
    );

  const register =
    document.getElementById(
      "registerForm"
    );

  const loginTab =
    document.getElementById(
      "loginTab"
    );

  const registerTab =
    document.getElementById(
      "registerTab"
    );


  if (login) {
    login.style.display =
      "none";
  }

  if (register) {
    register.style.display =
      "flex";
  }

  if (registerTab) {
    registerTab.classList.add(
      "active"
    );
  }

  if (loginTab) {
    loginTab.classList.remove(
      "active"
    );
  }
}


/* =========================================================
   FAVORITES
   ========================================================= */

function showFavorites() {

  const page =
    document.getElementById(
      "favoritesPage"
    );

  if (page) {

    page.style.display =
      "block";
  }
}


function closeFavorites() {

  const page =
    document.getElementById(
      "favoritesPage"
    );

  if (page) {

    page.style.display =
      "none";
  }
}


function saveFavorite() {

  alert(
    "❤️ Saved to favorites!"
  );
}


/* =========================================================
   SELLER DASHBOARD
   ========================================================= */

function openSellerDashboard() {

  const dashboard =
    document.getElementById(
      "sellerDashboard"
    );

  if (dashboard) {

    dashboard.style.display =
      "block";
  }
}


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
   ADMIN DASHBOARD
   ========================================================= */

function openAdminDashboard() {

  const dashboard =
    document.getElementById(
      "adminDashboard"
    );

  if (dashboard) {

    dashboard.style.display =
      "block";
  }
}


function closeAdminDashboard() {

  const dashboard =
    document.getElementById(
      "adminDashboard"
    );

  if (dashboard) {

    dashboard.style.display =
      "none";
  }
}


/* =========================================================
   WHATSAPP CONTACT
   ========================================================= */

function contactSeller(
  phone,
  product
) {

  if (!phone) {

    alert(
      "Seller phone number is not available."
    );

    return;
  }

  let number =
    String(phone).replace(
      /\D/g,
      ""
    );


  if (
    number.startsWith("0")
  ) {

    number =
      "260" +
      number.substring(1);
  }


  const message =
    encodeURIComponent(
      `Hello, I saw your listing for ${product} on SiomaMarket.`
    );


  window.open(
    `https://wa.me/${number}?text=${message}`,
    "_blank"
  );
}


/* =========================================================
   SELL FORM
   ========================================================= */

function setupSellForm() {

  const sellForm =
    document.getElementById(
      "sellForm"
    );

  if (!sellForm) return;


  sellForm.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();


      const message =
        document.getElementById(
          "sellMessage"
        );

      const button =
        document.getElementById(
          "publishButton"
        );


      if (button) {

        button.disabled =
          true;

        button.textContent =
          "⏳ Publishing...";
      }


      try {

        const title =
          document.getElementById(
            "sellTitle"
          )?.value.trim() || "";


        const description =
          document.getElementById(
            "sellDescription"
          )?.value.trim() || "";


        const price =
          Number(
            document.getElementById(
              "sellPrice"
            )?.value || 0
          );


        const category =
          document.getElementById(
            "sellCategory"
          )?.value || "";


        const location =
          document.getElementById(
            "sellLocation"
          )?.value.trim() ||
          "Sioma";


        const imageUrl =
          document.getElementById(
            "sellImageUrl"
          )?.value.trim() ||
          null;


        const sellerName =
          document.getElementById(
            "sellerName"
          )?.value.trim() ||
          "";


        const sellerPhone =
          document.getElementById(
            "sellerPhone"
          )?.value.trim() ||
          "";


        if (!title) {

          throw new Error(
            "Please enter a product title."
          );
        }


        if (!price || price <= 0) {

          throw new Error(
            "Please enter a valid price."
          );
        }


        if (!category) {

          throw new Error(
            "Please select a category."
          );
        }


        if (!sellerName) {

          throw new Error(
            "Please enter your name."
          );
        }


        if (!sellerPhone) {

          throw new Error(
            "Please enter your phone number."
          );
        }


        /*
         * IMPORTANT:
         * The current database structure you gave me
         * does not list "description" as a column.
         *
         * Therefore description is NOT inserted here.
         *
         * We can add description safely later when the
         * Supabase column exists.
         */

        const product = {

          title:
            title,

          price:
            price,

          category:
            category,

          location:
            location,

          image_url:
            imageUrl,

          seller_name:
            sellerName,

          seller_phone:
            sellerPhone,

          status:
            "active"
        };


        const {
          error
        } =
          await supabaseClient
            .from("listings")
            .insert([
              product
            ]);


        if (error) {

          throw error;
        }


        if (message) {

          message.innerHTML =
            "✅ Published successfully!";

          message.style.color =
            "green";
        }


        sellForm.reset();


        await loadLatestProducts();


      } catch (error) {

        console.error(
          "PUBLISH ERROR:",
          error
        );


        if (message) {

          message.innerHTML =
            `❌ ${escapeHTML(
              error.message ||
              "Unable to publish listing."
            )}`;

          message.style.color =
            "red";
        }

      } finally {

        if (button) {

          button.disabled =
            false;

          button.textContent =
            "🚀 PUBLISH IN SIOMA";
        }
      }

    }
  );
}


/* =========================================================
   CLOSE MODALS WHEN CLICKING OUTSIDE
   ========================================================= */

document.addEventListener(
  "click",
  function (event) {

    const authModal =
      document.getElementById(
        "authModal"
      );

    if (
      authModal &&
      event.target === authModal
    ) {

      closeAuthModal();
    }

  }
);


/* =========================================================
   END OF SCRIPT
   ========================================================= */
