/* =========================================================
   MART MANAGEMENT SYSTEM
   EMPLOYEES & PAYROLL MODULE
   ========================================================= */

function getEmployees() {
    return Storage.get(STORAGE_KEYS.EMPLOYEES, []);
}

function saveEmployees(employees) {
    return Storage.set(STORAGE_KEYS.EMPLOYEES, employees);
}

/* =========================================================
   1. EMPLOYEES LIST PAGE (employees.html)
   ========================================================= */
function initializeEmployeesListPage() {
    const tableBody = document.querySelector(".employee-table tbody") || document.querySelector(".table-container table tbody");
    if (!tableBody) return;

    const employees = getEmployees();

    // Summary Cards
    const cards = document.querySelectorAll(".employee-summary-grid .employee-card, .dashboard-cards .card, .dashboard-cards .employee-card");
    if (cards.length >= 4) {
        const total = employees.length;
        const active = employees.filter(e => (e.status || "Active").toLowerCase() === "active").length;
        const onLeave = employees.filter(e => (e.status || "").toLowerCase().includes("leave")).length;
        const totalPayroll = employees.reduce((sum, e) => sum + (Number(e.salary) || 0), 0);

        const c0H2 = cards[0].querySelector("h2");
        if (c0H2) c0H2.textContent = total;

        const c1H2 = cards[1].querySelector("h2");
        if (c1H2) c1H2.textContent = active;

        const c2H2 = cards[2].querySelector("h2");
        if (c2H2) c2H2.textContent = onLeave;

        const c3H2 = cards[3].querySelector("h2");
        if (c3H2) {
            if (totalPayroll >= 100000) {
                c3H2.textContent = "₹" + (totalPayroll / 100000).toFixed(2) + "L";
            } else {
                c3H2.textContent = typeof formatCurrency === "function" ? formatCurrency(totalPayroll) : "₹" + totalPayroll;
            }
        }
    }

    function renderEmployees(filterList = null) {
        const list = filterList !== null ? filterList : employees;
        tableBody.innerHTML = "";

        if (list.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 30px; color: #6b7280;">
                        No employees found matching criteria.
                    </td>
                </tr>
            `;
            return;
        }

        list.forEach(emp => {
            const tr = document.createElement("tr");
            const initials = emp.name ? emp.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() : "EM";
            const status = emp.status || "Active";
            const statusClass = status.toLowerCase() === "active" ? "active" : status.toLowerCase().includes("leave") ? "partial" : "inactive";
            const formattedSalary = typeof formatCurrency === "function" ? formatCurrency(emp.salary) : "₹" + emp.salary;
            const joinFormatted = typeof formatDate === "function" && emp.joinDate ? formatDate(emp.joinDate) : (emp.joinDate || "-");

            tr.innerHTML = `
                <td>
                    <div class="employee-name-cell" style="display:flex; align-items:center; gap:10px;">
                        <div class="employee-avatar" style="width:36px; height:36px; border-radius:50%; background:#3b82f6; color:white; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:13px;">
                            ${initials}
                        </div>
                        <div>
                            <strong>${emp.name}</strong><br>
                            <span style="font-size:12px; color:#6b7280;">${emp.id}</span>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="contact-cell">
                        <span>${emp.phone || "-"}</span><br>
                        <small style="color:#6b7280;">${emp.email || "-"}</small>
                    </div>
                </td>
                <td>
                    <span class="position-badge" style="background:#e0f2fe; color:#0369a1; padding:4px 8px; border-radius:4px; font-size:12px; font-weight:500;">
                        ${emp.position || "Staff"}
                    </span>
                </td>
                <td>${joinFormatted}</td>
                <td style="font-weight:600;">${formattedSalary}</td>
                <td>
                    <span class="status ${statusClass}">${status}</span>
                </td>
                <td>
                    <a href="employee-details.html?id=${emp.id}" class="action-btn" style="text-decoration:none; margin-right:4px;">
                        View
                    </a>
                    <a href="add-employee.html?id=${emp.id}" class="action-btn" style="text-decoration:none; margin-right:4px;">
                        Edit
                    </a>
                    <button class="action-btn delete-emp-btn" data-id="${emp.id}" style="color:#ef4444; border-color:#ef4444;">
                        Delete
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        tableBody.querySelectorAll(".delete-emp-btn").forEach(btn => {
            btn.addEventListener("click", function () {
                const id = this.getAttribute("data-id");
                if (confirm("Are you sure you want to remove this employee record?")) {
                    const updated = employees.filter(e => e.id !== id);
                    saveEmployees(updated);
                    if (typeof logActivity === "function") {
                        logActivity("Employee Removed", "Employees", `Removed employee record ID ${id}`);
                    }
                    initializeEmployeesListPage();
                }
            });
        });
    }

    renderEmployees();

    // Filters
    const searchInput = document.querySelector(".employee-search input");
    const positionSelect = document.querySelectorAll(".employee-filter select")[0];
    const statusSelect = document.querySelectorAll(".employee-filter select")[1];

    function applyFilters() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
        const posFilter = positionSelect ? positionSelect.value : "All Positions";
        const statFilter = statusSelect ? statusSelect.value : "All Status";

        const filtered = employees.filter(e => {
            const name = String(e.name || "").toLowerCase();
            const id = String(e.id || "").toLowerCase();
            const phone = String(e.phone || "").toLowerCase();
            const matchesSearch = !query || name.includes(query) || id.includes(query) || phone.includes(query);

            let matchesPos = true;
            if (posFilter && posFilter !== "All Positions") {
                matchesPos = (e.position || "").toLowerCase() === posFilter.toLowerCase();
            }

            let matchesStat = true;
            if (statFilter && statFilter !== "All Status") {
                matchesStat = (e.status || "Active").toLowerCase() === statFilter.toLowerCase();
            }

            return matchesSearch && matchesPos && matchesStat;
        });

        renderEmployees(filtered);
    }

    if (searchInput) searchInput.addEventListener("input", applyFilters);
    if (positionSelect) positionSelect.addEventListener("change", applyFilters);
    if (statusSelect) statusSelect.addEventListener("change", applyFilters);
}

/* =========================================================
   2. ADD / EDIT EMPLOYEE PAGE (add-employee.html)
   ========================================================= */
function initializeAddEmployeePage() {
    const form = document.querySelector(".employee-form") || document.querySelector("form");
    if (!form) return;

    const employees = getEmployees();
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get("id");

    const idInput = document.getElementById("employeeId");
    const nameInput = document.getElementById("employeeName");
    const dobInput = document.getElementById("dob");
    const genderSelect = document.getElementById("gender");
    const phoneInput = document.getElementById("phone");
    const emailInput = document.getElementById("email");
    const addressInput = document.getElementById("address");
    const cityInput = document.getElementById("city");
    const stateInput = document.getElementById("state");
    const pinInput = document.getElementById("pin");
    const positionSelect = document.getElementById("position");
    const joiningDateInput = document.getElementById("joiningDate");
    const employeeStatusSelect = document.getElementById("employeeStatus");
    const employeeTypeSelect = document.getElementById("employeeType");
    const salaryInput = document.getElementById("salary");
    const paymentMethodSelect = document.getElementById("paymentMethod");

    let editingEmployee = null;

    if (editId) {
        editingEmployee = employees.find(e => e.id === editId);
        if (editingEmployee) {
            const headerH1 = document.querySelector(".page-header h1");
            if (headerH1) headerH1.textContent = "Edit Employee";

            if (idInput) {
                idInput.value = editingEmployee.id;
                idInput.readOnly = true;
            }
            if (nameInput) nameInput.value = editingEmployee.name || "";
            if (dobInput) dobInput.value = editingEmployee.dob || "";
            if (genderSelect) genderSelect.value = editingEmployee.gender || "Male";
            if (phoneInput) phoneInput.value = editingEmployee.phone || "";
            if (emailInput) emailInput.value = editingEmployee.email || "";
            if (addressInput) addressInput.value = editingEmployee.address || "";
            if (cityInput) cityInput.value = editingEmployee.city || "";
            if (stateInput) stateInput.value = editingEmployee.state || "";
            if (pinInput) pinInput.value = editingEmployee.pinCode || "";
            if (positionSelect) positionSelect.value = editingEmployee.position || "Sales Executive";
            if (joiningDateInput) joiningDateInput.value = editingEmployee.joinDate || "";
            if (employeeStatusSelect) employeeStatusSelect.value = editingEmployee.status || "Active";
            if (employeeTypeSelect) employeeTypeSelect.value = editingEmployee.type || "Full Time";
            if (salaryInput) salaryInput.value = editingEmployee.salary || 0;
            if (paymentMethodSelect) paymentMethodSelect.value = editingEmployee.paymentMethod || "Bank Transfer";
        }
    } else {
        if (idInput) {
            const nextNum = employees.length + 1;
            idInput.value = `EMP-${String(nextNum).padStart(3, "0")}`;
        }
        if (joiningDateInput && !joiningDateInput.value) {
            joiningDateInput.value = typeof getToday === "function" ? getToday() : new Date().toISOString().split("T")[0];
        }
    }

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const name = nameInput ? nameInput.value.trim() : "";
        const phone = phoneInput ? phoneInput.value.trim() : "";
        const salary = salaryInput ? Number(salaryInput.value) : 0;

        if (!name) {
            alert("Please enter employee full name.");
            nameInput?.focus();
            return;
        }

        if (!phone) {
            alert("Please enter phone number.");
            phoneInput?.focus();
            return;
        }

        const id = idInput ? idInput.value.trim() : `EMP-${Date.now()}`;

        const empData = {
            id: id,
            name: name,
            dob: dobInput ? dobInput.value : "",
            gender: genderSelect ? genderSelect.value : "",
            phone: phone,
            email: emailInput ? emailInput.value.trim() : "",
            address: addressInput ? addressInput.value.trim() : "",
            city: cityInput ? cityInput.value.trim() : "",
            state: stateInput ? stateInput.value.trim() : "",
            pinCode: pinInput ? pinInput.value.trim() : "",
            position: positionSelect ? positionSelect.value : "Sales Executive",
            department: positionSelect ? positionSelect.value : "Sales",
            joinDate: joiningDateInput ? joiningDateInput.value : (typeof getToday === "function" ? getToday() : ""),
            status: employeeStatusSelect ? employeeStatusSelect.value : "Active",
            type: employeeTypeSelect ? employeeTypeSelect.value : "Full Time",
            salary: salary,
            paymentMethod: paymentMethodSelect ? paymentMethodSelect.value : "Bank Transfer"
        };

        if (editingEmployee) {
            const index = employees.findIndex(e => e.id === editingEmployee.id);
            if (index !== -1) {
                employees[index] = empData;
            }
        } else {
            employees.push(empData);
        }

        saveEmployees(employees);

        if (typeof logActivity === "function") {
            logActivity(editingEmployee ? "Employee Updated" : "Employee Added", "Employees", `${editingEmployee ? "Updated" : "Added"} employee ${name} (${id}).`);
        }

        alert(`✓ Employee ${name} saved successfully.`);
        window.location.href = "employees.html";
    });
}

/* =========================================================
   3. EMPLOYEE DETAILS PAGE (employee-details.html)
   ========================================================= */
function initializeEmployeeDetailsPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const empId = urlParams.get("id");

    const employees = getEmployees();
    const emp = employees.find(e => e.id === empId) || employees[0];

    if (!emp) return;

    // Header info
    const nameEl = document.querySelector(".employee-profile h2") || document.querySelector(".profile-info h2");
    if (nameEl) nameEl.textContent = emp.name;

    const idSpans = document.querySelectorAll(".profile-info p, .employee-profile p");
    if (idSpans.length > 0) {
        idSpans[0].innerHTML = `Employee ID: <strong>${emp.id}</strong> | Position: <strong>${emp.position}</strong>`;
    }

    // Grid details
    const items = document.querySelectorAll(".info-grid .info-item, .employee-detail-grid .detail-item");
    items.forEach(item => {
        const label = item.querySelector("label, span:first-child")?.textContent?.trim();
        const val = item.querySelector("span:last-child, strong, p");
        if (!val) return;

        if (label?.includes("Name")) val.textContent = emp.name;
        if (label?.includes("ID")) val.textContent = emp.id;
        if (label?.includes("Phone")) val.textContent = emp.phone || "-";
        if (label?.includes("Email")) val.textContent = emp.email || "-";
        if (label?.includes("Position")) val.textContent = emp.position || "-";
        if (label?.includes("Salary")) val.textContent = typeof formatCurrency === "function" ? formatCurrency(emp.salary) : "₹" + emp.salary;
        if (label?.includes("Joining")) val.textContent = typeof formatDate === "function" ? formatDate(emp.joinDate) : emp.joinDate;
        if (label?.includes("Status")) val.textContent = emp.status || "Active";
        if (label?.includes("Address")) val.textContent = emp.address || "-";
    });
}

/* =========================================================
   4. PAYROLL PAGE (payroll.html)
   ========================================================= */
function initializePayrollPage() {
    const tableBody = document.querySelector(".payroll-table tbody") || document.querySelector(".table-container table tbody");
    if (!tableBody) return;

    const employees = getEmployees();
    const totalPayroll = employees.reduce((sum, e) => sum + (Number(e.salary) || 0), 0);

    const sumCards = document.querySelectorAll(".summary-card, .dashboard-cards .card");
    if (sumCards.length >= 3) {
        const h2 = sumCards[0].querySelector("h2, p");
        if (h2) h2.textContent = typeof formatCurrency === "function" ? formatCurrency(totalPayroll) : "₹" + totalPayroll;
    }

    tableBody.innerHTML = "";
    employees.forEach(emp => {
        const tr = document.createElement("tr");
        const basic = Number(emp.salary) || 0;
        const allowances = 0;
        const deductions = 0;
        const net = basic + allowances - deductions;

        tr.innerHTML = `
            <td style="font-weight:600;">${emp.id}</td>
            <td>${emp.name}</td>
            <td>${emp.position || "Staff"}</td>
            <td>₹${basic.toFixed(2)}</td>
            <td>₹0.00</td>
            <td>₹0.00</td>
            <td style="font-weight:600; color:#10b981;">₹${net.toFixed(2)}</td>
            <td><span class="status active">Paid</span></td>
            <td>
                <button class="action-btn pay-slip-btn" onclick="window.print()">
                    Payslip
                </button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

/* =========================================================
   ROUTER INITIALIZATION
   ========================================================= */
document.addEventListener("DOMContentLoaded", function () {
    const path = window.location.pathname;

    if (path.includes("add-employee.html")) {
        initializeAddEmployeePage();
    } else if (path.includes("employee-details.html")) {
        initializeEmployeeDetailsPage();
    } else if (path.includes("payroll.html")) {
        initializePayrollPage();
    } else if (path.includes("employees.html")) {
        initializeEmployeesListPage();
    }
});
