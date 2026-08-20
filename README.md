
/* =========================
   SIOMA MARKET
   MOBILE-FIRST CSS
   ========================= */

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

html {
    scroll-behavior: smooth;
}

body {
    font-family: Arial, sans-serif;
    background: #f5f7f6;
    color: #222;
    line-height: 1.5;
    overflow-x: hidden;
}

.container {
    width: 100%;
    max-width: 1100px;
    margin: auto;
    padding: 0 15px;
}


/* =========================
   HEADER
   ========================= */

.header {
    background: white;
    border-bottom: 1px solid #ddd;
    position: sticky;
    top: 0;
    z-index: 1000;
}

.nav {
    min-height: 65px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.logo {
    display: flex;
    align-items: center;
    gap: 8px;
}

.logo span {
    width: 40px;
    height: 40px;
    background: #087f5b;
    color: white;
    border-radius: 8px;

    display: flex;
    align-items: center;
    justify-content: center;

    font-weight: bold;
}

.logo h1 {
    font-size: 18px;
}

.logo small {
    color: #777;
    font-size: 11px;
}


/* MOBILE MENU */

.menu-btn {
    border: none;
    background: none;
    font-size: 28px;
    padding: 8px;
    cursor: pointer;
}

nav {
    display: none;

    position: absolute;
    top: 65px;
    left: 0;
    right: 0;

    background: white;
    padding: 15px;

    border-bottom: 1px solid #ddd;
}

nav.active {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

nav a {
    text-decoration: none;
    color: #222;
    font-weight: bold;
    padding: 8px;
}


/* =========================
   HERO
   ========================= */

.hero {
    background: #087f5b;
    color: white;
    padding: 50px 0;
}

.hero h2 {
    font-size: 32px;
    line-height: 1.15;
    margin-bottom: 15px;
}

.hero p {
    font-size: 16px;
    margin-bottom: 25px;
}

.hero-buttons {
    display: flex;
    flex-direction: column;
    gap: 10px;
}


/* =========================
   BUTTONS
   ========================= */

.btn {
    display: block;
    width: 100%;

    padding: 14px 18px;

    border-radius: 8px;
    border: none;

    text-align: center;
    text-decoration: none;

    font-weight: bold;
    font-size: 16px;

    cursor: pointer;
}

.primary {
    background: #087f5b;
    color: white;
}

.secondary {
    background: white;
    color: #087f5b;
}


/* =========================
   SEARCH
   ========================= */

.search-section {
    background: white;
    padding: 15px 0;

    position: sticky;
    top: 65px;
    z-index: 900;
}

#searchInput {
    width: 100%;

    padding: 15px;

    border: 1px solid #ccc;
    border-radius: 25px;

    font-size: 16px;

    outline: none;
}

#searchInput:focus {
    border-color: #087f5b;
}


/* =========================
   CATEGORIES
   ========================= */

.categories {
    padding: 30px 0;
}

.categories h2 {
    margin-bottom: 15px;
}

.category-grid {
    display: grid;

    grid-template-columns: repeat(2, 1fr);

    gap: 10px;
}

.category-grid button {
    min-height: 80px;

    background: white;

    border: 1px solid #ddd;
    border-radius: 10px;

    font-size: 14px;

    cursor: pointer;
}

.category-grid button:active {
    transform: scale(.97);
}


/* =========================
   PRODUCTS
   ========================= */

.products-section {
    padding: 30px 0 50px;
}

.section-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;

    margin-bottom: 20px;
}

.section-heading h2 {
    font-size: 22px;
}

#productCount {
    color: #777;
    font-size: 13px;
}

.product-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 15px;
}


/* PRODUCT CARD */

.product-card {
    background: white;

    border-radius: 12px;

    overflow: hidden;

    box-shadow: 0 2px 8px rgba(0,0,0,.08);
}

.product-image {
    height: 150px;

    background: #e9ecef;

    display: flex;
    align-items: center;
    justify-content: center;

    font-size: 55px;
}

.product-content {
    padding: 16px;
}

.product-content h3 {
    font-size: 19px;
    margin-bottom: 5px;
}

.price {
    color: #087f5b;

    font-size: 21px;

    font-weight: bold;

    margin: 8px 0;
}

.location {
    color: #777;

    font-size: 14px;

    margin-bottom: 8px;
}

.whatsapp {
    display: block;

    width: 100%;

    background: #25D366;
    color: white;

    text-align: center;

    padding: 13px;

    border-radius: 8px;

    text-decoration: none;

    font-weight: bold;

    margin-top: 12px;
}


/* =========================
   SELL SECTION
   ========================= */

.sell-section {
    background: white;
    padding: 50px 0;
}

.sell-box {
    width: 100%;
}

.sell-box h2 {
    font-size: 25px;
    margin-bottom: 10px;
}

.sell-box > p {
    color: #666;
    margin-bottom: 25px;
}


/* FORM */

form {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

form label {
    font-weight: bold;
    margin-top: 10px;
}

form input,
form select,
form textarea {
    width: 100%;

    padding: 14px;

    border: 1px solid #ccc;

    border-radius: 8px;

    font-size: 16px;

    background: white;
}

form textarea {
    min-height: 120px;
}

form button {
    margin-top: 15px;
}


/* =========================
   ABOUT
   ========================= */

.about-section {
    padding: 50px 0;
}

.about-section h2 {
    margin-bottom: 12px;
}

.about-section > .container > p {
    color: #666;
    margin-bottom: 25px;
}

.how-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 15px;
}

.how-grid div {
    background: white;

    padding: 20px;

    border-radius: 10px;
}

.how-grid strong {
    font-size: 28px;
    color: #087f5b;
}


/* =========================
   FOOTER
   ========================= */

footer {
    background: #222;
    color: white;

    text-align: center;

    padding: 30px 15px;
}

footer h3 {
    margin-bottom: 5px;
}


/* =========================
   TABLETS
   ========================= */

@media (min-width: 600px) {

    .hero-buttons {
        flex-direction: row;
    }

    .btn {
        width: auto;
    }

    .product-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .how-grid {
        grid-template-columns: repeat(3, 1fr);
    }

}


/* =========================
   DESKTOP
   ========================= */

@media (min-width: 850px) {

    .container {
        padding: 0 20px;
    }

    .menu-btn {
        display: none;
    }

    nav {
        display: flex;

        position: static;

        flex-direction: row;

        padding: 0;

        border: none;

        gap: 25px;
    }

    nav a {
        padding: 5px;
    }

    .hero {
        padding: 90px 0;
    }

    .hero h2 {
        font-size: 48px;
    }

    .product-grid {
        grid-template-columns: repeat(3, 1fr);
    }

    .category-grid {
        grid-template-columns: repeat(4, 1fr);
    }

}
