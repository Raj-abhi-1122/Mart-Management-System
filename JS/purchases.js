/* =========================================================
   MART MANAGEMENT SYSTEM
   PURCHASES MODULE (ORDERS, RESTOCK, INVOICE ENTRY)
   ========================================================= */

function getPurchases() {
    return Storage.get(STORAGE_KEYS.PURCHASES, []);
}

function savePurchases(purchases) {
    return Storage.set(STORAGE_KEYS.PURCHASES, purchases);
}

/* =========================================================
   1. PURCHASES LIST PAGE (purchases.html)
   ========================================================= */
function initializePurchasesListPage() {
    const tableBody = document.getElementById("purchaseTableBody") || document.querySelector(".table-container table tbody");
    if (!tableBody) return;

    const purchases = getPurchases();
    const suppliers = Storage.get(STORAGE_KEYS.SUPPLIERS, []);
    const searchInput = document.getElementById("purchaseSearchInput") || document.querySelector(".search-input");
    const supplierFilter = document.getElementById("purchaseSupplierFilter") || document.querySelectorAll(".filter-select")[0];
    const statusFilter = document.getElementById("purchaseStatusFilter") || document.querySelectorAll(".filter-select")[1];

    // Populate supplier filter dropdown
    if (supplierFilter) {
        supplierFilter.innerHTML = '<option value="">All Suppliers</option>';
        suppliers.forEach(s => {
            const opt = document.createElement("option");
            opt.value = s.id;
            opt.textContent = s.name;
            supplierFilter.appendChild(opt);
        });
    }

    function renderPurchases(listToRender = null) {
        const list = listToRender !== null ? listToRender : purchases;
        tableBody.innerHTML = "";

        if (list.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 30px; color: #6b7280;">
                        No purchases found. Click "+ Add Purchase" to record new supplier purchases.
                    </td>
                </tr>
            `;
            return;
        }

        list.slice().reverse().forEach(purchase => {
            const tr = document.createElement("tr");
            const status = purchase.paymentStatus || (Number(purchase.dueAmount) <= 0 ? "Paid" : "Partial");
            const statusClass = status.toLowerCase() === "paid" ? "active" : status.toLowerCase() === "partial" ? "partial" : "due";
            const itemCount = Array.isArray(purchase.items) ? purchase.items.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0) : 1;
            const formattedTotal = typeof formatCurrency === "function" ? formatCurrency(purchase.grandTotal) : "₹" + purchase.grandTotal;
            const formattedPaid = typeof formatCurrency === "function" ? formatCurrency(purchase.paidAmount) : "₹" + (purchase.paidAmount || 0);
            const formattedDue = typeof formatCurrency === "function" ? formatCurrency(purchase.dueAmount) : "₹" + (purchase.dueAmount || 0);
            const formattedDate = typeof formatDate === "function" ? formatDate(purchase.purchaseDate) : purchase.purchaseDate;

            tr.innerHTML = `
                <td style="font-weight: 600;">${purchase.invoiceNumber || purchase.id}</td>
                <td>${purchase.supplierName || "Supplier"}</td>
                <td>${formattedDate}</td>
                <td>${itemCount}</td>
                <td style="font-weight: 600;">${formattedTotal}</td>
                <td style="color: #10b981;">${formattedPaid}</td>
                <td style="color: ${Number(purchase.dueAmount) > 0 ? '#ef4444' : '#6b7280'}; font-weight: 600;">${formattedDue}</td>
                <td><span class="status ${statusClass}">${status}</span></td>
                <td>
                    <button class="action-btn delete-purch-btn" data-id="${purchase.id}" style="color: #ef4444; border-color: #ef4444;">
                        Delete
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        tableBody.querySelectorAll(".delete-purch-btn").forEach(btn => {
            btn.addEventListener("click", function () {
                const id = this.getAttribute("data-id");
                if (confirm("Are you sure you want to delete this purchase record?")) {
                    const updated = purchases.filter(p => p.id !== id);
                    savePurchases(updated);
                    if (typeof logActivity === "function") {
                        logActivity("Purchase Deleted", "Purchases", `Deleted purchase record ID ${id}`);
                    }
                    initializePurchasesListPage();
                }
            });
        });
    }

    renderPurchases();

    function filterPurchases() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
        const selectedSupplier = supplierFilter ? supplierFilter.value : "";
        const selectedStatus = statusFilter ? statusFilter.value : "";

        const filtered = purchases.filter(p => {
            const inv = String(p.invoiceNumber || p.id || "").toLowerCase();
            const supName = String(p.supplierName || "").toLowerCase();
            const matchesSearch = !query || inv.includes(query) || supName.includes(query);

            let matchesSupplier = true;
            if (selectedSupplier) {
                matchesSupplier = p.supplierId === selectedSupplier;
            }

            let matchesStatus = true;
            if (selectedStatus && selectedStatus !== "All Status") {
                matchesStatus = (p.paymentStatus || "").toLowerCase() === selectedStatus.toLowerCase();
            }

            return matchesSearch && matchesSupplier && matchesStatus;
        });

        renderPurchases(filtered);
    }

    if (searchInput) searchInput.addEventListener("input", filterPurchases);
    if (supplierFilter) supplierFilter.addEventListener("change", filterPurchases);
    if (statusFilter) statusFilter.addEventListener("change", filterPurchases);
}

/* =========================================================
   2. ADD PURCHASES PAGE (add-purchases.html)
   ========================================================= */
function initializeAddPurchasePage() {
    const suppliers = Storage.get(STORAGE_KEYS.SUPPLIERS, []);
    const products = Storage.get(STORAGE_KEYS.PRODUCTS, []);
    const today = typeof getToday === "function" ? getToday() : new Date().toISOString().split("T")[0];

    // Populate supplier dropdown
    const supplierSelect = document.getElementById("purchaseSupplier");
    if (supplierSelect) {
        supplierSelect.innerHTML = `<option value="">Select Supplier</option>`;
        suppliers.forEach(s => {
            if (s.status !== "Inactive") {
                const opt = document.createElement("option");
                opt.value = s.id;
                opt.textContent = `${s.name} (${s.companyName || s.category})`;
                supplierSelect.appendChild(opt);
            }
        });
    }

    const dateInput = document.getElementById("purchaseDate");
    if (dateInput && !dateInput.value) {
        dateInput.value = today;
    }

    const invoiceInput = document.getElementById("purchaseInvoiceNumber");
    if (invoiceInput && !invoiceInput.value) {
        invoiceInput.value = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const tableBody = document.querySelector(".purchase-table tbody");
    const addProductBtn = document.getElementById("addPurchaseProduct");

    function createPurchaseRow(selectedProdId = "") {
        const tr = document.createElement("tr");

        let prodOptions = `<option value="">Select Product</option>`;
        products.forEach(p => {
            const isSelected = p.id === selectedProdId ? "selected" : "";
            prodOptions += `<option value="${p.id}" data-cost="${p.purchasePrice}" ${isSelected}>${p.name}</option>`;
        });

        const selectedProduct = products.find(p => p.id === selectedProdId);
        const cost = selectedProduct ? selectedProduct.purchasePrice : 0;

        tr.innerHTML = `
            <td>
                <select class="product-select" style="width:100%; padding:8px; border:1px solid #d1d5db; border-radius:4px;">
                    ${prodOptions}
                </select>
            </td>
            <td>
                <input type="number" class="qty-input" value="1" min="1" style="width:80px; padding:6px; border:1px solid #d1d5db; border-radius:4px;">
            </td>
            <td>
                <input type="number" class="cost-input" value="${cost}" min="0" step="0.5" style="width:90px; padding:6px; border:1px solid #d1d5db; border-radius:4px;">
            </td>
            <td>
                <input type="number" class="disc-input" value="0" min="0" style="width:70px; padding:6px; border:1px solid #d1d5db; border-radius:4px;">
            </td>
            <td class="purchase-line-total" style="font-weight:600;">
                ₹${cost.toFixed(2)}
            </td>
            <td>
                <button type="button" class="delete-btn remove-purch-row" style="background:none; border:none; cursor:pointer; font-size:16px; color:#ef4444;">
                    🗑
                </button>
            </td>
        `;

        const select = tr.querySelector(".product-select");
        const qtyInp = tr.querySelector(".qty-input");
        const costInp = tr.querySelector(".cost-input");
        const discInp = tr.querySelector(".disc-input");
        const totalCell = tr.querySelector(".purchase-line-total");
        const removeBtn = tr.querySelector(".remove-purch-row");

        select.addEventListener("change", function () {
            const prod = products.find(p => p.id === this.value);
            if (prod) {
                costInp.value = prod.purchasePrice;
            }
            recalc();
        });

        function recalc() {
            const qty = Math.max(0, Number(qtyInp.value) || 0);
            const unitCost = Math.max(0, Number(costInp.value) || 0);
            const disc = Math.max(0, Number(discInp.value) || 0);
            const total = Math.max(0, (qty * unitCost) - disc);
            totalCell.textContent = `₹${total.toFixed(2)}`;
            calculateTotals();
        }

        qtyInp.addEventListener("input", recalc);
        costInp.addEventListener("input", recalc);
        discInp.addEventListener("input", recalc);

        removeBtn.addEventListener("click", function () {
            if (tableBody.querySelectorAll("tr").length > 1) {
                tr.remove();
                calculateTotals();
            } else {
                alert("At least one product is required.");
            }
        });

        return tr;
    }

    if (tableBody) {
        tableBody.innerHTML = "";
        const firstProdId = products.length > 0 ? products[0].id : "";
        tableBody.appendChild(createPurchaseRow(firstProdId));
    }

    if (addProductBtn) {
        addProductBtn.addEventListener("click", function () {
            tableBody.appendChild(createPurchaseRow(""));
        });
    }

    function calculateTotals() {
        let subtotal = 0;
        let totalDiscount = 0;

        const rows = tableBody.querySelectorAll("tr");
        rows.forEach(r => {
            const qty = Number(r.querySelector(".qty-input")?.value) || 0;
            const cost = Number(r.querySelector(".cost-input")?.value) || 0;
            const disc = Number(r.querySelector(".disc-input")?.value) || 0;
            subtotal += (qty * cost);
            totalDiscount += disc;
        });

        const grandTotal = Math.max(0, subtotal - totalDiscount);

        const subtotalEl = document.getElementById("purchaseSubtotal");
        const discEl = document.getElementById("purchaseTotalDiscount");
        const grandEl = document.getElementById("purchaseGrandTotal");
        const paidInp = document.getElementById("purchasePaidAmount");
        const dueEl = document.getElementById("purchaseDueAmount");
        const statusSpan = document.querySelector(".purchase-summary-row .status");

        if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
        if (discEl) discEl.textContent = `₹${totalDiscount.toFixed(2)}`;
        if (grandEl) grandEl.textContent = `₹${grandTotal.toFixed(2)}`;

        if (paidInp && !paidInp.dataset.modified) {
            paidInp.value = Math.round(grandTotal);
        }

        const paid = Number(paidInp ? paidInp.value : grandTotal) || 0;
        const due = Math.max(0, grandTotal - paid);

        if (dueEl) dueEl.textContent = `₹${due.toFixed(2)}`;

        if (statusSpan) {
            if (paid >= grandTotal && grandTotal > 0) {
                statusSpan.textContent = "Paid";
                statusSpan.className = "status active";
            } else if (paid > 0) {
                statusSpan.textContent = "Partial";
                statusSpan.className = "status partial";
            } else {
                statusSpan.textContent = "Unpaid";
                statusSpan.className = "status due";
            }
        }
    }

    const paidInput = document.getElementById("purchasePaidAmount");
    if (paidInput) {
        paidInput.addEventListener("input", function () {
            this.dataset.modified = "true";
            calculateTotals();
        });
    }

    calculateTotals();

    // Save Purchase Form Submit
    const saveBtn = document.getElementById("savePurchaseBtn") || document.querySelector(".form-actions .primary-btn");
    if (saveBtn) {
        saveBtn.addEventListener("click", function () {
            const supplierId = supplierSelect ? supplierSelect.value : "";
            if (!supplierId) {
                alert("Please select a supplier.");
                supplierSelect?.focus();
                return;
            }

            const supplier = suppliers.find(s => s.id === supplierId);
            const invoiceNumber = invoiceInput ? invoiceInput.value.trim() : "";
            if (!invoiceNumber) {
                alert("Please enter an invoice number.");
                invoiceInput?.focus();
                return;
            }

            const paymentMethodSelect = document.getElementById("purchasePaymentMethod");
            const paymentMethod = paymentMethodSelect ? paymentMethodSelect.value : "Bank Transfer";
            const notesInput = document.querySelector(".summary-left textarea") || document.querySelector("textarea");
            const notes = notesInput ? notesInput.value.trim() : "";

            const rows = tableBody.querySelectorAll("tr");
            const items = [];

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const sel = row.querySelector(".product-select");
                const qtyInp = row.querySelector(".qty-input");
                const costInp = row.querySelector(".cost-input");
                const discInp = row.querySelector(".disc-input");

                const prodId = sel ? sel.value : "";
                const qty = Number(qtyInp ? qtyInp.value : 0);
                const cost = Number(costInp ? costInp.value : 0);
                const discount = Number(discInp ? discInp.value : 0);

                if (!prodId) {
                    alert(`Please select a valid product in row ${i + 1}.`);
                    return;
                }

                if (qty <= 0) {
                    alert(`Quantity must be greater than zero in row ${i + 1}.`);
                    return;
                }

                const product = products.find(p => p.id === prodId);
                items.push({
                    productId: prodId,
                    productName: product ? product.name : "Product",
                    quantity: qty,
                    purchasePrice: cost,
                    lineSubtotal: qty * cost,
                    discount: discount,
                    lineTotal: (qty * cost) - discount
                });
            }

            if (items.length === 0) {
                alert("Please add at least one product row.");
                return;
            }

            const subtotal = items.reduce((sum, item) => sum + item.lineSubtotal, 0);
            const totalDiscount = items.reduce((sum, item) => sum + item.discount, 0);
            const grandTotal = Math.max(0, subtotal - totalDiscount);
            const paid = Number(paidInput ? paidInput.value : grandTotal) || 0;
            const due = Math.max(0, grandTotal - paid);

            const newPurchase = {
                id: "PUR-" + Date.now(),
                invoiceNumber: invoiceNumber,
                supplierId: supplierId,
                supplierName: supplier ? supplier.name : "Supplier",
                purchaseDate: dateInput ? dateInput.value : today,
                paymentMethod: paymentMethod,
                items: items,
                subtotal: subtotal,
                discount: totalDiscount,
                grandTotal: grandTotal,
                paidAmount: paid,
                dueAmount: due,
                paymentStatus: due <= 0 ? "Paid" : paid > 0 ? "Partial" : "Unpaid",
                notes: notes,
                createdAt: today
            };

            // 1. Save purchase
            const purchases = getPurchases();
            purchases.push(newPurchase);
            savePurchases(purchases);

            // 2. Increase stock in products and inventory
            const inventory = Storage.get(STORAGE_KEYS.INVENTORY, []);
            items.forEach(item => {
                const prod = products.find(p => p.id === item.productId);
                if (prod) {
                    prod.stock = Number(prod.stock) + item.quantity;
                    prod.purchasePrice = item.purchasePrice; // update cost
                }
                const inv = inventory.find(i => i.productId === item.productId);
                if (inv) {
                    inv.currentStock = Number(inv.currentStock) + item.quantity;
                    inv.unitCost = item.purchasePrice;
                    if (inv.currentStock <= 0) inv.stockStatus = "Out of Stock";
                    else if (inv.currentStock <= inv.minimumStock) inv.stockStatus = "Low Stock";
                    else inv.stockStatus = "In Stock";
                }
            });
            Storage.set(STORAGE_KEYS.PRODUCTS, products);
            Storage.set(STORAGE_KEYS.INVENTORY, inventory);

            // 3. Update supplier dues if any
            if (supplier && due > 0) {
                supplier.openingBalance = (Number(supplier.openingBalance) || 0) + due;
                Storage.set(STORAGE_KEYS.SUPPLIERS, suppliers);
            }

            // 4. Log activity
            if (typeof logActivity === "function") {
                logActivity("Purchase Created", "Purchases", `Recorded purchase ${invoiceNumber} from ${supplier ? supplier.name : "Supplier"} for ₹${grandTotal.toFixed(2)}.`);
            }

            alert(`✓ Purchase ${invoiceNumber} saved and stock successfully restocked!`);
            window.location.href = "purchases.html";
        });
    }
}

/* =========================================================
   ROUTER INITIALIZATION
   ========================================================= */
document.addEventListener("DOMContentLoaded", function () {
    const path = window.location.pathname;
    if (path.includes("add-purchases.html")) {
        initializeAddPurchasePage();
    } else if (path.includes("purchases.html")) {
        initializePurchasesListPage();
    }
});
