/* =========================================================
   MART MANAGEMENT SYSTEM
   CUSTOMERS MODULE (LIST, ADD/EDIT, DETAILS)
   ========================================================= */

function getCustomers() {
    return Storage.get(STORAGE_KEYS.CUSTOMERS, []);
}

function saveCustomers(customers) {
    return Storage.set(STORAGE_KEYS.CUSTOMERS, customers);
}

/* =========================================================
   1. CUSTOMERS LIST PAGE (customers.html)
   ========================================================= */
function initializeCustomersListPage() {
    const tableBody = document.querySelector(".table-container table tbody");
    if (!tableBody) return;

    const customers = getCustomers();

    // Summary Cards
    const cards = document.querySelectorAll(".dashboard-cards .card");
    if (cards.length >= 4) {
        const totalCount = customers.length;
        const activeCount = customers.filter(c => c.status !== "Inactive").length;
        const totalPurchases = customers.reduce((sum, c) => sum + (Number(c.totalPurchases) || 0), 0);
        const totalDue = customers.reduce((sum, c) => sum + (Number(c.amountDue) || 0), 0);

        const c0P = cards[0].querySelector("p");
        if (c0P) c0P.textContent = totalCount;

        const c1P = cards[1].querySelector("p");
        if (c1P) c1P.textContent = activeCount;

        const c2P = cards[2].querySelector("p");
        if (c2P) c2P.textContent = typeof formatCurrency === "function" ? formatCurrency(totalPurchases) : "₹" + totalPurchases;

        const c3P = cards[3].querySelector("p");
        if (c3P) c3P.textContent = typeof formatCurrency === "function" ? formatCurrency(totalDue) : "₹" + totalDue;
    }

    function renderCustomers(filterList = null) {
        const list = filterList !== null ? filterList : customers;
        tableBody.innerHTML = "";

        if (list.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 30px; color: #6b7280;">
                        No customers found. Click "+ Add Customer" to add one.
                    </td>
                </tr>
            `;
            return;
        }

        list.forEach(cust => {
            const tr = document.createElement("tr");
            const statusClass = (cust.status || "Active").toLowerCase() === "active" ? "active" : "inactive";
            const formattedPurchases = typeof formatCurrency === "function" ? formatCurrency(cust.totalPurchases) : "₹" + (cust.totalPurchases || 0);
            const formattedDue = typeof formatCurrency === "function" ? formatCurrency(cust.amountDue) : "₹" + (cust.amountDue || 0);
            const lastDate = cust.lastPurchaseDate || cust.createdAt || "-";

            tr.innerHTML = `
                <td style="font-weight: 600;">${cust.id}</td>
                <td>${cust.name}</td>
                <td>${cust.phone || "-"}</td>
                <td>${cust.email || "-"}</td>
                <td style="font-weight: 600;">${formattedPurchases}</td>
                <td style="color: ${Number(cust.amountDue) > 0 ? '#ef4444' : '#6b7280'}; font-weight: 600;">${formattedDue}</td>
                <td>${typeof formatDate === "function" && lastDate !== "-" ? formatDate(lastDate) : lastDate}</td>
                <td>
                    <span class="status ${statusClass}">${cust.status || "Active"}</span>
                </td>
                <td>
                    <a href="customer-details.html?id=${cust.id}" class="action-btn" style="text-decoration:none; display:inline-block; margin-right:4px;">
                        View
                    </a>
                    <a href="add-customer.html?id=${cust.id}" class="action-btn" style="text-decoration:none; display:inline-block; margin-right:4px;">
                        Edit
                    </a>
                    <button class="action-btn delete-cust-btn" data-id="${cust.id}" style="color: #ef4444; border-color: #ef4444;">
                        Delete
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        // Delete button listener
        tableBody.querySelectorAll(".delete-cust-btn").forEach(btn => {
            btn.addEventListener("click", function() {
                const id = this.getAttribute("data-id");
                if (confirm("Are you sure you want to delete this customer?")) {
                    const updated = customers.filter(c => c.id !== id);
                    saveCustomers(updated);
                    if (typeof logActivity === "function") {
                        logActivity("Customer Deleted", "Customers", `Deleted customer ID: ${id}`);
                    }
                    initializeCustomersListPage();
                }
            });
        });
    }

    renderCustomers();

    // Filters
    const searchInput = document.querySelector(".customer-filter .search-input");
    const statusSelect = document.querySelectorAll(".customer-filter .filter-select")[0];
    const sortSelect = document.querySelectorAll(".customer-filter .filter-select")[1];

    function applyFilters() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
        const statusFilter = statusSelect ? statusSelect.value : "All Customers";
        const sortBy = sortSelect ? sortSelect.value : "Sort By";

        let filtered = customers.filter(c => {
            const name = String(c.name || "").toLowerCase();
            const phone = String(c.phone || "").toLowerCase();
            const id = String(c.id || "").toLowerCase();
            const matchesSearch = !query || name.includes(query) || phone.includes(query) || id.includes(query);

            let matchesStatus = true;
            if (statusFilter && statusFilter !== "All Customers") {
                matchesStatus = (c.status || "Active").toLowerCase() === statusFilter.toLowerCase();
            }

            return matchesSearch && matchesStatus;
        });

        // Sorting
        if (sortBy === "Name") {
            filtered.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortBy === "Total Purchases") {
            filtered.sort((a, b) => (Number(b.totalPurchases) || 0) - (Number(a.totalPurchases) || 0));
        } else if (sortBy === "Amount Due") {
            filtered.sort((a, b) => (Number(b.amountDue) || 0) - (Number(a.amountDue) || 0));
        }

        renderCustomers(filtered);
    }

    if (searchInput) searchInput.addEventListener("input", applyFilters);
    if (statusSelect) statusSelect.addEventListener("change", applyFilters);
    if (sortSelect) sortSelect.addEventListener("change", applyFilters);
}

/* =========================================================
   2. ADD / EDIT CUSTOMER PAGE (add-customer.html)
   ========================================================= */
function initializeAddCustomerPage() {
    const form = document.querySelector(".customer-form");
    if (!form) return;

    const customers = getCustomers();
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get("id");

    const inputs = form.querySelectorAll("input");
    const selects = form.querySelectorAll("select");
    const textarea = form.querySelector("textarea");

    // Mapping inputs by position in form
    const idInput = inputs[0];
    const nameInput = inputs[1];
    const phoneInput = inputs[2];
    const emailInput = inputs[3];
    const dobInput = inputs[4];
    const statusSelect = selects[0];
    const addressInput = inputs[5];
    const cityInput = inputs[6];
    const stateInput = inputs[7];
    const pinInput = inputs[8];
    const openingDueInput = inputs[9];
    const creditLimitInput = inputs[10];
    const paymentTermsSelect = selects[1];
    const customerTypeSelect = selects[2];
    const notesInput = textarea;

    let editingCustomer = null;

    if (editId) {
        editingCustomer = customers.find(c => c.id === editId);
        if (editingCustomer) {
            const headerH1 = document.querySelector(".page-header h1");
            if (headerH1) headerH1.textContent = "Edit Customer";

            if (idInput) {
                idInput.value = editingCustomer.id;
                idInput.readOnly = true;
            }
            if (nameInput) nameInput.value = editingCustomer.name || "";
            if (phoneInput) phoneInput.value = editingCustomer.phone || "";
            if (emailInput) emailInput.value = editingCustomer.email || "";
            if (dobInput) dobInput.value = editingCustomer.dob || "";
            if (statusSelect) statusSelect.value = editingCustomer.status || "Active";
            if (addressInput) addressInput.value = editingCustomer.address || "";
            if (cityInput) cityInput.value = editingCustomer.city || "";
            if (stateInput) stateInput.value = editingCustomer.state || "";
            if (pinInput) pinInput.value = editingCustomer.pinCode || "";
            if (openingDueInput) openingDueInput.value = editingCustomer.amountDue || 0;
            if (creditLimitInput) creditLimitInput.value = editingCustomer.creditLimit || 0;
            if (paymentTermsSelect) paymentTermsSelect.value = editingCustomer.paymentTerms || "Cash Only";
            if (customerTypeSelect) customerTypeSelect.value = editingCustomer.customerType || "Regular Customer";
            if (notesInput) notesInput.value = editingCustomer.notes || "";
        }
    } else {
        // Auto-generate customer ID
        if (idInput) {
            const nextIdNum = 101 + customers.length;
            idInput.value = `CUS-${nextIdNum}`;
        }
    }

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const name = nameInput ? nameInput.value.trim() : "";
        const phone = phoneInput ? phoneInput.value.trim() : "";

        if (!name) {
            alert("Customer Name is required.");
            if (nameInput) nameInput.focus();
            return;
        }

        if (!phone) {
            alert("Phone Number is required.");
            if (phoneInput) phoneInput.focus();
            return;
        }

        const id = idInput ? idInput.value.trim() : `CUS-${Date.now()}`;

        // Check duplicate phone if new
        if (!editingCustomer && customers.some(c => c.phone === phone)) {
            if (!confirm(`A customer with phone number ${phone} already exists. Do you still want to proceed?`)) {
                return;
            }
        }

        const customerData = {
            id: id,
            name: name,
            phone: phone,
            email: emailInput ? emailInput.value.trim() : "",
            dob: dobInput ? dobInput.value : "",
            status: statusSelect ? statusSelect.value : "Active",
            address: addressInput ? addressInput.value.trim() : "",
            city: cityInput ? cityInput.value.trim() : "",
            state: stateInput ? stateInput.value.trim() : "",
            pinCode: pinInput ? pinInput.value.trim() : "",
            amountDue: openingDueInput ? (Number(openingDueInput.value) || 0) : 0,
            creditLimit: creditLimitInput ? (Number(creditLimitInput.value) || 0) : 0,
            paymentTerms: paymentTermsSelect ? paymentTermsSelect.value : "Cash Only",
            customerType: customerTypeSelect ? customerTypeSelect.value : "Regular Customer",
            notes: notesInput ? notesInput.value.trim() : "",
            totalPurchases: editingCustomer ? (editingCustomer.totalPurchases || 0) : 0,
            amountPaid: editingCustomer ? (editingCustomer.amountPaid || 0) : 0,
            createdAt: editingCustomer ? editingCustomer.createdAt : (typeof getToday === "function" ? getToday() : new Date().toISOString().split("T")[0])
        };

        if (editingCustomer) {
            const index = customers.findIndex(c => c.id === editingCustomer.id);
            if (index !== -1) {
                customers[index] = customerData;
            }
        } else {
            customers.push(customerData);
        }

        saveCustomers(customers);

        if (typeof logActivity === "function") {
            logActivity(editingCustomer ? "Customer Updated" : "Customer Added", "Customers", `${editingCustomer ? "Updated" : "Added"} customer ${name} (${id}).`);
        }

        alert(`✓ Customer ${name} saved successfully.`);
        window.location.href = "customers.html";
    });
}

/* =========================================================
   3. CUSTOMER DETAILS PAGE (customer-details.html)
   ========================================================= */
function initializeCustomerDetailsPage() {
    const profileSection = document.querySelector(".customer-profile");
    if (!profileSection) return;

    const urlParams = new URLSearchParams(window.location.search);
    const customerId = urlParams.get("id");

    const customers = getCustomers();
    const bills = Storage.get(STORAGE_KEYS.BILLS, []);

    const customer = customers.find(c => c.id === customerId) || customers[0];

    if (!customer) {
        profileSection.innerHTML = `<div style="padding: 30px; text-align: center;">No customer found.</div>`;
        return;
    }

    // 1. Profile header
    const nameH2 = profileSection.querySelector(".profile-info h2");
    if (nameH2) nameH2.textContent = customer.name;

    const profilePList = profileSection.querySelectorAll(".profile-info p");
    if (profilePList.length >= 3) {
        profilePList[0].innerHTML = `Customer ID: <strong>${escapeHtml(customer.id)}</strong>`;
        profilePList[1].innerHTML = `📞 ${customer.phone || "N/A"}`;
        profilePList[2].innerHTML = `✉️ ${customer.email || "N/A"}`;
    }

    const statusBadge = profileSection.querySelector(".customer-status");
    if (statusBadge) {
        statusBadge.textContent = customer.status || "Active";
        statusBadge.className = `customer-status ${(customer.status || "Active").toLowerCase() === "active" ? "active" : "inactive"}`;
    }

    // 2. Summary cards
    const custBills = bills.filter(b => b.customerId === customer.id || b.customerPhone === customer.phone);
    const calculatedPurchases = custBills.length > 0 ? custBills.reduce((sum, b) => sum + (Number(b.grandTotal) || 0), 0) : (Number(customer.totalPurchases) || 0);
    const calculatedPaid = custBills.length > 0 ? custBills.reduce((sum, b) => sum + (Number(b.paidAmount) || 0), 0) : (Number(customer.amountPaid) || 0);
    const calculatedDue = custBills.length > 0 ? custBills.reduce((sum, b) => sum + (Number(b.dueAmount) || 0), 0) : (Number(customer.amountDue) || 0);

    const sumCards = document.querySelectorAll(".customer-summary .customer-summary-card");
    if (sumCards.length >= 4) {
        sumCards[0].querySelector("h2").textContent = typeof formatCurrency === "function" ? formatCurrency(calculatedPurchases) : "₹" + calculatedPurchases;
        sumCards[1].querySelector("h2").textContent = custBills.length;
        sumCards[2].querySelector("h2").textContent = typeof formatCurrency === "function" ? formatCurrency(calculatedPaid) : "₹" + calculatedPaid;
        sumCards[3].querySelector("h2").textContent = typeof formatCurrency === "function" ? formatCurrency(calculatedDue) : "₹" + calculatedDue;
    }

    // 3. Information Grid
    const infoItems = document.querySelectorAll(".info-grid .info-item");
    infoItems.forEach(item => {
        const label = item.querySelector("label")?.textContent?.trim();
        const span = item.querySelector("span");
        if (!span) return;

        if (label === "Customer ID") span.textContent = customer.id;
        if (label === "Customer Name") span.textContent = customer.name;
        if (label === "Phone") span.textContent = customer.phone || "-";
        if (label === "Email") span.textContent = customer.email || "-";
        if (label === "Address") span.textContent = customer.address || "-";
        if (label === "City") span.textContent = customer.city || "-";
        if (label === "State") span.textContent = customer.state || "-";
        if (label === "PIN Code") span.textContent = customer.pinCode || "-";
        if (label === "Customer Type") span.textContent = customer.customerType || "Regular";
        if (label === "Payment Terms") span.textContent = customer.paymentTerms || "Cash Only";
    });

    // 4. Bill History Table
    const tableBody = document.querySelector(".history-section table tbody");
    if (tableBody) {
        tableBody.innerHTML = "";
        if (custBills.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 25px; color: #6b7280;">
                        No bills recorded for this customer yet.
                    </td>
                </tr>
            `;
        } else {
            custBills.forEach(b => {
                const tr = document.createElement("tr");
                const status = b.paymentStatus || "Paid";
                const statusClass = status.toLowerCase() === "paid" ? "active" : "partial";
                const itemCount = Array.isArray(b.items) ? b.items.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0) : 1;

                tr.innerHTML = `
                    <td style="font-weight: 600;">${b.id || b.billNumber}</td>
                    <td>${typeof formatDate === "function" ? formatDate(b.billDate) : b.billDate}</td>
                    <td>${itemCount}</td>
                    <td style="font-weight: 600;">₹${Number(b.grandTotal).toFixed(2)}</td>
                    <td style="color: #10b981;">₹${Number(b.paidAmount).toFixed(2)}</td>
                    <td style="color: ${Number(b.dueAmount) > 0 ? '#ef4444' : '#6b7280'};">₹${Number(b.dueAmount).toFixed(2)}</td>
                    <td><span class="status ${statusClass}">${status}</span></td>
                    <td>
                        <a href="bill-details.html?id=${b.id || b.billNumber}" class="action-btn" style="text-decoration:none;">
                            View
                        </a>
                    </td>
                `;
                tableBody.appendChild(tr);
            });
        }
    }
}

/* =========================================================
   INITIALIZATION ROUTER
   ========================================================= */
document.addEventListener("DOMContentLoaded", function () {
    const path = window.location.pathname;

    if (path.includes("add-customer.html")) {
        initializeAddCustomerPage();
    } else if (path.includes("customer-details.html")) {
        initializeCustomerDetailsPage();
    } else if (path.includes("customers.html")) {
        initializeCustomersListPage();
    }
});
