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
    const modal = document.getElementById("attendanceModal");
    const employeeSelect = document.getElementById("modalEmployeeId");
    const modalDate = document.getElementById("modalDate");
    const modalStatus = document.getElementById("modalStatus");
    const modalCheckIn = document.getElementById("modalCheckIn");
    const modalCheckOut = document.getElementById("modalCheckOut");
    const modalLeaveType = document.getElementById("modalLeaveType");
    const modalNotes = document.getElementById("modalNotes");
    const modalTitle = document.getElementById("modalTitle");
    const modalEmployeeName = document.getElementById("modalEmployeeName");
    const attendanceForm = document.getElementById("attendanceForm");

    const today = typeof getToday === "function" ? getToday() : new Date().toISOString().split("T")[0];
    if (datePicker) {
        datePicker.value = today;
    }
    const requestedEmployeeId = new URLSearchParams(window.location.search).get("employeeId");
    if (requestedEmployeeId && searchInput) searchInput.value = requestedEmployeeId;

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
                    <button type="button" class="action-btn set-status-btn" aria-label="Mark ${escapeHtml(emp.name)} present" data-emp="${escapeHtml(emp.id)}" data-status="Present" style="color:#10b981; border-color:#10b981; padding:2px 6px;">P</button>
                    <button type="button" class="action-btn set-status-btn" aria-label="Mark ${escapeHtml(emp.name)} absent" data-emp="${escapeHtml(emp.id)}" data-status="Absent" style="color:#ef4444; border-color:#ef4444; padding:2px 6px;">A</button>
                    <button type="button" class="action-btn set-status-btn" aria-label="Mark ${escapeHtml(emp.name)} half day" data-emp="${escapeHtml(emp.id)}" data-status="Half Day" style="color:#8b5cf6; border-color:#8b5cf6; padding:2px 6px;">HD</button>
                    <button type="button" class="action-btn set-status-btn" aria-label="Mark ${escapeHtml(emp.name)} on leave" data-emp="${escapeHtml(emp.id)}" data-status="Leave" style="color:#f59e0b; border-color:#f59e0b; padding:2px 6px;">L</button>
                    <button type="button" class="action-btn edit-attendance-btn" data-emp="${escapeHtml(emp.id)}">Edit</button>
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

        tableBody.querySelectorAll(".edit-attendance-btn").forEach(btn => {
            btn.addEventListener("click", () => openAttendanceModal(btn.dataset.emp));
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

    function toInputTime(value) {
        const match = String(value || "").match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
        if (!match) return "";
        let hour = Number(match[1]);
        if (match[3]) {
            const suffix = match[3].toUpperCase();
            if (suffix === "PM" && hour < 12) hour += 12;
            if (suffix === "AM" && hour === 12) hour = 0;
        }
        return `${String(hour).padStart(2, "0")}:${match[2]}`;
    }

    function toDisplayTime(value) {
        if (!value) return "-";
        const [h, m] = value.split(":").map(Number);
        const suffix = h >= 12 ? "PM" : "AM";
        return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
    }

    function openAttendanceModal(employeeId) {
        if (!modal || !employeeSelect) return;
        const activeEmployees = employees.filter(emp => (emp.status || "Active").toLowerCase() !== "inactive");
        employeeSelect.replaceChildren(...activeEmployees.map(emp => {
            const option = document.createElement("option");
            option.value = emp.id;
            option.textContent = `${emp.name} (${emp.id})`;
            return option;
        }));
        const emp = activeEmployees.find(item => item.id === employeeId) || activeEmployees[0];
        if (!emp) {
            if (typeof showToast === "function") showToast("Add an active employee before recording attendance.", "warning");
            return;
        }
        employeeSelect.value = emp.id;
        const date = datePicker?.value || today;
        const record = attendanceRecords.find(item => item.date === date && item.employeeId === emp.id);
        if (modalTitle) modalTitle.textContent = record ? "Edit Attendance" : "Mark Attendance";
        if (modalEmployeeName) modalEmployeeName.textContent = emp.name;
        if (modalDate) modalDate.value = date;
        if (modalStatus) modalStatus.value = record?.status || "Present";
        if (modalCheckIn) modalCheckIn.value = toInputTime(record?.checkIn || "09:00 AM");
        if (modalCheckOut) modalCheckOut.value = toInputTime(record?.checkOut || "06:00 PM");
        if (modalLeaveType) modalLeaveType.value = record?.leaveType || "";
        if (modalNotes) modalNotes.value = record?.notes || "";
        modal.classList.add("show");
        modal.querySelector("button, input, select")?.focus();
    }

    function closeAttendanceModal() {
        modal?.classList.remove("show");
    }

    document.getElementById("openAttendanceModalBtn")?.addEventListener("click", () => openAttendanceModal());
    document.getElementById("closeModalBtn")?.addEventListener("click", closeAttendanceModal);
    document.getElementById("cancelModalBtn")?.addEventListener("click", closeAttendanceModal);
    modal?.addEventListener("click", event => {
        if (event.target === modal) closeAttendanceModal();
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && modal?.classList.contains("show")) closeAttendanceModal();
    });
    employeeSelect?.addEventListener("change", () => {
        const emp = employees.find(item => item.id === employeeSelect.value);
        if (modalEmployeeName) modalEmployeeName.textContent = emp?.name || "Employee attendance";
    });
    modalDate?.addEventListener("change", () => {
        const empId = employeeSelect?.value;
        const record = attendanceRecords.find(item => item.date === modalDate.value && item.employeeId === empId);
        if (modalStatus) modalStatus.value = record?.status || "Present";
        if (modalCheckIn) modalCheckIn.value = toInputTime(record?.checkIn || "09:00 AM");
        if (modalCheckOut) modalCheckOut.value = toInputTime(record?.checkOut || "06:00 PM");
        if (modalLeaveType) modalLeaveType.value = record?.leaveType || "";
        if (modalNotes) modalNotes.value = record?.notes || "";
        if (modalTitle) modalTitle.textContent = record ? "Edit Attendance" : "Mark Attendance";
    });
    attendanceForm?.addEventListener("submit", event => {
        event.preventDefault();
        const emp = employees.find(item => item.id === employeeSelect?.value);
        const date = modalDate?.value;
        if (!emp || !date) return;
        const status = modalStatus?.value || "Present";
        const checkIn = status === "Absent" || status === "Leave" ? "-" : toDisplayTime(modalCheckIn?.value);
        const checkOut = status === "Absent" || status === "Leave" ? "-" : toDisplayTime(modalCheckOut?.value);
        let workingHours = "0h 00m";
        if (checkIn !== "-" && modalCheckIn?.value && modalCheckOut?.value) {
            const [inHour, inMinute] = modalCheckIn.value.split(":").map(Number);
            const [outHour, outMinute] = modalCheckOut.value.split(":").map(Number);
            const minutes = Math.max(0, outHour * 60 + outMinute - inHour * 60 - inMinute);
            workingHours = `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
        }
        const data = {
            id: `ATT-${date}-${emp.id}`, date, employeeId: emp.id, employeeName: emp.name,
            position: emp.position || "Staff", checkIn, checkOut, workingHours, status,
            leaveType: status === "Leave" ? (modalLeaveType?.value || "") : "",
            notes: modalNotes?.value.trim() || ""
        };
        const index = attendanceRecords.findIndex(item => item.date === date && item.employeeId === emp.id);
        if (index < 0) attendanceRecords.push(data);
        else attendanceRecords[index] = { ...attendanceRecords[index], ...data };
        if (!saveAttendance(attendanceRecords)) {
            if (typeof showToast === "function") showToast("Attendance could not be saved. Check browser storage.", "error");
            return;
        }
        if (datePicker && datePicker.value !== date) datePicker.value = date;
        renderAttendance();
        closeAttendanceModal();
        if (typeof showToast === "function") showToast("Attendance saved successfully.");
    });

    document.getElementById("markAllPresentBtn")?.addEventListener("click", () => {
        const date = datePicker?.value || today;
        if (!window.confirm(`Mark all active employees present for ${date}?`)) return;
        employees.filter(emp => (emp.status || "Active").toLowerCase() !== "inactive").forEach(emp => {
            const index = attendanceRecords.findIndex(item => item.date === date && item.employeeId === emp.id);
            const old = index >= 0 ? attendanceRecords[index] : {};
            const record = { ...old, id: `ATT-${date}-${emp.id}`, date, employeeId: emp.id, employeeName: emp.name,
                position: emp.position || "Staff", checkIn: old.checkIn && old.checkIn !== "-" ? old.checkIn : "09:00 AM",
                checkOut: old.checkOut && old.checkOut !== "-" ? old.checkOut : "06:00 PM", workingHours: old.workingHours || "9h 00m", status: "Present" };
            if (index >= 0) attendanceRecords[index] = record;
            else attendanceRecords.push(record);
        });
        if (!saveAttendance(attendanceRecords)) {
            if (typeof showToast === "function") showToast("Attendance could not be saved. Check browser storage.", "error");
            return;
        }
        renderAttendance();
        if (typeof showToast === "function") showToast("Active employees marked present.");
    });
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
    const activeEmployees = employees.filter(employee => (employee.status || "Active").toLowerCase() !== "inactive");
    const filter = document.querySelector(".leave-filter");
    const selects = filter?.querySelectorAll("select") || [];
    const dates = filter?.querySelectorAll('input[type="date"]') || [];
    const pageButtons = Array.from(document.querySelectorAll(".leave-pagination .pagination-btn"));
    const pageSize = 5;
    let page = 1;
    let visibleLeaves = leaves;
    if (selects[0]) {
        selects[0].replaceChildren();
        const all = document.createElement("option"); all.textContent = "All Employees"; selects[0].appendChild(all);
        activeEmployees.forEach(employee => { const option = document.createElement("option"); option.value = employee.name; option.textContent = employee.name; selects[0].appendChild(option); });
    }
    if (filter && selects.length >= 3) {
        // Keep the existing type/status options while replacing stale demo employee names.
        selects[1].value = "All Leave Types";
        selects[2].value = "All Status";
    }

    function renderLeaves() {
        tableBody.innerHTML = "";
        if (visibleLeaves.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align:center; padding:25px; color:#6b7280;">
                        No pending leave requests found.
                    </td>
                </tr>
            `;
        } else {
            visibleLeaves.slice((page - 1) * pageSize, page * pageSize).forEach(lev => {
                const tr = document.createElement("tr");
                const addCell = (value, className = "") => { const cell = document.createElement("td"); cell.textContent = String(value ?? "-"); if (className) cell.className = className; tr.appendChild(cell); return cell; };
                addCell(lev.id, "leave-request-id");
                addCell(lev.employeeName);
                addCell(lev.leaveType);
                addCell(lev.fromDate);
                addCell(lev.toDate);
                addCell(`${Number(lev.days) || 0} Days`);
                addCell(lev.reason);
                const statusCell = addCell(lev.status);
                const statusSpan = document.createElement("span");
                statusSpan.className = `status ${lev.status === "Approved" ? "active" : lev.status === "Rejected" ? "due" : "partial"}`;
                statusSpan.textContent = String(lev.status || "Pending"); statusCell.replaceChildren(statusSpan);
                const action = document.createElement("td");
                if (lev.status === "Pending") {
                    [["Approve", "approve-leave-btn", "#10b981"], ["Reject", "reject-leave-btn", "#ef4444"]].forEach(([label, className, color]) => {
                        const button = document.createElement("button"); button.type = "button"; button.className = `action-btn ${className}`; button.dataset.id = lev.id;
                        button.style.color = color; button.textContent = label; action.appendChild(button);
                    });
                } else { action.textContent = "Completed"; }
                tr.appendChild(action); tableBody.appendChild(tr);
            });
        }

        const totalPages = Math.max(1, Math.ceil(visibleLeaves.length / pageSize));
        pageButtons.forEach(button => {
            const label = button.textContent.trim();
            if (/^\d+$/.test(label)) {
                const number = Number(label); button.hidden = number > totalPages; button.classList.toggle("active", number === page); button.setAttribute("aria-current", number === page ? "page" : "false");
            } else if (/previous/i.test(label)) button.disabled = page <= 1;
            else if (/next/i.test(label)) button.disabled = page >= totalPages;
        });
        document.querySelectorAll(".summary-cards .summary-card p").forEach((value, index) => {
            const numbers = [leaves.length, leaves.filter(item => item.status === "Pending").length,
                leaves.filter(item => item.status === "Approved").length, leaves.filter(item => item.status === "Rejected").length, "—"];
            if (numbers[index] !== undefined) value.textContent = numbers[index];
        });

        tableBody.querySelectorAll(".approve-leave-btn").forEach(btn => {
            btn.addEventListener("click", function() {
                const id = this.getAttribute("data-id");
                const item = leaves.find(l => l.id === id);
                if (item) {
                    item.status = "Approved";
                    saveLeaves(leaves);
                    applyFilters();
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
                    applyFilters();
                }
            });
        });
    }

    function applyFilters() {
        const employee = selects[0]?.value || "All Employees";
        const type = selects[1]?.value || "All Leave Types";
        const status = selects[2]?.value || "All Status";
        const from = dates[0]?.value || "";
        const to = dates[1]?.value || "";
        visibleLeaves = leaves.filter(leave => (employee === "All Employees" || leave.employeeName === employee)
            && (type === "All Leave Types" || leave.leaveType === type)
            && (status === "All Status" || leave.status === status)
            && (!from || String(leave.fromDate || "") >= from)
            && (!to || String(leave.toDate || "") <= to));
        page = 1;
        renderLeaves();
    }

    renderLeaves();
    filter?.querySelector(".filter-btn")?.addEventListener("click", applyFilters);
    selects.forEach(select => select.addEventListener("change", applyFilters));
    dates.forEach(input => input.addEventListener("change", applyFilters));
    pageButtons.forEach(button => button.addEventListener("click", () => {
        const label = button.textContent.trim();
        const totalPages = Math.max(1, Math.ceil(visibleLeaves.length / pageSize));
        if (/^\d+$/.test(label)) page = Number(label);
        else if (/previous/i.test(label)) page = Math.max(1, page - 1);
        else if (/next/i.test(label)) page = Math.min(totalPages, page + 1);
        renderLeaves();
    }));

    const exportButton = document.querySelector(".leave-requests-card .secondary-btn");
    exportButton?.addEventListener("click", () => {
        if (typeof exportVisibleTablesCsv === "function") exportVisibleTablesCsv("mms_leave_requests");
    });

    const addButton = document.querySelector(".page-header-actions .primary-btn");
    addButton?.addEventListener("click", () => {
        if (!activeEmployees.length) { if (typeof showToast === "function") showToast("Add an active employee before creating a leave request.", "warning"); return; }
        const dialog = document.createElement("dialog"); dialog.className = "mms-leave-dialog";
        const form = document.createElement("form"); form.method = "dialog"; form.className = "mms-leave-form";
        const title = document.createElement("h2"); title.textContent = "Add Leave Request"; form.appendChild(title);
        const makeField = (labelText, control) => { const wrap = document.createElement("label"); wrap.className = "form-group"; wrap.append(document.createTextNode(labelText), control); form.appendChild(wrap); };
        const employeeSelect = document.createElement("select"); employeeSelect.required = true;
        activeEmployees.forEach(employee => { const option = document.createElement("option"); option.value = employee.id; option.textContent = `${employee.name} (${employee.id})`; employeeSelect.appendChild(option); });
        makeField("Employee", employeeSelect);
        const typeSelect = document.createElement("select"); typeSelect.required = true;
        ["Casual Leave", "Sick Leave", "Paid Leave", "Emergency Leave", "Unpaid Leave"].forEach(type => { const option = document.createElement("option"); option.value = type; option.textContent = type; typeSelect.appendChild(option); });
        makeField("Leave type", typeSelect);
        const fromInput = document.createElement("input"); fromInput.type = "date"; fromInput.required = true; fromInput.value = today; makeField("From date", fromInput);
        const toInput = document.createElement("input"); toInput.type = "date"; toInput.required = true; toInput.value = today; makeField("To date", toInput);
        const reasonInput = document.createElement("textarea"); reasonInput.required = true; reasonInput.maxLength = 500; makeField("Reason", reasonInput);
        const actions = document.createElement("div"); actions.className = "form-actions";
        const cancel = document.createElement("button"); cancel.type = "button"; cancel.className = "secondary-btn"; cancel.textContent = "Cancel"; cancel.addEventListener("click", () => dialog.close());
        const save = document.createElement("button"); save.type = "submit"; save.className = "primary-btn"; save.textContent = "Save Request";
        actions.append(cancel, save); form.appendChild(actions); dialog.appendChild(form); document.body.appendChild(dialog);
        dialog.addEventListener("close", () => dialog.remove(), { once: true });
        dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
        form.addEventListener("submit", event => {
            event.preventDefault();
            if (fromInput.value > toInput.value) { toInput.setCustomValidity("End date must be on or after start date."); toInput.reportValidity(); return; }
            toInput.setCustomValidity("");
            const employee = activeEmployees.find(item => item.id === employeeSelect.value);
            const fromDate = new Date(`${fromInput.value}T00:00:00`); const toDate = new Date(`${toInput.value}T00:00:00`);
            const days = Math.floor((toDate - fromDate) / 86400000) + 1;
            leaves.unshift({ id: generateId("LEV"), employeeId: employee.id, employeeName: employee.name, leaveType: typeSelect.value,
                fromDate: fromInput.value, toDate: toInput.value, days, reason: reasonInput.value.trim(), status: "Pending", appliedOn: today });
            if (!saveLeaves(leaves)) { leaves.shift(); if (typeof showToast === "function") showToast("Leave request could not be saved.", "error"); return; }
            applyFilters();
            if (typeof logActivity === "function") logActivity("Leave Request Added", "Attendance", `Created leave request for ${employee.name}.`);
            if (typeof showToast === "function") showToast("Leave request added.");
            dialog.close();
        });
        if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", "");
        employeeSelect.focus();
    });
}

function initializeAttendanceReportsPage() {
    const filter = document.querySelector(".attendance-report-filter");
    const reportBody = document.querySelector(".attendance-report-table tbody");
    const lateBody = document.querySelector(".late-arrival-table tbody");
    if (!filter || !reportBody) return;

    const controls = filter.querySelectorAll("select");
    const monthSelect = controls[0];
    const employeeSelect = controls[1];
    const positionSelect = controls[2];
    const statusSelect = controls[3];
    const applyButton = filter.querySelector("button");
    const employees = Storage.get(STORAGE_KEYS.EMPLOYEES, []).filter(emp => (emp.status || "Active").toLowerCase() !== "inactive");
    const records = getAttendance();
    const currentMonth = (typeof getToday === "function" ? getToday() : new Date().toISOString().slice(0, 10)).slice(0, 7);

    const months = Array.from(new Set([currentMonth, ...records.map(record => String(record.date || "").slice(0, 7)).filter(Boolean)])).sort().reverse();
    if (monthSelect) {
        monthSelect.replaceChildren();
        const allOption = document.createElement("option");
        allOption.value = "all";
        allOption.textContent = "All Months";
        monthSelect.appendChild(allOption);
        months.forEach(month => {
            const option = document.createElement("option");
            option.value = month;
            option.textContent = new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
            monthSelect.appendChild(option);
        });
        monthSelect.value = months.includes(currentMonth) ? currentMonth : "all";
    }
    if (employeeSelect) {
        employeeSelect.replaceChildren();
        const all = document.createElement("option"); all.value = "all"; all.textContent = "All Employees"; employeeSelect.appendChild(all);
        employees.forEach(emp => { const option = document.createElement("option"); option.value = emp.id; option.textContent = emp.name; employeeSelect.appendChild(option); });
    }
    if (positionSelect) {
        positionSelect.replaceChildren();
        const all = document.createElement("option"); all.value = "all"; all.textContent = "All Positions"; positionSelect.appendChild(all);
        Array.from(new Set(employees.map(emp => emp.position).filter(Boolean))).sort().forEach(position => {
            const option = document.createElement("option"); option.value = position; option.textContent = position; positionSelect.appendChild(option);
        });
    }

    function statusOf(record) { return String(record.status || "Unmarked"); }
    function parseMinutes(value) {
        const match = String(value || "").match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (!match) return null;
        let hour = Number(match[1]);
        if (match[3]?.toUpperCase() === "PM" && hour < 12) hour += 12;
        if (match[3]?.toUpperCase() === "AM" && hour === 12) hour = 0;
        return hour * 60 + Number(match[2]);
    }
    function renderCell(row, value) {
        const cell = document.createElement("td");
        cell.textContent = String(value ?? "-");
        row.appendChild(cell);
        return cell;
    }
    function update() {
        const month = monthSelect?.value || "all";
        const employeeId = employeeSelect?.value || "all";
        const position = positionSelect?.value || "all";
        const selectedStatus = statusSelect?.value || "All Status";
        const monthRecords = records.filter(record => (month === "all" || String(record.date || "").startsWith(month))
            && (employeeId === "all" || record.employeeId === employeeId)
            && (selectedStatus === "All Status" || statusOf(record).toLowerCase() === selectedStatus.toLowerCase()));
        const chosenEmployees = employees.filter(emp => (employeeId === "all" || emp.id === employeeId)
            && (position === "all" || (emp.position || "") === position));
        const scopedEmployees = chosenEmployees.filter(emp => selectedStatus === "All Status" || monthRecords.some(record => record.employeeId === emp.id));
        const grouped = new Map();
        monthRecords.forEach(record => {
            if (position !== "all" && (employees.find(emp => emp.id === record.employeeId)?.position || "") !== position) return;
            if (!grouped.has(record.employeeId)) grouped.set(record.employeeId, []);
            grouped.get(record.employeeId).push(record);
        });

        reportBody.replaceChildren();
        let totalPresent = 0, totalAbsent = 0, totalLeave = 0, totalHalf = 0, totalLate = 0;
        scopedEmployees.forEach(emp => {
            const empRecords = grouped.get(emp.id) || [];
            const present = empRecords.filter(item => statusOf(item) === "Present").length;
            const absent = empRecords.filter(item => statusOf(item) === "Absent").length;
            const leave = empRecords.filter(item => statusOf(item) === "Leave").length;
            const half = empRecords.filter(item => statusOf(item) === "Half Day").length;
            const late = empRecords.filter(item => { const time = parseMinutes(item.checkIn); return time !== null && time > 9 * 60; });
            const denominator = present + absent + leave + half;
            const rate = denominator ? ((present + half * 0.5) / denominator * 100) : 0;
            totalPresent += present; totalAbsent += absent; totalLeave += leave; totalHalf += half; totalLate += late.length;
            const row = document.createElement("tr");
            const nameCell = renderCell(row, "");
            const nameWrap = document.createElement("div"); nameWrap.className = "report-employee";
            const avatar = document.createElement("div"); avatar.className = "report-avatar"; avatar.textContent = String(emp.name || "").split(/\s+/).map(part => part[0] || "").join("").slice(0, 2).toUpperCase();
            const details = document.createElement("div"); const strong = document.createElement("strong"); strong.textContent = emp.name || "Employee";
            const small = document.createElement("small"); small.textContent = emp.department || emp.position || "Staff"; details.append(strong, small); nameWrap.append(avatar, details); nameCell.appendChild(nameWrap);
            [emp.id, emp.position || "Staff", empRecords.length, present, absent, leave, half, late.length].forEach(value => renderCell(row, value));
            const percentage = renderCell(row, ""); const bar = document.createElement("div"); bar.className = "attendance-percentage";
            const track = document.createElement("div"); track.className = "percentage-bar"; const fill = document.createElement("span"); fill.style.width = `${rate.toFixed(1)}%`; track.appendChild(fill);
            const percent = document.createElement("strong"); percent.textContent = `${rate.toFixed(1)}%`; bar.append(track, percent); percentage.appendChild(bar);
            const action = document.createElement("td"); const link = document.createElement("a"); link.href = `attendance.html?employeeId=${encodeURIComponent(emp.id)}`; link.className = "report-view-btn"; link.textContent = "View"; action.appendChild(link); row.appendChild(action);
            reportBody.appendChild(row);
        });
        if (!scopedEmployees.length) { const row = document.createElement("tr"); const cell = renderCell(row, "No attendance records match these filters."); cell.colSpan = 11; reportBody.appendChild(row); }

        if (lateBody) {
            lateBody.replaceChildren();
            scopedEmployees.forEach(emp => {
                const late = (grouped.get(emp.id) || []).filter(record => { const time = parseMinutes(record.checkIn); return time !== null && time > 9 * 60; });
                if (!late.length) return;
                const row = document.createElement("tr");
                [emp.name, emp.id, emp.position || "Staff", late.length, late[0].checkIn || "-", "09:00 AM", "—", "Review"].forEach(value => renderCell(row, value));
                lateBody.appendChild(row);
            });
            if (!lateBody.children.length) { const row = document.createElement("tr"); const cell = renderCell(row, "No late arrivals for the selected period."); cell.colSpan = 8; lateBody.appendChild(row); }
        }

        const cards = document.querySelectorAll(".attendance-report-summary .summary-card");
        const total = totalPresent + totalAbsent + totalLeave + totalHalf;
        const values = [scopedEmployees.length, totalPresent, totalAbsent, totalLeave, `${total ? ((totalPresent + totalHalf * 0.5) / total * 100).toFixed(1) : "0.0"}%`];
        cards.forEach((card, index) => { const value = card.querySelector("p"); if (value) value.textContent = values[index] ?? 0; });
        const overviewCounts = [totalPresent,totalAbsent,totalLeave,totalHalf];
        const overviewTotal = overviewCounts.reduce((sum,value)=>sum+value,0);
        document.querySelectorAll(".attendance-overview .overview-item").forEach((item,index)=>{
            const count=overviewCounts[index]||0; const percent=overviewTotal?count/overviewTotal*100:0;
            const strong=item.querySelector(".overview-top strong"); if(strong)strong.textContent=`${count} ${count===1?"Day":"Days"}`;
            const bar=item.querySelector(".overview-progress span"); if(bar)bar.style.width=`${percent.toFixed(1)}%`;
            const small=item.querySelector("small"); if(small)small.textContent=`${percent.toFixed(1)}% of recorded attendance`;
        });
        document.querySelectorAll(".status-report-list .status-report-item strong").forEach((node,index)=>{if(overviewCounts[index]!==undefined)node.textContent=overviewCounts[index];});
        const monthLabel = month === "all" ? "all recorded months" : new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
        const reportDescription = document.querySelector(".attendance-report-card .content-card-header p");
        if (reportDescription) reportDescription.textContent = `Attendance summary for ${monthLabel} · ${totalHalf} half days · ${totalLate} late arrivals`;
        const overviewDescription = document.querySelector(".attendance-overview")?.closest(".content-card")?.querySelector(".content-card-header p");
        if (overviewDescription) overviewDescription.textContent = `Attendance distribution for ${monthLabel}`;
        const statusDescription = document.querySelector(".status-report-list")?.closest(".content-card")?.querySelector(".content-card-header p");
        if (statusDescription) statusDescription.textContent = `Recorded status counts for ${monthLabel}`;
        const lateDescription = document.querySelector(".late-arrival-table")?.closest(".content-card")?.querySelector(".content-card-header p");
        if (lateDescription) lateDescription.textContent = `Employees with late check-ins for ${monthLabel}`;
        const lateBadge = document.querySelector(".late-arrival-table")?.closest(".content-card")?.querySelector(".report-info-badge");
        if (lateBadge) lateBadge.textContent = monthLabel;
    }
    update();
    applyButton?.addEventListener("click", update);
}

/* =========================================================
   ROUTER INITIALIZATION
   ========================================================= */
document.addEventListener("DOMContentLoaded", function () {
    const path = window.location.pathname;

    if (path.includes("employee-attendance.html")) {
        const employeeId = new URLSearchParams(window.location.search).get("id") || new URLSearchParams(window.location.search).get("employeeId");
        const employee = Storage.get(STORAGE_KEYS.EMPLOYEES, []).find(item => String(item.id) === String(employeeId));
        window.location.replace(employee ? `attendance.html?employeeId=${encodeURIComponent(employee.id)}` : "employees.html");
    } else if (path.includes("attendance-reports.html")) {
        initializeAttendanceReportsPage();
    } else if (path.includes("leave-management.html")) {
        initializeLeaveManagementPage();
    } else if (path.includes("attendance.html") || path.includes("employee-attendance.html")) {
        initializeDailyAttendancePage();
    }
});
