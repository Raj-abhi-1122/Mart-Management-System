/* =========================================================
   MART MANAGEMENT SYSTEM
   REPORTS & ANALYTICS MODULE
   ========================================================= */

function calculateBusinessMetrics(fromDate = null, toDate = null) {
    const bills = Storage.get(STORAGE_KEYS.BILLS, []);
    const purchases = Storage.get(STORAGE_KEYS.PURCHASES, []);
    const expenses = Storage.get(STORAGE_KEYS.EXPENSES, []);
    const products = Storage.get(STORAGE_KEYS.PRODUCTS, []);

    // Filter by dates if provided
    function isWithinRange(dateStr) {
        if (!dateStr) return true;
        if (fromDate && dateStr < fromDate) return false;
        if (toDate && dateStr > toDate) return false;
        return true;
    }

    const filteredBills = bills.filter(b => isWithinRange(b.billDate));
    const filteredPurchases = purchases.filter(p => isWithinRange(p.purchaseDate));
    const filteredExpenses = expenses.filter(e => isWithinRange(e.date));

    const totalSales = filteredBills.reduce((sum, b) => sum + (Number(b.grandTotal) || 0), 0);
    const totalPurchases = filteredPurchases.reduce((sum, p) => sum + (Number(p.grandTotal) || 0), 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const netProfit = totalSales - totalPurchases - totalExpenses;

    // Inventory metrics
    let totalStockCost = 0;
    let totalStockRetail = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach(p => {
        const stock = Number(p.stock) || 0;
        const cost = Number(p.purchasePrice) || 0;
        const retail = Number(p.sellingPrice) || 0;
        const min = Number(p.minimumStock) || 0;

        totalStockCost += (stock * cost);
        totalStockRetail += (stock * retail);

        if (stock <= 0) outOfStockCount++;
        else if (stock <= min) lowStockCount++;
    });

    return {
        totalSales,
        totalPurchases,
        totalExpenses,
        netProfit,
        billsCount: filteredBills.length,
        purchasesCount: filteredPurchases.length,
        expensesCount: filteredExpenses.length,
        totalStockCost,
        totalStockRetail,
        potentialMargin: totalStockRetail - totalStockCost,
        lowStockCount,
        outOfStockCount,
        filteredBills,
        filteredPurchases,
        filteredExpenses
    };
}

/* =========================================================
   1. MAIN REPORTS OVERVIEW (reports.html)
   ========================================================= */
function initializeReportsPage() {
    const fromInput = document.querySelector(".report-filter-grid input[type='date']:first-of-type");
    const toInput = document.querySelectorAll(".report-filter-grid input[type='date']")[1];
    const generateBtn = document.querySelector(".report-filter-action button");

    const today = typeof getToday === "function" ? getToday() : new Date().toISOString().split("T")[0];
    const currentYearMonth = today.substring(0, 7);

    if (fromInput && !fromInput.value) fromInput.value = `${currentYearMonth}-01`;
    if (toInput && !toInput.value) toInput.value = today;

    function updateCards() {
        const fromDate = fromInput ? fromInput.value : null;
        const toDate = toInput ? toInput.value : null;

        const metrics = calculateBusinessMetrics(fromDate, toDate);
        const cards = document.querySelectorAll(".report-summary-cards .summary-card");

        if (cards.length >= 4) {
            // Total Sales
            cards[0].querySelector("h2").textContent = typeof formatCurrency === "function" ? formatCurrency(metrics.totalSales) : "₹" + metrics.totalSales.toFixed(2);

            // Total Purchases
            cards[1].querySelector("h2").textContent = typeof formatCurrency === "function" ? formatCurrency(metrics.totalPurchases) : "₹" + metrics.totalPurchases.toFixed(2);

            // Total Expenses
            cards[2].querySelector("h2").textContent = typeof formatCurrency === "function" ? formatCurrency(metrics.totalExpenses) : "₹" + metrics.totalExpenses.toFixed(2);

            // Net Profit
            const profitH2 = cards[3].querySelector("h2");
            profitH2.textContent = typeof formatCurrency === "function" ? formatCurrency(metrics.netProfit) : "₹" + metrics.netProfit.toFixed(2);
            profitH2.style.color = metrics.netProfit >= 0 ? "#10b981" : "#ef4444";
        }
    }

    updateCards();

    if (generateBtn) {
        generateBtn.addEventListener("click", function () {
            updateCards();
            if (typeof showToast === "function") showToast("Report updated for selected date range.");
        });
    }
}

/* =========================================================
   2. PROFIT & LOSS REPORT (profit-loss.html)
   ========================================================= */
function initializeProfitLossPage() {
    const metrics = calculateBusinessMetrics();

    // Summary numbers
    const summaryCards = document.querySelectorAll(".summary-card");
    if (summaryCards.length >= 4) {
        summaryCards[0].querySelector("h2").textContent = typeof formatCurrency === "function" ? formatCurrency(metrics.totalSales) : "₹" + metrics.totalSales;
        summaryCards[1].querySelector("h2").textContent = typeof formatCurrency === "function" ? formatCurrency(metrics.totalPurchases) : "₹" + metrics.totalPurchases;
        summaryCards[2].querySelector("h2").textContent = typeof formatCurrency === "function" ? formatCurrency(metrics.totalExpenses) : "₹" + metrics.totalExpenses;
        const netH2 = summaryCards[3].querySelector("h2");
        netH2.textContent = typeof formatCurrency === "function" ? formatCurrency(metrics.netProfit) : "₹" + metrics.netProfit;
        netH2.style.color = metrics.netProfit >= 0 ? "#10b981" : "#ef4444";
    }

    // P&L Statement Rows
    const plRows = document.querySelectorAll(".pl-row, .statement-row");
    plRows.forEach(row => {
        const title = row.querySelector(".pl-title, span:first-child")?.textContent?.trim();
        const amountEl = row.querySelector(".pl-amount, strong, span:last-child");
        if (!amountEl) return;

        if (title?.includes("Revenue") || title?.includes("Sales")) amountEl.textContent = `₹${metrics.totalSales.toFixed(2)}`;
        if (title?.includes("Cost of Goods") || title?.includes("Purchase")) amountEl.textContent = `₹${metrics.totalPurchases.toFixed(2)}`;
        if (title?.includes("Expenses")) amountEl.textContent = `₹${metrics.totalExpenses.toFixed(2)}`;
        if (title?.includes("Net Profit")) {
            amountEl.textContent = `₹${metrics.netProfit.toFixed(2)}`;
            amountEl.style.color = metrics.netProfit >= 0 ? "#10b981" : "#ef4444";
        }
    });
}

/* =========================================================
   3. INVENTORY REPORTS (inventory-reports.html)
   ========================================================= */
function initializeInventoryReportsPage() {
    const metrics = calculateBusinessMetrics();

    const cards = document.querySelectorAll(".summary-card");
    if (cards.length >= 4) {
        cards[0].querySelector("h2").textContent = typeof formatCurrency === "function" ? formatCurrency(metrics.totalStockCost) : "₹" + metrics.totalStockCost;
        cards[1].querySelector("h2").textContent = typeof formatCurrency === "function" ? formatCurrency(metrics.totalStockRetail) : "₹" + metrics.totalStockRetail;
        cards[2].querySelector("h2").textContent = typeof formatCurrency === "function" ? formatCurrency(metrics.potentialMargin) : "₹" + metrics.potentialMargin;
        cards[3].querySelector("h2").textContent = metrics.lowStockCount + metrics.outOfStockCount;
    }
}

/* =========================================================
   ROUTER INITIALIZATION
   ========================================================= */
document.addEventListener("DOMContentLoaded", function () {
    const path = window.location.pathname;

    if (path.includes("profit-loss.html")) {
        initializeProfitLossPage();
    } else if (path.includes("inventory-reports.html")) {
        initializeInventoryReportsPage();
    } else if (path.includes("reports.html") || path.includes("sales-reports.html") || path.includes("purchase-reports.html")) {
        initializeReportsPage();
    }
});
