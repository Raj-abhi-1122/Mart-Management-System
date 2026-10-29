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

    const filteredBills = bills.filter(b => !b.cancelled && isWithinRange(b.billDate));
    const filteredPurchases = purchases.filter(p => !p.cancelled && isWithinRange(p.purchaseDate));
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

function renderReportRows(table, rows, emptyMessage = "No records match this report.") {
    const body = table?.tBodies?.[0];
    if (!body) return;
    body.replaceChildren();
    if (!rows.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = table.tHead?.rows?.[0]?.cells.length || 1;
        cell.textContent = emptyMessage;
        row.appendChild(cell); body.appendChild(row); return;
    }
    rows.forEach(values => {
        const row = document.createElement("tr");
        values.forEach(value => { const cell = document.createElement("td"); cell.textContent = String(value ?? "-"); row.appendChild(cell); });
        body.appendChild(row);
    });
}

function money(value) {
    return typeof formatCurrency === "function" ? formatCurrency(Number(value) || 0) : `₹${(Number(value) || 0).toFixed(2)}`;
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
    const grid = document.querySelector(".profit-filter-grid");
    const dates = grid ? grid.querySelectorAll('input[type="date"]') : [];
    const selects = grid ? grid.querySelectorAll("select") : [];
    const button = grid?.querySelector("button");
    const today = typeof getToday === "function" ? getToday() : new Date().toISOString().slice(0, 10);
    if (dates[0] && !dates[0].value) dates[0].value = `${today.slice(0, 7)}-01`;
    if (dates[1] && !dates[1].value) dates[1].value = today;

    function update() {
        let fromDate = dates[0]?.value || null;
        let toDate = dates[1]?.value || null;
        const period = selects[0]?.value;
        if (period && period !== "Custom Period") {
            const end = new Date(`${today}T00:00:00`);
            toDate = today;
            if (period === "Today") fromDate = today;
            else if (period === "This Week") {
                end.setDate(end.getDate() - ((end.getDay() + 6) % 7));
                fromDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
            }
            else if (period === "This Month") fromDate = `${today.slice(0, 7)}-01`;
            else if (period === "This Year") fromDate = `${today.slice(0, 4)}-01-01`;
            if (dates[0]) dates[0].value = fromDate;
            if (dates[1]) dates[1].value = toDate;
        }
        if (fromDate && toDate && fromDate > toDate) {
            if (typeof showToast === "function") showToast("Start date must be on or before end date.", "error");
            return;
        }
        const metrics = calculateBusinessMetrics(fromDate, toDate);
        const cards = document.querySelectorAll(".profit-summary-cards .summary-card");
        const values = [metrics.totalSales, metrics.totalPurchases, metrics.totalExpenses, metrics.netProfit];
        cards.forEach((card, index) => {
            const value = card.querySelector("h2");
            if (value && values[index] !== undefined) {
                value.textContent = typeof formatCurrency === "function" ? formatCurrency(values[index]) : `₹${values[index].toFixed(2)}`;
                if (index === 3) value.style.color = metrics.netProfit >= 0 ? "#10b981" : "#ef4444";
            }
        });
        document.querySelectorAll(".pl-row, .statement-row").forEach(row => {
            const title = row.querySelector(".pl-title, span:first-child")?.textContent?.trim() || "";
            const amountEl = row.querySelector(".pl-amount, strong, span:last-child");
            if (!amountEl) return;
            let amount = null;
            if (/Revenue|Sales/i.test(title)) amount = metrics.totalSales;
            else if (/Cost of Goods|Purchase/i.test(title)) amount = metrics.totalPurchases;
            else if (/Expenses/i.test(title)) amount = metrics.totalExpenses;
            else if (/Net Profit/i.test(title)) amount = metrics.netProfit;
            if (amount !== null) amountEl.textContent = typeof formatCurrency === "function" ? formatCurrency(amount) : `₹${amount.toFixed(2)}`;
            if (/Net Profit/i.test(title)) amountEl.style.color = metrics.netProfit >= 0 ? "#10b981" : "#ef4444";
        });
        const monthly = new Map();
        metrics.filteredBills.forEach(bill => {
            const key = String(bill.billDate || "").slice(0,7); if (!key) return;
            if (!monthly.has(key)) monthly.set(key,{revenue:0,purchases:0,expenses:0});
            monthly.get(key).revenue += Number(bill.grandTotal)||0;
        });
        metrics.filteredPurchases.forEach(purchase => { const key=String(purchase.purchaseDate||"").slice(0,7); if(!key)return; if(!monthly.has(key))monthly.set(key,{revenue:0,purchases:0,expenses:0}); monthly.get(key).purchases+=Number(purchase.grandTotal)||0; });
        metrics.filteredExpenses.forEach(expense => { const key=String(expense.date||"").slice(0,7); if(!key)return; if(!monthly.has(key))monthly.set(key,{revenue:0,purchases:0,expenses:0}); monthly.get(key).expenses+=Number(expense.amount)||0; });
        const table = document.querySelector(".profit-report-table");
        const monthlyRows = Array.from(monthly.entries()).sort((a,b)=>b[0].localeCompare(a[0])).map(([key,value])=>{
            const gross=value.revenue-value.purchases; const net=gross-value.expenses; const monthDate=new Date(`${key}-01T00:00:00`);
            return [monthDate.toLocaleDateString("en-IN",{month:"long",year:"numeric"}),money(value.revenue),money(value.purchases),money(value.expenses),money(gross),money(net),`${value.revenue?((net/value.revenue)*100).toFixed(1):"0.0"}%`];
        });
        renderReportRows(table,monthlyRows,"No transactions match this report period.");
        if (typeof showToast === "function") showToast(`Profit and loss report updated (${metrics.billsCount} bills, ${metrics.purchasesCount} purchases, ${metrics.expensesCount} expenses).`);
    }
    update();
    button?.addEventListener("click", update);
}

/* =========================================================
   3. INVENTORY REPORTS (inventory-reports.html)
   ========================================================= */
function initializeInventoryReportsPage() {
    const grid = document.querySelector(".inventory-filter-grid");
    const date = grid?.querySelector('input[type="date"]');
    const selects = grid ? grid.querySelectorAll("select") : [];
    const button = grid?.querySelector("button");
    const today = typeof getToday === "function" ? getToday() : new Date().toISOString().slice(0, 10);
    if (date && !date.value) date.value = today;
    if (date) date.value = today;
    if (selects[0]) {
        const products = Storage.get(STORAGE_KEYS.PRODUCTS, []); const current = selects[0].value;
        selects[0].replaceChildren(new Option("All Categories", "All Categories"));
        Array.from(new Set(products.map(product => product.category).filter(Boolean))).sort().forEach(category => selects[0].appendChild(new Option(category, category)));
        if (Array.from(selects[0].options).some(option => option.value === current)) selects[0].value = current;
    }
    function update() {
        const products = Storage.get(STORAGE_KEYS.PRODUCTS, []);
        const category = selects[0]?.value || "All Categories";
        const stockStatus = selects[1]?.value || "All Status";
        const basis = selects[2]?.value || "Purchase Price";
        const filtered = products.filter(product => {
            const matchesCategory = category === "All Categories" || (product.category || "").toLowerCase() === category.toLowerCase();
            const stock = Number(product.stock) || 0;
            const minimum = Number(product.minimumStock) || 0;
            const status = stock <= 0 ? "Out of Stock" : stock <= minimum ? "Low Stock" : "In Stock";
            return matchesCategory && (stockStatus === "All Status" || status === stockStatus);
        });
        const stockUnits = filtered.reduce((sum, product) => sum + (Number(product.stock) || 0), 0);
        const low = filtered.filter(product => Number(product.stock) > 0 && Number(product.stock) <= Number(product.minimumStock || 0)).length;
        const out = filtered.filter(product => Number(product.stock) <= 0).length;
        const cards = document.querySelectorAll(".inventory-report-summary .summary-card");
        const values = [filtered.length, stockUnits, low, out];
        cards.forEach((card, index) => { const value = card.querySelector("h2"); if (value) value.textContent = values[index] ?? 0; });
        const activeCount = filtered.filter(product => (product.status || "Active").toLowerCase() === "active").length;
        const cardSmalls = document.querySelectorAll(".inventory-report-summary .summary-card small");
        if (cardSmalls[0]) cardSmalls[0].textContent = `${activeCount} active products`;
        if (cardSmalls[1]) cardSmalls[1].textContent = "units in selected categories";
        if (cardSmalls[2]) cardSmalls[2].textContent = `${low} products require attention`;
        if (cardSmalls[3]) cardSmalls[3].textContent = `${out} products need restocking`;
        const stockValue = filtered.reduce((sum, product) => sum + (Number(product.stock) || 0) * (Number(basis === "Selling Price" ? product.sellingPrice : product.purchasePrice) || 0), 0);
        const valueText = document.querySelector(".inventory-value-main strong");
        if (valueText) valueText.textContent = money(stockValue);
        const productMeta = new Map(products.map(product => [product.id, product]));
        const asOfDate = date?.value || today;
        const movements = [];
        Storage.get(STORAGE_KEYS.PURCHASES, []).forEach(purchase => (purchase.items || []).forEach(item => movements.push({ date: purchase.purchaseDate, productId: item.productId, name: item.productName, type: purchase.cancelled ? "Purchase (Cancelled)" : "Purchase", quantity: Number(item.quantity) || 0, ref: purchase.invoiceNumber || purchase.id, sign: "+" })));
        Storage.get(STORAGE_KEYS.BILLS, []).filter(bill => !bill.cancelled).forEach(bill => (bill.items || []).forEach(item => movements.push({ date: bill.billDate, productId: item.productId, name: item.productName, type: "Sale", quantity: Number(item.quantity) || 0, ref: bill.id || bill.billNumber, sign: "−" })));
        Storage.get(STORAGE_KEYS.STOCK_ADJUSTMENTS, []).forEach(adjustment => {
            const product = productMeta.get(adjustment.productId);
            movements.push({ date: adjustment.date, productId: adjustment.productId, name: adjustment.productName || product?.name, type: adjustment.reason || `Stock ${adjustment.adjustmentType || "Adjustment"}`, quantity: Number(adjustment.quantity) || 0, ref: adjustment.id || "Adjustment", sign: adjustment.adjustmentType === "Increase" ? "+" : "−", previous: adjustment.previousStock, next: adjustment.newStock });
        });
        const movementRows = movements.filter(item => (!asOfDate || !item.date || item.date <= asOfDate)
            && (category === "All Categories" || (productMeta.get(item.productId)?.category || "").toLowerCase() === category.toLowerCase()))
            .sort((a,b) => String(b.date || "").localeCompare(String(a.date || ""))).slice(0,50)
            .map(item => [item.date ? (typeof formatDate === "function" ? formatDate(item.date) : item.date) : "-",item.name || productMeta.get(item.productId)?.name || "Unknown Product",item.type,`${item.sign}${item.quantity}`,item.previous ?? "—",item.next ?? "—",item.ref]);
        const lowProducts = filtered.filter(product => (Number(product.stock)||0) <= (Number(product.minimumStock)||0)).sort((a,b) => (Number(a.stock)||0)-(Number(b.stock)||0));
        const inventoryTables = document.querySelectorAll(".inventory-report-table");
        renderReportRows(inventoryTables[0], movementRows, "No recorded inventory movements for this selection.");
        renderReportRows(inventoryTables[1], lowProducts.map(product => [product.name,product.category || "-",Number(product.stock)||0,Number(product.minimumStock)||0,Math.max(0,(Number(product.minimumStock)||0)-(Number(product.stock)||0)),(Number(product.stock)||0)<=0 ? "Out of Stock" : "Low Stock"]), "No low stock products.");
        if (typeof showToast === "function") showToast(`Inventory report updated for ${filtered.length} products.`);
    }
    update();
    button?.addEventListener("click", update);
}

function initializeSalesReportPage() {
    const grid = document.querySelector(".sales-filter-grid");
    const dates = grid?.querySelectorAll('input[type="date"]') || [];
    const selects = grid?.querySelectorAll("select") || [];
    const button = grid?.querySelector("button");
    const today = typeof getToday === "function" ? getToday() : new Date().toISOString().slice(0, 10);
    if (dates[0]) dates[0].value = `${today.slice(0, 7)}-01`;
    if (dates[1]) dates[1].value = today;
    if (selects[0]) {
        const customers = Storage.get(STORAGE_KEYS.CUSTOMERS, []);
        const current = selects[0].value;
        selects[0].replaceChildren(new Option("All Customers", "All Customers"), new Option("Walk-in Customer", "Walk-in Customer"));
        customers.forEach(customer => selects[0].appendChild(new Option(customer.name, customer.name)));
        if (Array.from(selects[0].options).some(option => option.value === current)) selects[0].value = current;
    }
    function update() {
        const from = dates[0]?.value || "";
        const to = dates[1]?.value || "";
        if (from && to && from > to) { if (typeof showToast === "function") showToast("Start date must be on or before end date.", "error"); return; }
        const customer = selects[0]?.value || "All Customers";
        const method = selects[1]?.value || "All Methods";
        const bills = Storage.get(STORAGE_KEYS.BILLS, []).filter(bill => {
            if (bill.cancelled) return false;
            const date = bill.billDate || "";
            return (!from || date >= from) && (!to || date <= to)
                && (customer === "All Customers" || (bill.customerName || "Walk-in Customer") === customer)
                && (method === "All Methods" || (bill.paymentMethod || "") === method);
        });
        const total = bills.reduce((sum, bill) => sum + (Number(bill.grandTotal) || 0), 0);
        const paid = bills.reduce((sum, bill) => sum + (Number(bill.paidAmount) || 0), 0);
        const due = bills.reduce((sum, bill) => sum + (Number(bill.dueAmount) || 0), 0);
        const cards = document.querySelectorAll(".sales-report-summary .summary-card");
        const values = [typeof formatCurrency === "function" ? formatCurrency(total) : `₹${total.toFixed(2)}`, bills.length,
            typeof formatCurrency === "function" ? formatCurrency(paid) : `₹${paid.toFixed(2)}`,
            typeof formatCurrency === "function" ? formatCurrency(due) : `₹${due.toFixed(2)}`];
        cards.forEach((card, index) => { const value = card.querySelector("h2"); if (value) value.textContent = values[index] ?? "0"; });
        const smalls = document.querySelectorAll(".sales-report-summary .summary-card small");
        const salesDays = new Set(bills.map(bill => bill.billDate).filter(Boolean)).size;
        if (smalls[0]) smalls[0].textContent = `${from || "Any date"} to ${to || "Any date"}`;
        if (smalls[1]) smalls[1].textContent = `${salesDays ? (bills.length/salesDays).toFixed(1) : "0.0"} bills per sales day`;
        if (smalls[2]) smalls[2].textContent = `${total ? (paid/total*100).toFixed(1) : "0.0"}% collected`;
        if (smalls[3]) smalls[3].textContent = `${total ? (due/total*100).toFixed(1) : "0.0"}% pending`;
        const groupedDays = new Map();
        const byProduct = new Map();
        const byCustomer = new Map();
        bills.forEach(bill => {
            const day = bill.billDate || "Unknown";
            if (!groupedDays.has(day)) groupedDays.set(day, { count: 0, gross: 0, discount: 0, net: 0, paid: 0, due: 0 });
            const daily = groupedDays.get(day); daily.count++; daily.gross += Number(bill.subtotal) || 0; daily.discount += Number(bill.discount) || 0; daily.net += Number(bill.grandTotal) || 0; daily.paid += Number(bill.paidAmount) || 0; daily.due += Number(bill.dueAmount) || 0;
            const customerName = bill.customerName || "Walk-in Customer";
            if (!byCustomer.has(customerName)) byCustomer.set(customerName, { bills: 0, total: 0, paid: 0, due: 0 });
            const customerStats = byCustomer.get(customerName); customerStats.bills++; customerStats.total += Number(bill.grandTotal) || 0; customerStats.paid += Number(bill.paidAmount) || 0; customerStats.due += Number(bill.dueAmount) || 0;
            (bill.items || []).forEach(item => {
                if (!byProduct.has(item.productId)) byProduct.set(item.productId, { name: item.productName || "Product", quantity: 0, revenue: 0 });
                const product = byProduct.get(item.productId); product.quantity += Number(item.quantity) || 0; product.revenue += Number(item.lineTotal) || ((Number(item.quantity) || 0) * (Number(item.price) || 0) - (Number(item.discount) || 0));
            });
        });
        const dayRows = Array.from(groupedDays.entries()).sort((a,b) => b[0].localeCompare(a[0])).map(([day, item]) => [day === "Unknown" ? day : (typeof formatDate === "function" ? formatDate(day) : day), item.count, money(item.gross), money(item.discount), money(item.net), money(item.paid), money(item.due)]);
        const products = Storage.get(STORAGE_KEYS.PRODUCTS, []); const productMeta = new Map(products.map(product => [product.id, product]));
        const productRows = Array.from(byProduct.entries()).sort((a,b) => b[1].revenue-a[1].revenue).map(([id,item],index) => [index+1,item.name,productMeta.get(id)?.category || "-",item.quantity,money(item.revenue),total ? `${(item.revenue/total*100).toFixed(1)}%` : "0.0%"]);
        const customerRows = Array.from(byCustomer.entries()).sort((a,b) => b[1].total-a[1].total).map(([name,item],index) => [index+1,name,item.bills,money(item.total),money(item.paid),money(item.due)]);
        const salesTables = document.querySelectorAll(".sales-report-table");
        renderReportRows(salesTables[0], dayRows); renderReportRows(salesTables[1], productRows); renderReportRows(salesTables[2], customerRows);
        if (typeof showToast === "function") showToast(`Sales report updated for ${bills.length} bills.`);
    }
    update();
    button?.addEventListener("click", update);
}

function initializePurchaseReportPage() {
    const grid = document.querySelector(".purchase-filter-grid");
    const dates = grid?.querySelectorAll('input[type="date"]') || [];
    const selects = grid?.querySelectorAll("select") || [];
    const button = grid?.querySelector("button");
    const today = typeof getToday === "function" ? getToday() : new Date().toISOString().slice(0, 10);
    if (dates[0]) dates[0].value = `${today.slice(0, 7)}-01`;
    if (dates[1]) dates[1].value = today;
    if (selects[0]) {
        const suppliers = Storage.get(STORAGE_KEYS.SUPPLIERS, []);
        const current = selects[0].value;
        selects[0].replaceChildren(new Option("All Suppliers", "All Suppliers"));
        suppliers.forEach(supplier => selects[0].appendChild(new Option(supplier.name, supplier.name)));
        if (Array.from(selects[0].options).some(option => option.value === current)) selects[0].value = current;
    }
    function update() {
        const from = dates[0]?.value || "";
        const to = dates[1]?.value || "";
        if (from && to && from > to) { if (typeof showToast === "function") showToast("Start date must be on or before end date.", "error"); return; }
        const supplier = selects[0]?.value || "All Suppliers";
        const status = selects[1]?.value || "All Status";
        const purchases = Storage.get(STORAGE_KEYS.PURCHASES, []).filter(purchase => {
            const date = purchase.purchaseDate || "";
            const purchaseStatus = Number(purchase.dueAmount) <= 0 ? "Paid" : Number(purchase.paidAmount) > 0 ? "Partial" : "Due";
            return !purchase.cancelled && (!from || date >= from) && (!to || date <= to)
                && (supplier === "All Suppliers" || (purchase.supplierName || "") === supplier)
                && (status === "All Status" || purchaseStatus.toLowerCase() === status.toLowerCase());
        });
        const total = purchases.reduce((sum, purchase) => sum + (Number(purchase.grandTotal) || 0), 0);
        const paid = purchases.reduce((sum, purchase) => sum + (Number(purchase.paidAmount) || 0), 0);
        const due = purchases.reduce((sum, purchase) => sum + (Number(purchase.dueAmount) || 0), 0);
        const cards = document.querySelectorAll(".purchase-report-summary .summary-card");
        const values = [typeof formatCurrency === "function" ? formatCurrency(total) : `₹${total.toFixed(2)}`, purchases.length,
            typeof formatCurrency === "function" ? formatCurrency(paid) : `₹${paid.toFixed(2)}`,
            typeof formatCurrency === "function" ? formatCurrency(due) : `₹${due.toFixed(2)}`];
        cards.forEach((card, index) => { const value = card.querySelector("h2"); if (value) value.textContent = values[index] ?? "0"; });
        const smalls = document.querySelectorAll(".purchase-report-summary .summary-card small");
        const purchaseDays = new Set(purchases.map(purchase => purchase.purchaseDate).filter(Boolean)).size;
        if (smalls[0]) smalls[0].textContent = `${from || "Any date"} to ${to || "Any date"}`;
        if (smalls[1]) smalls[1].textContent = `${purchaseDays ? (purchases.length/purchaseDays).toFixed(1) : "0.0"} orders per purchase day`;
        if (smalls[2]) smalls[2].textContent = `${total ? (paid/total*100).toFixed(1) : "0.0"}% paid`;
        if (smalls[3]) smalls[3].textContent = `${total ? (due/total*100).toFixed(1) : "0.0"}% pending`;
        const groupedDays = new Map(); const productsById = new Map();
        purchases.forEach(purchase => {
            const day = purchase.purchaseDate || "Unknown";
            if (!groupedDays.has(day)) groupedDays.set(day, { orders: 0, total: 0, paid: 0, due: 0 });
            const daily = groupedDays.get(day); daily.orders++; daily.total += Number(purchase.grandTotal) || 0; daily.paid += Number(purchase.paidAmount) || 0; daily.due += Number(purchase.dueAmount) || 0;
            (purchase.items || []).forEach(item => {
                if (!productsById.has(item.productId)) productsById.set(item.productId, { name: item.productName || "Product", quantity: 0, value: 0, suppliers: new Set() });
                const product = productsById.get(item.productId); product.quantity += Number(item.quantity) || 0; product.value += Number(item.lineTotal) || ((Number(item.quantity) || 0) * (Number(item.purchasePrice) || 0) - (Number(item.discount) || 0)); product.suppliers.add(purchase.supplierName || "-");
            });
        });
        const dayRows = Array.from(groupedDays.entries()).sort((a,b) => b[0].localeCompare(a[0])).map(([day,item]) => [day === "Unknown" ? day : (typeof formatDate === "function" ? formatDate(day) : day),item.orders,money(item.total),money(item.paid),money(item.due),money(item.orders ? item.total/item.orders : 0),item.due <= 0 ? "Paid" : item.paid > 0 ? "Partial" : "Due"]);
        const products = Storage.get(STORAGE_KEYS.PRODUCTS, []); const productMeta = new Map(products.map(product => [product.id, product]));
        const productRows = Array.from(productsById.entries()).sort((a,b) => b[1].value-a[1].value).map(([id,item],index) => [index+1,item.name,productMeta.get(id)?.category || "-",item.quantity,money(item.value),item.suppliers.size > 1 ? "Multiple" : Array.from(item.suppliers)[0]]);
        const purchaseTables = document.querySelectorAll(".purchase-report-table");
        renderReportRows(purchaseTables[0], dayRows); renderReportRows(purchaseTables[1], productRows);
        if (typeof showToast === "function") showToast(`Purchase report updated for ${purchases.length} purchases.`);
    }
    update();
    button?.addEventListener("click", update);
}

function initializeExpenseReportPage() {
    const grid = document.querySelector(".expense-report-filter-grid");
    const dates = grid?.querySelectorAll('input[type="date"]') || [];
    const selects = grid?.querySelectorAll("select") || [];
    const button = grid?.querySelector("button");
    const today = typeof getToday === "function" ? getToday() : new Date().toISOString().slice(0, 10);
    if (dates[0]) dates[0].value = `${today.slice(0, 7)}-01`;
    if (dates[1]) dates[1].value = today;
    if (selects[0]) {
        const expenses = Storage.get(STORAGE_KEYS.EXPENSES, []);
        const current = selects[0].value;
        selects[0].replaceChildren(new Option("All Categories", "All Categories"));
        Array.from(new Set(expenses.map(expense => expense.category).filter(Boolean))).sort().forEach(value => selects[0].appendChild(new Option(value, value)));
        if (Array.from(selects[0].options).some(option => option.value === current)) selects[0].value = current;
    }
    function update() {
        const from = dates[0]?.value || "";
        const to = dates[1]?.value || "";
        if (from && to && from > to) { if (typeof showToast === "function") showToast("Start date must be on or before end date.", "error"); return; }
        const category = selects[0]?.value || "All Categories";
        const status = selects[1]?.value || "All Status";
        const expenses = Storage.get(STORAGE_KEYS.EXPENSES, []).filter(expense => {
            const date = expense.date || "";
            return (!from || date >= from) && (!to || date <= to)
                && (category === "All Categories" || (expense.category || "") === category)
                && (status === "All Status" || (expense.status || "Paid").toLowerCase() === status.toLowerCase());
        });
        const total = expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
        const paid = expenses.reduce((sum, expense) => {
            const amount = Number(expense.amount) || 0;
            const dueAmount = Number(expense.dueAmount) || 0;
            return sum + (expense.status === "Paid" ? amount : Math.max(0, amount - dueAmount));
        }, 0);
        const due = expenses.reduce((sum, expense) => sum + (Number(expense.dueAmount) || (expense.status === "Paid" ? 0 : Number(expense.amount) || 0)), 0);
        const cards = document.querySelectorAll(".expense-report-summary .summary-card");
        const values = [typeof formatCurrency === "function" ? formatCurrency(total) : `₹${total.toFixed(2)}`, expenses.length,
            typeof formatCurrency === "function" ? formatCurrency(paid) : `₹${paid.toFixed(2)}`,
            typeof formatCurrency === "function" ? formatCurrency(due) : `₹${due.toFixed(2)}`];
        cards.forEach((card, index) => { const value = card.querySelector("h2"); if (value) value.textContent = values[index] ?? "0"; });
        const daily = new Map();
        const byCategory = new Map();
        expenses.forEach(expense => {
            const day = expense.date || "Unknown";
            if (!daily.has(day)) daily.set(day, { count: 0, total: 0, paid: 0, due: 0 });
            const row = daily.get(day); const amount = Number(expense.amount) || 0; const dueAmount = Number(expense.dueAmount) || 0;
            row.count++; row.total += amount; row.due += dueAmount; row.paid += Math.max(0, amount - dueAmount);
            const key = expense.category || "Other";
            if (!byCategory.has(key)) byCategory.set(key, { count: 0, total: 0 });
            const categoryStats = byCategory.get(key); categoryStats.count++; categoryStats.total += amount;
        });
        const dailyRows = Array.from(daily.entries()).sort((a,b) => b[0].localeCompare(a[0])).map(([day,item]) => [day === "Unknown" ? day : (typeof formatDate === "function" ? formatDate(day) : day),item.count,money(item.total),money(item.paid),money(item.due),money(item.count ? item.total/item.count : 0)]);
        const highestRows = expenses.slice().sort((a,b) => (Number(b.amount)||0)-(Number(a.amount)||0)).slice(0,10).map(expense => [expense.expenseNumber || expense.id,typeof formatDate === "function" ? formatDate(expense.date) : expense.date,expense.description || "-",expense.category || "Other",expense.vendor || "-",money(expense.amount),expense.status || "Paid"]);
        const expenseTables = document.querySelectorAll(".expense-report-table");
        renderReportRows(expenseTables[0], dailyRows); renderReportRows(expenseTables[1], highestRows);
        const categoryList = document.querySelector(".expense-report-two-column .expense-category-list");
        if (categoryList) {
            categoryList.replaceChildren();
            const sortedCategories = Array.from(byCategory.entries()).sort((a,b) => b[1].total-a[1].total);
            if (!sortedCategories.length) { const empty = document.createElement("p"); empty.textContent = "No expenses match this report."; categoryList.appendChild(empty); }
            sortedCategories.forEach(([name,item]) => {
                const row = document.createElement("div"); row.className = "expense-category-row";
                const info = document.createElement("div"); info.className = "expense-category-info";
                const dot = document.createElement("span"); dot.className = `expense-category-dot ${name.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`;
                const details = document.createElement("div"); const strong = document.createElement("strong"); strong.textContent = name; const count = document.createElement("span"); count.textContent = `${item.count} ${item.count === 1 ? "record" : "records"}`; details.append(strong,count); info.append(dot,details);
                const amount = document.createElement("div"); amount.className = "expense-category-amount"; const totalEl = document.createElement("strong"); totalEl.textContent = money(item.total); const share = document.createElement("span"); share.textContent = `${total ? (item.total/total*100).toFixed(1) : "0.0"}%`; amount.append(totalEl,share); row.append(info,amount); categoryList.appendChild(row);
            });
            const totalRow = document.createElement("div"); totalRow.className = "expense-category-total"; const totalLabel = document.createElement("span"); totalLabel.textContent = "Total Expenses"; const totalValue = document.createElement("strong"); totalValue.textContent = money(total); totalRow.append(totalLabel,totalValue); categoryList.appendChild(totalRow);
        }
        const stats = [expenses.length ? total/expenses.length : 0, Math.max(0,...expenses.map(expense=>Number(expense.amount)||0)), expenses.length ? Math.min(...expenses.map(expense=>Number(expense.amount)||0)) : 0, from && to ? total / Math.max(1, Math.floor((new Date(`${to}T00:00:00`)-new Date(`${from}T00:00:00`))/86400000)+1) : 0, total ? due/total*100 : 0];
        document.querySelectorAll(".expense-statistics .expense-stat-row strong").forEach((node,index) => { if (stats[index] !== undefined) node.textContent = index === 4 ? `${stats[index].toFixed(1)}%` : money(stats[index]); });
        const smalls = document.querySelectorAll(".expense-report-summary .summary-card small");
        if (smalls[0]) smalls[0].textContent = from || to ? `${from || "Any date"} to ${to || "Any date"}` : "All dates";
        if (smalls[1]) smalls[1].textContent = "records in selected period";
        if (smalls[2]) smalls[2].textContent = `${total ? (paid/total*100).toFixed(1) : "0.0"}% collected`;
        if (smalls[3]) smalls[3].textContent = `${total ? (due/total*100).toFixed(1) : "0.0"}% pending`;
        if (typeof showToast === "function") showToast(`Expense report updated for ${expenses.length} records.`);
    }
    update();
    button?.addEventListener("click", update);
}

/* =========================================================
   ROUTER INITIALIZATION
   ========================================================= */
document.addEventListener("DOMContentLoaded", function () {
    const path = window.location.pathname;

    if (path.includes("profit-loss.html")) {
        initializeProfitLossPage();
    } else if (path.includes("sales-reports.html")) {
        initializeSalesReportPage();
    } else if (path.includes("purchase-reports.html")) {
        initializePurchaseReportPage();
    } else if (path.includes("expense-reports.html")) {
        initializeExpenseReportPage();
    } else if (path.includes("inventory-reports.html")) {
        initializeInventoryReportsPage();
    } else if (path.includes("reports.html")) {
        initializeReportsPage();
    }
});
