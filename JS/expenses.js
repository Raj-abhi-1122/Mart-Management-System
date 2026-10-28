/* =========================================================
   MART MANAGEMENT SYSTEM
   EXPENSES MODULE (TRACKING, REPORTS, ENTRY)
   ========================================================= */

function getExpenses() {
    return Storage.get(STORAGE_KEYS.EXPENSES, []);
}

function saveExpenses(expenses) {
    return Storage.set(STORAGE_KEYS.EXPENSES, expenses);
}

/* =========================================================
   1. EXPENSES LIST PAGE (expenses.html)
   ========================================================= */
function initializeExpensesListPage() {
    const tableBody = document.querySelector(".expense-table tbody") || document.querySelector(".table-container table tbody");
    if (!tableBody) return;

    const expenses = getExpenses();
    const today = typeof getToday === "function" ? getToday() : new Date().toISOString().split("T")[0];
    const currentMonth = today.substring(0, 7);

    // Summary Cards
    const cards = document.querySelectorAll(".summary-card");
    if (cards.length >= 3) {
        const monthExpenses = expenses.filter(e => (e.date || "").startsWith(currentMonth));
        const totalMonth = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const pendingAmount = expenses.reduce((sum, e) => sum + (Number(e.dueAmount) || 0), 0);
        const todayAmount = expenses.filter(e => e.date === today).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        const c0P = cards[0].querySelector("p");
        if (c0P) c0P.textContent = typeof formatCurrency === "function" ? formatCurrency(totalMonth) : "₹" + totalMonth;

        const c1P = cards[1].querySelector("p");
        if (c1P) c1P.textContent = typeof formatCurrency === "function" ? formatCurrency(pendingAmount) : "₹" + pendingAmount;

        const c2P = cards[2].querySelector("p");
        if (c2P) c2P.textContent = typeof formatCurrency === "function" ? formatCurrency(todayAmount) : "₹" + todayAmount;
    }

    // Records counter
    const countSpan = document.querySelector(".expense-count");
    if (countSpan) countSpan.textContent = `${expenses.length} Records`;

    function renderExpenses(filterList = null) {
        const list = filterList !== null ? filterList : expenses;
        tableBody.innerHTML = "";

        if (list.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 30px; color: #6b7280;">
                        No expenses found. Click "+ Add Expense" to record business expenses.
                    </td>
                </tr>
            `;
            return;
        }

        list.slice().reverse().forEach(exp => {
            const tr = document.createElement("tr");
            const status = exp.status || "Paid";
            const statusClass = status.toLowerCase() === "paid" ? "paid" : "pending";
            const formattedAmount = typeof formatCurrency === "function" ? formatCurrency(exp.amount) : "₹" + exp.amount;
            const formattedDate = typeof formatDate === "function" ? formatDate(exp.date) : exp.date;

            let catIcon = "💰";
            const cat = (exp.category || "").toLowerCase();
            if (cat.includes("elect")) catIcon = "⚡";
            else if (cat.includes("rent")) catIcon = "🏢";
            else if (cat.includes("sal")) catIcon = "👨‍💼";
            else if (cat.includes("trans")) catIcon = "🚚";
            else if (cat.includes("supp")) catIcon = "📦";

            tr.innerHTML = `
                <td><strong>${exp.expenseNumber || exp.id}</strong></td>
                <td>${formattedDate}</td>
                <td>
                    <span class="expense-category" style="background:#f3f4f6; padding:4px 8px; border-radius:4px; font-size:12px; font-weight:600;">
                        ${catIcon} ${exp.category}
                    </span>
                </td>
                <td>${exp.description || "-"}</td>
                <td style="font-weight:600;">${formattedAmount}</td>
                <td>${exp.paymentMethod || "Cash"}</td>
                <td>
                    <span class="status ${statusClass}">${status}</span>
                </td>
                <td>
                    <a href="expense-details.html?id=${exp.id}" class="action-btn" style="text-decoration:none; margin-right:4px;">
                        View
                    </a>
                    <a href="add-expense.html?id=${exp.id}" class="action-btn" style="text-decoration:none; margin-right:4px;">
                        Edit
                    </a>
                    <button class="action-btn delete-exp-btn" data-id="${exp.id}" style="color:#ef4444; border-color:#ef4444;">
                        Delete
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        tableBody.querySelectorAll(".delete-exp-btn").forEach(btn => {
            btn.addEventListener("click", function() {
                const id = this.getAttribute("data-id");
                if (confirm("Are you sure you want to delete this expense record?")) {
                    const updated = expenses.filter(e => e.id !== id);
                    saveExpenses(updated);
                    if (typeof logActivity === "function") {
                        logActivity("Expense Deleted", "Expenses", `Deleted expense record ID ${id}`);
                    }
                    initializeExpensesListPage();
                }
            });
        });
    }

    renderExpenses();

    // Filters
    const searchInput = document.querySelector(".expense-filter-group input[type='text']");
    const categorySelect = document.querySelectorAll(".expense-filter-group select")[0];
    const statusSelect = document.querySelectorAll(".expense-filter-group select")[1];
    const filterBtn = document.querySelector(".expense-filter-btn");

    function applyFilters() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
        const catFilter = categorySelect ? categorySelect.value : "All Categories";
        const statFilter = statusSelect ? statusSelect.value : "All Status";

        const filtered = expenses.filter(e => {
            const desc = String(e.description || "").toLowerCase();
            const id = String(e.expenseNumber || e.id || "").toLowerCase();
            const matchesSearch = !query || desc.includes(query) || id.includes(query);

            let matchesCat = true;
            if (catFilter && catFilter !== "All Categories") {
                matchesCat = (e.category || "").toLowerCase() === catFilter.toLowerCase();
            }

            let matchesStat = true;
            if (statFilter && statFilter !== "All Status") {
                matchesStat = (e.status || "Paid").toLowerCase() === statFilter.toLowerCase();
            }

            return matchesSearch && matchesCat && matchesStat;
        });

        renderExpenses(filtered);
    }

    if (filterBtn) filterBtn.addEventListener("click", applyFilters);
    if (searchInput) searchInput.addEventListener("input", applyFilters);
    if (categorySelect) categorySelect.addEventListener("change", applyFilters);
    if (statusSelect) statusSelect.addEventListener("change", applyFilters);
}

/* =========================================================
   2. ADD / EDIT EXPENSE PAGE (add-expense.html)
   ========================================================= */
function initializeAddExpensePage() {
    const form = document.querySelector(".expense-form") || document.querySelector("form");
    if (!form) return;

    const expenses = getExpenses();
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get("id");
    const today = typeof getToday === "function" ? getToday() : new Date().toISOString().split("T")[0];

    const inputs = form.querySelectorAll("input");
    const selects = form.querySelectorAll("select");
    const textarea = form.querySelector("textarea");

    // Map inputs:
    // Basic section:
    const idInput = inputs[0]; // Expense ID
    const dateInput = inputs[1]; // Date
    const catSelect = selects[0]; // Category
    const descInput = inputs[2]; // Description
    const vendorInput = inputs[3]; // Vendor
    const refInput = inputs[4]; // Reference

    // Payment section:
    const totalAmountInput = inputs[5]; // Total
    const paidAmountInput = inputs[6]; // Paid
    const dueAmountInput = inputs[7]; // Due
    const paymentMethodSelect = selects[1]; // Method
    const paymentStatusSelect = selects[2]; // Status

    let editingExpense = null;

    if (editId) {
        editingExpense = expenses.find(e => e.id === editId);
        if (editingExpense) {
            const headerH1 = document.querySelector(".page-header h1");
            if (headerH1) headerH1.textContent = "Edit Expense";

            if (idInput) {
                idInput.value = editingExpense.expenseNumber || editingExpense.id;
                idInput.readOnly = true;
            }
            if (dateInput) dateInput.value = editingExpense.date || today;
            if (catSelect) catSelect.value = editingExpense.category || "Other";
            if (descInput) descInput.value = editingExpense.description || "";
            if (vendorInput) vendorInput.value = editingExpense.vendor || "";
            if (refInput) refInput.value = editingExpense.reference || "";
            if (totalAmountInput) totalAmountInput.value = editingExpense.amount || 0;
            if (paidAmountInput) paidAmountInput.value = editingExpense.paidAmount || editingExpense.amount || 0;
            if (dueAmountInput) dueAmountInput.value = editingExpense.dueAmount || 0;
            if (paymentMethodSelect) paymentMethodSelect.value = editingExpense.paymentMethod || "Cash";
            if (paymentStatusSelect) paymentStatusSelect.value = editingExpense.status || "Paid";
        }
    } else {
        if (idInput) {
            const nextNum = expenses.length + 1;
            idInput.value = `EXP-${String(nextNum).padStart(3, "0")}`;
            idInput.readOnly = true;
        }
        if (dateInput) dateInput.value = today;
    }

    // Auto calculate due amount
    if (totalAmountInput && paidAmountInput && dueAmountInput) {
        function recalcDue() {
            const tot = Number(totalAmountInput.value) || 0;
            const pd = Number(paidAmountInput.value) || 0;
            const due = Math.max(0, tot - pd);
            dueAmountInput.value = due.toFixed(2);
            if (paymentStatusSelect) {
                if (due <= 0 && tot > 0) paymentStatusSelect.value = "Paid";
                else if (pd > 0) paymentStatusSelect.value = "Partial";
                else paymentStatusSelect.value = "Pending";
            }
        }
        totalAmountInput.addEventListener("input", function() {
            if (!paidAmountInput.dataset.modified) {
                paidAmountInput.value = this.value;
            }
            recalcDue();
        });
        paidAmountInput.addEventListener("input", function() {
            this.dataset.modified = "true";
            recalcDue();
        });
    }

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const amount = Number(totalAmountInput ? totalAmountInput.value : 0);
        const category = catSelect ? catSelect.value : "Other";
        const description = descInput ? descInput.value.trim() : "";

        if (!amount || amount <= 0) {
            alert("Please enter a valid expense amount.");
            totalAmountInput?.focus();
            return;
        }

        if (!description) {
            alert("Please enter an expense description.");
            descInput?.focus();
            return;
        }

        const id = idInput ? idInput.value.trim() : `EXP-${Date.now()}`;
        const paid = Number(paidAmountInput ? paidAmountInput.value : amount) || 0;
        const due = Math.max(0, amount - paid);

        const expData = {
            id: id,
            expenseNumber: id,
            date: dateInput ? dateInput.value : today,
            category: category,
            description: description,
            vendor: vendorInput ? vendorInput.value.trim() : "",
            reference: refInput ? refInput.value.trim() : "",
            amount: amount,
            paidAmount: paid,
            dueAmount: due,
            paymentMethod: paymentMethodSelect ? paymentMethodSelect.value : "Cash",
            status: paymentStatusSelect ? paymentStatusSelect.value : (due <= 0 ? "Paid" : "Pending"),
            notes: textarea ? textarea.value.trim() : "",
            createdAt: today
        };

        if (editingExpense) {
            const index = expenses.findIndex(e => e.id === editingExpense.id);
            if (index !== -1) expenses[index] = expData;
        } else {
            expenses.push(expData);
        }

        saveExpenses(expenses);

        if (typeof logActivity === "function") {
            logActivity(editingExpense ? "Expense Updated" : "Expense Added", "Expenses", `${editingExpense ? "Updated" : "Recorded"} expense ${id} for ${category}: ₹${amount}.`);
        }

        alert(`✓ Expense record ${id} saved successfully.`);
        window.location.href = "expenses.html";
    });
}

/* =========================================================
   3. EXPENSE DETAILS PAGE (expense-details.html)
   ========================================================= */
function initializeExpenseDetailsPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const expId = urlParams.get("id");

    const expenses = getExpenses();
    const exp = expenses.find(e => (e.id === expId || e.expenseNumber === expId)) || expenses[0];

    if (!exp) return;

    const titleH2 = document.querySelector(".expense-detail-header h2");
    if (titleH2) titleH2.textContent = `${exp.expenseNumber || exp.id} - ${exp.category}`;

    const items = document.querySelectorAll(".info-item, .detail-item");
    items.forEach(item => {
        const label = item.querySelector("label, span:first-child")?.textContent?.trim();
        const val = item.querySelector("span:last-child, strong, p");
        if (!val) return;

        if (label?.includes("ID")) val.textContent = exp.expenseNumber || exp.id;
        if (label?.includes("Date")) val.textContent = typeof formatDate === "function" ? formatDate(exp.date) : exp.date;
        if (label?.includes("Category")) val.textContent = exp.category;
        if (label?.includes("Description")) val.textContent = exp.description || "-";
        if (label?.includes("Amount")) val.textContent = typeof formatCurrency === "function" ? formatCurrency(exp.amount) : "₹" + exp.amount;
        if (label?.includes("Payment")) val.textContent = exp.paymentMethod || "Cash";
        if (label?.includes("Status")) val.textContent = exp.status || "Paid";
        if (label?.includes("Reference")) val.textContent = exp.reference || "-";
    });
}

/* =========================================================
   ROUTER INITIALIZATION
   ========================================================= */
document.addEventListener("DOMContentLoaded", function () {
    const path = window.location.pathname;

    if (path.includes("add-expense.html")) {
        initializeAddExpensePage();
    } else if (path.includes("expense-details.html")) {
        initializeExpenseDetailsPage();
    } else if (path.includes("expenses.html") || path.includes("expense-reports.html")) {
        initializeExpensesListPage();
    }
});
