
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Sioma Market - Buy & Sell in Sioma</title>

    <meta name="description"
          content="Sioma Market connects buyers and sellers in Sioma, Zambia.">

    <link rel="stylesheet" href="style.css">
</head>

<body>

<header class="header">

    <div class="container nav">

        <div class="logo">
            <span>SM</span>
            <div>
                <h1>Sioma Market</h1>
                <small>Buy • Sell • Connect</small>
            </div>
        </div>

        <button class="menu-btn" onclick="toggleMenu()">☰</button>

        <nav id="navMenu">
            <a href="#home">Home</a>
            <a href="#products">Buy</a>
            <a href="#sell">Sell</a>
            <a href="#about">About</a>
        </nav>

    </div>

</header>


<main>

<!-- HERO -->

<section id="home" class="hero">

    <div class="container hero-content">

        <div>

            <h2>Buy and sell locally in Sioma.</h2>

            <p>
                Find products, livestock, farm produce and services
                from sellers around Sioma.
            </p>

            <div class="hero-buttons">
                <a href="#products" class="btn primary">
                    Browse Products
                </a>

                <a href="#sell" class="btn secondary">
                    Sell Something
                </a>
            </div>

        </div>

    </div>

</section>


<!-- SEARCH -->

<section class="search-section">

    <div class="container">

        <input
            type="text"
            id="searchInput"
            placeholder="Search chickens, fish, maize..."
            onkeyup="searchProducts()"
        >

    </div>

</section>


<!-- CATEGORIES -->

<section class="categories">

    <div class="container">

        <h2>Categories</h2>

        <div class="category-grid">

            <button onclick="filterCategory('All')">
                🛒<br>All
            </button>

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

    </div>

</section>


<!-- PRODUCTS -->

<section id="products" class="products-section">

    <div class="container">

        <div class="section-heading">

            <div>
                <h2>Available in Sioma</h2>
                <p>Contact sellers directly.</p>
            </div>

            <span id="productCount"></span>

        </div>


        <div id="productGrid" class="product-grid">

            <!-- Products are inserted by JavaScript -->

        </div>

    </div>

</section>


<!-- SELL -->

<section id="sell" class="sell-section">

    <div class="container">

        <div class="sell-box">

            <h2>Sell on Sioma Market</h2>

            <p>
                Advertise your product to buyers in Sioma.
                First 50 sellers can list for free.
            </p>


            <form id="sellerForm">

                <label>Your Name</label>

                <input
                    type="text"
                    id="sellerName"
                    required
                    placeholder="Enter your name"
                >


                <label>Phone / WhatsApp</label>

                <input
                    type="tel"
                    id="sellerPhone"
                    required
                    placeholder="097xxxxxxx"
                >


                <label>Product</label>

                <input
                    type="text"
                    id="sellerProduct"
                    required
                    placeholder="Example: Village chickens"
                >


                <label>Category</label>

                <select id="sellerCategory" required>

                    <option value="">Select category</option>

                    <option>Farm Produce</option>
                    <option>Livestock</option>
                    <option>Fish</option>
                    <option>Poultry</option>
                    <option>Electronics</option>
                    <option>Services</option>
                    <option>Property</option>

                </select>


                <label>Price (K)</label>

                <input
                    type="number"
                    id="sellerPrice"
                    required
                    placeholder="Example: 850"
                >


                <label>Location</label>

                <input
                    type="text"
                    id="sellerLocation"
                    required
                    placeholder="Example: Sioma"
                >


                <label>Description</label>

                <textarea
                    id="sellerDescription"
                    required
                    placeholder="Describe your product..."
                ></textarea>


                <button type="submit" class="btn primary">
                    Submit Listing
                </button>

            </form>


            <div id="formMessage"></div>

        </div>

    </div>

</section>


<!-- ABOUT -->

<section id="about" class="about-section">

    <div class="container">

        <h2>About Sioma Market</h2>

        <p>
            Sioma Market is a local marketplace designed to connect
            buyers and sellers in Sioma and surrounding areas.
        </p>

        <div class="how-grid">

            <div>
                <strong>1</strong>
                <h3>Seller lists</h3>
                <p>Products are advertised on the marketplace.</p>
            </div>

            <div>
                <strong>2</strong>
                <h3>Buyer searches</h3>
                <p>Buyers find products they need.</p>
            </div>

            <div>
                <strong>3</strong>
                <h3>They connect</h3>
                <p>Buyer contacts the seller directly.</p>
            </div>

        </div>

    </div>

</section>

</main>


<!-- FOOTER -->

<footer>

    <div class="container">

        <h3>Sioma Market</h3>

        <p>Buy • Sell • Connect</p>

        <p>
            © <span id="year"></span> Sioma Market
        </p>

    </div>

</footer>


<script src="script.js"></script>

</body>
</html>
