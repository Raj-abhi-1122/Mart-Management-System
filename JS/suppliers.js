
/* =========================================================
   MART MANAGEMENT SYSTEM
   PHASE 2 - STEP 5.1: SUPPLIER DATA STRUCTURE
   ========================================================= */


/* =========================================================
   GET ALL SUPPLIERS
   ========================================================= */

function getSuppliers() {

    const suppliers = Storage.get(
        STORAGE_KEYS.SUPPLIERS,
        []
    );

    return Array.isArray(suppliers)
        ? suppliers
        : [];
}


/* =========================================================
   SAVE ALL SUPPLIERS
   ========================================================= */

function saveSuppliers(suppliers) {

    if (!Array.isArray(suppliers)) {
        console.error(
            "Save Error: Suppliers must be an array."
        );

        return false;
    }

    return Storage.set(
        STORAGE_KEYS.SUPPLIERS,
        suppliers
    );
}


/* =========================================================
   CREATE A NEW SUPPLIER RECORD
   ========================================================= */

function createSupplierRecord(data = {}) {
    return {
        id: String(data.id || generateId("SUP")).trim(),
        name: String(data.name || "").trim(),
        companyName: String(data.companyName || "").trim(),
        contactPerson: String(data.contactPerson || "").trim(),
        phone: String(data.phone || "").trim(),
        alternatePhone: String(data.alternatePhone || "").trim(),
        email: String(data.email || "").trim(),
        address: String(data.address || "").trim(),
        city: String(data.city || "").trim(),
        state: String(data.state || "").trim(),
        pinCode: String(data.pinCode || "").trim(),
        category: String(data.category || "").trim(),
        productsSupplied: String(data.productsSupplied || "").trim(),
        gstNumber: String(data.gstNumber || "").trim(),
        paymentTerms: String(data.paymentTerms || "Immediate").trim(),
        openingBalance: Math.max(0, toNumber(data.openingBalance)),
        status: data.status === "Inactive" ? "Inactive" : "Active",
        notes: String(data.notes || "").trim(),
        createdAt: getToday(),
        updatedAt: getToday()
    };
}


/* =========================================================
   FIND SUPPLIER BY ID
   ========================================================= */

function getSupplierById(supplierId) {

    const suppliers = getSuppliers();

    return suppliers.find(
        function (supplier) {
            return supplier.id === supplierId;
        }
    ) || null;
}


console.log(
    "MMS Supplier data module loaded successfully."
);


/* =========================================================
   PHASE 2 - STEP 5.2: DYNAMIC SUPPLIER LIST
   ========================================================= */

/* SAFELY DISPLAY TEXT IN HTML */
function escapeSupplierHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (character) {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}

/* GET PRODUCT NAMES SUPPLIED BY A SUPPLIER */

function getProductsSuppliedBySupplier(supplierId) {
    const supplier = getSupplierById(supplierId);
    const products = Storage.get(STORAGE_KEYS.PRODUCTS, []);

    const linkedProducts = Array.isArray(products)
        ? products
            .filter(function (product) {
                return product.supplierId === supplierId;
            })
            .map(function (product) {
                return product.name;
            })
            .filter(Boolean)
        : [];

    // Prefer actual products linked to this supplier.
    if (linkedProducts.length > 0) {
        return linkedProducts;
    }

    // Otherwise, use the text entered in the supplier form.
    if (supplier && supplier.productsSupplied) {
        return supplier.productsSupplied
            .split(",")
            .map(function (name) {
                return name.trim();
            })
            .filter(Boolean);
    }

    return [];
}


/* CALCULATE TOTAL PURCHASES */
function calculateSupplierPurchaseTotal() {
    const purchases = Storage.get(STORAGE_KEYS.PURCHASES, []);

    if (!Array.isArray(purchases)) {
        return 0;
    }

    return purchases.reduce(function (total, purchase) {
        const amount = toNumber(
            purchase.totalAmount ??
            purchase.grandTotal ??
            purchase.total ??
            purchase.amount
        );

        return total + amount;
    }, 0);
}

/* UPDATE SUPPLIER SUMMARY CARDS */
function updateSupplierSummary() {
    const suppliers = getSuppliers();

    const totalElement = document.getElementById("totalSuppliers");
    const activeElement = document.getElementById("activeSuppliers");
    const pendingElement = document.getElementById("pendingSupplierPayments");
    const purchasesElement = document.getElementById("totalSupplierPurchases");

    const activeCount = suppliers.filter(function (supplier) {
        return supplier.status === "Active";
    }).length;

    const pendingPayments = suppliers.reduce(function (total, supplier) {
        return total + Math.max(0, toNumber(supplier.openingBalance));
    }, 0);

    if (totalElement) {
        totalElement.textContent = suppliers.length;
    }

    if (activeElement) {
        activeElement.textContent = activeCount;
    }

    if (pendingElement) {
        pendingElement.textContent = formatCurrency(pendingPayments);
    }

    if (purchasesElement) {
        purchasesElement.textContent = formatCurrency(
            calculateSupplierPurchaseTotal()
        );
    }
}

/* DISPLAY SUPPLIER TABLE */
function displaySuppliers() {
    const tableBody = document.getElementById("suppliersTableBody");

    if (!tableBody) {
        return;
    }

    const searchInput = document.getElementById("supplierSearch");
    const statusFilter = document.getElementById("supplierStatusFilter");

    const searchText = searchInput
        ? searchInput.value.trim().toLowerCase()
        : "";

    const selectedStatus = statusFilter
        ? statusFilter.value
        : "";

    const suppliers = getSuppliers();

    const filteredSuppliers = suppliers.filter(function (supplier) {
        const searchableText = [
            supplier.id,
            supplier.name,
            supplier.contactPerson,
            supplier.phone,
            supplier.email
        ].join(" ").toLowerCase();

        const matchesSearch = searchableText.includes(searchText);

        const matchesStatus =
            selectedStatus === "" ||
            supplier.status === selectedStatus;

        return matchesSearch && matchesStatus;
    });

    if (filteredSuppliers.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding:20px;">
                    ${suppliers.length === 0
                        ? "No suppliers found. Click Add Supplier to create one."
                        : "No suppliers match your search or filter."}
                </td>
            </tr>
        `;

        updateSupplierSummary();
        return;
    }

    tableBody.innerHTML = filteredSuppliers.map(function (supplier) {
        const productNames = getProductsSuppliedBySupplier(supplier.id);
        const productsText = productNames.length > 0
            ? productNames.join(", ")
            : "-";

        const statusClass = supplier.status === "Active"
            ? "active"
            : "inactive";

        return `
            <tr>
                <td>${escapeSupplierHTML(supplier.id)}</td>
                <td>${escapeSupplierHTML(supplier.name || "-")}</td>
                <td>${escapeSupplierHTML(supplier.phone || "-")}</td>
                <td>${escapeSupplierHTML(supplier.email || "-")}</td>
                <td>${escapeSupplierHTML(productsText)}</td>
                <td>${escapeSupplierHTML(
                    formatCurrency(toNumber(supplier.openingBalance))
                )}</td>
                <td>
                    <span class="status ${statusClass}">
                        ${escapeSupplierHTML(supplier.status)}
                    </span>
                </td>
                <td>
                    <button
                        type="button"
                        class="action-btn"
                        data-action="view"
                        data-id="${escapeSupplierHTML(supplier.id)}"
                    >
                        View
                    </button>

                   
                    <button
                        type="button"
                        class="action-btn"
                        data-action="edit"
                        data-id="${escapeSupplierHTML(supplier.id)}"
                    >
                        Edit
                    </button>
                    
                    <button
                        type="button"
                        class="action-btn"
                        data-action="delete"
                        data-id="${escapeSupplierHTML(supplier.id)}"
                    >
                        Delete
                    </button>


                </td>
            </tr>
        `;
    }).join("");

    updateSupplierSummary();
}

/* INITIALIZE SUPPLIER LIST PAGE */
function initializeSuppliersPage() {
    const searchInput = document.getElementById("supplierSearch");
    const statusFilter = document.getElementById("supplierStatusFilter");

    if (!document.getElementById("suppliersTableBody")) {
        return;
    }

    if (searchInput) {
        searchInput.addEventListener("input", displaySuppliers);
    }

    if (statusFilter) {
        statusFilter.addEventListener("change", displaySuppliers);
    }

    displaySuppliers();

   
    
        const tableBody = document.getElementById("suppliersTableBody");

        if (tableBody) {
            tableBody.addEventListener("click", function (event) {
                const button = event.target.closest("button[data-action]");

                if (!button || !tableBody.contains(button)) return;

                const action = button.dataset.action;
                const supplierId = button.dataset.id;
                const supplier = getSupplierById(supplierId);

                if (!supplier) {
                    alert("Supplier record not found.");
                    return;
                }

                if (action === "view") {
                    window.location.href =
                        "supplier-details.html?id=" +
                        encodeURIComponent(supplierId);
                    return;
                }

                if (action === "edit") {
                    window.location.href =
                        "add-supplier.html?edit=" +
                        encodeURIComponent(supplierId);
                    return;
                }

                if (action === "delete") {
                    // Prevent deletion when purchase history exists.
                    if (isSupplierLinkedToPurchases(supplierId)) {
                        alert(
                            "This supplier cannot be deleted because purchase " +
                            "records are linked to it. Preserve the supplier " +
                            "record to maintain purchase history."
                        );
                        return;
                    }

                    const confirmed = window.confirm(
                        "Are you sure you want to delete supplier \"" +
                        supplier.name +
                        "\"?\n\nThis action cannot be undone."
                    );

                    if (!confirmed) return;

                    const suppliers = getSuppliers();

                    const updatedSuppliers = suppliers.filter(function (item) {
                        return item.id !== supplierId;
                    });

                    if (updatedSuppliers.length === suppliers.length) {
                        alert("Supplier could not be found in the saved list.");
                        return;
                    }

                    if (!saveSuppliers(updatedSuppliers)) {
                        alert("Unable to delete supplier. Please try again.");
                        return;
                    }

                    // Refresh the list and summary cards.
                    displaySuppliers();
                    updateSupplierSummary();

                    alert("Supplier deleted successfully!");
                }
            });
        }


}


/* START WHEN THE PAGE IS READY */
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeSuppliersPage);
} else {
    initializeSuppliersPage();
}



function validateSupplierPhone(phone) {
    // Accept 10-digit Indian mobile numbers beginning with 6-9.
    return /^[6-9]\d{9}$/.test(String(phone).trim());
}

function validateSupplierEmail(email) {
    const value = String(email || "").trim();

    // Email is optional, but must be valid when provided.
    if (value === "") return true;

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateSupplierGST(gstNumber) {
    const value = String(gstNumber || "").trim().toUpperCase();

    // GST number is optional.
    if (value === "") return true;

    // Standard Indian GSTIN format.
    return /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/.test(value);
}

function validateSupplierPinCode(pinCode) {
    const value = String(pinCode || "").trim();

    // PIN code is optional.
    if (value === "") return true;

    // Six digits; first digit cannot be zero.
    return /^[1-9]\d{5}$/.test(value);
}

function validateSupplierOpeningBalance(balance) {
    const value = String(balance ?? "").trim();

    if (value === "") return true;

    const amount = Number(value);

    return Number.isFinite(amount) && amount >= 0;
}

function validateSupplierName(name) {
    return String(name || "").trim().length >= 2;
}


function isDuplicateSupplierPhone(phone, currentSupplierId = "") {
    const normalizedPhone = String(phone || "").trim();

    return getSuppliers().some(function (supplier) {
        return supplier.phone === normalizedPhone &&
            supplier.id !== currentSupplierId;
    });
}

function isDuplicateSupplierGST(gstNumber, currentSupplierId = "") {
    const normalizedGST = String(gstNumber || "").trim().toUpperCase();

    // Empty GST numbers should not count as duplicates.
    if (!normalizedGST) return false;

    return getSuppliers().some(function (supplier) {
        return String(supplier.gstNumber || "").trim().toUpperCase() ===
            normalizedGST &&
            supplier.id !== currentSupplierId;
    });
}


/* =========================================================
   PHASE 2 - STEP 5.3: ADD AND SAVE SUPPLIER
   ========================================================= */


function initializeAddSupplierPage() {
    const form = document.getElementById("supplierForm");

    if (!form) return;

    const params = new URLSearchParams(window.location.search);
    const editId = params.get("edit");
    const editingSupplier = editId ? getSupplierById(editId) : null;

    const supplierIdInput = document.getElementById("supplierId");
    const nameInput = document.getElementById("supplierName");
    const phoneInput = document.getElementById("supplierPhone");

    const submitButton = form.querySelector(
        'button[type="submit"], input[type="submit"]'
    );

    // If an edit ID was supplied but the record does not exist,
    // do not accidentally create a new supplier.
    if (editId && !editingSupplier) {
        alert("Supplier record not found.");
        window.location.href = "suppliers.html";
        return;
    }

    // Fill the form when editing an existing supplier.
    if (editingSupplier) {
        const fieldMap = {
            supplierId: "id",
            supplierName: "name",
            supplierCompany: "companyName",
            supplierGST: "gstNumber",
            supplierPhone: "phone",
            supplierEmail: "email",
            supplierContactPerson: "contactPerson",
            supplierAlternatePhone: "alternatePhone",
            supplierAddress: "address",
            supplierCity: "city",
            supplierState: "state",
            supplierPinCode: "pinCode",
            supplierProducts: "productsSupplied",
            supplierPaymentTerms: "paymentTerms",
            supplierOpeningBalance: "openingBalance",
            supplierStatus: "status",
            supplierNotes: "notes"
        };

        Object.entries(fieldMap).forEach(function ([fieldId, property]) {
            const input = document.getElementById(fieldId);

            if (input) {
                input.value = editingSupplier[property] ?? "";
            }
        });

        if (submitButton) {
            if (submitButton.tagName === "INPUT") {
                submitButton.value = "Update Supplier";
            } else {
                submitButton.textContent = "Update Supplier";
            }
        }

        const heading = document.querySelector("main h1, main h2");

        if (heading) {
            heading.textContent = "Edit Supplier";
        }
    } else {
        // New supplier mode.
        if (supplierIdInput && !supplierIdInput.value.trim()) {
            supplierIdInput.value = generateId("SUP");
        }

        if (submitButton) {
            if (submitButton.tagName === "INPUT") {
                submitButton.value = "Save Supplier";
            } else {
                submitButton.textContent = "Save Supplier";
            }
        }
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        const name = nameInput ? nameInput.value.trim() : "";
        const phone = phoneInput ? phoneInput.value.trim() : "";

        if (!name || !phone) {
            alert("Please enter the supplier name and phone number.");
            return;
        }

        const suppliers = getSuppliers();

        // Prevent duplicate phone numbers, except for the
        // supplier currently being edited.
        const duplicatePhone = suppliers.some(function (supplier) {
            return supplier.phone === phone &&
                supplier.id !== (editingSupplier ? editingSupplier.id : null);
        });

        if (duplicatePhone) {
            alert("A supplier with this phone number already exists.");
            return;
        }

        const supplierData = {
            id: editingSupplier
                ? editingSupplier.id
                : (supplierIdInput ? supplierIdInput.value.trim() : ""),

            name: name,
            companyName: document.getElementById("supplierCompany")?.value,
            gstNumber: document.getElementById("supplierGST")?.value,
            phone: phone,
            email: document.getElementById("supplierEmail")?.value,
            contactPerson: document.getElementById("supplierContactPerson")?.value,
            alternatePhone: document.getElementById("supplierAlternatePhone")?.value,
            address: document.getElementById("supplierAddress")?.value,
            city: document.getElementById("supplierCity")?.value,
            state: document.getElementById("supplierState")?.value,
            pinCode: document.getElementById("supplierPinCode")?.value,
            productsSupplied: document.getElementById("supplierProducts")?.value,
            paymentTerms: document.getElementById("supplierPaymentTerms")?.value,
            openingBalance: document.getElementById("supplierOpeningBalance")?.value,
            status: document.getElementById("supplierStatus")?.value,
            notes: document.getElementById("supplierNotes")?.value
        };

        const updatedSupplier = createSupplierRecord(supplierData);

        if (editingSupplier) {
            // Preserve the original creation date.
            updatedSupplier.createdAt = editingSupplier.createdAt;
            updatedSupplier.updatedAt = getToday();

            const index = suppliers.findIndex(function (supplier) {
                return supplier.id === editingSupplier.id;
            });

            if (index === -1) {
                alert("Supplier record no longer exists.");
                return;
            }

            suppliers[index] = updatedSupplier;
        } else {
            updatedSupplier.createdAt = getToday();
            updatedSupplier.updatedAt = getToday();
            suppliers.push(updatedSupplier);
        }

        if (!saveSuppliers(suppliers)) {
            alert("Unable to save supplier details. Please try again.");
            return;
        }

        alert(
            editingSupplier
                ? "Supplier updated successfully!"
                : "Supplier added successfully!"
        );

        window.location.href = "suppliers.html";
    });
}

// Initialize only on the Add Supplier page.
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeAddSupplierPage);
} else {
    initializeAddSupplierPage();
}


/* =========================================================
   PHASE 2 - STEP 5.4: VIEW SUPPLIER DETAILS
   ========================================================= */

function initializeSupplierDetailsPage() {
    const container = document.getElementById("supplierDetailsContainer");

    // Run only on the supplier details page.
    if (!container) {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const supplierId = params.get("id");
    const supplier = supplierId ? getSupplierById(supplierId) : null;

    if (!supplier) {
        container.innerHTML = `
            <h3>Supplier Not Found</h3>
            <p>The supplier record could not be found.</p>
            <a href="suppliers.html" class="secondary-btn">
                Back to Suppliers
            </a>
        `;
        return;
    }

    const fields = [
        ["Supplier ID", supplier.id],
        ["Supplier Name", supplier.name],
        ["Company Name", supplier.companyName],
        ["Contact Person", supplier.contactPerson],
        ["Phone Number", supplier.phone],
        ["Alternate Phone", supplier.alternatePhone],
        ["Email Address", supplier.email],
        ["Address", supplier.address],
        ["City", supplier.city],
        ["State", supplier.state],
        ["PIN Code", supplier.pinCode],
        ["GST Number", supplier.gstNumber],
        ["Products Supplied", supplier.productsSupplied],
        ["Payment Terms", supplier.paymentTerms],
        ["Opening Balance", formatCurrency(supplier.openingBalance)],
        ["Supplier Status", supplier.status],
        ["Created Date", formatDate(supplier.createdAt)],
        ["Last Updated", formatDate(supplier.updatedAt)],
        ["Notes", supplier.notes]
    ];

    container.innerHTML = `
        <h2>${escapeSupplierHTML(supplier.name || "Supplier")}</h2>

        <div class="form-grid">
            ${fields.map(function (field) {
                return `
                    <div class="form-group">
                        <label>${escapeSupplierHTML(field[0])}</label>
                        <p>${escapeSupplierHTML(field[1] || "-")}</p>
                    </div>
                `;
            }).join("")}
        </div>

        <div class="form-actions">
            <a href="suppliers.html" class="secondary-btn">
                ← Back to Suppliers
            </a>
        </div>
    `;
}

function isSupplierLinkedToPurchases(supplierId) {
    const purchases = Storage.get(STORAGE_KEYS.PURCHASES, []);

    if (!Array.isArray(purchases)) {
        console.error("Purchase data is invalid. Deletion blocked.");
        return true;
    }

    return purchases.some(function (purchase) {
        if (!purchase) return false;

        // Check common supplier ID fields.
        if (
            String(purchase.supplierId ?? "") === String(supplierId) ||
            String(purchase.supplierID ?? "") === String(supplierId)
        ) {
            return true;
        }

        // Check a nested supplier object, if present.
        if (
            purchase.supplier &&
            typeof purchase.supplier === "object" &&
            String(purchase.supplier.id ?? "") === String(supplierId)
        ) {
            return true;
        }

        return false;
    });
}

// Initialize the details page when the document is ready.
if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeSupplierDetailsPage
    );
} else {
    initializeSupplierDetailsPage();
}
