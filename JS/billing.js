/* =========================================================
   MART MANAGEMENT SYSTEM
   BILLING MODULE (POS, BILL HISTORY, INVOICE)
   ========================================================= */

// Ensure dependencies
function getBills() {
    return Storage.get(STORAGE_KEYS.BILLS, []);
}

function saveBills(bills) {
    return Storage.set(STORAGE_KEYS.BILLS, bills);
}

/* =========================================================
   1. BILLING LIST PAGE (billing.html & bill-history.html)
   ========================================================= */
function initializeBillingListPage() {
    const tableBody = document.querySelector(".table-container table tbody");
    if (!tableBody) return;

    const bills = getBills();
    const today = typeof getToday === "function" ? getToday() : new Date().toISOString().split("T")[0];

    // Summary Cards (if present on billing.html)
    const cards = document.querySelectorAll(".dashboard-cards .card");
    if (cards.length >= 4) {
        const todaysBills = bills.filter(b => b.billDate === today);
        const todaysSales = todaysBills.reduce((sum, b) => sum + (Number(b.grandTotal) || 0), 0);
        const paidCount = bills.filter(b => (b.paymentStatus || "").toLowerCase() === "paid").length;
        const totalPending = bills.reduce((sum, b) => sum + (Number(b.dueAmount) || 0), 0);

        const card0P = cards[0].querySelector("p");
        if (card0P) card0P.textContent = todaysBills.length;

        const card1P = cards[1].querySelector("p");
        if (card1P) card1P.textContent = typeof formatCurrency === "function" ? formatCurrency(todaysSales) : "₹" + todaysSales;

        const card2P = cards[2].querySelector("p");
        if (card2P) card2P.textContent = paidCount;

        const card3P = cards[3].querySelector("p");
        if (card3P) card3P.textContent = typeof formatCurrency === "function" ? formatCurrency(totalPending) : "₹" + totalPending;
    }

    function renderBills(filterList = null) {
        const list = filterList !== null ? filterList : bills;
        tableBody.innerHTML = "";

        if (list.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 25px; color: #6b7280;">
                        No bills found matching your criteria.
                    </td>
                </tr>
            `;
            return;
        }

        list.slice().reverse().forEach(bill => {
            const tr = document.createElement("tr");
            const status = bill.paymentStatus || (Number(bill.dueAmount) <= 0 ? "Paid" : "Partial");
            const statusClass = status.toLowerCase() === "paid" ? "active" : status.toLowerCase() === "partial" ? "partial" : "due";
            const itemCount = Array.isArray(bill.items) ? bill.items.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0) : 0;
            const formattedTotal = typeof formatCurrency === "function" ? formatCurrency(bill.grandTotal) : "₹" + bill.grandTotal;
            const formattedPaid = typeof formatCurrency === "function" ? formatCurrency(bill.paidAmount) : "₹" + bill.paidAmount;
            const formattedDue = typeof formatCurrency === "function" ? formatCurrency(bill.dueAmount) : "₹" + bill.dueAmount;
            const formattedDate = typeof formatDate === "function" ? formatDate(bill.billDate) : bill.billDate;

            tr.innerHTML = `
                <td style="font-weight: 600;">${bill.id || bill.billNumber}</td>
                <td>${bill.customerName || "Walk-in Customer"}</td>
                <td>${formattedDate}</td>
                <td>${itemCount}</td>
                <td style="font-weight: 600;">${formattedTotal}</td>
                <td style="color: #10b981;">${formattedPaid}</td>
                <td style="color: ${Number(bill.dueAmount) > 0 ? '#ef4444' : '#6b7280'};">${formattedDue}</td>
                <td>
                    <span class="status ${statusClass}">${status}</span>
                </td>
                <td>
                    <a href="bill-details.html?id=${bill.id || bill.billNumber}" class="action-btn" style="text-decoration:none; display:inline-block; margin-right:5px;">
                        View
                    </a>
                    <button class="action-btn print-btn" data-id="${bill.id || bill.billNumber}">
                        Print
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        // Attach print buttons
        tableBody.querySelectorAll(".print-btn").forEach(btn => {
            btn.addEventListener("click", function() {
                const id = this.getAttribute("data-id");
                window.location.href = `bill-details.html?id=${id}&autoprint=true`;
            });
        });
    }

    renderBills();

    // Filters
    const searchInput = document.querySelector(".filter-section .search-input");
    const statusSelect = document.querySelectorAll(".filter-section .filter-select")[0];
    const dateSelect = document.querySelectorAll(".filter-section .filter-select")[1];

    function applyFilters() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
        const statusFilter = statusSelect ? statusSelect.value : "All Payment Status";
        const dateFilter = dateSelect ? dateSelect.value : "All Time";

        const filtered = bills.filter(b => {
            const billId = String(b.id || b.billNumber || "").toLowerCase();
            const custName = String(b.customerName || "").toLowerCase();
            const matchesSearch = !query || billId.includes(query) || custName.includes(query);

            let matchesStatus = true;
            if (statusFilter && statusFilter !== "All Payment Status") {
                matchesStatus = (b.paymentStatus || "").toLowerCase() === statusFilter.toLowerCase();
            }

            let matchesDate = true;
            if (dateFilter === "Today") {
                matchesDate = b.billDate === today;
            }

            return matchesSearch && matchesStatus && matchesDate;
        });

        renderBills(filtered);
    }

    if (searchInput) searchInput.addEventListener("input", applyFilters);
    if (statusSelect) statusSelect.addEventListener("change", applyFilters);
    if (dateSelect) dateSelect.addEventListener("change", applyFilters);
}

/* =========================================================
   2. POS / NEW BILL PAGE (new-bill.html)
   ========================================================= */
function initializeNewBillPage() {
    const billForm = document.querySelector(".bill-form");
    if (!billForm) return;

    const products = Storage.get(STORAGE_KEYS.PRODUCTS, []);
    const customers = Storage.get(STORAGE_KEYS.CUSTOMERS, []);
    const settings = Storage.get(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    const bills = getBills();
    const today = typeof getToday === "function" ? getToday() : new Date().toISOString().split("T")[0];

    // 1. Auto generate bill number
    const billPrefix = settings?.billing?.invoicePrefix || "BILL";
    const nextNum = (settings?.billing?.startingNumber || 1001) + bills.length;
    const generatedBillId = `${billPrefix}${nextNum}`;

    const billNumberInput = billForm.querySelector(".form-grid input[type='text']");
    if (billNumberInput) billNumberInput.value = generatedBillId;

    const dateInput = billForm.querySelector(".form-grid input[type='date']");
    if (dateInput) dateInput.value = today;

    // 2. Populate customer dropdown
    const customerSelect = billForm.querySelectorAll(".form-grid select")[0];
    if (customerSelect) {
        customerSelect.innerHTML = `<option value="">Walk-in Customer</option>`;
        customers.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c.id;
            opt.textContent = `${c.name} (${c.phone || "No phone"})`;
            customerSelect.appendChild(opt);
        });
    }

    // 3. Bill items table handling
    const tableBody = document.querySelector(".bill-table tbody");
    const addProductBtn = document.querySelector(".section-title-row button");

    function createProductRow(selectedProdId = "", defaultQty = 1) {
        const tr = document.createElement("tr");

        let productOptions = `<option value="">Select Product</option>`;
        products.forEach(p => {
            const isSelected = p.id === selectedProdId ? "selected" : "";
            productOptions += `<option value="${p.id}" data-price="${p.sellingPrice}" data-stock="${p.stock}" ${isSelected}>${p.name}</option>`;
        });

        const selectedProduct = products.find(p => p.id === selectedProdId);
        const availStock = selectedProduct ? selectedProduct.stock : 0;
        const unitPrice = selectedProduct ? selectedProduct.sellingPrice : 0;
        const lineTotal = unitPrice * defaultQty;

        tr.innerHTML = `
            <td>
                <select class="product-picker" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #d1d5db;">
                    ${productOptions}
                </select>
            </td>
            <td>
                <span class="stock-available" style="font-weight: 600; color: ${availStock <= 5 ? '#ef4444' : '#10b981'};">
                    ${availStock}
                </span>
            </td>
            <td>
                <input type="number" class="qty-input" value="${defaultQty}" min="1" max="${availStock > 0 ? availStock : 999}" style="width: 80px; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px;">
            </td>
            <td>
                <input type="number" class="price-input" value="${unitPrice}" min="0" step="0.5" style="width: 90px; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px;">
            </td>
            <td>
                <input type="number" class="discount-input" value="0" min="0" style="width: 70px; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px;">
            </td>
            <td class="line-total-cell" style="font-weight: 600;">
                ₹${lineTotal.toFixed(2)}
            </td>
            <td>
                <button type="button" class="delete-btn remove-row-btn" style="background: none; border: none; cursor: pointer; font-size: 16px; color: #ef4444;">
                    🗑
                </button>
            </td>
        `;

        // Event listeners for this row
        const prodPicker = tr.querySelector(".product-picker");
        const qtyInp = tr.querySelector(".qty-input");
        const priceInp = tr.querySelector(".price-input");
        const discInp = tr.querySelector(".discount-input");
        const stockSpan = tr.querySelector(".stock-available");
        const totalCell = tr.querySelector(".line-total-cell");
        const removeBtn = tr.querySelector(".remove-row-btn");

        prodPicker.addEventListener("change", function () {
            const prod = products.find(p => p.id === this.value);
            if (prod) {
                stockSpan.textContent = prod.stock;
                stockSpan.style.color = prod.stock <= 5 ? "#ef4444" : "#10b981";
                priceInp.value = prod.sellingPrice;
                qtyInp.max = prod.stock;
            } else {
                stockSpan.textContent = "0";
                priceInp.value = "0";
            }
            recalcRow();
        });

        function recalcRow() {
            const qty = Math.max(0, Number(qtyInp.value) || 0);
            const price = Math.max(0, Number(priceInp.value) || 0);
            const disc = Math.max(0, Number(discInp.value) || 0);
            const total = Math.max(0, (qty * price) - disc);
            totalCell.textContent = `₹${total.toFixed(2)}`;
            calculateBillSummary();
        }

        qtyInp.addEventListener("input", recalcRow);
        priceInp.addEventListener("input", recalcRow);
        discInp.addEventListener("input", recalcRow);

        removeBtn.addEventListener("click", function () {
            if (tableBody.querySelectorAll("tr").length > 1) {
                tr.remove();
                calculateBillSummary();
            } else {
                alert("A bill must contain at least one item.");
            }
        });

        return tr;
    }

    if (tableBody) {
        tableBody.innerHTML = "";
        // Insert initial row with first product if available
        const firstProdId = products.length > 0 ? products[0].id : "";
        tableBody.appendChild(createProductRow(firstProdId, 1));
    }

    if (addProductBtn) {
        addProductBtn.addEventListener("click", function () {
            tableBody.appendChild(createProductRow("", 1));
        });
    }

    // 4. Calculate Bill Summary
    function calculateBillSummary() {
        let subtotal = 0;
        let totalDiscount = 0;

        const rows = tableBody.querySelectorAll("tr");
        rows.forEach(row => {
            const qty = Number(row.querySelector(".qty-input")?.value) || 0;
            const price = Number(row.querySelector(".price-input")?.value) || 0;
            const disc = Number(row.querySelector(".discount-input")?.value) || 0;
            subtotal += (qty * price);
            totalDiscount += disc;
        });

        const gstPercentage = settings?.billing?.gstEnabled ? (Number(settings.billing.gstPercentage) || 0) : 0;
        const taxAmount = (subtotal * gstPercentage) / 100;
        const grandTotal = Math.max(0, subtotal - totalDiscount + taxAmount);

        // Update display elements in bill summary
        const summaryRows = document.querySelectorAll(".bill-summary-row");
        summaryRows.forEach(sRow => {
            const label = sRow.querySelector("span")?.textContent?.trim();
            const strong = sRow.querySelector("strong");
            if (!strong) return;

            if (label === "Subtotal") strong.textContent = typeof formatCurrency === "function" ? formatCurrency(subtotal) : "₹" + subtotal.toFixed(2);
            if (label === "GST / Tax") strong.textContent = typeof formatCurrency === "function" ? formatCurrency(taxAmount) : "₹" + taxAmount.toFixed(2);
            if (label === "Total Discount") strong.textContent = typeof formatCurrency === "function" ? formatCurrency(totalDiscount) : "₹" + totalDiscount.toFixed(2);
            if (label === "Grand Total") strong.textContent = typeof formatCurrency === "function" ? formatCurrency(grandTotal) : "₹" + grandTotal.toFixed(2);
        });

        // Recalculate change / paid
        const paidInput = document.querySelector(".bill-summary-row input[type='number']");
        const changeRowStrong = document.querySelector(".change-row strong");
        const statusSpan = document.querySelector(".bill-summary-row .status");

        if (paidInput) {
            // Default paidInput to grandTotal if empty or initially matching
            if (!paidInput.dataset.modified) {
                paidInput.value = Math.round(grandTotal);
            }
            const paid = Number(paidInput.value) || 0;
            const changeOrDue = paid - grandTotal;

            if (changeRowStrong) {
                const changeLabel = document.querySelector(".change-row span");
                if (changeOrDue >= 0) {
                    if (changeLabel) changeLabel.textContent = "Change to Return";
                    changeRowStrong.textContent = typeof formatCurrency === "function" ? formatCurrency(changeOrDue) : "₹" + changeOrDue.toFixed(2);
                    changeRowStrong.style.color = "#10b981";
                } else {
                    if (changeLabel) changeLabel.textContent = "Amount Due";
                    changeRowStrong.textContent = typeof formatCurrency === "function" ? formatCurrency(Math.abs(changeOrDue)) : "₹" + Math.abs(changeOrDue).toFixed(2);
                    changeRowStrong.style.color = "#ef4444";
                }
            }

            if (statusSpan) {
                if (paid >= grandTotal) {
                    statusSpan.textContent = "Paid";
                    statusSpan.className = "status active";
                } else if (paid > 0) {
                    statusSpan.textContent = "Partial";
                    statusSpan.className = "status partial";
                } else {
                    statusSpan.textContent = "Due";
                    statusSpan.className = "status due";
                }
            }
        }
    }

    const paidInput = document.querySelector(".bill-summary-row input[type='number']");
    if (paidInput) {
        paidInput.addEventListener("input", function () {
            this.dataset.modified = "true";
            calculateBillSummary();
        });
    }

    calculateBillSummary();

    // 5. Generate Bill Action
    const generateBtn = document.querySelector(".form-actions .primary-btn");
    if (generateBtn) {
        generateBtn.addEventListener("click", function () {
            // Prevent accidental duplicate submission
            if (generateBtn.disabled) return;

            const rows = tableBody.querySelectorAll("tr");
            const billItems = [];

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const prodSelect = row.querySelector(".product-picker");
                const qtyInput = row.querySelector(".qty-input");
                const priceInput = row.querySelector(".price-input");
                const discInput = row.querySelector(".discount-input");

                const prodId = prodSelect ? prodSelect.value : "";
                const qty = Number(qtyInput ? qtyInput.value : 0);
                const price = Number(priceInput ? priceInput.value : 0);
                const discount = Number(discInput ? discInput.value : 0);

                if (!prodId) {
                    alert(`Please select a valid product in item row ${i + 1}.`);
                    return;
                }

                if (qty <= 0) {
                    alert(`Quantity must be greater than zero in row ${i + 1}.`);
                    return;
                }

                const product = products.find(p => p.id === prodId);
                if (settings?.billing?.preventInsufficientStock && product && product.stock < qty) {
                    alert(`Insufficient stock for ${escapeHtml(product.name)}! Available: ${product.stock}, requested: ${qty}.`);
                    return;
                }

                billItems.push({
                    productId: prodId,
                    productName: product ? product.name : "Product",
                    quantity: qty,
                    price: price,
                    discount: discount,
                    lineTotal: (qty * price) - discount
                });
            }

            if (billItems.length === 0) {
                alert("Please add at least one product to the bill.");
                return;
            }

            // Customer info
            const selectedCustId = customerSelect ? customerSelect.value : "";
            const customer = customers.find(c => c.id === selectedCustId);
            const customerName = customer ? customer.name : "Walk-in Customer";
            const customerPhone = customer ? customer.phone : "";

            // Totals
            const subtotal = billItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
            const totalDiscount = billItems.reduce((sum, item) => sum + item.discount, 0);
            const gstPercentage = settings?.billing?.gstEnabled ? (Number(settings.billing.gstPercentage) || 0) : 0;
            const taxAmount = (subtotal * gstPercentage) / 100;
            const grandTotal = Math.max(0, subtotal - totalDiscount + taxAmount);
            const paid = Number(paidInput ? paidInput.value : grandTotal) || 0;
            const due = Math.max(0, grandTotal - paid);
            const paymentMethodSelect = billForm.querySelectorAll(".form-grid select")[1];
            const paymentMethod = paymentMethodSelect ? paymentMethodSelect.value : "Cash";

            let paymentStatus = "Paid";
            if (due > 0 && paid > 0) paymentStatus = "Partial";
            else if (due > 0 && paid === 0) paymentStatus = "Due";

            const newBill = {
                id: generatedBillId,
                billNumber: generatedBillId,
                customerId: selectedCustId || null,
                customerName: customerName,
                customerPhone: customerPhone,
                billDate: dateInput ? dateInput.value : today,
                items: billItems,
                subtotal: subtotal,
                taxAmount: taxAmount,
                discount: totalDiscount,
                grandTotal: grandTotal,
                paidAmount: paid,
                dueAmount: due,
                paymentMethod: paymentMethod,
                paymentStatus: paymentStatus,
                createdAt: today
            };

            // 1. Save bill
            bills.push(newBill);
            saveBills(bills);

            // 2. Deduct inventory & product stocks
            const inventory = Storage.get(STORAGE_KEYS.INVENTORY, []);
            billItems.forEach(item => {
                const prod = products.find(p => p.id === item.productId);
                if (prod) {
                    prod.stock = Math.max(0, Number(prod.stock) - item.quantity);
                }
                const inv = inventory.find(i => i.productId === item.productId);
                if (inv) {
                    inv.currentStock = Math.max(0, Number(inv.currentStock) - item.quantity);
                    if (inv.currentStock <= 0) inv.stockStatus = "Out of Stock";
                    else if (inv.currentStock <= inv.minimumStock) inv.stockStatus = "Low Stock";
                    else inv.stockStatus = "In Stock";
                }
            });
            Storage.set(STORAGE_KEYS.PRODUCTS, products);
            Storage.set(STORAGE_KEYS.INVENTORY, inventory);

            // 3. Update customer stats if registered customer
            if (customer) {
                customer.totalPurchases = (Number(customer.totalPurchases) || 0) + grandTotal;
                customer.amountDue = (Number(customer.amountDue) || 0) + due;
                customer.amountPaid = (Number(customer.amountPaid) || 0) + paid;
                Storage.set(STORAGE_KEYS.CUSTOMERS, customers);
            }

            // 4. Log activity
            if (typeof logActivity === "function") {
                logActivity("Bill Generated", "Billing", `Generated bill ${generatedBillId} for ${customerName} total ₹${grandTotal.toFixed(2)}.`);
            }

            // Disable button to prevent double-save
            generateBtn.disabled = true;
            generateBtn.textContent = "Bill Saved ✓";

            alert(`✓ Bill ${generatedBillId} generated successfully!`);
            window.location.href = `bill-details.html?id=${generatedBillId}`;
        });
    }
}

/* =========================================================
   3. INVOICE / BILL DETAILS PAGE (bill-details.html)
   ========================================================= */
function initializeBillDetailsPage() {
    const printableBill = document.getElementById("printableBill");
    if (!printableBill) return;

    const urlParams = new URLSearchParams(window.location.search);
    const billId = urlParams.get("id");
    const autoPrint = urlParams.get("autoprint");

    const bills = getBills();
    const settings = Storage.get(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);

    const bill = bills.find(b => (b.id === billId || b.billNumber === billId)) || bills[bills.length - 1];

    if (!bill) {
        printableBill.innerHTML = `<div style="padding: 40px; text-align:center;">No bill record found.</div>`;
        return;
    }

    // 1. Populate Store Header
    const storeNameH1 = printableBill.querySelector(".shop-info h1");
    if (storeNameH1) storeNameH1.textContent = "🏪 " + (settings?.store?.name || "MART MANAGEMENT SYSTEM");

    const storePList = printableBill.querySelectorAll(".shop-info p");
    if (storePList.length >= 4) {
        storePList[0].textContent = settings?.store?.type || "Your Trusted Local Mart";
        storePList[1].textContent = settings?.store?.address || "Main Market, India";
        storePList[2].textContent = "Phone: " + (settings?.store?.phone || "+91 98765 43210");
        storePList[3].textContent = "GSTIN: " + (settings?.store?.gstNumber || "03AAAAA0000A1Z5");
    }

    // 2. Populate Bill Title Info
    const billPList = printableBill.querySelectorAll(".invoice-title p");
    if (billPList.length >= 2) {
        billPList[0].innerHTML = `<strong>Bill No:</strong> ${bill.id || bill.billNumber}`;
        billPList[1].innerHTML = `<strong>Date:</strong> ${typeof formatDate === "function" ? formatDate(bill.billDate) : bill.billDate}`;
    }

    // 3. Populate Customer & Payment Info
    const customerPList = printableBill.querySelectorAll(".invoice-customer div:first-child p");
    if (customerPList.length >= 2) {
        customerPList[0].innerHTML = `<strong>Customer:</strong> ${bill.customerName || "Walk-in Customer"}`;
        customerPList[1].innerHTML = `<strong>Phone:</strong> ${bill.customerPhone || "N/A"}`;
    }

    const paymentPList = printableBill.querySelectorAll(".invoice-customer div:last-child p");
    if (paymentPList.length >= 2) {
        paymentPList[0].innerHTML = `<strong>Payment:</strong> ${bill.paymentMethod || "Cash"}`;
        const statusClass = (bill.paymentStatus || "Paid").toLowerCase() === "paid" ? "active" : "partial";
        paymentPList[1].innerHTML = `<strong>Status:</strong> <span class="status ${statusClass}">${bill.paymentStatus || "Paid"}</span>`;
    }

    // 4. Populate Items Table
    const tableBody = printableBill.querySelector(".invoice-table tbody");
    if (tableBody && Array.isArray(bill.items)) {
        tableBody.innerHTML = "";
        bill.items.forEach((item, idx) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${idx + 1}</td>
                <td>${escapeHtml(item.productName)}</td>
                <td>${item.quantity}</td>
                <td>₹${Number(item.price).toFixed(2)}</td>
                <td>₹${(Number(item.discount) || 0).toFixed(2)}</td>
                <td style="font-weight: 600;">₹${Number(item.lineTotal).toFixed(2)}</td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // 5. Populate Summary Rows
    const summaryRows = printableBill.querySelectorAll(".invoice-summary-row");
    summaryRows.forEach(row => {
        const spanText = row.querySelector("span")?.textContent?.trim();
        const strong = row.querySelector("strong");
        if (!strong) return;

        if (spanText === "Subtotal") strong.textContent = typeof formatCurrency === "function" ? formatCurrency(bill.subtotal) : "₹" + bill.subtotal.toFixed(2);
        if (spanText === "GST / Tax") strong.textContent = typeof formatCurrency === "function" ? formatCurrency(bill.taxAmount) : "₹" + (bill.taxAmount || 0).toFixed(2);
        if (spanText === "Discount") strong.textContent = typeof formatCurrency === "function" ? formatCurrency(bill.discount) : "₹" + (bill.discount || 0).toFixed(2);
        if (spanText === "Grand Total") strong.textContent = typeof formatCurrency === "function" ? formatCurrency(bill.grandTotal) : "₹" + bill.grandTotal.toFixed(2);
        if (spanText === "Paid Amount") strong.textContent = typeof formatCurrency === "function" ? formatCurrency(bill.paidAmount) : "₹" + (bill.paidAmount || 0).toFixed(2);
        if (spanText === "Due Amount") {
            strong.textContent = typeof formatCurrency === "function" ? formatCurrency(bill.dueAmount) : "₹" + (bill.dueAmount || 0).toFixed(2);
            strong.style.color = Number(bill.dueAmount) > 0 ? "#ef4444" : "#10b981";
        }
    });

    if (autoPrint === "true") {
        setTimeout(() => window.print(), 500);
    }
}

/* =========================================================
   INITIALIZATION ROUTER
   ========================================================= */
document.addEventListener("DOMContentLoaded", function () {
    const path = window.location.pathname;

    if (path.includes("new-bill.html")) {
        initializeNewBillPage();
    } else if (path.includes("bill-details.html")) {
        initializeBillDetailsPage();
    } else if (path.includes("billing.html") || path.includes("bill-history.html")) {
        initializeBillingListPage();
    }
});
