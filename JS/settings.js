/* =========================================================
   MART MANAGEMENT SYSTEM
   SETTINGS & DATA BACKUP MODULE
   ========================================================= */

function getSettings() {
    return Storage.get(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
}

function saveSettings(settings) {
    const success = Storage.set(STORAGE_KEYS.SETTINGS, settings);
    if (success && typeof syncStoreBranding === "function") {
        syncStoreBranding();
    }
    return success;
}

/* =========================================================
   1. STORE SETTINGS PAGE (store-settings.html)
   ========================================================= */
function initializeStoreSettingsPage() {
    const form = document.querySelector(".store-settings-form") || document.querySelector("form");
    if (!form) return;

    const settings = getSettings();
    const store = settings.store || {};

    const storeNameInp = document.getElementById("storeName");
    const storeCodeInp = document.getElementById("storeCode");
    const ownerNameInp = document.getElementById("ownerName");
    const businessTypeSelect = document.getElementById("businessType");
    const phoneInp = document.getElementById("phone");
    const emailInp = document.getElementById("email");
    const addressInp = document.getElementById("address");
    const gstInp = document.getElementById("gstNumber");
    const panInp = document.getElementById("panNumber");
    const currencySelect = document.getElementById("currency");

    // Populate current values
    if (storeNameInp) storeNameInp.value = store.name || "My Mart";
    if (storeCodeInp) storeCodeInp.value = store.code || "MART001";
    if (ownerNameInp) ownerNameInp.value = store.owner || "Admin";
    if (businessTypeSelect) businessTypeSelect.value = store.type || "Retail Store";
    if (phoneInp) phoneInp.value = store.phone || "";
    if (emailInp) emailInp.value = store.email || "";
    if (addressInp) addressInp.value = store.address || "";
    if (gstInp) gstInp.value = store.gstNumber || "";
    if (panInp) panInp.value = store.panNumber || "";
    if (currencySelect) currencySelect.value = store.currency || "INR";

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        settings.store = {
            name: storeNameInp ? storeNameInp.value.trim() : "My Mart",
            code: storeCodeInp ? storeCodeInp.value.trim() : "MART001",
            owner: ownerNameInp ? ownerNameInp.value.trim() : "Admin",
            type: businessTypeSelect ? businessTypeSelect.value : "Retail Store",
            phone: phoneInp ? phoneInp.value.trim() : "",
            email: emailInp ? emailInp.value.trim() : "",
            address: addressInp ? addressInp.value.trim() : "",
            gstNumber: gstInp ? gstInp.value.trim() : "",
            panNumber: panInp ? panInp.value.trim() : "",
            currency: currencySelect ? currencySelect.value : "INR"
        };

        saveSettings(settings);

        if (typeof logActivity === "function") {
            logActivity("Settings Updated", "Settings", "Store profile and contact details updated.");
        }

        alert("✓ Store settings updated successfully.");
    });
}

/* =========================================================
   2. BILLING SETTINGS PAGE (billing-settings.html)
   ========================================================= */
function initializeBillingSettingsPage() {
    const form = document.querySelector("form");
    if (!form) return;

    const settings = getSettings();
    const billing = settings.billing || {};

    const prefixInp = document.getElementById("invoicePrefix") || form.querySelector("input[placeholder*='BILL']");
    const startNumInp = document.getElementById("startingNumber") || form.querySelector("input[type='number']");
    const gstCheck = document.getElementById("gstEnabled") || form.querySelector("input[type='checkbox']");

    if (prefixInp) prefixInp.value = billing.invoicePrefix || "BILL";
    if (startNumInp) startNumInp.value = billing.startingNumber || 1001;
    if (gstCheck && typeof billing.gstEnabled === "boolean") gstCheck.checked = billing.gstEnabled;

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        if (prefixInp) billing.invoicePrefix = prefixInp.value.trim();
        if (startNumInp) billing.startingNumber = Number(startNumInp.value) || 1001;
        if (gstCheck) billing.gstEnabled = gstCheck.checked;

        settings.billing = billing;
        saveSettings(settings);

        if (typeof logActivity === "function") {
            logActivity("Settings Updated", "Settings", "Billing and tax settings updated.");
        }

        alert("✓ Billing settings updated successfully.");
    });
}

/* =========================================================
   3. BACKUP & RESTORE PAGE (backup-settings.html)
   ========================================================= */
function initializeBackupSettingsPage() {
    // 1. Calculate live database size
    let totalBytes = 0;
    Object.values(STORAGE_KEYS).forEach(key => {
        const item = localStorage.getItem(key);
        if (item) totalBytes += (key.length + item.length) * 2;
    });
    const sizeKB = (totalBytes / 1024).toFixed(2);

    const sizeEl = document.querySelector(".backup-details div:nth-child(2) strong");
    if (sizeEl) sizeEl.textContent = `${sizeKB} KB`;

    const dbEl = document.querySelector(".backup-details div:nth-child(3) strong");
    if (dbEl) dbEl.textContent = "LocalStorage (Ready)";

    const today = typeof getToday === "function" ? getToday() : new Date().toISOString().slice(0, 10);
    const exportJson = (filename, data) => {
        const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
        const link = document.createElement("a"); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 0);
    };
    const downloadText = (filename, content, type) => {
        const url = URL.createObjectURL(new Blob([content], { type }));
        const link = document.createElement("a"); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 0);
    };
    const collectAllData = () => Object.values(STORAGE_KEYS).reduce((result, key) => { result[key] = Storage.get(key, null); return result; }, {});
    const backupBtn = Array.from(document.querySelectorAll("button")).find(button => /backup now/i.test(button.textContent));
    backupBtn?.addEventListener("click", function () {
        exportJson(`mms_backup_${today}.json`, collectAllData());
        const lastBackupEl = document.querySelector(".backup-details div:first-child strong");
        if (lastBackupEl) lastBackupEl.textContent = new Date().toLocaleString("en-IN");
        if (typeof logActivity === "function") logActivity("Database Backup", "Settings", `Created a JSON backup (${sizeKB} KB).`);
        if (typeof showToast === "function") showToast("Backup downloaded as JSON.");
    });

    const selectedCollections = () => {
        const checked = Array.from(document.querySelectorAll(".data-export-grid input[type='checkbox']:checked"));
        const map = {
            Products: [STORAGE_KEYS.PRODUCTS], Inventory: [STORAGE_KEYS.INVENTORY, STORAGE_KEYS.STOCK_ADJUSTMENTS],
            Suppliers: [STORAGE_KEYS.SUPPLIERS, STORAGE_KEYS.PURCHASES], Customers: [STORAGE_KEYS.CUSTOMERS, STORAGE_KEYS.BILLS],
            Employees: [STORAGE_KEYS.EMPLOYEES, STORAGE_KEYS.ATTENDANCE, STORAGE_KEYS.LEAVES, STORAGE_KEYS.PAYROLL],
            Attendance: [STORAGE_KEYS.ATTENDANCE, STORAGE_KEYS.LEAVES], Billing: [STORAGE_KEYS.BILLS], Expenses: [STORAGE_KEYS.EXPENSES]
        };
        const keys = new Set();
        checked.forEach(input => {
            const label = input.closest("label")?.querySelector("strong")?.textContent.trim();
            (map[label] || []).forEach(key => keys.add(key));
        });
        return Array.from(keys);
    };
    const exportRows = keys => keys.flatMap(key => {
        const value = Storage.get(key, []);
        const records = Array.isArray(value) ? value : [value];
        return records.filter(record => record && typeof record === "object").map(record => ({
            collection: key.replace("mms_", ""), id: record.id || "", name: record.name || record.customerName || record.supplierName || record.employeeName || "",
            date: record.date || record.billDate || record.purchaseDate || "", status: record.status || record.paymentStatus || "",
            amount: record.amount ?? record.grandTotal ?? "", details: JSON.stringify(record)
        }));
    });
    const quoteCsv = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csvColumns = ["Collection", "ID", "Name", "Date", "Status", "Amount", "Record JSON"];
    const exportCsvBtn = Array.from(document.querySelectorAll(".data-export-actions button")).find(button => /export csv/i.test(button.textContent));
    exportCsvBtn?.addEventListener("click", () => {
        const rows = exportRows(selectedCollections());
        const content = "\uFEFF" + [csvColumns, ...rows.map(row => [row.collection, row.id, row.name, row.date, row.status, row.amount, row.details])].map(row => row.map(quoteCsv).join(",")).join("\r\n");
        downloadText(`mms_export_${today}.csv`, content, "text/csv;charset=utf-8");
        if (typeof showToast === "function") showToast(`Exported ${rows.length} records as CSV.`);
    });
    const exportExcelBtn = Array.from(document.querySelectorAll(".data-export-actions button")).find(button => /export excel/i.test(button.textContent));
    exportExcelBtn?.addEventListener("click", () => {
        const rows = exportRows(selectedCollections());
        const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
        const html = `<table><thead><tr>${csvColumns.map(column => `<th>${escape(column)}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${[row.collection, row.id, row.name, row.date, row.status, row.amount, row.details].map(value => `<td>${escape(value)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
        downloadText(`mms_export_${today}.xls`, `<!doctype html><html><meta charset="utf-8"><body>${html}</body></html>`, "application/vnd.ms-excel");
        if (typeof showToast === "function") showToast(`Exported ${rows.length} records in an Excel-readable file.`);
    });
    const exportAllBtn = Array.from(document.querySelectorAll(".data-export-actions button")).find(button => /export all data/i.test(button.textContent));
    exportAllBtn?.addEventListener("click", () => { exportJson(`mms_full_export_${today}.json`, collectAllData()); if (typeof showToast === "function") showToast("All application data exported as JSON."); });

    const fileInput = document.getElementById("backupFile");
    const restoreBtn = document.querySelector(".restore-area button");
    restoreBtn?.addEventListener("click", () => {
        if (!fileInput?.files?.length) { if (typeof showToast === "function") showToast("Select a JSON backup file first.", "warning"); else alert("Select a JSON backup file first."); return; }
        if (!window.confirm("Restoring this backup will replace matching locally stored data. Continue?")) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const imported = JSON.parse(String(reader.result || ""));
                if (!imported || Array.isArray(imported) || typeof imported !== "object") throw new Error("Backup must be a JSON object.");
                const allowed = new Set(Object.values(STORAGE_KEYS));
                const entries = Object.entries(imported).filter(([key, value]) => allowed.has(key) && value !== undefined);
                if (!entries.length) throw new Error("No recognized MMS collections were found.");
                const previous = new Map(entries.map(([key]) => [key, { exists: Storage.exists(key), value: Storage.get(key) }]));
                for (const [key, value] of entries) {
                    if (!Storage.set(key, value)) {
                        previous.forEach((saved, savedKey) => saved.exists ? Storage.set(savedKey, saved.value) : Storage.remove(savedKey));
                        throw new Error(`Could not restore ${key}.`);
                    }
                }
                if (typeof logActivity === "function") logActivity("Database Restore", "Settings", `Restored ${entries.length} collections from a JSON backup.`);
                if (typeof showToast === "function") showToast(`Restored ${entries.length} data collections.`);
                window.location.reload();
            } catch (error) {
                if (typeof showToast === "function") showToast(error.message || "Invalid backup file.", "error"); else alert(error.message || "Invalid backup file.");
            }
        };
        reader.onerror = () => { if (typeof showToast === "function") showToast("The backup file could not be read.", "error"); };
        reader.readAsText(fileInput.files[0]);
    });

    const dataActions = document.querySelectorAll(".data-management-item");
    dataActions.forEach(item => {
        const label = item.querySelector("strong")?.textContent || "";
        const button = item.querySelector("button");
        if (/clear temporary/i.test(label)) button?.addEventListener("click", () => {
            const keys = Object.keys(localStorage).filter(key => key.startsWith("mms_temp_"));
            keys.forEach(key => localStorage.removeItem(key));
            if (typeof showToast === "function") showToast(keys.length ? `Cleared ${keys.length} temporary entries.` : "No temporary data was stored.");
        });
        if (/reset application settings/i.test(label)) button?.addEventListener("click", () => {
            if (!window.confirm("Reset application settings to their defaults? Other records will be kept.")) return;
            if (!Storage.set(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS)) { if (typeof showToast === "function") showToast("Settings could not be reset.", "error"); return; }
            if (typeof showToast === "function") showToast("Application settings reset. Reloading...");
            setTimeout(() => window.location.reload(), 500);
        });
        if (/delete all application data/i.test(label)) button?.addEventListener("click", () => {
            if (!window.confirm("Permanently delete all locally stored Mart Management System data? This cannot be undone.")) return;
            if (!Storage.clear()) { if (typeof showToast === "function") showToast("Application data could not be deleted.", "error"); return; }
            window.location.reload();
        });
    });

    const settings = getSettings();
    const backup = settings.backup || {};
    const backupStatus = document.getElementById("backupStatus");
    const backupFrequency = document.getElementById("backupFrequency");
    const backupTime = document.getElementById("backupTime");
    const retention = document.getElementById("retention");
    if (backupStatus) backupStatus.value = backup.enabled ? "Enabled" : "Disabled";
    if (backupFrequency && backup.frequency) backupFrequency.value = backup.frequency;
    if (backupTime && backup.time) backupTime.value = backup.time;
    if (retention && backup.retention) retention.value = backup.retention;
    const saveBackupBtn = Array.from(document.querySelectorAll(".form-actions button")).find(button => /save backup settings/i.test(button.textContent));
    saveBackupBtn?.addEventListener("click", () => {
        settings.backup = { enabled: backupStatus?.value === "Enabled", frequency: backupFrequency?.value || "Every Week",
            time: backupTime?.value || "23:00", retention: retention?.value || "30 Days" };
        if (!saveSettings(settings)) { if (typeof showToast === "function") showToast("Backup settings could not be saved.", "error"); return; }
        if (typeof showToast === "function") showToast("Backup preferences saved.");
    });
}



/* =========================================================
   4. INVENTORY SETTINGS PAGE (inventory-settings.html)
   ========================================================= */
function initializeInventorySettingsPage() {
    var form = document.querySelector('form');
    if (!form) return;

    var settings = getSettings();
    var inv = settings.inventory || {};

    var lowStockInp    = document.getElementById('lowStockThreshold');
    var criticalInp    = document.getElementById('criticalThreshold');
    var autoReorderChk = document.getElementById('autoReorder');
    var defaultUnitSel = document.getElementById('defaultUnit');

    if (lowStockInp)    lowStockInp.value     = inv.lowStockThreshold !== undefined ? inv.lowStockThreshold : 10;
    if (criticalInp)    criticalInp.value     = inv.criticalThreshold  !== undefined ? inv.criticalThreshold : 5;
    if (autoReorderChk) autoReorderChk.checked = !!inv.autoReorder;
    if (defaultUnitSel) defaultUnitSel.value  = inv.defaultUnit || 'Pcs';

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        settings.inventory = {
            lowStockThreshold : lowStockInp    ? Number(lowStockInp.value)    : 10,
            criticalThreshold : criticalInp    ? Number(criticalInp.value)    : 5,
            autoReorder       : autoReorderChk ? autoReorderChk.checked       : false,
            defaultUnit       : defaultUnitSel ? defaultUnitSel.value         : 'Pcs'
        };
        saveSettings(settings);
        if (typeof logActivity === 'function') logActivity('Settings Updated', 'Settings', 'Inventory thresholds updated.');
        if (typeof showToast === 'function') showToast('Inventory settings saved.', 'success');
        else alert('Inventory settings saved.');
    });
}


/* =========================================================
   5. EMPLOYEE SETTINGS PAGE (employee-settings.html)
   ========================================================= */
function initializeEmployeeSettingsPage() {
    var form = document.querySelector('form');
    if (!form) return;

    var settings = getSettings();
    var emp = settings.employee || {};

    var workHoursInp    = document.getElementById('workHoursPerDay');
    var workDaysInp     = document.getElementById('workDaysPerMonth');
    var overtimeRateInp = document.getElementById('overtimeRate');
    var payDayInp       = document.getElementById('salaryPayDay');

    if (workHoursInp)    workHoursInp.value    = emp.workHoursPerDay  !== undefined ? emp.workHoursPerDay  : 8;
    if (workDaysInp)     workDaysInp.value     = emp.workDaysPerMonth  !== undefined ? emp.workDaysPerMonth : 26;
    if (overtimeRateInp) overtimeRateInp.value = emp.overtimeRate      !== undefined ? emp.overtimeRate     : 1.5;
    if (payDayInp)       payDayInp.value       = emp.salaryPayDay      !== undefined ? emp.salaryPayDay     : 1;

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        settings.employee = {
            workHoursPerDay  : workHoursInp    ? Number(workHoursInp.value)    : 8,
            workDaysPerMonth : workDaysInp     ? Number(workDaysInp.value)     : 26,
            overtimeRate     : overtimeRateInp ? Number(overtimeRateInp.value) : 1.5,
            salaryPayDay     : payDayInp       ? Number(payDayInp.value)       : 1
        };
        saveSettings(settings);
        if (typeof logActivity === 'function') logActivity('Settings Updated', 'Settings', 'Employee payroll defaults updated.');
        if (typeof showToast === 'function') showToast('Employee settings saved.', 'success');
        else alert('Employee settings saved.');
    });
}


/* =========================================================
   6. NOTIFICATION SETTINGS PAGE (notification-settings.html)
   ========================================================= */
function initializeNotificationSettingsPage() {
    var container = document.querySelector('.page-content');
    if (!container) return;

    var settings = getSettings();
    var notif = settings.notifications || {};

    // Restore every saved notification preference, including select controls.
    var allChecks = container.querySelectorAll('input[type="checkbox"]');
    function ruleKey(chk) {
        var label = chk.closest(".notification-rule");
        var title = label ? label.querySelector("strong")?.textContent.trim() : "";
        return title ? title.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+(.)/g, function (_, c) { return c.toUpperCase(); }).replace(/^./, function (c) { return c.toLowerCase(); }) : (chk.id || chk.name || "rule");
    }
    allChecks.forEach(function(chk) {
        var key = ruleKey(chk);
        if (notif.rules && notif.rules[key] !== undefined) chk.checked = !!notif.rules[key];
    });
    var selects = container.querySelectorAll("select");
    selects.forEach(function(select) {
        var key = select.id;
        var value = key === "notificationStatus" ? (notif.enabled === false ? "Disabled" : "Enabled")
            : key === "expiryNotification" ? (notif.expiry === false ? "Disabled" : "Enabled")
            : key === "expiryDays" ? (notif.expiryDays ? `${notif.expiryDays} Days` : "")
            : notif[key];
        if (value !== undefined && Array.from(select.options).some(function(option) { return option.value === String(value) || option.textContent.trim() === String(value); })) select.value = String(value);
    });

    var saveButton = container.querySelector(".form-actions .primary-btn");
    if (!saveButton) return;
    saveButton.addEventListener('click', function (e) {
        e.preventDefault();
        var updated = Object.assign({}, settings.notifications || {});
        updated.rules = Object.assign({}, updated.rules || {});
        allChecks.forEach(function(chk) {
            updated.rules[ruleKey(chk)] = chk.checked;
        });
        selects.forEach(function(select) {
            if (!select.id) return;
            if (select.id === "notificationStatus") updated.enabled = select.value !== "Disabled";
            else if (select.id === "expiryNotification") updated.expiry = select.value !== "Disabled";
            else if (select.id === "expiryDays") updated.expiryDays = Number.parseInt(select.value, 10) || 30;
            else updated[select.id] = select.value;
        });
        settings.notifications = updated;
        if (!saveSettings(settings)) { if (typeof showToast === "function") showToast("Notification settings could not be saved.", "error"); return; }
        if (typeof refreshConditionNotifications === "function") refreshConditionNotifications();
        if (typeof logActivity === 'function') logActivity('Settings Updated', 'Settings', 'Notification preferences updated.');
        if (typeof showToast === 'function') showToast('Notification settings saved.', 'success');
        else alert('Notification settings saved.');
    });
}

/* =========================================================
   ROUTER INITIALIZATION
   ========================================================= */
document.addEventListener("DOMContentLoaded", function () {
    const path = window.location.pathname;

    if (path.includes("store-settings.html")) {
        initializeStoreSettingsPage();
    } else if (path.includes("billing-settings.html") || path.includes("billing-setting.html")) {
        initializeBillingSettingsPage();
    } else if (path.includes("backup-settings.html")) {
        initializeBackupSettingsPage();
    } else if (path.includes("inventory-settings.html")) {
        initializeInventorySettingsPage();
    } else if (path.includes("employee-settings.html")) {
        initializeEmployeeSettingsPage();
    } else if (path.includes("notification-settings.html")) {
        initializeNotificationSettingsPage();
    }
});
