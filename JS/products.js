/* =========================================================
   MART MANAGEMENT SYSTEM
   PHASE 2 - STEP 3
   PRODUCTS CRUD
   ========================================================= */


/* =========================================================
   PRODUCT STORAGE
   ========================================================= */

function getProducts() {

    return Storage.get(
        STORAGE_KEYS.PRODUCTS,
        []
    );

}


function saveProducts(products) {

    return Storage.set(
        STORAGE_KEYS.PRODUCTS,
        products
    );

}


/* =========================================================
   PRODUCT STATUS
   ========================================================= */

function getProductStockStatus(product) {

    const stock = Number(product.stock) || 0;
    const minimumStock = Number(product.minimumStock) || 0;

    if (stock <= 0) {

        return "Out of Stock";

    }

    if (stock <= minimumStock) {

        return "Low Stock";

    }

    return "In Stock";

}


/* =========================================================
   DISPLAY PRODUCTS
   ========================================================= */

function displayProducts(products = null) {

    const productList =
        products || getProducts();

    const tableBody =
        document.querySelector(
            "#productTableBody"
        );

    if (!tableBody) {

        return;

    }


    tableBody.innerHTML = "";


    if (productList.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="7"
                    style="text-align:center; padding:30px;">
                    No products found.
                </td>
            </tr>
        `;

        return;

    }


    productList.forEach(function (product) {

        const status =
            getProductStockStatus(product);


        let statusClass = "active-status";

        if (status === "Low Stock") {

            statusClass = "low-status";

        }

        if (status === "Out of Stock") {

            statusClass = "out-status";

        }


        const row = document.createElement("tr");


        row.innerHTML = `

            <td>${escapeHtml(product.id)}</td>

            <td>${escapeHtml(product.name)}</td>

            <td>${escapeHtml(product.category)}</td>

            <td>
                ${formatCurrency(product.sellingPrice)}
            </td>

            <td>${product.stock}</td>

            <td>
                <span class="status ${statusClass}">
                    ${status}
                </span>
            </td>

            <td>

                <button
                    class="edit-btn"
                    onclick="editProduct('${escapeHtml(product.id)}')"
                >
                    Edit
                </button>

                <button
                    class="delete-btn"
                    onclick="deleteProduct('${escapeHtml(product.id)}')"
                >
                    Delete
                </button>

            </td>

        `;


        tableBody.appendChild(row);

    });

}


/* =========================================================
   SEARCH PRODUCTS
   ========================================================= */

function searchProducts() {

    const searchInput =
        document.querySelector(
            "#productSearch"
        );

    const categoryFilter =
        document.querySelector(
            "#categoryFilter"
        );

    const stockFilter =
        document.querySelector(
            "#stockFilter"
        );


    const searchText =
        searchInput
            ? searchInput.value
                .toLowerCase()
                .trim()
            : "";


    const selectedCategory =
        categoryFilter
            ? categoryFilter.value
            : "All Categories";


    const selectedStock =
        stockFilter
            ? stockFilter.value
            : "All Stock";


    const products =
        getProducts();


    const filteredProducts =
        products.filter(function (product) {

            const matchesSearch =

                product.name
                    .toLowerCase()
                    .includes(searchText)

                ||

                product.id
                    .toLowerCase()
                    .includes(searchText)

                ||

                (product.sku &&
                    product.sku
                        .toLowerCase()
                        .includes(searchText));


            const matchesCategory =

                selectedCategory ===
                "All Categories"

                ||

                product.category ===
                selectedCategory;


            const status =
                getProductStockStatus(product);


            const matchesStock =

                selectedStock ===
                "All Stock"

                ||

                status ===
                selectedStock;


            return (
                matchesSearch &&
                matchesCategory &&
                matchesStock
            );

        });


    displayProducts(
        filteredProducts
    );

}


/* =========================================================
   DELETE PRODUCT
   ========================================================= */

function deleteProduct(productId) {

    const products =
        getProducts();


    const product =
        products.find(function (item) {

            return item.id === productId;

        });


    if (!product) {

        alert("Product not found.");

        return;

    }

    const bills = Storage.get(STORAGE_KEYS.BILLS, []);
    const purchases = Storage.get(STORAGE_KEYS.PURCHASES, []);
    const adjustments = Storage.get(STORAGE_KEYS.STOCK_ADJUSTMENTS, []);
    const hasHistory = bills.some(bill => (bill.items || []).some(item => item.productId === productId))
        || purchases.some(purchase => (purchase.items || []).some(item => item.productId === productId))
        || adjustments.some(adjustment => adjustment.productId === productId);
    if (hasHistory) {
        alert("This product has bill, purchase, or stock adjustment history and cannot be deleted. Keep it to preserve those records.");
        return;
    }


    const confirmation =
        confirm(
            `Are you sure you want to delete "${product.name}"?`
        );


    if (!confirmation) {

        return;

    }


    const updatedProducts =
        products.filter(function (item) {

            return item.id !== productId;

        });


    const inventory = Storage.get(STORAGE_KEYS.INVENTORY, []);
    const updatedInventory = inventory.filter(item => item.productId !== productId);
    if (!Storage.setMany([
        [STORAGE_KEYS.PRODUCTS, updatedProducts],
        [STORAGE_KEYS.INVENTORY, updatedInventory]
    ])) {
        alert("Product could not be deleted because storage did not complete the update.");
        return;
    }


    alert(
        "Product deleted successfully."
    );


    displayProducts();

}


/* =========================================================
   EDIT PRODUCT
   ========================================================= */

function editProduct(productId) {

    const products =
        getProducts();


    const product =
        products.find(function (item) {

            return item.id === productId;

        });


    if (!product) {

        alert("Product not found.");

        return;

    }


    window.location.href = `add-product.html?id=${encodeURIComponent(productId)}`;

}


/* =========================================================
   INITIALIZE PRODUCTS PAGE
   ========================================================= */

function initializeProductsPage() {

    const tableBody =
        document.querySelector(
            "#productTableBody"
        );


    if (!tableBody) {

        return;

    }


    displayProducts();


    const searchInput =
        document.querySelector(
            "#productSearch"
        );


    const categoryFilter =
        document.querySelector(
            "#categoryFilter"
        );


    const stockFilter =
        document.querySelector(
            "#stockFilter"
        );


    if (searchInput) {

        searchInput.addEventListener(
            "input",
            searchProducts
        );

    }


    if (categoryFilter) {

        categoryFilter.addEventListener(
            "change",
            searchProducts
        );

    }


    if (stockFilter) {

        stockFilter.addEventListener(
            "change",
            searchProducts
        );

    }

}


/* =========================================================
   PAGE LOAD
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        initializeProductsPage();

    }
);
/* =========================================================
   ADD / EDIT PRODUCT FORM
   ========================================================= */

function initializeProductForm() {

    const productForm =
        document.querySelector(
            "#productForm"
        );


    if (!productForm) {

        return;

    }


    const editProductId = new URLSearchParams(window.location.search).get("id");
    localStorage.removeItem("mms_edit_product_id");


    /*
        EDIT MODE
    */

    if (editProductId) {

        loadProductForEdit(
            editProductId
        );

    }


    productForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            saveProductFromForm();

        }
    );

}


/* =========================================================
   LOAD PRODUCT FOR EDIT
   ========================================================= */

function loadProductForEdit(productId) {

    const products =
        getProducts();


    const product =
        products.find(function (item) {

            return item.id === productId;

        });


    if (!product) {

        alert("Product not found.");

        return;

    }


    document.querySelector("#productName").value =
        product.name || "";


    document.querySelector("#productId").value =
        product.id || "";


    document.querySelector("#category").value =
        product.category || "";


    document.querySelector("#brand").value =
        product.brand || "";


    document.querySelector("#purchasePrice").value =
        product.purchasePrice || 0;


    document.querySelector("#sellingPrice").value =
        product.sellingPrice || 0;


    document.querySelector("#quantity").value =
        product.stock || 0;


    document.querySelector("#minimumStock").value =
        product.minimumStock || 0;


    document.querySelector("#expiryDate").value =
        product.expiryDate || "";


    document.querySelector("#description").value =
        product.description || "";


    /*
        Change button text
    */

    const submitButton =
        document.querySelector(
            "#productForm button[type='submit']"
        );


    if (submitButton) {

        submitButton.textContent =
            "Update Product";

    }

}


/* =========================================================
   SAVE PRODUCT FROM FORM
   ========================================================= */

function saveProductFromForm() {

    const name =
        document.querySelector(
            "#productName"
        ).value.trim();


    const productId =
        document.querySelector(
            "#productId"
        ).value.trim();


    const category =
        document.querySelector(
            "#category"
        ).value;


    const brand =
        document.querySelector(
            "#brand"
        ).value.trim();


    const purchasePrice =
        toNumber(
            document.querySelector(
                "#purchasePrice"
            ).value
        );


    const sellingPrice =
        toNumber(
            document.querySelector(
                "#sellingPrice"
            ).value
        );


    const quantity =
        toNumber(
            document.querySelector(
                "#quantity"
            ).value
        );


    const minimumStock =
        toNumber(
            document.querySelector(
                "#minimumStock"
            ).value
        );


    const supplier =
        document.querySelector(
            "#supplier"
        ).value;


    const expiryDate =
        document.querySelector(
            "#expiryDate"
        ).value;


    const description =
        document.querySelector(
            "#description"
        ).value.trim();


    /*
        BASIC VALIDATION
    */

    if (!isRequired(name)) {

        alert(
            "Please enter product name."
        );

        return;

    }


    if (!isRequired(productId)) {

        alert(
            "Please enter product ID."
        );

        return;

    }


    if (!isRequired(category)) {

        alert(
            "Please select a category."
        );

        return;

    }


    if (purchasePrice < 0) {

        alert(
            "Purchase price cannot be negative."
        );

        return;

    }


    if (sellingPrice < 0) {

        alert(
            "Selling price cannot be negative."
        );

        return;

    }


    if (quantity < 0) {

        alert(
            "Quantity cannot be negative."
        );

        return;

    }

    if (minimumStock < 0 || !Number.isFinite(purchasePrice) || !Number.isFinite(sellingPrice) || !Number.isFinite(quantity)) {
        alert("Prices and stock values must be valid non-negative numbers.");
        return;
    }


    /*
        GET EXISTING PRODUCTS
    */

    const products =
        getProducts();


    const editProductId = new URLSearchParams(window.location.search).get("id");


    /*
        CHECK DUPLICATE PRODUCT ID
    */

    const duplicate =
        products.find(function (product) {

            return (
                product.id === productId &&
                product.id !== editProductId
            );

        });


    if (duplicate) {

        alert(
            "A product with this ID already exists."
        );

        return;

    }


    /*
        PRODUCT OBJECT
    */

    const editingProduct = editProductId ? products.find(product => product.id === editProductId) : null;
    if (editProductId && !editingProduct) {
        alert("Product record not found. No product was created.");
        window.location.href = "products.html";
        return;
    }

    const suppliers = Storage.get(STORAGE_KEYS.SUPPLIERS, []);
    if (supplier && !suppliers.some(item => item.id === supplier)) {
        alert("The selected supplier no longer exists. Choose a valid supplier or leave it blank.");
        return;
    }

    const productData = {
        ...(editingProduct || {}),

        id: productId,

        name: name,

        category: category,

        brand: brand,

        purchasePrice: purchasePrice,

        sellingPrice: sellingPrice,

        stock: quantity,

        minimumStock: minimumStock,

        supplierId: supplier,

        expiryDate: expiryDate,

        description: description,

        status: editingProduct?.status || "Active",
        createdAt: editingProduct?.createdAt || getToday(),
        updatedAt: getToday()

    };


    /*
        EDIT EXISTING PRODUCT
    */

    const inventory = Storage.get(STORAGE_KEYS.INVENTORY, []);
    const adjustments = Storage.get(STORAGE_KEYS.STOCK_ADJUSTMENTS, []);
    const existingInventory = inventory.find(item => item.productId === productId);
    const stockStatus = quantity <= 0 ? "Out of Stock" : quantity <= minimumStock ? "Low Stock" : "In Stock";
    const inventoryData = {
        ...(existingInventory || {}),
        id: existingInventory?.id || generateId("INV"),
        productId,
        productName: name,
        category,
        currentStock: quantity,
        minimumStock,
        unitCost: purchasePrice,
        sellingPrice,
        stockStatus,
        status: stockStatus,
        lastUpdated: getToday()
    };
    if (existingInventory) {
        inventory[inventory.findIndex(item => item.productId === productId)] = inventoryData;
    } else {
        inventory.push(inventoryData);
    }

    if (editingProduct && Number(editingProduct.stock) !== quantity) {
        const delta = quantity - (Number(editingProduct.stock) || 0);
        adjustments.unshift({
            id: generateId("ADJ"), productId, adjustmentType: delta > 0 ? "Increase" : "Decrease",
            quantity: Math.abs(delta), previousStock: Number(editingProduct.stock) || 0, newStock: quantity,
            reason: "Stock changed while editing product details", notes: "Recorded automatically from the product form.",
            date: getToday(), adjustedBy: "Owner", createdAt: getToday()
        });
    }

    if (editProductId) {

        const index =
            products.findIndex(
                function (product) {

                    return (
                        product.id ===
                        editProductId
                    );

                }
            );


        if (index !== -1) {

            /*
                Preserve original creation date
            */

            productData.createdAt =
                products[index].createdAt ||
                getToday();


            products[index] =
                productData;


            if (!Storage.setMany([
                [STORAGE_KEYS.PRODUCTS, products],
                [STORAGE_KEYS.INVENTORY, inventory],
                [STORAGE_KEYS.STOCK_ADJUSTMENTS, adjustments]
            ])) {
                alert("Product update could not be saved. Existing data was preserved where possible.");
                return;
            }


            alert(
                "Product updated successfully."
            );


            window.location.href =
                "products.html";


            return;

        }

    }


    /*
        CREATE NEW PRODUCT
    */

    products.push(
        productData
    );
    if (!Storage.setMany([
        [STORAGE_KEYS.PRODUCTS, products],
        [STORAGE_KEYS.INVENTORY, inventory]
    ])) {
        alert("Product could not be saved. Please try again.");
        return;
    }


    /*
        SUCCESS MESSAGE
    */

    alert(
        "Product added successfully."
    );


    /*
        GO BACK TO PRODUCTS
    */

    window.location.href =
        "products.html";

}


/* =========================================================
   INITIALIZE FORM
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        initializeProductForm();

    }
);
