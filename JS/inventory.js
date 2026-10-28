/* =========================================================
   MART MANAGEMENT SYSTEM
   PHASE 2 - STEP 4
   INVENTORY MANAGEMENT
   ========================================================= */


/* =========================================================
   GET INVENTORY
   ========================================================= */

function getInventory() {

    return Storage.get(
        STORAGE_KEYS.INVENTORY,
        []
    );

}


/* =========================================================
   SAVE INVENTORY
   ========================================================= */

function saveInventory(inventory) {

    return Storage.set(
        STORAGE_KEYS.INVENTORY,
        inventory
    );

}


/* =========================================================
   GET PRODUCTS
   ========================================================= */

function getInventoryProducts() {

    return Storage.get(
        STORAGE_KEYS.PRODUCTS,
        []
    );

}


/* =========================================================
   CALCULATE STOCK STATUS
   ========================================================= */

function getInventoryStatus(
    currentStock,
    minimumStock
) {

    currentStock =
        Number(currentStock) || 0;

    minimumStock =
        Number(minimumStock) || 0;


    if (currentStock <= 0) {

        return "Out of Stock";

    }


    if (currentStock <= minimumStock) {

        return "Low Stock";

    }


    return "In Stock";

}


/* =========================================================
   CREATE / SYNC INVENTORY
   ========================================================= */

function synchronizeInventory() {

    const products =
        getInventoryProducts();


    const inventory =
        getInventory();


    /*
        Go through every product
    */

    products.forEach(function (product) {

        const existingInventory =
            inventory.find(function (item) {

                return (
                    item.productId ===
                    product.id
                );

            });


        /*
            If inventory record doesn't exist,
            create one.
        */

        if (!existingInventory) {

            inventory.push({

                id: generateId("INV"),

                productId: product.id,

                currentStock:
                    Number(product.stock) || 0,

                minimumStock:
                    Number(product.minimumStock) || 0,

                lastUpdated:
                    getToday(),

                status:
                    getInventoryStatus(
                        product.stock,
                        product.minimumStock
                    )

            });

        }


        /*
            If inventory record already exists,
            update basic information.
        */

        else {

            existingInventory.minimumStock =
                Number(product.minimumStock) || 0;

            existingInventory.status =
                getInventoryStatus(
                    existingInventory.currentStock,
                    existingInventory.minimumStock
                );

        }

    });


    /*
        Save inventory
    */

    saveInventory(
        inventory
    );


    console.log(
        "Inventory synchronized successfully."
    );

}


/* =========================================================
   INITIALIZE INVENTORY
   ========================================================= */

function initializeInventory() {

    synchronizeInventory();

}


/* =========================================================
   PAGE LOAD
   ========================================================= */

// document.addEventListener(
//     "DOMContentLoaded",
//     function () {

//         initializeInventory();

//     }
// );

/* =========================================================
   DISPLAY INVENTORY
   ========================================================= */

function displayInventory(inventoryList = null) {

    const inventory =
        inventoryList || getInventory();

    const products =
        getInventoryProducts();

    const tableBody =
        document.querySelector(
            "#inventoryTableBody"
        );

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = "";


    if (inventory.length === 0) {

    const searchInput =
        document.querySelector(
            "#inventorySearch"
        );

    const categoryFilter =
        document.querySelector(
            "#inventoryCategoryFilter"
        );

    const stockFilter =
        document.querySelector(
            "#inventoryStockFilter"
        );

    const searchText =
        searchInput
            ? searchInput.value.trim()
            : "";

    const selectedCategory =
        categoryFilter
            ? categoryFilter.value
            : "All Categories";

    const selectedStock =
        stockFilter
            ? stockFilter.value
            : "All Stock";

    const hasFilter =
        searchText !== "" ||
        selectedCategory !== "All Categories" ||
        selectedStock !== "All Stock";

    const message =
        hasFilter
            ? "No products match your search or selected filters."
            : "No inventory records found.";

    tableBody.innerHTML = `
        <tr>
            <td
                colspan="7"
                style="text-align:center; padding:30px;"
            >
                ${message}
            </td>
        </tr>
    `;

    return;
}


    inventory.forEach(function (item) {

        const product =
            products.find(function (productItem) {

                return (
                    productItem.id ===
                    item.productId
                );

            });


        if (!product) {
            return;
        }


        const status =
            getInventoryStatus(
                item.currentStock,
                item.minimumStock
            );


        let statusClass =
            "active-status";


        if (status === "Low Stock") {

            statusClass =
                "low-status";

        }


        if (status === "Out of Stock") {

            statusClass =
                "out-status";

        }


        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>
                ${product.id}
            </td>

            <td>
                ${product.name}
            </td>

            <td>
                ${product.category}
            </td>

            <td>
                ${item.currentStock}
            </td>

            <td>
                ${item.minimumStock}
            </td>

            <td>

                <span class="status ${statusClass}">
                    ${status}
                </span>

            </td>

            <td>
                ${formatDate(item.lastUpdated)}
            </td>

        `;


        tableBody.appendChild(row);

    });

}


/* =========================================================
   INVENTORY SUMMARY
   ========================================================= */

function updateInventorySummary() {

    const inventory =
        getInventory();


    let inStock = 0;

    let lowStock = 0;

    let outOfStock = 0;


    inventory.forEach(function (item) {

        const status =
            getInventoryStatus(
                item.currentStock,
                item.minimumStock
            );


        if (status === "In Stock") {

            inStock++;

        }

        else if (status === "Low Stock") {

            lowStock++;

        }

        else if (status === "Out of Stock") {

            outOfStock++;

        }

    });


    const totalProducts =
        inventory.length;


    const totalProductsElement =
        document.querySelector(
            "#totalProducts"
        );


    const inStockElement =
        document.querySelector(
            "#inStockCount"
        );


    const lowStockElement =
        document.querySelector(
            "#lowStockCount"
        );


    const outOfStockElement =
        document.querySelector(
            "#outOfStockCount"
        );


    if (totalProductsElement) {

        totalProductsElement.textContent =
            totalProducts;

    }


    if (inStockElement) {

        inStockElement.textContent =
            inStock;

    }


    if (lowStockElement) {

        lowStockElement.textContent =
            lowStock;

    }


    if (outOfStockElement) {

        outOfStockElement.textContent =
            outOfStock;

    }

}


/* =========================================================
   SEARCH AND FILTER INVENTORY
   ========================================================= */

function filterInventory() {

    const searchInput =
        document.querySelector(
            "#inventorySearch"
        );


    const categoryFilter =
        document.querySelector(
            "#inventoryCategoryFilter"
        );


    const stockFilter =
        document.querySelector(
            "#inventoryStockFilter"
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
        getInventoryProducts();


    const inventory =
        getInventory();


    const filteredInventory =
        inventory.filter(function (item) {

            const product =
                products.find(function (productItem) {

                    return (
                        productItem.id ===
                        item.productId
                    );

                });


            if (!product) {
                return false;
            }


            const matchesSearch =

                product.name
                    .toLowerCase()
                    .includes(searchText)

                ||

                product.id
                    .toLowerCase()
                    .includes(searchText);


            const matchesCategory =

                selectedCategory ===
                "All Categories"

                ||

                product.category ===
                selectedCategory;


            const status =
                getInventoryStatus(
                    item.currentStock,
                    item.minimumStock
                );


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


    displayInventory(
        filteredInventory
    );

}


/* =========================================================
   INITIALIZE INVENTORY PAGE
   ========================================================= */


function initializeInventoryPage() {

    // Only display inventory on page load.
    // Do not automatically modify LocalStorage.
    if (!document.querySelector("#inventoryTableBody")) {
        return;
    }

    displayInventory();


    updateInventorySummary();
    displayRecentStockMovements();
    displayLowStockAlerts();


    const searchInput =
        document.querySelector(
            "#inventorySearch"
        );


    const categoryFilter =
        document.querySelector(
            "#inventoryCategoryFilter"
        );


    const stockFilter =
        document.querySelector(
            "#inventoryStockFilter"
        );


    if (searchInput) {

        searchInput.addEventListener(
            "input",
            filterInventory
        );

    }


    if (categoryFilter) {

        categoryFilter.addEventListener(
            "change",
            filterInventory
        );

    }


    if (stockFilter) {

        stockFilter.addEventListener(
            "change",
            filterInventory
        );

    }

}
document.addEventListener(
    "DOMContentLoaded",
    function () {

        initializeInventoryPage();
          initializeStockAdjustmentPage();

    }
);

/* =========================================================
   STOCK ADJUSTMENT
   ========================================================= */


/* =========================================================
   GET STOCK ADJUSTMENTS
   ========================================================= */

function getStockAdjustments() {

    return Storage.get(
        STORAGE_KEYS.STOCK_ADJUSTMENTS,
        []
    );

}


/* =========================================================
   SAVE STOCK ADJUSTMENTS
   ========================================================= */

function saveStockAdjustments(adjustments) {

    return Storage.set(
        STORAGE_KEYS.STOCK_ADJUSTMENTS,
        adjustments
    );

}


/* =========================================================
   LOAD PRODUCTS INTO ADJUSTMENT DROPDOWN
   ========================================================= */

function loadAdjustmentProducts() {

    const productSelect =
        document.querySelector(
            "#product"
        );


    if (!productSelect) {

        return;

    }


    const products =
        getInventoryProducts();


    productSelect.innerHTML = `
        <option value="">
            Select Product
        </option>
    `;


    products.forEach(function (product) {

        const option =
            document.createElement("option");


        option.value =
            product.id;


        option.textContent =
            `${product.name} (${product.id})`;


        productSelect.appendChild(
            option
        );

    });

}


/* =========================================================
   GET INVENTORY RECORD FOR PRODUCT
   ========================================================= */

function getInventoryByProductId(productId) {

    const inventory =
        getInventory();


    return inventory.find(
        function (item) {

            return (
                item.productId ===
                productId
            );

        }
    );

}


/* =========================================================
   UPDATE CURRENT STOCK DISPLAY
   ========================================================= */

function updateAdjustmentStockDisplay() {

    const productSelect =
        document.querySelector(
            "#product"
        );


    const currentStockInput =
        document.querySelector(
            "#currentStock"
        );


    const newStockInput =
        document.querySelector(
            "#newStock"
        );


    const summaryCurrentStock =
        document.querySelector(
            "#summaryCurrentStock"
        );


    const summaryNewStock =
        document.querySelector(
            "#summaryNewStock"
        );


    if (!productSelect) {

        return;

    }


    const productId =
        productSelect.value;


    if (!productId) {

        if (currentStockInput) {

            currentStockInput.value = 0;

        }


        if (newStockInput) {

            newStockInput.value = 0;

        }


        if (summaryCurrentStock) {

            summaryCurrentStock.textContent = 0;

        }


        if (summaryNewStock) {

            summaryNewStock.textContent = 0;

        }


        return;

    }


    const inventoryRecord =
        getInventoryByProductId(
            productId
        );


    if (!inventoryRecord) {

        alert(
            "Inventory record not found for this product."
        );

        return;

    }


    const currentStock =
        Number(
            inventoryRecord.currentStock
        ) || 0;


    if (currentStockInput) {

        currentStockInput.value =
            currentStock;

    }


    if (newStockInput) {

        newStockInput.value =
            currentStock;

    }


    if (summaryCurrentStock) {

        summaryCurrentStock.textContent =
            currentStock;

    }


    if (summaryNewStock) {

        summaryNewStock.textContent =
            currentStock;

    }

}


/* =========================================================
   CALCULATE NEW STOCK
   ========================================================= */


function calculateNewAdjustmentStock() {
    const currentStockInput = document.querySelector("#currentStock");
    const typeInput = document.querySelector("#adjustmentType");
    const quantityInput = document.querySelector("#adjustmentQuantity");
    const newStockInput = document.querySelector("#newStock");
    const summaryAdjustment = document.querySelector("#summaryAdjustment");
    const summaryNewStock = document.querySelector("#summaryNewStock");

    if (!currentStockInput || !typeInput || !quantityInput) {
        return null;
    }

    const currentStock = Number(currentStockInput.value);
    const adjustmentType = typeInput.value;
    const quantity = Number(quantityInput.value);

    if (
        !Number.isFinite(currentStock) ||
        currentStock < 0 ||
        !Number.isFinite(quantity) ||
        quantity < 0
    ) {
        if (newStockInput) newStockInput.value = "";
        if (summaryNewStock) summaryNewStock.textContent = "Invalid";

        if (summaryAdjustment) {
            summaryAdjustment.textContent = "Invalid quantity";
            summaryAdjustment.className = "";
        }

        return null;
    }

    let newStock = currentStock;

    if (adjustmentType === "Increase") {
        newStock = currentStock + quantity;
    } else if (adjustmentType === "Decrease") {
        newStock = currentStock - quantity;
    }

    // Do not silently change negative stock to zero.
    // The save function will reject invalid decreases.
    if (newStockInput) {
        newStockInput.value = Number.isFinite(newStock) ? newStock : "";
    }

    if (summaryNewStock) {
        summaryNewStock.textContent = Number.isFinite(newStock)
            ? String(newStock)
            : "Invalid";
    }

    if (summaryAdjustment) {
        if (adjustmentType === "Increase") {
            summaryAdjustment.textContent = `+ ${quantity}`;
            summaryAdjustment.className = "summary-increase";
        } else if (adjustmentType === "Decrease") {
            summaryAdjustment.textContent = `- ${quantity}`;
            summaryAdjustment.className = "summary-decrease";
        } else {
            summaryAdjustment.textContent = "0";
            summaryAdjustment.className = "";
        }
    }

    return newStock;
}



/* =========================================================
   SAVE STOCK ADJUSTMENT
   ========================================================= */


let stockAdjustmentSaveInProgress = false;

function saveStockAdjustment() {
    if (stockAdjustmentSaveInProgress) {
        return false;
    }

    const productSelect = document.querySelector("#product");
    const typeInput = document.querySelector("#adjustmentType");
    const quantityInput = document.querySelector("#adjustmentQuantity");
    const dateInput = document.querySelector("#adjustmentDate");
    const reasonInput = document.querySelector("#reason");
    const notesInput = document.querySelector("#notes");
    const form = document.querySelector("#stockAdjustmentForm");

    if (!productSelect || !typeInput || !quantityInput ||
        !dateInput || !reasonInput) {
        alert("Stock adjustment form fields could not be found.");
        return false;
    }

    const productId = productSelect.value;
    const adjustmentType = typeInput.value;
    const quantity = Number(quantityInput.value);
    const adjustmentDate = dateInput.value;
    const reason = reasonInput.value;
    const notes = notesInput ? notesInput.value.trim() : "";

    if (!productId) {
        alert("Please select a product.");
        return false;
    }

    if (adjustmentType !== "Increase" && adjustmentType !== "Decrease") {
        alert("Please select a valid adjustment type.");
        return false;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
        alert("Adjustment quantity must be a number greater than 0.");
        return false;
    }

    if (!adjustmentDate ||
        !/^\d{4}-\d{2}-\d{2}$/.test(adjustmentDate) ||
        Number.isNaN(Date.parse(adjustmentDate))) {
        alert("Please select a valid adjustment date.");
        return false;
    }

    if (adjustmentDate > getToday()) {
        alert("Adjustment date cannot be in the future.");
        return false;
    }

    if (!reason) {
        alert("Please select a reason.");
        return false;
    }

    const inventory = getInventory();
    const products = getInventoryProducts();
    const adjustments = getStockAdjustments();

    if (!Array.isArray(inventory) ||
        !Array.isArray(products) ||
        !Array.isArray(adjustments)) {
        alert("Stored inventory data is invalid. No changes were saved.");
        return false;
    }

    const matchingInventory = inventory.filter(
        item => item && item.productId === productId
    );

    if (matchingInventory.length !== 1) {
        alert(
            matchingInventory.length === 0
                ? "Inventory record not found. No changes were saved."
                : "Multiple inventory records exist for this product. No changes were saved."
        );
        return false;
    }

    const matchingProducts = products.filter(
        item => item && item.id === productId
    );

    if (matchingProducts.length !== 1) {
        alert(
            matchingProducts.length === 0
                ? "Product record not found. No changes were saved."
                : "Multiple product records exist. No changes were saved."
        );
        return false;
    }

    const inventoryRecord = matchingInventory[0];
    const product = matchingProducts[0];
    const currentStock = Number(inventoryRecord.currentStock);

    if (!Number.isFinite(currentStock) || currentStock < 0) {
        alert("Current inventory stock is invalid. No changes were saved.");
        return false;
    }

    const newStock = adjustmentType === "Increase"
        ? currentStock + quantity
        : currentStock - quantity;

    if (!Number.isFinite(newStock) || newStock < 0) {
        alert("Stock cannot become negative. No changes were saved.");
        return false;
    }
    const productStock = Number(product.stock);

            if (!Number.isFinite(productStock) || productStock < 0) {
            alert("Product stock is invalid. No changes were saved.");
            return false;
        }

            if (productStock !== currentStock) {
            alert(
                "Product stock and inventory stock do not match. " +
                "No changes were saved. Please inspect the records first."
            );
            return false;
        }

    // Keep snapshots for best-effort recovery if a later save fails.
    const originalInventory = JSON.parse(JSON.stringify(inventory));
    const originalProducts = JSON.parse(JSON.stringify(products));
    const originalAdjustments = JSON.parse(JSON.stringify(adjustments));

    stockAdjustmentSaveInProgress = true;

    const submitButton = form
        ? form.querySelector('[type="submit"]')
        : null;

    const wasButtonDisabled = submitButton
        ? submitButton.disabled
        : false;

    if (submitButton) {
        submitButton.disabled = true;
    }

    try {
        inventoryRecord.currentStock = newStock;
        inventoryRecord.lastUpdated = adjustmentDate;
        inventoryRecord.status = getInventoryStatus(
            newStock,
            inventoryRecord.minimumStock
        );

        product.stock = newStock;

        adjustments.unshift({
            id: generateId("ADJ"),
            productId: productId,
            adjustmentType: adjustmentType,
            quantity: quantity,
            previousStock: currentStock,
            newStock: newStock,
            reason: reason,
            notes: notes,
            date: adjustmentDate,
            adjustedBy: "Owner",
            createdAt: getToday()
        });

        const inventorySaved = saveInventory(inventory);

        if (inventorySaved === false) {
            throw new Error("Could not save inventory data.");
        }

        const productsSaved = Storage.set(
            STORAGE_KEYS.PRODUCTS,
            products
        );

        if (productsSaved === false) {
            throw new Error("Could not save product data.");
        }

        const historySaved = saveStockAdjustments(adjustments);

        if (historySaved === false) {
            throw new Error("Could not save adjustment history.");
        }

        alert("Stock adjustment saved successfully.");
        window.location.href = "inventory.html";
        return true;

    } catch (error) {
        // Best-effort rollback. LocalStorage cannot atomically commit
        // changes to multiple keys, and recovery can itself fail.
        let rollbackSucceeded = true;

        try {
            if (saveInventory(originalInventory) === false) {
                rollbackSucceeded = false;
            }
        } catch (rollbackError) {
            rollbackSucceeded = false;
        }

        try {
            if (Storage.set(STORAGE_KEYS.PRODUCTS, originalProducts) === false) {
                rollbackSucceeded = false;
            }
        } catch (rollbackError) {
            rollbackSucceeded = false;
        }

        try {
            if (saveStockAdjustments(originalAdjustments) === false) {
                rollbackSucceeded = false;
            }
        } catch (rollbackError) {
            rollbackSucceeded = false;
        }

        console.error("Stock adjustment save failed:", error);

        alert(
            rollbackSucceeded
                ? "Stock adjustment could not be saved. Previous data was restored."
                : "Save failed and recovery could not be confirmed. Do not retry yet; inspect inventory and product stock first."
        );

        return false;

    } finally {
        stockAdjustmentSaveInProgress = false;

        if (submitButton) {
            submitButton.disabled = wasButtonDisabled;
        }
    }
}



/* =========================================================
   INITIALIZE STOCK ADJUSTMENT PAGE
   ========================================================= */


function initializeStockAdjustmentPage() {
    const form = document.querySelector("#stockAdjustmentForm");

    if (!form) {
        return;
    }

    // Do not call synchronizeInventory() here.
    loadAdjustmentProducts();
    displayAdjustmentHistory();

    const dateInput = document.querySelector("#adjustmentDate");

    if (dateInput) {
        dateInput.value = getToday();
    }

    const productSelect = document.querySelector("#product");

    if (productSelect) {
        productSelect.addEventListener(
            "change",
            updateAdjustmentStockDisplay
        );
    }

    const adjustmentType = document.querySelector("#adjustmentType");

    if (adjustmentType) {
        adjustmentType.addEventListener(
            "change",
            calculateNewAdjustmentStock
        );
    }

    const quantityInput = document.querySelector("#adjustmentQuantity");

    if (quantityInput) {
        quantityInput.addEventListener(
            "input",
            calculateNewAdjustmentStock
        );
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        saveStockAdjustment();
    });
}




/* =========================================================
   DISPLAY STOCK ADJUSTMENT HISTORY
   ========================================================= */

function displayAdjustmentHistory() {

    const historyBody =
        document.querySelector(
            "#adjustmentHistoryBody"
        );


    if (!historyBody) {

        return;

    }


    const adjustments =
        getStockAdjustments();


    const products =
        getInventoryProducts();


    historyBody.innerHTML = "";


    /*
        No adjustment records
    */

    if (adjustments.length === 0) {

        historyBody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    style="text-align:center; padding:30px;"
                >
                    No stock adjustments found.
                </td>
            </tr>
        `;

        return;

    }


    /*
        Display latest adjustment first
    */

    adjustments.forEach(
        function (adjustment) {

            const product =
                products.find(
                    function (item) {

                        return (
                            item.id ===
                            adjustment.productId
                        );

                    }
                );


            const productName =
                product
                    ? product.name
                    : "Unknown Product";


            const quantity =
                Number(
                    adjustment.quantity
                ) || 0;


            let typeClass =
                "adjustment-out";


            let quantityDisplay =
                `- ${quantity}`;


            /*
                Increase
            */

            if (
                adjustment.adjustmentType ===
                "Increase"
            ) {

                typeClass =
                    "adjustment-in";


                quantityDisplay =
                    `+ ${quantity}`;

            }


            /*
                Decrease
            */

            if (
                adjustment.adjustmentType ===
                "Decrease"
            ) {

                typeClass =
                    "adjustment-out";


                quantityDisplay =
                    `- ${quantity}`;

            }


            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    ${formatDate(
                        adjustment.date
                    )}
                </td>

                <td>
                    ${productName}
                </td>

                <td>
                    <span class="${typeClass}">
                        ${adjustment.adjustmentType}
                    </span>
                </td>

                <td>
                    ${quantityDisplay}
                </td>

                <td>
                    ${adjustment.reason}
                </td>

                <td>
                    ${adjustment.adjustedBy || "Owner"}
                </td>

            `;


            historyBody.appendChild(
                row
            );

        }
    );

}
/* =========================================================
   INVENTORY ↔ PRODUCT STOCK CONSISTENCY
   ========================================================= */

function checkStockConsistency() {

    const products = getInventoryProducts();
    const inventory = getInventory();

    const inconsistencies = [];

    products.forEach(function (product) {

        const inventoryRecord = inventory.find(
            function (item) {
                return item.productId === product.id;
            }
        );

        if (!inventoryRecord) {

            inconsistencies.push({
                productId: product.id,
                productName: product.name,
                productStock: Number(product.stock) || 0,
                inventoryStock: null,
                issue: "Inventory record missing"
            });

            return;
        }

        const productStock =
            Number(product.stock) || 0;

        const inventoryStock =
            Number(inventoryRecord.currentStock) || 0;

        if (productStock !== inventoryStock) {

            inconsistencies.push({
                productId: product.id,
                productName: product.name,
                productStock: productStock,
                inventoryStock: inventoryStock,
                issue: "Stock mismatch"
            });

        }

    });

    if (inconsistencies.length === 0) {

        console.log(
            "✅ Stock consistency check passed."
        );

        return true;
    }

    console.warn(
        "⚠️ Stock consistency problems found:",
        inconsistencies
    );

    return inconsistencies;
}
/* =========================================================
   AUTOMATIC STOCK CONSISTENCY SYNCHRONIZATION
   ========================================================= */

function synchronizeStockConsistency() {

    const products = getInventoryProducts();
    const inventory = getInventory();

    let changesMade = false;

    products.forEach(function (product) {

        const inventoryRecord = inventory.find(
            function (item) {
                return item.productId === product.id;
            }
        );

        // If inventory record does not exist,
        // create it from product stock.
        if (!inventoryRecord) {

            inventory.push({
                id: generateId("INV"),
                productId: product.id,
                currentStock: Number(product.stock) || 0,
                minimumStock: Number(product.minimumStock) || 0,
                lastUpdated: getToday(),
                status: getInventoryStatus(
                    product.stock,
                    product.minimumStock
                )
            });

            changesMade = true;

            return;
        }

        const productStock =
            Number(product.stock) || 0;

        const inventoryStock =
            Number(inventoryRecord.currentStock) || 0;

        // Correct inventory stock if mismatch exists
        if (productStock !== inventoryStock) {

            console.warn(
                "Stock mismatch corrected:",
                product.name,
                "Inventory:",
                inventoryStock,
                "→ Product:",
                productStock
            );

            inventoryRecord.currentStock =
                productStock;

            inventoryRecord.minimumStock =
                Number(product.minimumStock) || 0;

            inventoryRecord.lastUpdated =
                getToday();

            inventoryRecord.status =
                getInventoryStatus(
                    productStock,
                    product.minimumStock
                );

            changesMade = true;
        }

    });

    if (changesMade) {

        saveInventory(inventory);

        console.log(
            "✅ Stock consistency synchronized successfully."
        );

    } else {

        console.log(
            "✅ Stock consistency already synchronized."
        );

    }

    return inventory;
}

/* =========================================================
   DISPLAY RECENT STOCK MOVEMENTS
   ========================================================= */

function displayRecentStockMovements() {

    const movementContainer =
        document.querySelector(
            "#recentStockMovement"
        );


    if (!movementContainer) {

        return;

    }


    const adjustments =
        getStockAdjustments();


    const products =
        getInventoryProducts();


    movementContainer.innerHTML = "";


    /*
        No movement records
    */

    if (adjustments.length === 0) {

        movementContainer.innerHTML = `
            <div
                class="movement-item"
                style="text-align:center;"
            >

                <div>

                    <strong>
                        No stock movement
                    </strong>

                    <p>
                        No recent stock adjustments found.
                    </p>

                </div>

            </div>
        `;

        return;

    }


    /*
        Show latest 5 movements
    */

    const recentMovements =
        adjustments.slice(0, 5);


    recentMovements.forEach(
        function (adjustment) {

            const product =
                products.find(
                    function (item) {

                        return (
                            item.id ===
                            adjustment.productId
                        );

                    }
                );


            const productName =
                product
                    ? product.name
                    : "Unknown Product";


            const quantity =
                Number(
                    adjustment.quantity
                ) || 0;


            let movementClass =
                "movement-out";


            let movementQuantity =
                `- ${quantity}`;


            let movementDescription =
                "Stock decreased";


            /*
                Increase movement
            */

            if (
                adjustment.adjustmentType ===
                "Increase"
            ) {

                movementClass =
                    "movement-in";


                movementQuantity =
                    `+ ${quantity}`;


                movementDescription =
                    "Stock increased";

            }


            /*
                Decrease movement
            */

            if (
                adjustment.adjustmentType ===
                "Decrease"
            ) {

                movementClass =
                    "movement-out";


                movementQuantity =
                    `- ${quantity}`;


                movementDescription =
                    "Stock decreased";

            }


            const movementItem =
                document.createElement(
                    "div"
                );


            movementItem.className =
                "movement-item";


            movementItem.innerHTML = `

                <div>

                    <strong>
                        ${productName}
                    </strong>

                    <p>
                        ${movementDescription}
                        · ${adjustment.reason}
                    </p>

                </div>


                <span class="${movementClass}">
                    ${movementQuantity}
                </span>

            `;


            movementContainer.appendChild(
                movementItem
            );

        }
    );

}

/* =========================================================
   DISPLAY LOW STOCK ALERTS
   ========================================================= */

function displayLowStockAlerts() {

    const container =
        document.querySelector(
            "#lowStockAlertsContainer"
        );

    if (!container) {
        return;
    }

    const products =
        getInventoryProducts();

    container.innerHTML = "";

    const lowStockProducts =
    products.filter(
        function (product) {

            const status =
                getInventoryStatus(
                    product.stock,
                    product.minimumStock
                );

            return (
                status === "Low Stock" ||
                status === "Out of Stock"
            );
        }
    );

    if (lowStockProducts.length === 0) {

        container.innerHTML = `
            <div class="movement-item">
                <div>
                    <strong>
                        No low stock products
                    </strong>

                    <p>
                        All products have sufficient stock.
                    </p>
                </div>
            </div>
        `;

        return;
    }

    lowStockProducts.forEach(
        function (product) {

            const stock =
                Number(product.stock) || 0;

            const minimumStock =
                Number(product.minimumStock) || 0;

            const alertItem =
                document.createElement("div");

            alertItem.className =
                "alert-item";

            let statusText =
                "Low Stock";

            if (stock === 0) {
                statusText =
                    "Out of Stock";
            }

            alertItem.innerHTML = `
                <div>
                    <strong>
                        ${product.name}
                    </strong>

                    <p>
                        ${statusText}
                        · Minimum: ${minimumStock}
                    </p>
                </div>

                <span class="movement-out">
                    ${stock}
                </span>
            `;

            container.appendChild(
                alertItem
            );
        }
    );
}