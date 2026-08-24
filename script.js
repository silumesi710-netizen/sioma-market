/* =========================================
   SIOMA MARKET - SCRIPT.JS
   Cleaned & Corrected Version
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
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

        if (error) {
            throw error;
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
            behavior: "smooth",
            block: "start"
        });

    } catch (error) {

        console.error(
            "SEARCH ERROR:",
            error
        );

        results.innerHTML =
            "<p>❌ Search failed. Please try again.</p>";
    }
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

    try {

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
            throw error;
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
            behavior: "smooth",
            block: "start"
        });

    } catch (error) {

        console.error(
            "BUY NOW ERROR:",
            error
        );

        results.innerHTML = `
            <div class="no-results">
                ❌ Unable to load products.
            </div>
        `;
    }
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

    if (!results) {
        return;
    }

    if (!Array.isArray(products)) {
        products = [];
    }

    let html = `
        <h2>${escapeHTML(heading)}</h2>

        <div class="results-grid">
    `;

    products.forEach(
        function (product) {

            const image =
                product.image_url ||
                "https://via.placeholder.com/600x400?text=SiomaMarket";

            const title =
                product.title ||
                "Product";

            const location =
                product.location ||
                "Sioma";

            const price =
                Number(product.price || 0);

            html += `

                <div class="result-card">

                    <img
                        src="${escapeHTML(image)}"
                        alt="${escapeHTML(title)}"
                        loading="lazy"
                        onerror="this.src='https://via.placeholder.com/600x400?text=SiomaMarket'"
                    >

                    <div class="result-info">

                        <h3>
                            ${escapeHTML(title)}
                        </h3>

                        <p class="result-price">
                            K${price.toLocaleString()}
                        </p>

                        <p>
                            📍 ${escapeHTML(location)}
                        </p>

                        <button
                            type="button"
                            class="buy-result"
                            onclick="viewListing('${escapeHTML(product.id)}')"
                        >
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

    const detailsTitle =
        document.getElementById(
            "detailsTitle"
        );

    if (detailsTitle) {
        detailsTitle.textContent =
            "Loading product...";
    }

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
                "Product was not found."
            );
        }


        /* =====================================
           IMAGE
        ===================================== */

        const detailsImage =
            document.getElementById(
                "detailsImage"
            );

        if (detailsImage) {

            detailsImage.src =
                data.image_url ||
                "https://via.placeholder.com/800x500?text=SiomaMarket";

            detailsImage.alt =
                data.title ||
                "SiomaMarket product";

            detailsImage.onerror =
                function () {

                    this.src =
                        "https://via.placeholder.com/800x500?text=SiomaMarket";
                };
        }


        /* =====================================
           TITLE
        ===================================== */

        if (detailsTitle) {

            detailsTitle.textContent =
                data.title ||
                "Product";
        }


        /* =====================================
           PRICE
        ===================================== */

        const detailsPrice =
            document.getElementById(
                "detailsPrice"
            );

        if (detailsPrice) {

            detailsPrice.textContent =
                "K" +
                Number(
                    data.price || 0
                ).toLocaleString();
        }


        /* =====================================
           CATEGORY
        ===================================== */

        const detailsCategory =
            document.getElementById(
                "detailsCategory"
            );

        if (detailsCategory) {

            detailsCategory.textContent =
                data.category ||
                "";
        }


        /* =====================================
           LOCATION
        ===================================== */

        const detailsLocation =
            document.getElementById(
                "detailsLocation"
            );

        if (detailsLocation) {

            detailsLocation.textContent =
                "📍 " +
                (
                    data.location ||
                    "Sioma"
                );
        }


        /* =====================================
           DESCRIPTION
        ===================================== */

        const detailsDescription =
            document.getElementById(
                "detailsDescription"
            );

        if (detailsDescription) {

            detailsDescription.textContent =
                data.description ||
                "No description provided.";
        }


        /* =====================================
           SELLER
        ===================================== */

        const detailsSeller =
            document.getElementById(
                "detailsSeller"
            );

        if (detailsSeller) {

            detailsSeller.textContent =
                data.seller_name ||
                "Sioma Seller";
        }


        /* =====================================
           PHONE
        ===================================== */

        const detailsPhone =
            document.getElementById(
                "detailsPhone"
            );

        if (detailsPhone) {

            detailsPhone.textContent =
                data.seller_phone ||
                "Phone number not provided";
        }


        /* =====================================
           WHATSAPP
        ===================================== */

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
                        data.title || "product"
                    );
                };

        } else if (whatsappButton) {

            whatsappButton.style.display =
                "none";
        }


        /* =====================================
           CALL BUTTON
        ===================================== */

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
                        cleanPhoneNumber(
                            data.seller_phone
                        );
                };

        } else if (callButton) {

            callButton.style.display =
                "none";
        }

    } catch (error) {

        console.error(
            "PRODUCT ERROR:",
            error
        );

        if (detailsTitle) {

            detailsTitle.textContent =
                "Unable to load product.";
        }

        alert(
            "Unable to load this product. Please try again."
        );
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

    if (!productPage) {
        return;
    }

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
        cleanPhoneNumber(phone);

    if (!number) {

        alert(
            "Seller phone number is not available."
        );

        return;
    }

    if (number.startsWith("0")) {

        number =
            "260" +
            number.substring(1);
    }

    const message =
        encodeURIComponent(
            "Hello, I found your " +
            (product || "product") +
            " on SiomaMarket. Is it still available?"
        );

    const whatsappURL =
        "https://wa.me/" +
        number +
        "?text=" +
        message;

    window.open(
        whatsappURL,
        "_blank",
        "noopener,noreferrer"
    );
}


/* =========================================
   CLEAN PHONE NUMBER
========================================= */

function cleanPhoneNumber(phone) {

    return String(phone || "")
        .replace(/\D/g, "");
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

    if (!sellPage) {
        return;
    }

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

        if (!sellForm) {
            return;
        }

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


                /* =================================
                   CHECK REQUIRED ELEMENTS
                ================================= */

                const titleInput =
                    document.getElementById(
                        "sellTitle"
                    );

                const descriptionInput =
                    document.getElementById(
                        "sellDescription"
                    );

                const priceInput =
                    document.getElementById(
                        "sellPrice"
                    );

                const categoryInput =
                    document.getElementById(
                        "sellCategory"
                    );

                const locationInput =
                    document.getElementById(
                        "sellLocation"
                    );

                const imageInput =
                    document.getElementById(
                        "sellImage"
                    );

                const sellerNameInput =
                    document.getElementById(
                        "sellerName"
                    );

                const sellerPhoneInput =
                    document.getElementById(
                        "sellerPhone"
                    );


                if (
                    !titleInput ||
                    !descriptionInput ||
                    !priceInput ||
                    !categoryInput ||
                    !locationInput ||
                    !sellerNameInput ||
                    !sellerPhoneInput
                ) {

                    console.error(
                        "SELL FORM ERROR: Required form fields are missing."
                    );

                    if (message) {

                        message.innerHTML =
                            "❌ Some sell form fields are missing.";

                        message.style.color =
                            "#c62828";
                    }

                    return;
                }


                /* =================================
                   DISABLE BUTTON
                ================================= */

                if (button) {

                    button.disabled =
                        true;

                    button.textContent =
                        "⏳ Publishing...";
                }


                /* =================================
                   PRODUCT DATA
                ================================= */

                const product = {

                    title:
                        titleInput.value.trim(),

                    description:
                        descriptionInput.value.trim(),

                    price:
                        Number(
                            priceInput.value
                        ),

                    category:
                        categoryInput.value,

                    location:
                        locationInput.value.trim() ||
                        "Sioma",

                    image_url:
                        imageInput
                            ? imageInput.value.trim() || null
                            : null,

                    seller_name:
                        sellerNameInput.value.trim(),

                    seller_phone:
                        sellerPhoneInput.value.trim(),

                    status:
                        "active"
                };


                /* =================================
                   VALIDATION
                ================================= */

                if (!product.title) {

                    showSellMessage(
                        message,
                        "❌ Please enter a product name.",
                        "#c62828"
                    );

                    resetPublishButton(
                        button
                    );

                    return;
                }


                if (
                    !product.price ||
                    product.price <= 0
                ) {

                    showSellMessage(
                        message,
                        "❌ Please enter a valid price.",
                        "#c62828"
                    );

                    resetPublishButton(
                        button
                    );

                    return;
                }


                if (!product.category) {

                    showSellMessage(
                        message,
                        "❌ Please select a category.",
                        "#c62828"
                    );

                    resetPublishButton(
                        button
                    );

                    return;
                }


                if (!product.seller_name) {

                    showSellMessage(
                        message,
                        "❌ Please enter your name.",
                        "#c62828"
                    );

                    resetPublishButton(
                        button
                    );

                    return;
                }


                if (!product.seller_phone) {

                    showSellMessage(
                        message,
                        "❌ Please enter your phone number.",
                        "#c62828"
                    );

                    resetPublishButton(
                        button
                    );

                    return;
                }


                /* =================================
                   PUBLISH TO SUPABASE
                ================================= */

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


                    console.log(
                        "PRODUCT PUBLISHED:",
                        data
                    );


                    if (message) {

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
                    }


                    sellForm.reset();


                    if (locationInput) {

                        locationInput.value =
                            "Sioma";
                    }


                } catch (error) {

                    console.error(
                        "SELL ERROR:",
                        error
                    );


                    if (message) {

                        message.innerHTML = `
                            ❌ Could not publish product.
                            <br><br>
                            ${escapeHTML(
                                error.message ||
                                "Unknown error"
                            )}
                        `;

                        message.style.color =
                            "#c62828";
                    }
                }


                /* =================================
                   RESTORE BUTTON
                ================================= */

                resetPublishButton(
                    button
                );
            }
        );
    }
);


/* =========================================
   SELL MESSAGE HELPER
========================================= */

function showSellMessage(
    element,
    text,
    color
) {

    if (!element) {
        return;
    }

    element.innerHTML =
        text;

    element.style.color =
        color;
}


/* =========================================
   RESET PUBLISH BUTTON
========================================= */

function resetPublishButton(
    button
) {

    if (!button) {
        return;
    }

    button.disabled =
        false;

    button.textContent =
        "🚀 PUBLISH PRODUCT";
}


/* =========================================
   BASIC HTML ESCAPING
========================================= */

function escapeHTML(value) {

    return String(value ?? "")
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
