
const SUPABASE_URL =
    "https://luolbdjonzissgskjupd.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_bMHzln24777v-kDo-uE8Eg_AYUWThn-";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


/* SEARCH PRODUCTS */

async function searchMarket() {

    const input =
        document.getElementById("searchInput");

    const search =
        input.value.trim();

    const results =
        document.getElementById("searchResults");

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

        console.error(error);

        results.innerHTML =
            "<p>❌ Search failed.</p>";

        return;
    }

    if (!data || data.length === 0) {

        results.innerHTML =
            "<p>🔍 No products found.</p>";

        return;
    }

    let html = `
        <h2>🔎 Search Results</h2>
        <div class="results-grid">
    `;

    data.forEach(product => {

        const image =
            product.image_url ||
            "https://via.placeholder.com/500";

        html += `

            <div class="result-card">

                <img
                    src="${image}"
                    alt="Product">

                <div class="result-info">

                    <h3>
                        ${product.title}
                    </h3>

                    <p class="result-price">
                        K${Number(
                            product.price || 0
                        ).toLocaleString()}
                    </p>

                    <p>
                        📍 ${
                            product.location ||
                            "Sioma"
                        }
                    </p>

                    <button
                        class="buy-result"
                        onclick="viewListing('${product.id}')">

                        🛒 BUY

                    </button>

                </div>

            </div>

        `;
    });

    html += "</div>";

    results.innerHTML = html;
}


/* OPEN PRODUCT DETAILS */

async function viewListing(id) {

    console.log(
        "BUY BUTTON CLICKED:",
        id
    );

    const page =
        document.getElementById(
            "productPage"
        );

    if (!page) {

        alert(
            "Product details section is missing."
        );

        return;
    }

    page.style.display = "block";

    document.body.style.overflow =
        "hidden";


    const { data, error } =
        await supabaseClient
            .from("listings")
            .select("*")
            .eq("id", id)
            .single();


    if (error) {

        console.error(error);

        alert(
            "Could not load product."
        );

        return;
    }


    document.getElementById(
        "detailsImage"
    ).src =
        data.image_url || "";


    document.getElementById(
        "detailsTitle"
    ).textContent =
        data.title || "Product";


    document.getElementById(
        "detailsPrice"
    ).textContent =
        "K" +
        Number(
            data.price || 0
        ).toLocaleString();


    document.getElementById(
        "detailsCategory"
    ).textContent =
        data.category || "";


    document.getElementById(
        "detailsLocation"
    ).textContent =
        "📍 " +
        (
            data.location ||
            "Sioma"
        );


    document.getElementById(
        "detailsDescription"
    ).textContent =
        data.description ||
        "No description available.";


    document.getElementById(
        "detailsSeller"
    ).textContent =
        data.seller_name ||
        "Sioma Seller";


    document.getElementById(
        "detailsPhone"
    ).textContent =
        data.seller_phone ||
        "";


    const whatsapp =
        document.getElementById(
            "whatsappButton"
        );


    if (data.seller_phone) {

        whatsapp.style.display =
            "block";

        whatsapp.onclick =
            function () {

                contactSeller(
                    data.seller_phone,
                    data.title
                );

            };

    } else {

        whatsapp.style.display =
            "none";
    }

}


/* CLOSE PRODUCT */

function closeProductPage() {

    const page =
        document.getElementById(
            "productPage"
        );

    page.style.display =
        "none";

    document.body.style.overflow =
        "auto";
}


/* WHATSAPP */

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
