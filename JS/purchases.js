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
            const status = purchase.cancelled ? "Cancelled" : (purchase.paymentStatus || (Number(purchase.dueAmount) <= 0 ? "Paid" : "Partial"));
            const statusClass = status.toLowerCase() === "paid" ? "active" : status.toLowerCase() === "partial" ? "partial" : status.toLowerCase() === "cancelled" ? "inactive" : "due";
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
                    <button class="action-btn cancel-purch-btn" data-id="${purchase.id}" ${purchase.cancelled ? "disabled" : ""} style="color: #ef4444; border-color: #ef4444;">
                        ${purchase.cancelled ? "Cancelled" : "Cancel Purchase"}
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        tableBody.querySelectorAll(".cancel-purch-btn").forEach(btn => {
            btn.addEventListener("click", function () {
                const id = this.getAttribute("data-id");
                const currentPurchases = getPurchases();
                const purchase = currentPurchases.find(p => String(p.id) === String(id));
                if (!purchase || purchase.cancelled) return;
                const due = Number(purchase.dueAmount) || 0;
                if (due > 0) { alert("Settle or remove the outstanding supplier balance before cancelling this purchase."); return; }
                if (!confirm(`Cancel purchase ${purchase.invoiceNumber || id}? Its quantities will be removed from stock and the record retained for audit.`)) return;

                const currentProducts = Storage.get(STORAGE_KEYS.PRODUCTS, []);
                const inventory = Storage.get(STORAGE_KEYS.INVENTORY, []);
                const adjustments = Storage.get(STORAGE_KEYS.STOCK_ADJUSTMENTS, []);
                const suppliersNow = Storage.get(STORAGE_KEYS.SUPPLIERS, []);
                const supplier = suppliersNow.find(s => String(s.id) === String(purchase.supplierId));
                if (due > 0 && !supplier) { alert("Supplier record is missing; cancellation cannot safely update the balance."); return; }
                const productUpdates = currentProducts.map(p => ({ ...p }));
                const inventoryUpdates = inventory.map(i => ({ ...i }));
                const newAdjustments = adjustments.slice();
                for (const item of (purchase.items || [])) {
                    const product = productUpdates.find(p => String(p.id) === String(item.productId));
                    const inv = inventoryUpdates.find(i => String(i.productId) === String(item.productId));
                    const quantity = Number(item.quantity);
                    if (!product || !Number.isFinite(quantity) || quantity <= 0 || Number(product.stock) < quantity || (inv && Number(inv.currentStock) < quantity)) {
                        alert(`Stock for ${item.productName || item.productId} has changed and cannot be safely reversed. Adjust stock first.`);
                        return;
                    }
                    product.stock = Number(product.stock) - quantity;
                    if (inv) {
                        inv.currentStock = Number(inv.currentStock) - quantity;
                        inv.stockStatus = inv.currentStock <= 0 ? "Out of Stock" : inv.currentStock <= Number(inv.minimumStock || 0) ? "Low Stock" : "In Stock";
                    }
                    newAdjustments.push({ id: `ADJ-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, productId: product.id, productName: product.name, adjustmentType: "Decrease", quantity, previousStock: Number(product.stock) + quantity, newStock: Number(product.stock), reason: `Purchase Cancellation (${purchase.invoiceNumber || id})`, notes: "Stock reversed when the purchase was cancelled.", date: new Date().toISOString().slice(0, 10), adjustedBy: "Owner", createdAt: new Date().toISOString() });
                }
                const updatedPurchases = currentPurchases.map(p => String(p.id) === String(id) ? { ...p, cancelled: true, cancelledAt: new Date().toISOString(), paymentStatus: "Cancelled" } : p);
                const entries = [[STORAGE_KEYS.PURCHASES, updatedPurchases], [STORAGE_KEYS.PRODUCTS, productUpdates], [STORAGE_KEYS.INVENTORY, inventoryUpdates], [STORAGE_KEYS.STOCK_ADJUSTMENTS, newAdjustments]];
                if (due > 0) { supplier.openingBalance = Math.max(0, (Number(supplier.openingBalance) || 0) - due); entries.push([STORAGE_KEYS.SUPPLIERS, suppliersNow]); }
                if (!Storage.setMany(entries)) { alert("Purchase cancellation failed; no changes were saved."); return; }
                if (typeof logActivity === "function") logActivity("Purchase Cancelled", "Purchases", `Cancelled purchase ${purchase.invoiceNumber || id} and reversed its stock.`);
                window.location.reload();
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
                matchesStatus = (p.cancelled ? "cancelled" : (p.paymentStatus || "")).toLowerCase() === selectedStatus.toLowerCase();
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
            if (!supplier || supplier.status === "Inactive") { alert("Select an active supplier."); return; }
            const invoiceNumber = invoiceInput ? invoiceInput.value.trim() : "";
            if (!invoiceNumber) {
                alert("Please enter an invoice number.");
                invoiceInput?.focus();
                return;
            }
            const currentPurchases = getPurchases();
            if (currentPurchases.some(p => String(p.invoiceNumber || "").toLowerCase() === invoiceNumber.toLowerCase())) { alert("That supplier invoice number is already recorded."); invoiceInput?.focus(); return; }

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

                if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(cost) || cost < 0 || !Number.isFinite(discount) || discount < 0 || discount > qty * cost) {
                    alert(`Enter a valid quantity, cost, and discount in row ${i + 1}.`);
                    return;
                }

                const product = products.find(p => p.id === prodId);
                if (!product) { alert(`The selected product in row ${i + 1} no longer exists.`); return; }
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
            if (!Number.isFinite(paid) || paid < 0 || paid > grandTotal) { alert("Paid amount must be between zero and the purchase total."); paidInput?.focus(); return; }
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
            if (purchases.some(p => String(p.invoiceNumber || "").toLowerCase() === invoiceNumber.toLowerCase())) { alert("That supplier invoice number was just recorded. Reload and try again."); return; }
            purchases.push(newPurchase);

            // 2. Increase stock in products and inventory
            const productUpdates = products.map(p => ({ ...p }));
            const inventory = Storage.get(STORAGE_KEYS.INVENTORY, []).map(i => ({ ...i }));
            items.forEach(item => {
                const prod = productUpdates.find(p => p.id === item.productId);
                if (prod) {
                    prod.stock = (Number(prod.stock) || 0) + item.quantity;
                    prod.purchasePrice = item.purchasePrice; // update cost
                }
                let inv = inventory.find(i => i.productId === item.productId);
                if (!inv) { inv = { id: `INV-${item.productId}`, productId: item.productId, productName: item.productName, currentStock: 0, minimumStock: Number(prod?.minimumStock) || 0, unitCost: item.purchasePrice }; inventory.push(inv); }
                inv.currentStock = (Number(inv.currentStock) || 0) + item.quantity;
                inv.unitCost = item.purchasePrice;
                inv.productName = item.productName;
                inv.stockStatus = inv.currentStock <= 0 ? "Out of Stock" : inv.currentStock <= Number(inv.minimumStock || 0) ? "Low Stock" : "In Stock";
            });

            // 3. Update supplier dues if any
            if (supplier && due > 0) {
                supplier.openingBalance = (Number(supplier.openingBalance) || 0) + due;
            }
            const entries = [[STORAGE_KEYS.PURCHASES, purchases], [STORAGE_KEYS.PRODUCTS, productUpdates], [STORAGE_KEYS.INVENTORY, inventory]];
            if (supplier && due > 0) entries.push([STORAGE_KEYS.SUPPLIERS, suppliers]);
            if (!Storage.setMany(entries)) { alert("Purchase could not be saved. No changes were applied; please try again."); return; }

            // 4. Log activity
            if (typeof logActivity === "function") {
                logActivity("Purchase Created", "Purchases", `Recorded purchase ${invoiceNumber} from ${supplier ? supplier.name : "Supplier"} for ₹${grandTotal.toFixed(2)}.`);
            }
            if (typeof refreshConditionNotifications === "function") refreshConditionNotifications();

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
