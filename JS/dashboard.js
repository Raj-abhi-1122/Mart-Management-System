/* =========================================================
   MART MANAGEMENT SYSTEM
   DASHBOARD CONTROLLER
   ========================================================= */

function initializeDashboard() {
    const today = typeof getToday === "function" ? getToday() : new Date().toISOString().split("T")[0];
    const currentYearMonth = today.substring(0, 7); // "YYYY-MM"

    // Load data from LocalStorage
    const products = Storage.get(STORAGE_KEYS.PRODUCTS, []);
    const bills = Storage.get(STORAGE_KEYS.BILLS, []);
    const employees = Storage.get(STORAGE_KEYS.EMPLOYEES, []);

    // 1. Calculations
    const todaysBills = bills.filter(b => b.billDate === today);
    const todaysSales = todaysBills.reduce((sum, b) => sum + (Number(b.grandTotal) || 0), 0);

    const monthlyBills = bills.filter(b => (b.billDate || "").startsWith(currentYearMonth));
    const monthlySales = monthlyBills.reduce((sum, b) => sum + (Number(b.grandTotal) || 0), 0);

    const lowStockProducts = products.filter(p => Number(p.stock) <= Number(p.minimumStock));

    // 2. Update KPI Cards
    const cards = document.querySelectorAll(".dashboard-cards .dashboard-card");
    if (cards.length >= 6) {
        // Card 1: Today's Sales
        const salesH2 = cards[0].querySelector(".card-details h2");
        if (salesH2) salesH2.textContent = typeof formatCurrency === "function" ? formatCurrency(todaysSales) : "₹" + todaysSales.toLocaleString("en-IN");

        // Card 2: Total Products
        const prodH2 = cards[1].querySelector(".card-details h2");
        if (prodH2) prodH2.textContent = products.length;

        // Card 3: Employees
        const empH2 = cards[2].querySelector(".card-details h2");
        if (empH2) empH2.textContent = employees.length;

        // Card 4: Today's Bills
        const billsH2 = cards[3].querySelector(".card-details h2");
        if (billsH2) billsH2.textContent = todaysBills.length;

        // Card 5: Low Stock
        const lowH2 = cards[4].querySelector(".card-details h2");
        if (lowH2) lowH2.textContent = lowStockProducts.length;

        // Card 6: Monthly Revenue
        const revH2 = cards[5].querySelector(".card-details h2");
        if (revH2) {
            if (monthlySales >= 100000) {
                revH2.textContent = "₹" + (monthlySales / 100000).toFixed(2) + "L";
            } else {
                revH2.textContent = typeof formatCurrency === "function" ? formatCurrency(monthlySales) : "₹" + monthlySales.toLocaleString("en-IN");
            }
        }
    }

    // 3. Populate Low Stock Products Panel
    const stockList = document.querySelector(".stock-list");
    if (stockList) {
        stockList.innerHTML = "";
        if (lowStockProducts.length === 0) {
            stockList.innerHTML = `
                <div class="stock-item" style="padding: 15px; text-align: center; color: #10b981; font-weight: 500;">
                    ✓ All inventory stocks are healthy!
                </div>
            `;
        } else {
            lowStockProducts.slice(0, 6).forEach(product => {
                const stockQty = Number(product.stock) || 0;
                const isOutOfStock = stockQty <= 0;
                const itemDiv = document.createElement("div");
                itemDiv.className = "stock-item";
                itemDiv.innerHTML = `
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-weight:600;">${product.name}</span>
                        <small style="color:#6b7280; font-size:12px;">Min Required: ${product.minimumStock}</small>
                    </div>
                    <strong style="color: ${isOutOfStock ? '#ef4444' : '#f59e0b'};">
                        ${isOutOfStock ? 'Out of Stock' : stockQty + ' left'}
                    </strong>
                `;
                stockList.appendChild(itemDiv);
            });
        }
    }

    // Connect View All link in Low Stock header to inventory.html
    const lowStockPanelLink = document.querySelector(".dashboard-panel:nth-child(2) .panel-header a");
    if (lowStockPanelLink) {
        lowStockPanelLink.href = "inventory.html";
    }

    // 4. Populate Sales Overview / Recent Transactions
    const chartOrSalesPanel = document.querySelector(".dashboard-panel:first-child");
    if (chartOrSalesPanel) {
        let contentArea = chartOrSalesPanel.querySelector(".chart-placeholder, .sales-content");
        if (contentArea) {
            const recentBills = bills.slice(-5).reverse();
            if (recentBills.length === 0) {
                contentArea.innerHTML = `
                    <div style="padding: 30px; text-align: center; color: #6b7280;">
                        No recent sales recorded today.
                    </div>
                `;
            } else {
                let html = `
                    <div style="width: 100%; overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">
                            <thead>
                                <tr style="border-bottom: 2px solid #e5e7eb; color: #4b5563;">
                                    <th style="padding: 10px 8px;">Invoice</th>
                                    <th style="padding: 10px 8px;">Customer</th>
                                    <th style="padding: 10px 8px;">Amount</th>
                                    <th style="padding: 10px 8px;">Payment</th>
                                    <th style="padding: 10px 8px;">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                recentBills.forEach(b => {
                    const statusClass = (b.paymentStatus || "Paid").toLowerCase() === "paid" ? "active" : "partial";
                    const formattedTotal = typeof formatCurrency === "function" ? formatCurrency(b.grandTotal) : "₹" + b.grandTotal;
                    html += `
                        <tr style="border-bottom: 1px solid #f3f4f6;">
                            <td style="padding: 10px 8px; font-weight: 600;">${escapeHtml(b.id || b.billNumber || "")}</td>
                            <td style="padding: 10px 8px;">${escapeHtml(b.customerName || "Walk-in")}</td>
                            <td style="padding: 10px 8px; font-weight: 600;">${formattedTotal}</td>
                            <td style="padding: 10px 8px;"><span class="status ${statusClass}">${escapeHtml(b.paymentStatus || "Paid")}</span></td>
                            <td style="padding: 10px 8px;">
                                <a href="bill-details.html?id=${b.id}" style="color: #2563eb; font-weight: 500;">View</a>
                            </td>
                        </tr>
                    `;
                });
                html += `
                            </tbody>
                        </table>
                    </div>
                `;
                contentArea.innerHTML = html;
            }
        }
    }
}

document.addEventListener("DOMContentLoaded", function () {
    initializeDashboard();
});
