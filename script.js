script.js
// ===============================
// SIOMA MARKET - VERSION 1
// ===============================


// SAMPLE PRODUCTS

const products = [

    {
        name: "Village Chickens",
        category: "Poultry",
        price: 120,
        location: "Sioma",
        seller: "Example Seller",
        phone: "260970000000",
        emoji: "🐔",
        description: "Healthy village chickens available."
    },

    {
        name: "Fresh Fish",
        category: "Fish",
        price: 80,
        location: "Sioma",
        seller: "Example Fish Seller",
        phone: "260970000001",
        emoji: "🐟",
        description: "Fresh local fish available."
    },

    {
        name: "Maize",
        category: "Farm Produce",
        price: 250,
        location: "Sioma",
        seller: "Example Farmer",
        phone: "260970000002",
        emoji: "🌽",
        description: "Maize available for sale."
    },

    {
        name: "Goat",
        category: "Livestock",
        price: 900,
        location: "Sioma",
        seller: "Example Livestock Seller",
        phone: "260970000003",
        emoji: "🐐",
        description: "Goat available for sale."
    },

    {
        name: "Phone Repair",
        category: "Services",
        price: 50,
        location: "Sioma",
        seller: "Example Technician",
        phone: "260970000004",
        emoji: "🔧",
        description: "Phone repair services."
    },

    {
        name: "Used Smartphone",
        category: "Electronics",
        price: 850,
        location: "Sioma",
        seller: "Example Seller",
        phone: "260970000005",
        emoji: "📱",
        description: "Used smartphone in good condition."
    }

];


// DISPLAY PRODUCTS

function displayProducts(list) {

    const grid = document.getElementById("productGrid");

    grid.innerHTML = "";

    document.getElementById("productCount").textContent =
        `${list.length} listing(s)`;


    if (list.length === 0) {

        grid.innerHTML = `
            <p>No products found.</p>
        `;

        return;
    }


    list.forEach(product => {

        const whatsappMessage =
            `Hello, I saw your ${product.name} listing on Sioma Market. Is it still available?`;

        const whatsappURL =
            `https://wa.me/${product.phone}?text=${encodeURIComponent(whatsappMessage)}`;


        const card = document.createElement("div");

        card.className = "product-card";


        card.innerHTML = `

            <div class="product-image">
                ${product.emoji}
            </div>

            <div class="product-content">

                <h3>${product.name}</h3>

                <p>${product.description}</p>

                <div class="price">
                    K${product.price}
                </div>

                <div class="location">
                    📍 ${product.location}
                </div>

                <p>
                    Seller: ${product.seller}
                </p>

                <br>

                <a
                    class="whatsapp"
                    href="${whatsappURL}"
                    target="_blank"
                    rel="noopener"
                >
                    WhatsApp Seller
                </a>

            </div>
        `;


        grid.appendChild(card);

    });

}


// SEARCH

function searchProducts() {

    const search =
        document
            .getElementById("searchInput")
            .value
            .toLowerCase();


    const filtered = products.filter(product =>

        product.name.toLowerCase().includes(search) ||

        product.category.toLowerCase().includes(search) ||

        product.location.toLowerCase().includes(search) ||

        product.description.toLowerCase().includes(search)

    );


    displayProducts(filtered);

}


// CATEGORY FILTER

function filterCategory(category) {

    if (category === "All") {

        displayProducts(products);

        return;
    }


    const filtered =
        products.filter(product =>
            product.category === category
        );


    displayProducts(filtered);

}


// MOBILE MENU

function toggleMenu() {

    document
        .getElementById("navMenu")
        .classList
        .toggle("active");

}


// SELLER FORM

document
    .getElementById("sellerForm")
    .addEventListener("submit", function(event) {

        event.preventDefault();


        const name =
            document.getElementById("sellerName").value;

        const phone =
            document.getElementById("sellerPhone").value;

        const product =
            document.getElementById("sellerProduct").value;

        const category =
            document.getElementById("sellerCategory").value;

        const price =
            document.getElementById("sellerPrice").value;

        const location =
            document.getElementById("sellerLocation").value;

        const description =
            document.getElementById("sellerDescription").value;


        const message =
            `NEW SIOMA MARKET LISTING

Seller: ${name}

Phone: ${phone}

Product: ${product}

Category: ${category}

Price: K${price}

Location: ${location}

Description:
${description}`;


        const yourWhatsAppNumber =
            "260975969102";


        const url =
            `https://wa.me/${yourWhatsAppNumber}?text=${encodeURIComponent(message)}`;


        window.open(url, "_blank");


        document.getElementById("formMessage").innerHTML = `

            <p style="margin-top:20px;color:green;font-weight:bold;">

                Your listing has been prepared.
                Send the WhatsApp message to submit it.

            </p>

        `;


        this.reset();

    });


// CURRENT YEAR

document.getElementById("year").textContent =
    new Date().getFullYear();


// INITIAL DISPLAY

displayProducts(products);
