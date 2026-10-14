/* ==========================================================================
SIOMAMARKET — COMPLETE APPLICATION LOGIC
Compatible with productGrid, productMessage, searchInput and category-card.
========================================================================== */

/* ==========================================================================
SECTION 1: SUPABASE CONFIGURATION
========================================================================== */

const SUPABASE_URL = "https://luolbdjonzissgskjupd.supabase.co";

const SUPABASE_KEY =
"sb_publishable_bMHzln24777v-kDo-uE8Eg_AYUWThn-";

if (!window.supabase) {
console.error(
"Supabase library is missing. Check the Supabase script in index.html."
);
}

const supabaseClient = window.supabase
? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
: null;

/* ==========================================================================
SECTION 2: HELPER FUNCTIONS
========================================================================== */

const $ = (id) => document.getElementById(id);

function escapeHtml(value) {
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

function showMessage(message, type = "info") {
const element = $("productMessage");

if (!element) return;

element.textContent = message;
element.dataset.type = type;
element.style.display = "block";

}

function hideMessage() {
const element = $("productMessage");

if (element) {
    element.style.display = "none";
}

}

function formatPrice(value) {
const price = Number(value);

if (!Number.isFinite(price)) {
    return "Price on request";
}

return "K" + price.toLocaleString("en-ZM", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

}

function formatDate(value) {
if (!value) return "";

const date = new Date(value);

if (Number.isNaN(date.getTime())) {
    return "";
}

return date.toLocaleDateString("en-ZM", {
    day: "numeric",
    month: "short",
    year: "numeric"
});

}

function showError(message) {
console.error(message);
alert(message);
}

function setElementDisplay(id, display) {
const element = $(id);

if (element) {
    element.style.display = display;
}

}

/* ==========================================================================
SECTION 3: GLOBAL APPLICATION STATE
========================================================================== */

let currentUser = null;
let sessionLoaded = false;
let isAuthRegisterMode = false;

let favoriteListingIds = new Set();

let currentConversationId = null;
let currentConversationListingId = null;
let currentConversationRecipientId = null;

let selectedCategory = "";
let counterInterval = null;

/* ==========================================================================
SECTION 4: NAVIGATION
========================================================================== */

function navigateTo(pageId) {
document.querySelectorAll(".page-section").forEach((page) => {
page.classList.remove("active");
});

const target = $(pageId);

if (target) {
    target.classList.add("active");
}

if (pageId === "homePage") {
    loadListings();
}

if (pageId === "favsPage") {
    loadFavorites();
}

if (pageId === "messagesPage") {
    loadConversations();
}

}

/* ==========================================================================
SECTION 5: AUTHENTICATION
========================================================================== */

function toggleAuthMode(event) {
if (event) {
event.preventDefault();
}

isAuthRegisterMode = !isAuthRegisterMode;

const title = $("authTitle");
const submitButton = $("authSubmitBtn");
const toggleText = $("authToggleText");
const toggleLink = $("authToggleLink");

if (title) {
    title.textContent = isAuthRegisterMode
        ? "Create Account"
        : "Sign In";
}

if (submitButton) {
    submitButton.textContent = isAuthRegisterMode
        ? "Register"
        : "Login";
}

if (toggleText) {
    toggleText.textContent = isAuthRegisterMode
        ? "Already have an account?"
        : "Need an account?";
}

if (toggleLink) {
    toggleLink.textContent = isAuthRegisterMode
        ? "Login"
        : "Register";
}

}

async function handleAuthSubmit(event) {
if (event) {
event.preventDefault();
}

if (!supabaseClient) {
    showError("Supabase has not loaded. Refresh the page and try again.");
    return;
}

const emailElement = $("authEmail");
const passwordElement = $("authPassword");

if (!emailElement || !passwordElement) {
    showError("The login form fields could not be found.");
    return;
}

const email = emailElement.value.trim();
const password = passwordElement.value;

if (!email || !password) {
    showError("Enter your email address and password.");
    return;
}

const submitButton = $("authSubmitBtn");

if (submitButton) {
    submitButton.disabled = true;
}

try {
    if (isAuthRegisterMode) {
        const { error } = await supabaseClient.auth.signUp({
            email,
            password
        });

        if (error) throw error;

        alert(
            "Registration submitted. Check your email if confirmation is required."
        );
    } else {
        const { error } =
            await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

        if (error) throw error;

        navigateTo("homePage");
    }
} catch (error) {
    console.error("Authentication error:", error);
    showError(error.message || "Authentication failed.");
} finally {
    if (submitButton) {
        submitButton.disabled = false;
    }
}

}

async function handleLogout() {
if (!supabaseClient) return;

const { error } = await supabaseClient.auth.signOut();

if (error) {
    showError(error.message);
    return;
}

navigateTo("homePage");

}

async function handleUserSessionChanged() {
if (currentUser) {
setElementDisplay("authBtn", "none");
setElementDisplay("logoutBtn", "inline-block");
setElementDisplay("sellBtn", "inline-block");
setElementDisplay("favsBtn", "inline-block");
setElementDisplay("messagesBtn", "inline-block");

    await loadFavoriteIds();
} else {
    setElementDisplay("authBtn", "inline-block");
    setElementDisplay("logoutBtn", "none");
    setElementDisplay("sellBtn", "none");
    setElementDisplay("favsBtn", "none");
    setElementDisplay("messagesBtn", "none");

    favoriteListingIds.clear();

    stopCounterRefresh();
}

}

/* ==========================================================================
SECTION 6: LISTINGS AND PRODUCT SEARCH
========================================================================== */

async function loadListings(categoryOverride = null) {
const gridContainer = $("productGrid");

if (!gridContainer) {
    console.error(
        "Product grid not found. Check for id=\"productGrid\" in index.html."
    );
    return;
}

if (!supabaseClient) {
    showMessage("The marketplace connection is unavailable.", "error");
    return;
}

const searchElement = $("searchInput");
const queryText = searchElement
    ? searchElement.value.trim()
    : "";

if (categoryOverride !== null) {
    selectedCategory = categoryOverride;
}

const category = selectedCategory;

showMessage("Loading products...");

gridContainer.innerHTML = "";

try {
    let query = supabaseClient
        .from("listings")
        .select("*")
        .order("created_at", { ascending: false });

    if (category) {
        query = query.eq("category", category);
    }

    if (queryText) {
        query = query.ilike("title", "%" + queryText + "%");
    }

    const { data, error } = await query;

    if (error) {
        console.error("Product loading error:", error);

        showMessage(
            "Unable to load products. Please refresh and try again.",
            "error"
        );

        return;
    }

    renderListingsGrid(data || [], gridContainer);

    const heading = $("productsHeading");

    if (heading) {
        if (category) {
            heading.textContent =
                category.toLowerCase() === "timber"
                    ? "Timber Products"
                    : category + " Products";
        } else if (queryText) {
            heading.textContent = "Search Results";
        } else {
            heading.textContent = "Latest Products";
        }
    }

} catch (error) {
    console.error("Unexpected product loading error:", error);

    showMessage(
        "Something went wrong while loading products.",
        "error"
    );
}

}

function getPrimaryImage(item) {
if (!item || !item.image_url) {
return "";
}

let images = item.image_url;

if (typeof images === "string") {
    try {
        const parsed = JSON.parse(images);

        if (Array.isArray(parsed)) {
            images = parsed;
        }
    } catch (_) {
        // A normal image URL is also supported.
    }
}

if (Array.isArray(images)) {
    return images.find((image) => typeof image === "string" && image) || "";
}

return typeof images === "string" ? images : "";

}

function renderListingsGrid(listings, container) {
if (!container) return;

container.innerHTML = "";

if (!listings || listings.length === 0) {
    showMessage("No listings found. Check back soon!");
    return;
}

hideMessage();

listings.forEach((item) => {
    const card = document.createElement("article");

    card.className = "card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute(
        "aria-label",
        "View product: " + (item.title || "Product")
    );

    const image = getPrimaryImage(item);
    const safeTitle = escapeHtml(item.title || "Untitled product");
    const safeCategory = escapeHtml(item.category || "Other");
    const safeImage = escapeHtml(image);

    const isFavorite = favoriteListingIds.has(item.id);

    card.innerHTML = `
        <img
            class="card-img"
            src="${safeImage || "https://placehold.co/600x400?text=SiomaMarket"}"
            alt="${safeTitle}"
            loading="lazy"
            onerror="this.onerror=null;this.src='https://placehold.co/600x400?text=No+Image';"
        >

        <div class="card-body">
            <div class="card-price">
                ${escapeHtml(formatPrice(item.price))}
            </div>

            <div class="card-title">
                ${safeTitle}
            </div>

            <div class="card-footer">
                <span>${safeCategory}</span>

                ${
                    currentUser
                        ? `
                            <button
                                type="button"
                                class="btn favorite-toggle"
                                aria-label="${isFavorite ? "Remove from" : "Add to"} favourites"
                            >
                                ${isFavorite ? "♥" : "♡"}
                            </button>
                        `
                        : ""
                }
            </div>
        </div>
    `;

    card.addEventListener("click", () => {
        openProductModal(item);
    });

    card.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            openProductModal(item);
        }
    });

    const favoriteButton = card.querySelector(".favorite-toggle");

    if (favoriteButton) {
        favoriteButton.addEventListener("click", (event) => {
            event.stopPropagation();
            toggleFavorite(item.id);
        });
    }

    container.appendChild(card);
});

}

function handleSearch(event) {
if (event) {
event.preventDefault();
}

selectedCategory = "";
loadListings("");

}

function clearProductFilters() {
selectedCategory = "";

const searchInput = $("searchInput");

if (searchInput) {
    searchInput.value = "";
}

loadListings("");

}

/* ==========================================================================
SECTION 7: CATEGORY BUTTONS
========================================================================== */

function bindCategoryButtons() {
document.querySelectorAll(".category-card").forEach((button) => {
if (button.dataset.bound === "true") return;

    button.dataset.bound = "true";

    button.addEventListener("click", () => {
        const category = button.dataset.category;

        if (!category) {
            console.warn("Category button has no data-category value.");
            return;
        }

        const searchInput = $("searchInput");

        if (searchInput) {
            searchInput.value = "";
        }

        selectedCategory = category;

        loadListings(category);

        const productsSection = $("products");

        if (productsSection) {
            productsSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    });
});

}

/* ==========================================================================
SECTION 8: CREATE A LISTING
========================================================================== */

async function handleCreateListing(event) {
if (event) {
event.preventDefault();
}

if (!currentUser) {
    alert("Please sign in before posting a product.");
    navigateTo("authPage");
    return;
}

const titleElement = $("listTitle");
const priceElement = $("listPrice");
const categoryElement = $("listCategory");
const descriptionElement = $("listDesc");
const imageElement = $("listImageUrl");

if (
    !titleElement ||
    !priceElement ||
    !categoryElement ||
    !descriptionElement ||
    !imageElement
) {
    showError(
        "Some listing form fields are missing. Check index.html."
    );
    return;
}

const title = titleElement.value.trim();
const price = Number(priceElement.value);
const category = categoryElement.value;
const description = descriptionElement.value.trim();
const imageUrl = imageElement.value.trim();

if (!title || !category || !Number.isFinite(price) || price < 0) {
    showError("Enter a product title, category, and valid price.");
    return;
}

const payload = {
    seller_id: currentUser.id,
    title,
    price,
    category,
    description,
    image_url: imageUrl || null,
    status: "active"
};

try {
    const { error } = await supabaseClient
        .from("listings")
        .insert([payload]);

    if (error) throw error;

    alert("Your product has been published!");

    const form = $("createListingForm");

    if (form) {
        form.reset();
    }

    selectedCategory = "";
    navigateTo("homePage");

} catch (error) {
    console.error("Listing creation error:", error);

    showError(
        "Could not publish your product: " + error.message
    );
}

}

/* ==========================================================================
SECTION 9: FAVOURITES
========================================================================== */

async function loadFavoriteIds() {
if (!currentUser || !supabaseClient) return;

try {
    const { data, error } = await supabaseClient
        .from("favorites")
        .select("listing_id")
        .eq("user_id", currentUser.id);

    if (error) throw error;

    favoriteListingIds = new Set(
        (data || []).map((favorite) => favorite.listing_id)
    );

} catch (error) {
    console.error("Unable to load favourites:", error.message);
}

}

async function toggleFavorite(listingId) {
if (!currentUser) {
alert("Please sign in to save favourites.");
navigateTo("authPage");
return;
}

try {
    if (favoriteListingIds.has(listingId)) {
        const { error } = await supabaseClient
            .from("favorites")
            .delete()
            .eq("user_id", currentUser.id)
            .eq("listing_id", listingId);

        if (error) throw error;

        favoriteListingIds.delete(listingId);

    } else {
        const { error } = await supabaseClient
            .from("favorites")
            .insert([{
                user_id: currentUser.id,
                listing_id: listingId
            }]);

        if (error) throw error;

        favoriteListingIds.add(listingId);
    }

    await loadListings();

    const favoritesPage = $("favsPage");

    if (favoritesPage && favoritesPage.classList.contains("active")) {
        await loadFavorites();
    }

} catch (error) {
    console.error("Favourite update error:", error);
    showError("Unable to update favourites: " + error.message);
}

}

async function loadFavorites() {
if (!currentUser || !supabaseClient) return;

const grid = $("favsGrid");

if (!grid) {
    console.warn("The favourites grid was not found.");
    return;
}

grid.innerHTML = "";

try {
    const { data, error } = await supabaseClient
        .from("favorites")
        .select("listing_id, listings(*)")
        .eq("user_id", currentUser.id);

    if (error) throw error;

    const listings = (data || [])
        .map((favorite) => favorite.listings)
        .filter(Boolean);

    renderListingsGrid(listings, grid);

} catch (error) {
    console.error("Unable to load favourites:", error);
    grid.textContent = "Unable to load favourites.";
}

}

/* ==========================================================================
SECTION 10: PRODUCT DETAILS
========================================================================== */

function openProductModal(item) {
const modal = $("productModal");
const details = $("modalDetails");

if (!modal || !details) {
    console.error(
        "Product modal elements are missing from index.html."
    );
    return;
}

const image = getPrimaryImage(item);

details.innerHTML = `
    <img
        src="${escapeHtml(image || "https://placehold.co/600x400?text=No+Image")}"
        alt="${escapeHtml(item.title || "Product")}"
        style="width:100%;max-height:300px;object-fit:contain;border-radius:8px;"
        onerror="this.onerror=null;this.src='https://placehold.co/600x400?text=No+Image';"
    >

    <h2>${escapeHtml(item.title || "Untitled product")}</h2>

    <h3 style="color:var(--primary);margin:0.5rem 0;">
        ${escapeHtml(formatPrice(item.price))}
    </h3>

    <p>
        <strong>Category:</strong>
        ${escapeHtml(item.category || "Other")}
    </p>

    ${
        item.location
            ? `<p><strong>Location:</strong> ${escapeHtml(item.location)}</p>`
            : ""
    }

    ${
        item.created_at
            ? `<p><small>Listed ${escapeHtml(formatDate(item.created_at))}</small></p>`
            : ""
    }

    <p style="margin-top:0.75rem;white-space:pre-wrap;">
        ${escapeHtml(item.description || "No description provided.")}
    </p>

    ${
        currentUser && item.seller_id && currentUser.id !== item.seller_id
            ? `
                <button
                    type="button"
                    id="contactSellerButton"
                    class="btn btn-primary"
                    style="margin-top:1rem;width:100%;"
                >
                    Contact Seller
                </button>
            `
            : ""
    }
`;

modal.classList.add("active");

const contactButton = $("contactSellerButton");

if (contactButton) {
    contactButton.addEventListener("click", () => {
        messageSeller(item.id, item.seller_id);
    });
}

}

function closeModal() {
const modal = $("productModal");

if (modal) {
    modal.classList.remove("active");
}

}

/* ==========================================================================
SECTION 11: MESSAGING
Requires a messages table with sender_id, receiver_id, content and
created_at columns. listing_id is optional when sending a message.
========================================================================== */

function getConversationRecipient() {
return currentConversationRecipientId;
}

async function messageSeller(listingId, sellerId) {
closeModal();

if (!currentUser) {
    navigateTo("authPage");
    return;
}

if (!sellerId || sellerId === currentUser.id) {
    alert("You cannot message yourself.");
    return;
}

currentConversationId = sellerId;
currentConversationRecipientId = sellerId;
currentConversationListingId = listingId || null;

navigateTo("messagesPage");

await openConversation(
    sellerId,
    sellerId,
    listingId || null
);

}

async function openConversation(conversationId, otherUserId, listingId = null) {
if (!currentUser) return;

currentConversationId = conversationId || otherUserId;
currentConversationRecipientId = otherUserId;
currentConversationListingId = listingId;

const inputArea = $("chatInputArea");

if (inputArea) {
    inputArea.style.display = "flex";
}

await loadConversationMessages(otherUserId, listingId);

await loadConversations();

}

async function loadConversations() {
if (!currentUser || !supabaseClient) return;

const listContainer = $("conversationsList");

if (!listContainer) return;

listContainer.innerHTML = "<p>Loading conversations...</p>";

try {
    const { data, error } = await supabaseClient
        .from("messages")
        .select("*")
        .or(
            `sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`
        )
        .order("created_at", { ascending: false });

    if (error) throw error;

    const conversationsMap = new Map();

    (data || []).forEach((message) => {
        const otherId =
            message.sender_id === currentUser.id
                ? message.receiver_id
                : message.sender_id;

        if (otherId && !conversationsMap.has(otherId)) {
            conversationsMap.set(otherId, message);
        }
    });

    listContainer.innerHTML = "";

    if (conversationsMap.size === 0) {
        listContainer.textContent = "No active conversations yet.";
        return;
    }

    conversationsMap.forEach((lastMessage, otherId) => {
        const item = document.createElement("button");

        item.type = "button";
        item.className = "chat-item";

        if (currentConversationRecipientId === otherId) {
            item.classList.add("active");
        }

        const title = document.createElement("strong");
        title.textContent = "User ..." + otherId.slice(-6);

        const preview = document.createElement("p");
        preview.textContent = lastMessage.content || "Message";
        preview.style.overflow = "hidden";
        preview.style.textOverflow = "ellipsis";
        preview.style.whiteSpace = "nowrap";

        item.appendChild(title);
        item.appendChild(preview);

        item.addEventListener("click", () => {
            openConversation(
                otherId,
                otherId,
                lastMessage.listing_id || null
            );
        });

        listContainer.appendChild(item);
    });

} catch (error) {
    console.error("Conversation loading error:", error);

    listContainer.textContent =
        "Unable to load conversations. Check your database permissions.";
}

}

async function loadConversationMessages(recipientId, listingId = null) {
if (!currentUser || !recipientId || !supabaseClient) return;

const msgContainer = $("chatMessages");

if (!msgContainer) return;

msgContainer.innerHTML = "";

try {
    const { data, error } = await supabaseClient
        .from("messages")
        .select("*")
        .or(
            `and(sender_id.eq.${currentUser.id},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${currentUser.id})`
        )
        .order("created_at", { ascending: true });

    if (error) throw error;

    (data || []).forEach((message) => {
        const messageElement = document.createElement("div");

        messageElement.className =
            "message " +
            (
                message.sender_id === currentUser.id
                    ? "sent"
                    : "received"
            );

        messageElement.textContent = message.content || "";

        msgContainer.appendChild(messageElement);
    });

    msgContainer.scrollTop = msgContainer.scrollHeight;

} catch (error) {
    console.error("Message loading error:", error);

    msgContainer.textContent =
        "Unable to load messages. Check your database permissions.";
}

}

async function sendMessage(event) {
if (event) {
event.preventDefault();
}

if (!currentUser) {
    alert("Please sign in before sending a message.");
    return;
}

const recipientId = getConversationRecipient();
const input = $("chatInput");

if (!input) {
    showError("The message input field was not found.");
    return;
}

const content = input.value.trim();

if (!recipientId) {
    showError("Choose a conversation before sending a message.");
    return;
}

if (!content) return;

const payload = {
    sender_id: currentUser.id,
    receiver_id: recipientId,
    content
};

if (currentConversationListingId) {
    payload.listing_id = currentConversationListingId;
}

try {
    const { error } = await supabaseClient
        .from("messages")
        .insert([payload]);

    if (error) throw error;

    input.value = "";

    await loadConversationMessages(
        recipientId,
        currentConversationListingId
    );

    await loadConversations();

    await updateAllCounters();

} catch (error) {
    console.error("Message sending error:", error);

    showError("Unable to send message: " + error.message);
}

}

/* ==========================================================================
SECTION 12: MESSAGE COUNTERS
========================================================================== */

async function updateAllCounters() {
if (!currentUser || !supabaseClient) return;

const badge = $("msgCounter");

if (!badge) return;

try {
    const { count, error } = await supabaseClient
        .from("messages")
        .select("*", {
            count: "exact",
            head: true
        })
        .eq("receiver_id", currentUser.id)
        .eq("is_read", false);

    if (error) {
        console.warn("Message counter unavailable:", error.message);
        return;
    }

    badge.textContent = String(count || 0);
    badge.style.display = count > 0 ? "inline-block" : "none";

} catch (error) {
    console.error("Counter update error:", error);
}

}

function startCounterRefresh() {
updateAllCounters();

if (!counterInterval) {
    counterInterval = setInterval(updateAllCounters, 15000);
}

}

function stopCounterRefresh() {
if (counterInterval) {
clearInterval(counterInterval);
counterInterval = null;
}

const badge = $("msgCounter");

if (badge) {
    badge.style.display = "none";
}

}

/* ==========================================================================
SECTION 13: VISIBILITY AND REFRESH
========================================================================== */

function handleVisibilityChange() {
if (document.hidden || !currentUser) return;

updateAllCounters();

const messagesPage = $("messagesPage");

if (
    currentConversationRecipientId &&
    messagesPage &&
    messagesPage.classList.contains("active")
) {
    loadConversationMessages(
        currentConversationRecipientId,
        currentConversationListingId
    );
}

}

/* ==========================================================================
SECTION 14: APPLICATION INITIALIZATION
========================================================================== */

async function initializeSiomaMarket() {
bindCategoryButtons();

const searchForm = $("searchForm");

if (searchForm && searchForm.dataset.bound !== "true") {
    searchForm.dataset.bound = "true";

    searchForm.addEventListener("submit", handleSearch);
}

if (!supabaseClient) {
    showMessage(
        "The marketplace connection could not start.",
        "error"
    );
    return;
}

try {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) throw error;

    currentUser = data.session?.user || null;
    sessionLoaded = true;

    await handleUserSessionChanged();

    if (currentUser) {
        startCounterRefresh();
    }

} catch (error) {
    console.error("Session initialization error:", error);
}

await loadListings();

}

/* ==========================================================================
SECTION 15: AUTHENTICATION STATE LISTENER
========================================================================== */

if (supabaseClient) {
supabaseClient.auth.onAuthStateChange((event, session) => {
currentUser = session?.user || null;
sessionLoaded = true;

    setTimeout(async () => {
        try {
            await handleUserSessionChanged();

            if (currentUser) {
                startCounterRefresh();
            } else {
                stopCounterRefresh();
            }

            if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
                await loadListings();
            }

        } catch (error) {
            console.error(
                "Authentication state update error:",
                error
            );
        }
    }, 0);
});

}

/* ==========================================================================
SECTION 16: START APPLICATION
========================================================================== */

document.addEventListener(
"visibilitychange",
handleVisibilityChange
);

if (document.readyState === "loading") {
document.addEventListener(
"DOMContentLoaded",
initializeSiomaMarket,
{ once: true }
);
} else {
initializeSiomaMarket();
       }
