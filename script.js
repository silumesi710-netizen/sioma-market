/* ==========================================================================
   SIOMAMARKET - COMPLETE APPLICATION LOGIC
   ========================================================================== */

/* --------------------------------------------------------------------------
   SECTION 1 & 2: SUPABASE CONFIGURATION & INITIALIZATION
   -------------------------------------------------------------------------- */
const SUPABASE_URL = "https://your-supabase-project-url.supabase.co";
const SUPABASE_KEY = "your-anon-public-key";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Shorthand DOM Selector Helper
 */
const $ = (id) => document.getElementById(id);

/**
 * Escapes dynamic string input to mitigate XSS in HTML string literals
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* --------------------------------------------------------------------------
   SECTION 3: GLOBAL STATE MANAGEMENT
   -------------------------------------------------------------------------- */
let currentUser = null;
let sessionLoaded = false;
let isAuthRegisterMode = false;
let favoriteListingIds = new Set();

// Messaging Specific State
let currentConversationId = null;
let currentConversationListingId = null;
let currentConversationRecipientId = null;

// Background Counter Refresh Interval Reference
let counterInterval = null;

/* --------------------------------------------------------------------------
   SECTION 4: ROUTING & NAVIGATION
   -------------------------------------------------------------------------- */
function navigateTo(pageId) {
  document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
  const target = $(pageId);
  if (target) {
    target.classList.add('active');
  }

  // Trigger page-specific data loads
  if (pageId === 'homePage') loadListings();
  if (pageId === 'favsPage') loadFavorites();
  if (pageId === 'messagesPage') loadConversations();
}

/* --------------------------------------------------------------------------
   SECTION 5: AUTHENTICATION & SESSION HANDLING
   -------------------------------------------------------------------------- */
function toggleAuthMode(e) {
  if (e) e.preventDefault();
  isAuthRegisterMode = !isAuthRegisterMode;
  
  $('authTitle').innerText = isAuthRegisterMode ? 'Create Account' : 'Sign In';
  $('authSubmitBtn').innerText = isAuthRegisterMode ? 'Register' : 'Login';
  $('authToggleText').innerText = isAuthRegisterMode ? 'Already have an account?' : 'Need an account?';
  $('authToggleLink').innerText = isAuthRegisterMode ? 'Login' : 'Register';
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = $('authEmail').value;
  const password = $('authPassword').value;

  try {
    if (isAuthRegisterMode) {
      const { data, error } = await supabaseClient.auth.signUp({ email, password });
      if (error) throw error;
      alert('Registration successful! Please log in with your credentials.');
      toggleAuthMode();
    } else {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigateTo('homePage');
    }
  } catch (err) {
    alert(err.message);
  }
}

async function handleLogout() {
  await supabaseClient.auth.signOut();
  navigateTo('homePage');
}

async function handleUserSessionChanged() {
  if (currentUser) {
    $('authBtn').style.display = 'none';
    $('logoutBtn').style.display = 'inline-block';
    $('sellBtn').style.display = 'inline-block';
    $('favsBtn').style.display = 'inline-block';
    $('messagesBtn').style.display = 'inline-block';
    await loadFavoriteIds();
  } else {
    $('authBtn').style.display = 'inline-block';
    $('logoutBtn').style.display = 'none';
    $('sellBtn').style.display = 'none';
    $('favsBtn').style.display = 'none';
    $('messagesBtn').style.display = 'none';
    favoriteListingIds.clear();
  }
}

/* Primary Auth Listener */
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
    } catch (error) {
      console.error("Auth UI refresh error:", error);
    }
  }, 0);
});

/* --------------------------------------------------------------------------
   SECTION 6: CATALOG, LISTINGS & FAVORITES
   -------------------------------------------------------------------------- */
async function loadListings() {
  const queryText = $('searchInput').value;
  const category = $('categorySelect').value;

  let query = supabaseClient
    .from('listings')
    .select('*')
    .order('created_at', { ascending: false });

  if (category) query = query.eq('category', category);
  if (queryText) query = query.ilike('title', `%${queryText}%`);

  const { data, error } = await query;
  if (error) return console.error(error);

  renderListingsGrid(data, $('listingsGrid'));
}

function renderListingsGrid(listings, container) {
  container.innerHTML = '';
  if (!listings || listings.length === 0) {
    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No listings found.</p>';
    return;
  }

  listings.forEach(item => {
    const isFav = favoriteListingIds.has(item.id);
    const card = document.createElement('div');
    card.className = 'card';
    card.onclick = () => openProductModal(item);
    card.innerHTML = `
      <img class="card-img" src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}">
      <div class="card-body">
        <div class="card-price">$${Number(item.price).toFixed(2)}</div>
        <div class="card-title">${escapeHtml(item.title)}</div>
        <div class="card-footer">
          <span>${escapeHtml(item.category)}</span>
          ${currentUser ? `<button class="btn" onclick="event.stopPropagation(); toggleFavorite('${item.id}')">${isFav ? '❤️' : '🤍'}</button>` : ''}
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function handleSearch() {
  loadListings();
}

async function handleCreateListing(e) {
  e.preventDefault();
  if (!currentUser) return alert('You must be logged in to post listings.');

  const payload = {
    seller_id: currentUser.id,
    title: $('listTitle').value,
    price: parseFloat($('listPrice').value),
    category: $('listCategory').value,
    description: $('listDesc').value,
    image_url: $('listImageUrl').value,
    status: 'active'
  };

  const { error } = await supabaseClient.from('listings').insert([payload]);
  if (error) {
    alert(error.message);
  } else {
    alert('Listing published successfully!');
    $('createListingForm').reset();
    navigateTo('homePage');
  }
}

async function loadFavoriteIds() {
  if (!currentUser) return;
  const { data } = await supabaseClient.from('favorites').select('listing_id').eq('user_id', currentUser.id);
  if (data) {
    favoriteListingIds = new Set(data.map(f => f.listing_id));
  }
}

async function toggleFavorite(listingId) {
  if (!currentUser) return;

  if (favoriteListingIds.has(listingId)) {
    await supabaseClient.from('favorites').delete().eq('user_id', currentUser.id).eq('listing_id', listingId);
    favoriteListingIds.delete(listingId);
  } else {
    await supabaseClient.from('favorites').insert([{ user_id: currentUser.id, listing_id: listingId }]);
    favoriteListingIds.add(listingId);
  }
  
  loadListings();
  if ($('favsPage').classList.contains('active')) loadFavorites();
}

async function loadFavorites() {
  if (!currentUser) return;
  const { data } = await supabaseClient.from('favorites').select('listing_id, listings(*)').eq('user_id', currentUser.id);
  const listings = data ? data.map(d => d.listings).filter(Boolean) : [];
  renderListingsGrid(listings, $('favsGrid'));
}

function openProductModal(item) {
  const modal = $('productModal');
  $('modalDetails').innerHTML = `
    <img src="${escapeHtml(item.image_url)}" style="width:100%; max-height: 300px; object-fit: cover; border-radius:6px; margin-bottom:1rem;">
    <h2>${escapeHtml(item.title)}</h2>
    <h3 style="color:var(--primary); margin:0.5rem 0;">$${Number(item.price).toFixed(2)}</h3>
    <p><strong>Category:</strong> ${escapeHtml(item.category)}</p>
    <p style="margin-top:0.5rem;">${escapeHtml(item.description)}</p>
    ${currentUser && currentUser.id !== item.seller_id ? 
      `<button class="btn btn-primary" style="margin-top:1rem; width:100%;" onclick="messageSeller('${item.id}', '${item.seller_id}')">Contact Seller</button>` : ''}
  `;
  modal.classList.add('active');
}

function closeModal() {
  $('productModal').classList.remove('active');
}

/* --------------------------------------------------------------------------
   SECTION 7: MESSAGING SYSTEM & CHAT ENGINE
   -------------------------------------------------------------------------- */
function getConversationRecipient() {
  return currentConversationRecipientId || null;
}

async function messageSeller(listingId, sellerId) {
  closeModal();
  if (!currentUser) return navigateTo('authPage');
  if (sellerId === currentUser.id) return alert("You cannot message yourself.");

  openConversation(sellerId, sellerId, listingId);
  navigateTo('messagesPage');
}

async function openConversation(conversationId, otherUserId, listingId = null) {
  currentConversationId = conversationId;
  currentConversationListingId = listingId;
  currentConversationRecipientId = otherUserId;

  $('chatInputArea').style.display = 'flex';
  await loadConversationMessages(otherUserId, listingId);
}

async function loadConversations() {
  if (!currentUser) return;
  const { data, error } = await supabaseClient
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
    .order('created_at', { ascending: false });

  if (error) return console.error(error);

  const conversationsMap = new Map();
  data.forEach(msg => {
    const otherId = msg.sender_id === currentUser.id ? msg.receiver_id : msg.sender_id;
    if (!conversationsMap.has(otherId)) {
      conversationsMap.set(otherId, msg);
    }
  });

  const listContainer = $('conversationsList');
  listContainer.innerHTML = '';

  conversationsMap.forEach((lastMsg, otherId) => {
    const item = document.createElement('div');
    item.className = `chat-item ${currentConversationRecipientId === otherId ? 'active' : ''}`;
    item.onclick = () => openConversation(otherId, otherId, lastMsg.listing_id);
    item.innerHTML = `
      <strong>User ID: ...${otherId.slice(-6)}</strong>
      <p style="font-size:0.75rem; color:var(--text-muted); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">
        ${escapeHtml(lastMsg.content)}
      </p>
    `;
    listContainer.appendChild(item);
  });
}

async function loadConversationMessages(recipientId, listingId) {
  if (!currentUser || !recipientId) return;

  const { data, error } = await supabaseClient
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${currentUser.id})`)
    .order('created_at', { ascending: true });

  if (error) return console.error(error);

  const msgContainer = $('chatMessages');
  msgContainer.innerHTML = '';

  data.forEach(msg => {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${msg.sender_id === currentUser.id ? 'sent' : 'received'}`;
    msgDiv.innerText = msg.content;
    msgContainer.appendChild(msgDiv);
  });

  msgContainer.scrollTop = msgContainer.scrollHeight;
}

async function sendMessage() {
  const recipientId = getConversationRecipient();
  const content = $('chatInput').value.trim();

  if (!recipientId) return alert('Unable to identify the recipient.');
  if (!content) return;

  const payload = {
    sender_id: currentUser.id,
    receiver_id: recipientId,
    listing_id: currentConversationListingId,
    content: content
  };

  const { error } = await supabaseClient.from('messages').insert([payload]);
  if (error) {
    alert(error.message);
  } else {
    $('chatInput').value = '';
    loadConversationMessages(recipientId, currentConversationListingId);
    loadConversations();
  }
}

/* --------------------------------------------------------------------------
   SECTION 8 & 9: COUNTERS, REALTIME SYNC & LIFECYCLE
   -------------------------------------------------------------------------- */
async function updateAllCounters() {
  if (!currentUser) return;
  const { count, error } = await supabaseClient
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', currentUser.id)
    .eq('is_read', false);

  if (!error && count !== null) {
    const badge = $('msgCounter');
    if (count > 0) {
      badge.innerText = count;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
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
}

function handleVisibilityChange() {
  if (!document.hidden && currentUser) {
    updateAllCounters();
    const messagesPage = $('messagesPage');
    if (currentConversationRecipientId && messagesPage && messagesPage.classList.contains('active')) {
      loadConversationMessages(currentConversationRecipientId, currentConversationListingId);
    }
  }
}

// Bind App Visibility Listener
document.addEventListener('visibilitychange', handleVisibilityChange);

// Initial Execution Step
loadListings();
