/* =========================================
SIOMA MARKET - SCRIPT.JS
Cleaned & Corrected Version
========================================= */

const SUPABASE_URL = "https://luolbdjonzissgskjupd.supabase.co";
const SUPABASE_KEY = "sb_publishable_bMHzln24777v-kDo-uE8Eg_AYUWThn-";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================================
INITIAL LOAD
========================================= */

document.addEventListener("DOMContentLoaded", function () {
  loadLatestProducts();
});

async function loadLatestProducts() {
  const container = document.getElementById("homeProducts");
  if (!container) return;

  try {
    const { data, error } = await supabaseClient
      .from("listings")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = "<p>No products available right now.</p>";
      return;
    }

    renderGrid(container, data);
  } catch (err) {
    console.error("LOAD ERROR:", err);
    container.innerHTML = "<p>Unable to load products.</p>";
  }
}

function renderGrid(container, products) {
  let html = "";
  products.forEach((product) => {
    const image = product.image_url || "https://via.placeholder.com/600x400?text=SiomaMarket";
    const title = product.title || "Product";
    const location = product.location || "Sioma";
    const price = Number(product.price || 0);

    html += `
      <div class="product-card" onclick="viewListing('${escapeHTML(product.id)}')">
        <div class="product-image-wrap">
          <img src="${escapeHTML(image)}" alt="${escapeHTML(title)}" loading="lazy">
        </div>
        <div style="padding: 10px;">
          <h3>${escapeHTML(title)}</h3>
          <p class="product-price">K${price.toLocaleString()}</p>
          <p>📍 ${escapeHTML(location)}</p>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

/* =========================================
SEARCH & CATEGORY
========================================= */

async function searchMarket() {
  const input = document.getElementById("searchInput");
  const section = document.getElementById("searchResultsSection");
  const results = document.getElementById("searchResults");

  if (!input || !results) return;

  const search = input.value.trim();
  if (!search) return;

  section.style.display = "block";
  results.innerHTML = "<p>🔎 Searching...</p>";

  try {
    const { data, error } = await supabaseClient
      .from("listings")
      .select("*")
      .eq("status", "active")
      .ilike("title", `%${search}%`)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      results.innerHTML = "<p>🔍 No products found.</p>";
      return;
    }

    displayProducts(data, `Search: "${search}"`);
    section.scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    console.error("SEARCH ERROR:", error);
    results.innerHTML = "<p>❌ Search failed.</p>";
  }
}

async function searchCategory(category) {
  const section = document.getElementById("searchResultsSection");
  const results = document.getElementById("searchResults");
  if (!results) return;

  section.style.display = "block";
  results.innerHTML = "<p>🔎 Loading category...</p>";

  try {
    const { data, error } = await supabaseClient
      .from("listings")
      .select("*")
      .eq("status", "active")
      .eq("category", category)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      results.innerHTML = `<p>🔍 No products in ${escapeHTML(category)}.</p>`;
      return;
    }

    displayProducts(data, `Category: ${category}`);
    section.scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    console.error("CATEGORY ERROR:", err);
    results.innerHTML = "<p>❌ Failed to load category.</p>";
  }
}

async function buyNow() {
  const section = document.getElementById("searchResultsSection");
  const results = document.getElementById("searchResults");
  if (!results) return;

  section.style.display = "block";
  results.innerHTML = "<p>🔎 Loading products...</p>";

  try {
    const { data, error } = await supabaseClient
      .from("listings")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) throw error;

    displayProducts(data, "🛒 All Products");
    section.scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    results.innerHTML = "<p>❌ Unable to load products.</p>";
  }
}

function displayProducts(products, heading) {
  const results = document.getElementById("searchResults");
  if (!results) return;

  let html = `<h2>${escapeHTML(heading)}</h2><div class="products-grid">`;
  products.forEach((product) => {
    const image = product.image_url || "https://via.placeholder.com/600x400?text=SiomaMarket";
    const price = Number(product.price || 0);

    html += `
      <div class="product-card" onclick="viewListing('${escapeHTML(product.id)}')">
        <div class="product-image-wrap">
          <img src="${escapeHTML(image)}" alt="${escapeHTML(product.title)}">
        </div>
        <div style="padding: 10px;">
          <h3>${escapeHTML(product.title)}</h3>
          <p class="product-price">K${price.toLocaleString()}</p>
          <p>📍 ${escapeHTML(product.location || "Sioma")}</p>
        </div>
      </div>
    `;
  });
  html += "</div>";
  results.innerHTML = html;
}

/* =========================================
VIEW & MODALS NAVIGATION
========================================= */

async function viewListing(id) {
  const productPage = document.getElementById("productPage");
  if (!productPage) return;

  productPage.style.display = "block";
  document.body.style.overflow = "hidden";

  try {
    const { data, error } = await supabaseClient
      .from("listings")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) throw error;

    document.getElementById("detailsImage").src = data.image_url || "https://via.placeholder.com/800x500?text=SiomaMarket";
    document.getElementById("detailsTitle").textContent = data.title || "Product";
    document.getElementById("detailsPrice").textContent = "K" + Number(data.price || 0).toLocaleString();
    document.getElementById("detailsCategory").textContent = data.category || "General";
    document.getElementById("detailsLocation").textContent = "📍 " + (data.location || "Sioma");
    document.getElementById("detailsDescription").textContent = data.description || "No description.";
    document.getElementById("detailsSeller").textContent = data.seller_name || "Sioma Seller";
    document.getElementById("detailsPhone").textContent = data.seller_phone || "No phone";

    const whatsappBtn = document.getElementById("whatsappButton");
    if (whatsappBtn && data.seller_phone) {
      whatsappBtn.onclick = () => contactSeller(data.seller_phone, data.title);
    }
  } catch (err) {
    alert("Unable to load product details.");
  }
}

function closeProductPage() {
  document.getElementById("productPage").style.display = "none";
  document.body.style.overflow = "auto";
}

function sellNow() {
  document.getElementById("sellPage").style.display = "block";
  document.body.style.overflow = "hidden";
}

function closeSellPage() {
  document.getElementById("sellPage").style.display = "none";
  document.body.style.overflow = "auto";
}

function openAccount() {
  document.getElementById("authModal").style.display = "flex";
}

function closeAuthModal() {
  document.getElementById("authModal").style.display = "none";
}

function showLogin() {
  document.getElementById("loginForm").style.display = "flex";
  document.getElementById("registerForm").style.display = "none";
  document.getElementById("loginTab").classList.add("active");
  document.getElementById("registerTab").classList.remove("active");
}

function showRegister() {
  document.getElementById("loginForm").style.display = "none";
  document.getElementById("registerForm").style.display = "flex";
  document.getElementById("registerTab").classList.add("active");
  document.getElementById("loginTab").classList.remove("active");
}

function showFavorites() {
  document.getElementById("favoritesPage").style.display = "block";
}

function closeFavorites() {
  document.getElementById("favoritesPage").style.display = "none";
}

function openSellerDashboard() {
  document.getElementById("sellerDashboard").style.display = "block";
}

function closeSellerDashboard() {
  document.getElementById("sellerDashboard").style.display = "none";
}

function openAdminDashboard() {
  document.getElementById("adminDashboard").style.display = "block";
}

function closeAdminDashboard() {
  document.getElementById("adminDashboard").style.display = "none";
}

function saveFavorite() {
  alert("❤️ Saved to favorites!");
}

function contactSeller(phone, product) {
  let number = String(phone).replace(/\D/g, "");
  if (number.startsWith("0")) number = "260" + number.substring(1);
  const msg = encodeURIComponent(`Hello, I saw your listing for ${product} on SiomaMarket.`);
  window.open(`https://wa.me/${number}?text=${msg}`, "_blank");
}

/* =========================================
SELL FORM SUBMISSION
========================================= */

document.addEventListener("DOMContentLoaded", function () {
  const sellForm = document.getElementById("sellForm");
  if (!sellForm) return;

  sellForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const message = document.getElementById("sellMessage");
    const button = document.getElementById("publishButton");

    button.disabled = true;
    button.textContent = "⏳ Publishing...";

    const product = {
      title: document.getElementById("sellTitle").value.trim(),
      description: document.getElementById("sellDescription").value.trim(),
      price: Number(document.getElementById("sellPrice").value),
      category: document.getElementById("sellCategory").value,
      location: document.getElementById("sellLocation").value.trim() || "Sioma",
      image_url: document.getElementById("sellImageUrl").value.trim() || null,
      seller_name: document.getElementById("sellerName").value.trim(),
      seller_phone: document.getElementById("sellerPhone").value.trim(),
      status: "active"
    };

    try {
      const { error } = await supabaseClient.from("listings").insert([product]);
      if (error) throw error;

      message.innerHTML = "✅ Published successfully!";
      message.style.color = "green";
      sellForm.reset();
      loadLatestProducts();
    } catch (err) {
      message.innerHTML = `❌ Error: ${escapeHTML(err.message)}`;
      message.style.color = "red";
    }

    button.disabled = false;
    button.textContent = "🚀 PUBLISH IN SIOMA";
  });
});
