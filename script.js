/* =========================================
   SIOMA MARKET - SCRIPT.JS
========================================= */


/* =========================================
   SUPABASE
========================================= */

const SUPABASE_URL =
    "https://luolbdjonzissgskjupd.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_bMHzln24777v-kDo-uE8Eg_AYUWThn-";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


/* =========================================
   SEARCH PRODUCTS
========================================= */

async function searchMarket() {

    const input =
        document.getElementById("searchInput");

    const results =
        document.getElementById("searchResults");

    if (!input || !results) {
        alert("Search section is missing.");
        return;
    }

    const search =
        input.value.trim();

    if (!search) {

        results.innerHTML =
            "<p>Please enter a product.</p>";

        return;
    }

    results.innerHTML =
        "<p>🔎 Searching...</p>";

    const { data, error } =
        await supabaseClient
            .from("listings")
            .select("*")
            .eq("status", "active")
            .ilike(
                "title",
                "%" + search + "%"
            );

    if (error) {

        console.error(
            "SEARCH ERROR:",
            error
        );

        results.innerHTML =
            "<p>❌ Search failed.</p>";

        return;
    }

    if (!data || data.length === 0) {

        results.innerHTML =
            "<p>🔍 No products found.</p>";

        return;
    }

    displayProducts(
        data,
        "🔎 Search Results"
    );

    results.scrollIntoView({
        behavior: "smooth"
    });
}


/* =========================================
   BUY NOW
========================================= */

async function buyNow() {

    const results =
        document.getElementById(
            "searchResults"
        );

    if (!results) {

        alert(
            "Search results section is missing."
        );

        return;
    }

    results.innerHTML = `
        <div class="no-results">
            🔎 Loading products...
        </div>
    `;

    const { data, error } =
        await supabaseClient
            .from("listings")
            .select("*")
            .eq("status", "active")
            .order(
                "created_at",
                {
                    ascending: false
                }
            );

    if (error) {

        console.error(
            "BUY NOW ERROR:",
            error
        );

        results.innerHTML = `
            <div class="no-results">
                ❌ Unable to load products.
            </div>
        `;

        return;
    }

    if (!data || data.length === 0) {

        results.innerHTML = `
            <div class="no-results">
                🛒 No products are currently available.
            </div>
        `;

        return;
    }

    displayProducts(
        data,
        "🛒 Products for Sale"
    );

    results.scrollIntoView({
        behavior: "smooth"
    });
}


/* =========================================
   DISPLAY PRODUCT CARDS
========================================= */

function displayProducts(
    products,
    heading
) {

    const results =
        document.getElementById(
            "searchResults"
        );

    let html = `
        <h2>${heading}</h2>

        <div class="results-grid">
    `;

    products.forEach(
        function (product) {

            const image =
                product.image_url ||
                "https://via.placeholder.com/600x400?text=SiomaMarket";

            html += `

                <div class="result-card">

                    <img
                        src="${image}"
                        alt="${escapeHTML(
                            product.title ||
                            "Product"
                        )}"
                    >

                    <div class="result-info">

                        <h3>
                            ${escapeHTML(
                                product.title ||
                                "Product"
                            )}
                        </h3>

                        <p class="result-price">

                            K${Number(
                                product.price || 0
                            ).toLocaleString()}

                        </p>

                        <p>
                            📍 ${
                                escapeHTML(
                                    product.location ||
                                    "Sioma"
                                )
                            }
                        </p>

                        <button
                            class="buy-result"
                            onclick="viewListing('${product.id}')">

                            🛒 VIEW PRODUCT

                        </button>

                    </div>

                </div>
            `;
        }
    );

    html += `
        </div>
    `;

    results.innerHTML = html;
}


/* =========================================
   OPEN PRODUCT DETAILS
========================================= */

async function viewListing(id) {

    console.log(
        "VIEW PRODUCT:",
        id
    );

    const productPage =
        document.getElementById(
            "productPage"
        );

    if (!productPage) {

        alert(
            "Product details page is missing."
        );

        return;
    }

    productPage.style.display =
        "block";

    document.body.style.overflow =
        "hidden";


    document.getElementById(
        "detailsTitle"
    ).textContent =
        "Loading product...";


    const { data, error } =
        await supabaseClient
            .from("listings")
            .select("*")
            .eq("id", id)
            .single();


    if (error) {

        console.error(
            "PRODUCT ERROR:",
            error
        );

        document.getElementById(
            "detailsTitle"
        ).textContent =
            "Unable to load product.";

        return;
    }


    /* IMAGE */

    document.getElementById(
        "detailsImage"
    ).src =

        data.image_url ||

        "https://via.placeholder.com/800x500?text=SiomaMarket";


    /* TITLE */

    document.getElementById(
        "detailsTitle"
    ).textContent =

        data.title ||
        "Product";


    /* PRICE */

    document.getElementById(
        "detailsPrice"
    ).textContent =

        "K" +

        Number(
            data.price || 0
        ).toLocaleString();


    /* CATEGORY */

    document.getElementById(
        "detailsCategory"
    ).textContent =

        data.category ||
        "";


    /* LOCATION */

    document.getElementById(
        "detailsLocation"
    ).textContent =

        "📍 " +

        (
            data.location ||
            "Sioma"
        );


    /* DESCRIPTION */

    document.getElementById(
        "detailsDescription"
    ).textContent =

        data.description ||

        "No description provided.";


    /* SELLER */

    document.getElementById(
        "detailsSeller"
    ).textContent =

        data.seller_name ||

        "Sioma Seller";


    /* PHONE */

    document.getElementById(
        "detailsPhone"
    ).textContent =

        data.seller_phone ||

        "Phone number not provided";


    /* WHATSAPP */

    const whatsappButton =
        document.getElementById(
            "whatsappButton"
        );


    if (
        whatsappButton &&
        data.seller_phone
    ) {

        whatsappButton.style.display =
            "block";

        whatsappButton.onclick =
            function () {

                contactSeller(
                    data.seller_phone,
                    data.title
                );

            };

    }
    else if (whatsappButton) {

        whatsappButton.style.display =
            "none";
    }


    /* CALL BUTTON */

    const callButton =
        document.getElementById(
            "callButton"
        );


    if (
        callButton &&
        data.seller_phone
    ) {

        callButton.style.display =
            "block";

        callButton.onclick =
            function () {

                window.location.href =
                    "tel:" +
                    data.seller_phone;

            };

    }
    else if (callButton) {

        callButton.style.display =
            "none";
    }
}


/* =========================================
   CLOSE PRODUCT PAGE
========================================= */

function closeProductPage() {

    const productPage =
        document.getElementById(
            "productPage"
        );

    if (!productPage) return;

    productPage.style.display =
        "none";

    document.body.style.overflow =
        "auto";
}


/* =========================================
   WHATSAPP
========================================= */

function contactSeller(
    phone,
    product
) {

    let number =
        String(phone)
            .replace(/\D/g, "");


    if (
        number.startsWith("0")
    ) {

        number =
            "260" +
            number.substring(1);
    }


    const message =
        encodeURIComponent(
            "Hello, I found your " +
            product +
            " on SiomaMarket. Is it still available?"
        );


    window.open(
        "https://wa.me/" +
        number +
        "?text=" +
        message,
        "_blank"
    );
}


/* =========================================
   SAVE FAVORITE
========================================= */

function saveFavorite() {

    alert(
        "❤️ Product saved! Favorites will be added to your account soon."
    );
}


/* =========================================
   SELL NOW PAGE
========================================= */

function sellNow() {

    const sellPage =
        document.getElementById(
            "sellPage"
        );

    if (!sellPage) {

        alert(
            "SELL page not found."
        );

        return;
    }

    sellPage.style.display =
        "block";

    document.body.style.overflow =
        "hidden";
}


/* =========================================
   CLOSE SELL PAGE
========================================= */

function closeSellPage() {

    const sellPage =
        document.getElementById(
            "sellPage"
        );

    if (!sellPage) return;

    sellPage.style.display =
        "none";

    document.body.style.overflow =
        "auto";
}


/* =========================================
   SELL FORM
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

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
                    sellForm.querySelector(
                        ".publish-button"
                    );


                button.disabled =
                    true;

                button.textContent =
                    "⏳ Publishing...";


                const product = {

                    title:
                        document.getElementById(
                            "sellTitle"
                        ).value.trim(),

                    description:
                        document.getElementById(
                            "sellDescription"
                        ).value.trim(),

                    price:
                        Number(
                            document.getElementById(
                                "sellPrice"
                            ).value
                        ),

                    category:
                        document.getElementById(
                            "sellCategory"
                        ).value,

                    location:
                        document.getElementById(
                            "sellLocation"
                        ).value.trim(),

                    image_url:
                        document.getElementById(
                            "sellImage"
                        ).value.trim() ||
                        null,

                    seller_name:
                        document.getElementById(
                            "sellerName"
                        ).value.trim(),

                    seller_phone:
                        document.getElementById(
                            "sellerPhone"
                        ).value.trim(),

                    status:
                        "active"
                };


                try {

                    const {
                        data,
                        error
                    } =
                    await supabaseClient
                        .from("listings")
                        .insert([
                            product
                        ])
                        .select();


                    if (error) {

                        throw error;
                    }


                    message.innerHTML = `
                        ✅ <strong>
                        Product published successfully!
                        </strong>
                        <br><br>
                        Your product is now available
                        on SiomaMarket.
                    `;


                    message.style.color =
                        "#087f3d";


                    sellForm.reset();


                    document.getElementById(
                        "sellLocation"
                    ).value =
                        "Sioma";


                }
                catch (error) {

                    console.error(
                        "SELL ERROR:",
                        error
                    );


                    message.innerHTML = `
                        ❌ Could not publish product.
                        <br><br>
                        ${escapeHTML(
                            error.message
                        )}
                    `;


                    message.style.color =
                        "#c62828";
                }


                button.disabled =
                    false;

                button.textContent =
                    "🚀 PUBLISH PRODUCT";

            }
        );

    }
);


/* =========================================
   BASIC HTML ESCAPING
========================================= */

function escapeHTML(value) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
        }
