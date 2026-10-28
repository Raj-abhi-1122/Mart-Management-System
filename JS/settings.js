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

    // 2. Backup Now Button -> Export JSON
    const backupBtn = document.querySelector(".primary-btn");
    if (backupBtn && backupBtn.textContent.includes("Backup")) {
        backupBtn.addEventListener("click", function () {
            const exportData = {};
            Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
                exportData[key] = Storage.get(key, null);
            });

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
            const dlAnchor = document.createElement("a");
            const today = typeof getToday === "function" ? getToday() : new Date().toISOString().split("T")[0];
            dlAnchor.setAttribute("href", dataStr);
            dlAnchor.setAttribute("download", `mms_backup_${today}.json`);
            document.body.appendChild(dlAnchor);
            dlAnchor.click();
            dlAnchor.remove();

            const lastBackupEl = document.querySelector(".backup-details div:first-child strong");
            if (lastBackupEl) lastBackupEl.textContent = "Just now";

            if (typeof logActivity === "function") {
                logActivity("Database Backup", "Settings", `Created and downloaded JSON backup of mart database (${sizeKB} KB).`);
            }

            alert("✓ Database backup file downloaded successfully!");
        });
    }

    // 3. Restore Data handling
    const restoreSection = document.querySelector(".form-actions");
    if (restoreSection && !document.getElementById("restoreFileInput")) {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.id = "restoreFileInput";
        fileInput.accept = ".json";
        fileInput.style.display = "none";
        document.body.appendChild(fileInput);

        const restoreBtn = document.createElement("button");
        restoreBtn.type = "button";
        restoreBtn.className = "secondary-btn";
        restoreBtn.innerHTML = "📥 Restore from Backup File";
        restoreBtn.style.marginLeft = "10px";
        restoreSection.appendChild(restoreBtn);

        restoreBtn.addEventListener("click", function () {
            fileInput.click();
        });

        fileInput.addEventListener("change", function (e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function (event) {
                try {
                    const imported = JSON.parse(event.target.result);
                    let importedCount = 0;
                    Object.entries(imported).forEach(([k, val]) => {
                        if (k.startsWith("mms_") && val !== null) {
                            Storage.set(k, val);
                            importedCount++;
                        }
                    });

                    alert(`✓ Successfully restored ${importedCount} database collections from backup!`);
                    window.location.reload();
                } catch (err) {
                    alert("Invalid backup file. Please select a valid JSON backup.");
                }
            };
            reader.readAsText(file);
        });
    }
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
    var form = document.querySelector('form');
    if (!form) return;

    var settings = getSettings();
    var notif = settings.notifications || {};

    // Restore all checkboxes from saved state
    var allChecks = form.querySelectorAll('input[type="checkbox"]');
    allChecks.forEach(function(chk) {
        var key = chk.id || chk.name;
        if (key && notif[key] !== undefined) chk.checked = notif[key];
    });

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var updated = {};
        allChecks.forEach(function(chk) {
            var key = chk.id || chk.name;
            if (key) updated[key] = chk.checked;
        });
        settings.notifications = updated;
        saveSettings(settings);
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
