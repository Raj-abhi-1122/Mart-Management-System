/* =========================================================
   MART MANAGEMENT SYSTEM
   ATTENDANCE & LEAVE MANAGEMENT MODULE
   ========================================================= */

function getAttendance() {
    return Storage.get(STORAGE_KEYS.ATTENDANCE, []);
}

function saveAttendance(records) {
    return Storage.set(STORAGE_KEYS.ATTENDANCE, records);
}

function getLeaves() {
    return Storage.get(STORAGE_KEYS.LEAVES, []);
}

function saveLeaves(leaves) {
    return Storage.set(STORAGE_KEYS.LEAVES, leaves);
}

/* =========================================================
   1. DAILY ATTENDANCE PAGE (attendance.html)
   ========================================================= */
function initializeDailyAttendancePage() {
    const tableBody = document.getElementById("attendanceTableBody");
    if (!tableBody) return;

    const employees = Storage.get(STORAGE_KEYS.EMPLOYEES, []);
    let attendanceRecords = getAttendance();

    const datePicker = document.getElementById("attendanceDate");
    const searchInput = document.getElementById("employeeSearch");
    const statusFilter = document.getElementById("statusFilter");
    const resetBtn = document.getElementById("resetFilterBtn");
    const selectedDateText = document.getElementById("selectedDateText");

    const today = typeof getToday === "function" ? getToday() : new Date().toISOString().split("T")[0];
    if (datePicker) {
        datePicker.value = today;
    }

    function renderAttendance() {
        const selectedDate = datePicker ? datePicker.value : today;
        if (selectedDateText) {
            selectedDateText.textContent = `Attendance records for ${typeof formatDate === "function" ? formatDate(selectedDate) : selectedDate}`;
        }

        // Get or populate daily records for all active employees
        const dateRecords = attendanceRecords.filter(r => r.date === selectedDate);

        // Calculate card counts
        const totalEmp = employees.filter(e => (e.status || "Active").toLowerCase() !== "inactive").length;
        const present = dateRecords.filter(r => r.status === "Present").length;
        const absent = dateRecords.filter(r => r.status === "Absent").length;
        const leave = dateRecords.filter(r => r.status === "Leave").length;
        const halfDay = dateRecords.filter(r => r.status === "Half Day").length;

        const totalEl = document.getElementById("totalEmployees");
        const presEl = document.getElementById("presentCount");
        const absEl = document.getElementById("absentCount");
        const leaveEl = document.getElementById("leaveCount");
        const halfEl = document.getElementById("halfDayCount");

        if (totalEl) totalEl.textContent = totalEmp;
        if (presEl) presEl.textContent = present;
        if (absEl) absEl.textContent = absent;
        if (leaveEl) leaveEl.textContent = leave;
        if (halfEl) halfEl.textContent = halfDay;

        // Render table
        tableBody.innerHTML = "";

        const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
        const statFilterVal = statusFilter ? statusFilter.value : "all";

        employees.forEach(emp => {
            if ((emp.status || "Active").toLowerCase() === "inactive") return;

            const name = String(emp.name || "").toLowerCase();
            const id = String(emp.id || "").toLowerCase();
            if (query && !name.includes(query) && !id.includes(query)) return;

            let record = dateRecords.find(r => r.employeeId === emp.id);
            const currentStatus = record ? record.status : "Unmarked";

            if (statFilterVal !== "all" && currentStatus.toLowerCase() !== statFilterVal.toLowerCase()) {
                return;
            }

            const tr = document.createElement("tr");
            const checkIn = record?.checkIn || "--:--";
            const checkOut = record?.checkOut || "--:--";
            const workingHours = record?.workingHours || "-";

            let statusColor = "#6b7280";
            if (currentStatus === "Present") statusColor = "#10b981";
            else if (currentStatus === "Absent") statusColor = "#ef4444";
            else if (currentStatus === "Leave") statusColor = "#f59e0b";
            else if (currentStatus === "Half Day") statusColor = "#8b5cf6";

            tr.innerHTML = `
                <td>
                    <strong>${emp.name}</strong>
                </td>
                <td style="font-weight:600;">${emp.id}</td>
                <td>${emp.position || "Staff"}</td>
                <td>${checkIn}</td>
                <td>${checkOut}</td>
                <td>${workingHours}</td>
                <td>
                    <span style="background:${statusColor}22; color:${statusColor}; font-weight:600; padding:4px 8px; border-radius:4px; font-size:12px;">
                        ${currentStatus}
                    </span>
                </td>
                <td>
                    <button class="action-btn set-status-btn" data-emp="${emp.id}" data-status="Present" style="color:#10b981; border-color:#10b981; padding:2px 6px;">P</button>
                    <button class="action-btn set-status-btn" data-emp="${emp.id}" data-status="Absent" style="color:#ef4444; border-color:#ef4444; padding:2px 6px;">A</button>
                    <button class="action-btn set-status-btn" data-emp="${emp.id}" data-status="Half Day" style="color:#8b5cf6; border-color:#8b5cf6; padding:2px 6px;">HD</button>
                    <button class="action-btn set-status-btn" data-emp="${emp.id}" data-status="Leave" style="color:#f59e0b; border-color:#f59e0b; padding:2px 6px;">L</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        // Attach Quick Status Buttons
        tableBody.querySelectorAll(".set-status-btn").forEach(btn => {
            btn.addEventListener("click", function () {
                const empId = this.getAttribute("data-emp");
                const newStatus = this.getAttribute("data-status");
                const selectedDate = datePicker ? datePicker.value : today;
                const emp = employees.find(e => e.id === empId);

                let recordIndex = attendanceRecords.findIndex(r => r.date === selectedDate && r.employeeId === empId);

                let checkIn = "09:00 AM";
                let checkOut = "06:00 PM";
                let hours = "9h 00m";

                if (newStatus === "Absent" || newStatus === "Leave") {
                    checkIn = "-";
                    checkOut = "-";
                    hours = "0h 00m";
                } else if (newStatus === "Half Day") {
                    checkIn = "09:00 AM";
                    checkOut = "01:30 PM";
                    hours = "4h 30m";
                }

                const recordData = {
                    id: `ATT-${selectedDate}-${empId}`,
                    date: selectedDate,
                    employeeId: empId,
                    employeeName: emp ? emp.name : "Employee",
                    position: emp ? emp.position : "Staff",
                    checkIn: checkIn,
                    checkOut: checkOut,
                    workingHours: hours,
                    status: newStatus
                };

                if (recordIndex !== -1) {
                    attendanceRecords[recordIndex] = recordData;
                } else {
                    attendanceRecords.push(recordData);
                }

                saveAttendance(attendanceRecords);
                renderAttendance();
            });
        });
    }

    renderAttendance();

    if (datePicker) datePicker.addEventListener("change", renderAttendance);
    if (searchInput) searchInput.addEventListener("input", renderAttendance);
    if (statusFilter) statusFilter.addEventListener("change", renderAttendance);
    if (resetBtn) {
        resetBtn.addEventListener("click", function () {
            if (datePicker) datePicker.value = today;
            if (searchInput) searchInput.value = "";
            if (statusFilter) statusFilter.value = "all";
            renderAttendance();
        });
    }

    const exportBtn = document.getElementById("exportBtn");
    if (exportBtn) {
        exportBtn.addEventListener("click", function () {
            window.print();
        });
    }
}

/* =========================================================
   2. LEAVE MANAGEMENT PAGE (leave-management.html)
   ========================================================= */
function initializeLeaveManagementPage() {
    const tableBody = document.querySelector(".leave-table tbody") || document.querySelector(".table-container table tbody");
    if (!tableBody) return;

    let leaves = getLeaves();
    const employees = Storage.get(STORAGE_KEYS.EMPLOYEES, []);
    const today = typeof getToday === "function" ? getToday() : new Date().toISOString().split("T")[0];

    // Seed sample leaves if none
    if (leaves.length === 0 && employees.length > 0) {
        leaves = [
            {
                id: "LEV-101",
                employeeId: employees[0].id,
                employeeName: employees[0].name,
                leaveType: "Casual Leave",
                fromDate: today,
                toDate: today,
                days: 1,
                reason: "Family function",
                status: "Pending",
                appliedOn: today
            }
        ];
        saveLeaves(leaves);
    }

    function renderLeaves() {
        tableBody.innerHTML = "";
        if (leaves.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; padding:25px; color:#6b7280;">
                        No pending leave requests found.
                    </td>
                </tr>
            `;
            return;
        }

        leaves.forEach(lev => {
            const tr = document.createElement("tr");
            const statusClass = lev.status === "Approved" ? "active" : lev.status === "Rejected" ? "due" : "partial";

            tr.innerHTML = `
                <td style="font-weight:600;">${lev.employeeName}</td>
                <td>${lev.leaveType}</td>
                <td>${lev.fromDate}</td>
                <td>${lev.toDate}</td>
                <td>${lev.days} Days</td>
                <td>${lev.reason}</td>
                <td><span class="status ${statusClass}">${lev.status}</span></td>
                <td>
                    ${lev.status === "Pending" ? `
                        <button class="action-btn approve-leave-btn" data-id="${lev.id}" style="color:#10b981; border-color:#10b981; margin-right:4px;">Approve</button>
                        <button class="action-btn reject-leave-btn" data-id="${lev.id}" style="color:#ef4444; border-color:#ef4444;">Reject</button>
                    ` : `<span style="color:#6b7280; font-size:12px;">Completed</span>`}
                </td>
            `;
            tableBody.appendChild(tr);
        });

        tableBody.querySelectorAll(".approve-leave-btn").forEach(btn => {
            btn.addEventListener("click", function() {
                const id = this.getAttribute("data-id");
                const item = leaves.find(l => l.id === id);
                if (item) {
                    item.status = "Approved";
                    saveLeaves(leaves);
                    renderLeaves();
                }
            });
        });

        tableBody.querySelectorAll(".reject-leave-btn").forEach(btn => {
            btn.addEventListener("click", function() {
                const id = this.getAttribute("data-id");
                const item = leaves.find(l => l.id === id);
                if (item) {
                    item.status = "Rejected";
                    saveLeaves(leaves);
                    renderLeaves();
                }
            });
        });
    }

    renderLeaves();
}

/* =========================================================
   ROUTER INITIALIZATION
   ========================================================= */
document.addEventListener("DOMContentLoaded", function () {
    const path = window.location.pathname;

    if (path.includes("leave-management.html")) {
        initializeLeaveManagementPage();
    } else if (path.includes("attendance.html") || path.includes("employee-attendance.html") || path.includes("attendance-reports.html")) {
        initializeDailyAttendancePage();
    }
});
