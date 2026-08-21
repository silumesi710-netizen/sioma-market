
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Buy and Sell locally in Sioma</title>
    
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: Arial, sans-serif;
            background: #f4f6f8;
            color: #222;
        }

        /* HEADER */
        header {
            background: #087f3d;
            padding: 20px 15px 25px;
            text-align: center;
        }

        /* LOGO */
        .logo {
            color: white;
            font-size: 30px;
            font-weight: bold;
            margin-bottom: 20px;
        }

        .logo span {
            color: #ffd166;
        }

        /* SEARCH BAR */
        .search-container {
            max-width: 650px;
            margin: 0 auto 20px;
            display: flex;
            background: white;
            border-radius: 50px;
            padding: 5px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .search-container input {
            flex: 1;
            border: none;
            outline: none;
            padding: 13px 18px;
            font-size: 16px;
            border-radius: 50px;
        }

        .search-button {
            border: none;
            background: #ffb703;
            color: #222;
            padding: 12px 20px;
            border-radius: 50px;
            font-weight: bold;
            cursor: pointer;
        }

        .search-button:hover {
            background: #f4a900;
        }

        /* BUY & SELL BUTTONS */
        .action-buttons {
            display: flex;
            justify-content: center;
            gap: 15px;
        }

        .action-buttons button {
            min-width: 130px;
            padding: 13px 25px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
        }

        .buy-button {
            background: white;
            color: #087f3d;
        }

        .sell-button {
            background: #ffb703;
            color: #222;
        }

        .action-buttons button:hover {
            transform: translateY(-2px);
        }

        /* MAIN */
        main {
            max-width: 1100px;
            margin: auto;
            padding: 35px 15px;
            text-align: center;
        }

        .welcome {
            margin-bottom: 30px;
        }

        .welcome h1 {
            color: #087f3d;
            margin-bottom: 10px;
        }

        .welcome p {
            color: #666;
        }

        /* CATEGORIES */
        .categories {
            display: grid;
            grid-template-columns: repeat(
                auto-fit,
                minmax(120px, 1fr)
            );
            gap: 15px;
            margin-top: 25px;
        }

        .category {
            background: white;
            padding: 20px 10px;
            border-radius: 10px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.08);
            cursor: pointer;
        }

        .category-icon {
            font-size: 30px;
            display: block;
            margin-bottom: 8px;
        }

        .category:hover {
            transform: translateY(-3px);
        }

        /* FOOTER */
        footer {
            background: #123524;
            color: white;
            text-align: center;
            padding: 25px 15px;
            margin-top: 30px;
        }

        /* MOBILE */
        @media (max-width: 600px) {

            .logo {
                font-size: 26px;
            }

            .search-container {
                width: 100%;
            }

            .search-container input {
                min-width: 0;
            }

            .search-button {
                padding: 11px 15px;
            }

            .action-buttons {
                width: 100%;
            }

            .action-buttons button {
                flex: 1;
                min-width: 0;
            }

        }
    </style>
</head>

<body>

    <!-- HEADER -->
    <header>

        <div class="logo">
            🛍️ Sioma<span>Market</span>
        </div>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
        <!-- SEARCH BAR -->
        <div class="search-container">

            <input
                type="search"
                id="searchInput"
                placeholder="Search products, services..."
            >

            <button
                class="search-button"
                onclick="searchMarket()">
                🔍 Search
            </button>

        </div>

        <!-- BUY & SELL -->
        <div class="action-buttons">

            <button
                class="buy-button"
                onclick="buyNow()">
                🛒 BUY
            </button>

            <button
                class="sell-button"
                onclick="sellNow()">
                🏷️ SELL
            </button>

        </div>

    </header>


    <!-- MAIN CONTENT -->
    <main>

        <section class="welcome">

            <h1>
                Welcome to SiomaMarket
            </h1>

            <p>
                Buy local. Sell local. Grow together.
            </p>

        </section>


        <h2>
            Browse Categories
        </h2>


        <div class="categories">

            <div class="category">
                <span class="category-icon">🌾</span>
                Agriculture
            </div>

            <div class="category">
                <span class="category-icon">🐔</span>
                Livestock
            </div>

            <div class="category">
                <span class="category-icon">🐟</span>
                Fish
            </div>

            <div class="category">
                <span class="category-icon">📱</span>
                Phones
            </div>

            <div class="category">
                <span class="category-icon">🚗</span>
                Vehicles
            </div>

            <div class="category">
                <span class="category-icon">🏠</span>
                Houses
            </div>

            <div class="category">
                <span class="category-icon">👕</span>
                Clothes
            </div>

            <div class="category">
                <span class="category-icon">🛠️</span>
                Services
            </div>

        </div>

    </main>


    <!-- FOOTER -->
    <footer>

        <h3>
            🛍️ SiomaMarket
        </h3>

        <p>
            Your local marketplace in Sioma
        </p>

         <p>
    Buy and sell locally in Sioma.
         </p>
        <p>
            © 2026 SiomaMarket
        </p>

    </footer>


    <!-- JAVASCRIPT -->
    <script>

    
const SUPABASE_URL =
"https://luolbdjonzissgskjupd.supabase.co";

const SUPABASE_KEY =
"sb_publishable_bMHzln24777v-kDo-uE8Eg_AYUWThn-";

const supabaseClient =
window.supabase.createClient(
SUPABASE_URL,
SUPABASE_KEY
);


async function searchMarket() {

const searchInput =
document.getElementById(
"searchInput"
);

const search =
searchInput.value.trim();


if (search === "") {

alert(
"Please enter a product to search."
);

return;
}


const {
data,
error
} =
await supabaseClient
.from("listings")
.select("*")
.eq("status", "active")
.ilike(
"title",
"%" + search + "%"
);


if (error) {

console.error(error);

alert(
"Search failed."
);

return;
}


console.log(
"Results:",
data
);


if (data.length === 0) {

alert(
"No products found."
);

return;
}


alert(
data.length +
" product(s) found!"
);

}
async function viewListing(id) {

    /* SHOW LOADING PAGE */

    const productPage =
        document.getElementById(
            "productPage"
        );

    productPage.style.display =
        "block";


    document.body.style.overflow =
        "hidden";


    document.getElementById(
        "detailsTitle"
    ).innerText =
        "Loading product...";


    /* GET PRODUCT */

    const {
        data,
        error
    } =
    await supabaseClient

        .from("listings")

        .select(`
            id,
            title,
            description,
            price,
            category,
            location,
            image_url,
            seller_id,
            profiles (
                full_name,
                phone
            )
        `)

        .eq(
            "id",
            id
        )

        .single();


    /* ERROR */

    if (error) {

        console.error(error);

        document.getElementById(
            "detailsTitle"
        ).innerText =
            "Unable to load product.";

        return;
    }


    /* PRODUCT IMAGE */

    const image =
        data.image_url ||
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80";


    document.getElementById(
        "detailsImage"
    ).src =
        image;


    /* TITLE */

    document.getElementById(
        "detailsTitle"
    ).innerText =
        data.title;


    /* PRICE */

    document.getElementById(
        "detailsPrice"
    ).innerText =
        "K" +
        Number(
            data.price
        ).toLocaleString();


    /* CATEGORY */

    document.getElementById(
        "detailsCategory"
    ).innerText =
        data.category;


    /* LOCATION */

    document.getElementById(
        "detailsLocation"
    ).innerText =
        "📍 " +
        (
            data.location ||
            "Sioma"
        );


    /* DESCRIPTION */

    document.getElementById(
        "detailsDescription"
    ).innerText =
        data.description ||
        "No description provided.";


    /* SELLER */

    const seller =
        data.profiles;


    document.getElementById(
        "detailsSeller"
    ).innerText =

        seller &&
        seller.full_name

        ? seller.full_name

        : "Sioma Seller";


    /* PHONE */

    document.getElementById(
        "detailsPhone"
    ).innerText =

        seller &&
        seller.phone

        ? seller.phone

        : "Phone number not provided";


    /* WHATSAPP BUTTON */

    const whatsappButton =
        document.getElementById(
            "whatsappButton"
        );


    if (
        seller &&
        seller.phone
    ) {

        whatsappButton.style.display =
            "block";


        whatsappButton.onclick =
            function() {

                contactSeller(
                    seller.phone,
                    data.title
                );

            };

    } else {

        whatsappButton.style.display =
            "none";

    }

}

    </script>
<!-- PRODUCT DETAILS PAGE -->

<div id="productPage" class="product-page">

    <div class="product-page-header">

        <button
            class="back-button"
            onclick="closeProductPage()">
            ← Back
        </button>

        <h2>Product Details</h2>

    </div>


    <div class="product-details">

        <div class="details-image-container">

            <img
                id="detailsImage"
                src=""
                alt="Product photo"
                class="details-image">

        </div>


        <div class="details-content">

            <div class="details-category"
                 id="detailsCategory">
            </div>

            <h1 id="detailsTitle">
                Product
            </h1>

            <div
                class="details-price"
                id="detailsPrice">
                K0
            </div>

            <div
                class="details-location"
                id="detailsLocation">
                📍 Sioma
            </div>

            <hr>

            <h3>Description</h3>

            <p
                id="detailsDescription"
                class="details-description">
            </p>

            <hr>

            <h3>Seller</h3>

            <div class="seller-box">

                <div class="seller-icon">
                    👤
                </div>

                <div>

                    <strong
                        id="detailsSeller">
                        Seller
                    </strong>

                    <div
                        id="detailsPhone">
                    </div>

                </div>

            </div>


            <button
                id="whatsappButton"
                class="whatsapp-button">

                💬 Contact Seller on WhatsApp

            </button>

        </div>

    </div>

</div>
</body>
</html>
