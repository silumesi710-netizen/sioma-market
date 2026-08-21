
<html lang="en">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width, initial-scale=1.0">

<title>Sioma Market</title>

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<style>

*{
    box-sizing:border-box;
    margin:0;
    padding:0;
}


/* MAIN CENTER CONTAINER */
.container {
width: 100%;
max-width: 1100px;
margin: 0 auto;
padding: 0 15px;
}
body{
    font-family:Arial,sans-serif;
    background:#f5f7f5;
    color:#222;
}

header{
    background:#087f3d;
    color:white;
    padding:15px;
    position:sticky;
    top:0;
    z-index:100;
}

.header{
    max-width:1100px;
    margin:auto;
    display:flex;
    justify-content:space-between;
    align-items:center;
}

.logo{
    font-size:23px;
    font-weight:bold;
}

button{
    cursor:pointer;
}

.sell{
    background:#ffb703;
    border:0;
    padding:10px 15px;
    border-radius:7px;
    font-weight:bold;
}

.search{
    max-width:1100px;
    margin:12px auto 0;
}

.search input{
    width:100%;
    padding:14px;
    border:0;
    border-radius:8px;
    font-size:16px;
}

.hero{
    background:linear-gradient(
        135deg,
        #087f3d,
        #18a558
    );
    color:white;
    text-align:center;
    padding:40px 15px;
}

.hero h1{
    font-size:32px;
    margin-bottom:10px;
}

.hero p{
    margin-bottom:20px;
}

.hero button{
    border:0;
    background:#ffb703;
    padding:13px 22px;
    border-radius:8px;
    font-weight:bold;
}

.container{
    max-width:1100px;
    margin:auto;
    padding:20px 15px;
}

.section-title{
    margin:15px 0;
}

.categories{
    display:flex;
    gap:10px;
    overflow-x:auto;
}

.category{
    background:white;
    min-width:100px;
    padding:15px 8px;
    border-radius:10px;
    text-align:center;
    box-shadow:0 2px 7px rgba(0,0,0,.08);
}

.category span{
    display:block;
    font-size:27px;
    margin-bottom:7px;
}

.products{
    display:grid;
    grid-template-columns:repeat(2,1fr);
    gap:15px;
}

.product{
    background:white;
    border-radius:12px;
    overflow:hidden;
    box-shadow:0 2px 8px rgba(0,0,0,.08);
}

.product img{
    width:100%;
    height:160px;
    object-fit:cover;
}

.product-info{
    padding:12px;
}

.product-title{
    font-weight:bold;
    margin-bottom:7px;
}

.price{
    color:#087f3d;
    font-size:18px;
    font-weight:bold;
}

.location{
    color:#777;
    font-size:13px;
    margin:7px 0;
}

.view{
    width:100%;
    padding:10px;
    background:#087f3d;
    color:white;
    border:0;
    border-radius:6px;
}

.modal{
    display:none;
    position:fixed;
    inset:0;
    background:rgba(0,0,0,.6);
    z-index:200;
    padding:20px;
    overflow:auto;
}

.modal-box{
    background:white;
    max-width:500px;
    margin:30px auto;
    padding:20px;
    border-radius:12px;
}

.close{
    float:right;
    font-size:25px;
}

.form-group{
    margin:14px 0;
}

.form-group label{
    display:block;
    font-weight:bold;
    margin-bottom:5px;
}

.form-group input,
.form-group textarea,
.form-group select{
    width:100%;
    padding:11px;
    border:1px solid #ccc;
    border-radius:7px;
}

.form-group textarea{
    height:90px;
}

.primary{
    width:100%;
    padding:13px;
    background:#087f3d;
    color:white;
    border:0;
    border-radius:7px;
    font-weight:bold;
}

.auth-status{
    text-align:center;
    margin:10px;
}

.user-btn{
    background:white;
    border:0;
    padding:8px 12px;
    border-radius:7px;
    margin-right:5px;
}

.empty{
    text-align:center;
    padding:30px;
}

footer{
    background:#123524;
    color:white;
    text-align:center;
    padding:30px;
    margin-top:30px;
}

@media(min-width:700px){

    .products{
        grid-template-columns:
        repeat(4,1fr);
    }

    .hero h1{
        font-size:42px;
    }

}

</style>

</head>


<body>


<header>

<div class="header">

<div class="logo">
🛍️ Sioma Market
</div>

<div>

<button
class="user-btn"
onclick="openAuth()">
Account
</button>

<button
class="sell"
onclick="openSell()">
+ Sell
</button>

</div>

</div>


<div class="search">

<input
id="search"
placeholder="Search Sioma Market..."
oninput="loadListings()">

</div>

</header>


<section class="hero">

<h1>
Buy & Sell in Sioma
</h1>

<p>
Find products and services near you.
</p>

<button onclick="openSell()">
Start Selling
</button>

</section>


<div class="auth-status"
id="authStatus">
Not logged in
</div>


<main class="container">


<h2 class="section-title">
Categories
</h2>


<section class="categories">

<div class="container">

<h2>Categories</h2>

<div class="category-grid">

<button onclick="filterCategory('Farm Produce')">
🌽<br>Farm Produce
</button>

<button onclick="filterCategory('Livestock')">
🐐<br>Livestock
</button>

<button onclick="filterCategory('Fish')">
🐟<br>Fish
</button>

<button onclick="filterCategory('Poultry')">
🐔<br>Poultry
</button>

<button onclick="filterCategory('Electronics')">
📱<br>Electronics
</button>

<button onclick="filterCategory('Services')">
🔧<br>Services
</button>

<button onclick="filterCategory('Property')">
🏠<br>Property
</button>

</div>
<div
class="categories"
id="categories">
</div>


<h2 class="section-title">
Latest Listings
</h2>


<div
class="products"
id="products">

<div class="empty">
Loading listings...
</div>

</div>


</main>


<!-- PRODUCT MODAL -->

<div
class="modal"
id="productModal">

<div class="modal-box">

<button
class="close"
onclick="closeProduct()">
×
</button>

<h2 id="pTitle"></h2>

<br>

<p id="pDescription"></p>

<br>

<h3 id="pPrice"></h3>

<p id="pCategory"></p>

<p id="pLocation"></p>

<br>

<button
class="primary"
id="contactButton">
Contact Seller
</button>

</div>

</div>


<!-- AUTH MODAL -->

<div
class="modal"
id="authModal">

<div class="modal-box">

<button
class="close"
onclick="closeAuth()">
×
</button>


<h2>
Create / Login Account
</h2>


<div class="form-group">

<label>Email</label>

<input
type="email"
id="email"
placeholder="your@email.com">

</div>


<div class="form-group">

<label>Password</label>

<input
type="password"
id="password"
placeholder="Minimum 6 characters">

</div>


<div class="form-group">

<label>Your name</label>

<input
type="text"
id="fullName"
placeholder="Your name">

</div>


<div class="form-group">

<label>Phone</label>

<input
type="text"
id="phone"
placeholder="097XXXXXXX">

</div>


<button
class="primary"
onclick="signUp()">
Create Account
</button>

<br><br>

<button
class="primary"
onclick="signIn()">
Login
</button>

<br><br>

<button
class="primary"
onclick="signOut()">
Logout
</button>

</div>

</div>


<!-- SELL MODAL -->

<div
class="modal"
id="sellModal">

<div class="modal-box">

<button
class="close"
onclick="closeSell()">
×
</button>

<h2>
Sell Something
</h2>


<div class="form-group">

<label>Product name</label>

<input
id="title"
placeholder="Example: Fresh Fish">

</div>


<div class="form-group">

<label>Price in ZMW</label>

<input
type="number"
id="price"
placeholder="Example: 100">

</div>


<div class="form-group">

<label>Category</label>

<select id="category">

<option>Agriculture</option>
<option>Livestock</option>
<option>Fish</option>
<option>Phones</option>
<option>Vehicles</option>
<option>Services</option>
<option>Clothes</option>
<option>Houses & Land</option>

</select>

</div>


<div class="form-group">

<label>Location</label>

<input
id="location"
value="Sioma">

</div>


<div class="form-group">

<label>Description</label>

<textarea
id="description"
placeholder="Describe your item">
</textarea>

</div>


<div class="form-group">

<label>Product photo</label>

<input
type="file"
id="image"
accept="image/*">

</div>


<button
class="primary"
onclick="createListing()">

Publish Listing

</button>

</div>

</div>


<footer>

<h3>
🛍️ Sioma Market
</h3>

<p>
Buy local. Sell local. Grow Sioma.
</p>

<p>
© 2026 Sioma Market
</p>

</footer>


<script>

/* ==========================================
   SUPABASE CONNECTION
========================================== */

const SUPABASE_URL =
"YOUR_SUPABASE_URL";

const SUPABASE_KEY =
"YOUR_SUPABASE_PUBLISHABLE_KEY";


const supabaseClient =
window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


/* ==========================================
   GLOBAL VARIABLES
========================================== */

let currentUser = null;

let selectedSellerPhone = "";


/* ==========================================
   CHECK LOGIN
========================================== */

async function checkUser(){

    const {
        data
    } =
    await supabaseClient
    .auth
    .getUser();


    currentUser =
        data.user || null;


    updateAuthStatus();

}


/* ==========================================
   AUTH STATUS
========================================== */

function updateAuthStatus(){

    const status =
        document.getElementById(
            "authStatus"
        );


    if(currentUser){

        status.innerText =
            "Logged in: " +
            (currentUser.email || "");

    }else{

        status.innerText =
            "Not logged in";

    }

}


/* ==========================================
   SIGN UP
========================================== */

async function signUp(){

    const email =
        document.getElementById(
            "email"
        ).value.trim();


    const password =
        document.getElementById(
            "password"
        ).value;


    const fullName =
        document.getElementById(
            "fullName"
        ).value.trim();


    const phone =
        document.getElementById(
            "phone"
        ).value.trim();


    if(!email ||
       !password ||
       !fullName){

        alert(
            "Please enter email, password and name."
        );

        return;

    }


    const {
        data,
        error
    } =
    await supabaseClient
    .auth
    .signUp({

        email: email,

        password: password

    });


    if(error){

        alert(error.message);

        return;

    }


    if(!data.user){

        alert(
            "Check your email to confirm your account."
        );

        return;

    }


    const {
        error: profileError
    } =
    await supabaseClient
    .from("profiles")
    .insert({

        id: data.user.id,

        full_name: fullName,

        phone: phone,

        location: "Sioma"

    });


    if(profileError){

        alert(profileError.message);

        return;

    }


    currentUser =
        data.user;


    updateAuthStatus();


    alert(
        "Account created successfully."
    );

}


/* ==========================================
   LOGIN
========================================== */

async function signIn(){

    const email =
        document.getElementById(
            "email"
        ).value.trim();


    const password =
        document.getElementById(
            "password"
        ).value;


    const {
        data,
        error
    } =
    await supabaseClient
    .auth
    .signInWithPassword({

        email: email,

        password: password

    });


    if(error){

        alert(error.message);

        return;

    }


    currentUser =
        data.user;


    updateAuthStatus();


    closeAuth();


    alert("Login successful.");

}


/* ==========================================
   LOGOUT
========================================== */

async function signOut(){

    await supabaseClient
    .auth
    .signOut();


    currentUser = null;

    updateAuthStatus();

    alert("Logged out.");

}


/* ==========================================
   LOAD CATEGORIES
========================================== */

async function loadCategories(){

    const {
        data,
        error
    } =
    await supabaseClient
    .from("categories")
    .select("*")
    .order("id");


    if(error){

        console.log(error);

        return;

    }


    const box =
        document.getElementById(
            "categories"
        );


    box.innerHTML = "";


    data.forEach(category => {

        const button =
            document.createElement(
                "button"
            );


        button.className =
            "category";


        button.innerHTML =
            `
            <span>
                ${category.icon || "📦"}
            </span>

            ${category.name}
            `;


        button.onclick = () => {

            loadListings(
                category.name
            );

        };


        box.appendChild(button);

    });

}


/* ==========================================
   LOAD LISTINGS
========================================== */

async function loadListings(
    categoryFilter = ""
){

    const search =
        document.getElementById(
            "search"
        ).value.trim();


    let query =
        supabaseClient
        .from("listings")
        .select(`
            id,
            seller_id,
            title,
            description,
            price,
            category,
            location,
            image_url,
            created_at,
            profiles(
                full_name,
                phone
            )
        `)
        .eq("status","active")
        .order(
            "created_at",
            {
                ascending:false
            }
        );


    if(search){

        query =
            query.ilike(
                "title",
                "%" + search + "%"
            );

    }


    if(categoryFilter){

        query =
            query.eq(
                "category",
                categoryFilter
            );

    }


    const {
        data,
        error
    } =
    await query;


    if(error){

        console.log(error);

        document.getElementById(
            "products"
        ).innerHTML =

        `
        <div class="empty">
            Could not load listings.
        </div>
        `;

        return;

    }


    displayListings(data);

}


/* ==========================================
   DISPLAY LISTINGS
========================================== */

function displayListings(
    listings
){

    const box =
        document.getElementById(
            "products"
        );


    box.innerHTML = "";


    if(!listings.length){

        box.innerHTML =
        `
        <div class="empty">
            No listings found.
        </div>
        `;

        return;

    }


    listings.forEach(item => {

        const card =
            document.createElement(
                "div"
            );


        card.className =
            "product";


        const image =
            item.image_url ||
            "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80";


        card.innerHTML = `

        <img
            src="${image}"
            alt="${escapeHTML(item.title)}"
        >

        <div class="product-info">

            <div class="product-title">

                ${escapeHTML(item.title)}

            </div>

            <div class="price">

                K${Number(item.price)
                    .toLocaleString()}

            </div>

            <div class="location">

                📍 ${escapeHTML(
                    item.location || "Sioma"
                )}

            </div>

            <button class="view">

                View Details

            </button>

        </div>

        `;


        card
        .querySelector(".view")
        .onclick = () => {

            showProduct(item);

        };


        box.appendChild(card);

    });

}


/* ==========================================
   SHOW PRODUCT
========================================== */

function showProduct(item){

    document.getElementById(
        "pTitle"
    ).innerText =
        item.title;


    document.getElementById(
        "pDescription"
    ).innerText =
        item.description || "";


    document.getElementById(
        "pPrice"
    ).innerText =
        "K" +
        Number(item.price)
        .toLocaleString();


    document.getElementById(
        "pCategory"
    ).innerText =
        "Category: " +
        item.category;


    document.getElementById(
        "pLocation"
    ).innerText =
        "📍 " +
        (item.location || "Sioma");


    selectedSellerPhone =
        item.profiles?.phone || "";


    document.getElementById(
        "productModal"
    ).style.display =
        "block";

}


/* ==========================================
   CONTACT SELLER
========================================== */

function contactSeller(){

    if(!selectedSellerPhone){

        alert(
            "The seller has not provided a phone number."
        );

        return;

    }


    let phone =
        selectedSellerPhone
        .replace(/\D/g,"");


    if(phone.startsWith("0")){

        phone =
            "260" +
            phone.substring(1);

    }


    const url =
        "https://wa.me/" +
        phone;


    window.open(
        url,
        "_blank"
    );

}


document
.getElementById(
    "contactButton"
)
.onclick =
contactSeller;


/* ==========================================
   CREATE LISTING
========================================== */

async function createListing(){

    if(!currentUser){

        alert(
            "Please create an account or login first."
        );

        openAuth();

        return;

    }


    const title =
        document.getElementById(
            "title"
        ).value.trim();


    const price =
        document.getElementById(
            "price"
        ).value;


    const category =
        document.getElementById(
            "category"
        ).value;


    const location =
        document.getElementById(
            "location"
        ).value.trim();


    const description =
        document.getElementById(
            "description"
        ).value.trim();


    const imageInput =
        document.getElementById(
            "image"
        );


    if(!title || !price){

        alert(
            "Product name and price are required."
        );

        return;

    }


    let imageUrl = null;


    /* UPLOAD IMAGE */

    if(
        imageInput.files &&
        imageInput.files.length > 0
    ){

        const file =
            imageInput.files[0];


        const extension =
            file.name
            .split(".")
            .pop();


        const fileName =
            currentUser.id +
            "/" +
            Date.now() +
            "." +
            extension;


        const {
            error:
            uploadError
        } =
        await supabaseClient
        .storage
        .from(
            "listing-images"
        )
        .upload(
            fileName,
            file
        );


        if(uploadError){

            alert(
                uploadError.message
            );

            return;

        }


        const {
            data:
            publicData
        } =
        supabaseClient
        .storage
        .from(
            "listing-images"
        )
        .getPublicUrl(
            fileName
        );


        imageUrl =
            publicData.publicUrl;

    }


    /* SAVE DATABASE RECORD */

    const {
        error
    } =
    await supabaseClient
    .from("listings")
    .insert({

        seller_id:
            currentUser.id,

        title: title,

        description:
            description,

        price:
            Number(price),

        category:
            category,

        location:
            location || "Sioma",

        image_url:
            imageUrl,

        status:
            "active"

    });


    if(error){

        alert(
            error.message
        );

        return;

    }


    alert(
        "Your listing has been published!"
    );


    document.getElementById(
        "title"
    ).value = "";


    document.getElementById(
        "price"
    ).value = "";


    document.getElementById(
        "description"
    ).value = "";


    document.getElementById(
        "image"
    ).value = "";


    closeSell();


    loadListings();

}


/* ==========================================
   HTML SECURITY
========================================== */

function escapeHTML(
    text
){

    return String(text)
    .replace(
        /[&<>"']/g,
        function(match){

            return {

                "&":"&amp;",
                "<":"&lt;",
                ">":"&gt;",
                '"':"&quot;",
                "'":"&#039;"

            }[match];

        }
    );

}


/* ==========================================
   MODALS
========================================== */

function openAuth(){

    document.getElementById(
        "authModal"
    ).style.display =
        "block";

}


function closeAuth(){

    document.getElementById(
        "authModal"
    ).style.display =
        "none";

}


function openSell(){

    document.getElementById(
        "sellModal"
    ).style.display =
        "block";

}


function closeSell(){

    document.getElementById(
        "sellModal"
    ).style.display =
        "none";

}


function closeProduct(){

    document.getElementById(
        "productModal"
    ).style.display =
        "none";

}


/* ==========================================
   START APP
========================================== */

async function start(){

    await checkUser();

    await loadCategories();

    await loadListings();

}


start();

</script>

</body>

</html>
