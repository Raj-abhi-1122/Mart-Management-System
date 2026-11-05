/* =========================================================
   MART MANAGEMENT SYSTEM
   SETTINGS & DATA BACKUP MODULE (COMPLETE & ROBUST)
   ========================================================= */

/**
 * Deep merge source object into target object without overwriting
 * existing properties with undefined or destroying unrelated sub-objects.
 */
function deepMerge(target, source) {
    if (!source || typeof source !== "object") return target || {};
    const output = Object.assign({}, target);
    for (const key of Object.keys(source)) {
        const sourceVal = source[key];
        const targetVal = target ? target[key] : undefined;
        if (sourceVal && typeof sourceVal === "object" && !Array.isArray(sourceVal)) {
            output[key] = deepMerge(targetVal || {}, sourceVal);
        } else if (sourceVal !== undefined) {
            output[key] = sourceVal;
        }
    }
    return output;
}

/**
 * Safe retrieval of application settings with full fallback to DEFAULT_SETTINGS.
 */
function getSettings() {
    try {
        const defaults = typeof DEFAULT_SETTINGS !== "undefined" ? DEFAULT_SETTINGS : {};
        const saved = (typeof Storage !== "undefined" && typeof STORAGE_KEYS !== "undefined")
            ? Storage.get(STORAGE_KEYS.SETTINGS, defaults)
            : JSON.parse(localStorage.getItem("mms_settings") || "{}");
        return deepMerge(defaults, saved);
    } catch (e) {
        console.error("Error reading settings:", e);
        return typeof DEFAULT_SETTINGS !== "undefined" ? Object.assign({}, DEFAULT_SETTINGS) : {};
    }
}

/**
 * Non-destructively saves partial or full settings into LocalStorage.
 * Merges with existing settings so unrelated categories are never lost.
 */
function saveSettings(partialSettings, categoryKey) {
    try {
        const session = typeof Storage !== "undefined" && typeof STORAGE_KEYS !== "undefined"
            ? Storage.get(STORAGE_KEYS.AUTH_USER, {}) : {};
        if (!session?.isLoggedIn || !["owner", "admin"].includes(String(session.role || "").toLowerCase())) {
            console.warn("Settings save blocked: an administrator session is required.");
            return false;
        }
        const current = getSettings();
        let updated;
        if (categoryKey) {
            updated = Object.assign({}, current);
            updated[categoryKey] = deepMerge(current[categoryKey] || {}, partialSettings);
        } else {
            updated = deepMerge(current, partialSettings);
        }

        let success = false;
        if (typeof Storage !== "undefined" && typeof STORAGE_KEYS !== "undefined") {
            success = Storage.set(STORAGE_KEYS.SETTINGS, updated);
        } else {
            localStorage.setItem("mms_settings", JSON.stringify(updated));
            success = true;
        }

        if (success) {
            // Immediately apply active branding & alerts across the UI
            if (typeof syncStoreBranding === "function") {
                syncStoreBranding();
            }
            if (typeof refreshConditionNotifications === "function") {
                refreshConditionNotifications();
            }
        }
        return success;
    } catch (e) {
        console.error("Error saving settings:", e);
        return false;
    }
}

/**
 * Helper to show toast or fallback alert.
 */
function notifyUser(message, type = "success") {
    if (typeof showToast === "function") {
        showToast(message, type);
    } else {
        alert((type === "error" ? "❌ " : "✓ ") + message);
    }
}

function hasLocalAdminSession() {
    const user = typeof Storage !== "undefined" && typeof STORAGE_KEYS !== "undefined"
        ? Storage.get(STORAGE_KEYS.AUTH_USER, {}) : {};
    return !!user?.isLoggedIn && ["owner", "admin"].includes(String(user.role || "").toLowerCase());
}

/**
 * Helper to query input/select/textarea associated with a label text.
 */
function findControlByLabel(container, labelKeyword) {
    if (!container) return null;
    const labels = Array.from(container.querySelectorAll("label"));
    for (const lbl of labels) {
        if (lbl.textContent.toLowerCase().includes(labelKeyword.toLowerCase())) {
            const group = lbl.closest(".form-group") || lbl.parentElement;
            if (group) {
                const ctrl = group.querySelector("input, select, textarea");
                if (ctrl) return ctrl;
            }
        }
    }
    return null;
}

/**
 * Helper to find checkbox by its label or strong text.
 */
function findCheckboxByText(container, keyword) {
    if (!container) return null;
    const items = Array.from(container.querySelectorAll("label, .checkbox-item, .checkbox-row, .inventory-rule"));
    for (const item of items) {
        if (item.textContent.toLowerCase().includes(keyword.toLowerCase())) {
            const chk = item.querySelector("input[type='checkbox']");
            if (chk) return chk;
        }
    }
    return null;
}


/* =========================================================
   0. OVERVIEW PAGE (settings.html)
   ========================================================= */
function initializeSettingsOverviewPage() {
    const account = Storage.get(STORAGE_KEYS.AUTH_USER, {});
    const accountLabel = document.getElementById("adminCurrentAccount");
    if (accountLabel) accountLabel.textContent = account?.email || "No account email is configured";
    const settings = getSettings();

    // 1. Live Current Configuration
    const configRows = document.querySelectorAll(".configuration-table .configuration-row");
    configRows.forEach(row => {
        const label = row.querySelector("span")?.textContent.trim() || "";
        const strong = row.querySelector("strong");
        if (!strong) return;

        if (/currency/i.test(label)) {
            const curr = settings.store?.currency || "₹ INR";
            strong.textContent = curr.includes("INR") ? "₹ INR" : curr.includes("USD") ? "$ USD" : curr.includes("EUR") ? "€ EUR" : curr;
        } else if (/timezone/i.test(label)) {
            strong.textContent = "Asia/Kolkata (IST)";
        } else if (/low stock alert/i.test(label)) {
            const lowStockOn = settings.inventory?.lowStockAlerts !== false;
            strong.textContent = lowStockOn ? "Enabled" : "Disabled";
            strong.style.color = lowStockOn ? "#10b981" : "#ef4444";
        } else if (/automatic backup/i.test(label)) {
            const backupOn = !!settings.backup?.enabled;
            strong.textContent = backupOn ? "Enabled" : "Disabled";
            strong.style.color = backupOn ? "#10b981" : "#6b7280";
        } else if (/tax calculation/i.test(label)) {
            const taxOn = settings.billing?.gstEnabled !== false;
            strong.textContent = taxOn ? `Enabled (${settings.billing?.gstPercentage || 12}%)` : "Disabled";
            strong.style.color = taxOn ? "#10b981" : "#ef4444";
        }
    });

    // 2. Live System Information
    const infoItems = document.querySelectorAll(".system-info-grid .system-info-item");
    infoItems.forEach(item => {
        const label = item.querySelector("span")?.textContent.trim() || "";
        const strong = item.querySelector("strong");
        if (!strong) return;

        if (/database/i.test(label)) {
            let totalBytes = 0;
            if (typeof STORAGE_KEYS !== "undefined") {
                Object.values(STORAGE_KEYS).forEach(k => {
                    const val = localStorage.getItem(k);
                    if (val) totalBytes += (k.length + val.length) * 2;
                });
            }
            const sizeKB = (totalBytes / 1024).toFixed(1);
            strong.textContent = `LocalStorage (Active - ${sizeKB} KB)`;
            strong.style.color = "#10b981";
        }
    });
}


/* =========================================================
   1. STORE SETTINGS PAGE (store-settings.html)
   ========================================================= */
function initializeStoreSettingsPage() {
    const container = document.querySelector(".page-content");
    if (!container) return;

    const settings = getSettings();
    const store = settings.store || {};

    // Get input references
    const storeNameInp = document.getElementById("storeName");
    const storeCodeInp = document.getElementById("storeCode");
    const ownerNameInp = document.getElementById("ownerName");
    const businessTypeSelect = document.getElementById("businessType");
    const phoneInp = document.getElementById("phone");
    const altPhoneInp = document.getElementById("alternatePhone");
    const emailInp = document.getElementById("email");
    const websiteInp = document.getElementById("website");
    const addressInp = document.getElementById("address");
    const cityInp = document.getElementById("city");
    const stateInp = document.getElementById("state");
    const pincodeInp = document.getElementById("pincode");
    const countryInp = document.getElementById("country");
    const gstInp = document.getElementById("gst") || document.getElementById("gstNumber");
    const panInp = document.getElementById("pan") || document.getElementById("panNumber");
    const regInp = document.getElementById("registration");
    const currencySelect = document.getElementById("currency");
    const invoiceFooterInp = document.getElementById("invoiceFooter");
    const logoInput = document.getElementById("storeLogo");
    const logoPreview = document.getElementById("storeLogoPreview");
    let pendingLogo = store.logo || "";
    const showLogo = () => {
        if (!logoPreview) return;
        logoPreview.replaceChildren();
        if (pendingLogo) {
            const img = document.createElement("img");
            img.src = pendingLogo;
            img.alt = "Store logo preview";
            img.onerror = () => { pendingLogo = ""; logoPreview.textContent = "🏪 Logo unavailable"; };
            logoPreview.appendChild(img);
        } else logoPreview.textContent = "🏪 No logo selected";
    };
    showLogo();
    logoInput?.addEventListener("change", () => {
        const file = logoInput.files?.[0];
        if (!file) return;
        if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 300 * 1024) {
            logoInput.value = "";
            notifyUser("Choose a PNG, JPG, or WebP logo under 300 KB.", "error");
            return;
        }
        const reader = new FileReader();
        reader.onload = () => { if (typeof reader.result === "string") { pendingLogo = reader.result; showLogo(); } };
        reader.onerror = () => notifyUser("Could not read the selected logo.", "error");
        reader.readAsDataURL(file);
    });
    document.getElementById("removeStoreLogo")?.addEventListener("click", () => { pendingLogo = ""; if (logoInput) logoInput.value = ""; showLogo(); });

    // Populate saved values
    if (storeNameInp) storeNameInp.value = store.name || "My Mart Supermarket";
    if (storeCodeInp) storeCodeInp.value = store.code || "MART001";
    if (ownerNameInp) ownerNameInp.value = store.owner || "Admin Owner";
    if (businessTypeSelect && store.type) businessTypeSelect.value = store.type;
    if (phoneInp) phoneInp.value = store.phone || "";
    if (altPhoneInp) altPhoneInp.value = store.alternatePhone || "";
    if (emailInp) emailInp.value = store.email || "";
    if (websiteInp) websiteInp.value = store.website || "";
    if (addressInp) addressInp.value = store.address || "";
    if (cityInp) cityInp.value = store.city || "";
    if (stateInp) stateInp.value = store.state || "";
    if (pincodeInp) pincodeInp.value = store.pincode || "";
    if (countryInp) countryInp.value = store.country || "India";
    if (gstInp) gstInp.value = store.gstNumber || "";
    if (panInp) panInp.value = store.panNumber || "";
    if (regInp) regInp.value = store.registration || "";
    if (invoiceFooterInp) invoiceFooterInp.value = store.invoiceFooter || "Thank you for shopping with us. Visit again!";

    if (currencySelect && store.currency) {
        Array.from(currencySelect.options).forEach(opt => {
            if (opt.value === store.currency || opt.textContent.includes(store.currency)) {
                opt.selected = true;
            }
        });
    }

    // Populate business hours if stored
    if (store.businessHours) {
        const hourRows = container.querySelectorAll(".business-hours .hours-row");
        hourRows.forEach(row => {
            const dayName = row.querySelector(".day-name")?.textContent.trim().toLowerCase();
            const dayData = dayName ? store.businessHours[dayName] : null;
            if (dayData) {
                const timeInputs = row.querySelectorAll("input[type='time']");
                if (timeInputs.length >= 2) {
                    if (dayData.open) timeInputs[0].value = dayData.open;
                    if (dayData.close) timeInputs[1].value = dayData.close;
                }
                const chk = row.querySelector("input[type='checkbox']");
                if (chk) chk.checked = dayData.isOpen !== false;
            }
        });
    }

    // Save button handler
    const saveBtn = container.querySelector(".form-actions .primary-btn") ||
                    Array.from(container.querySelectorAll("button")).find(b => /save store/i.test(b.textContent));

    if (saveBtn) {
        saveBtn.addEventListener("click", function (e) {
            e.preventDefault();

            const name = storeNameInp ? storeNameInp.value.trim() : "";
            if (!name) {
                notifyUser("Please enter a valid store name.", "error");
                storeNameInp?.focus();
                return;
            }
            const emailValue = emailInp?.value.trim() || "";
            if (emailValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
                notifyUser("Enter a valid store email address.", "error");
                emailInp?.focus();
                return;
            }
            const codeValue = storeCodeInp?.value.trim() || "";
            if (!codeValue) {
                notifyUser("Enter a store code.", "error");
                storeCodeInp?.focus();
                return;
            }

            // Gather business hours
            const businessHours = {};
            const hourRows = container.querySelectorAll(".business-hours .hours-row");
            hourRows.forEach(row => {
                const dayName = row.querySelector(".day-name")?.textContent.trim().toLowerCase();
                if (dayName) {
                    const timeInputs = row.querySelectorAll("input[type='time']");
                    const chk = row.querySelector("input[type='checkbox']");
                    businessHours[dayName] = {
                        open: timeInputs[0]?.value || "09:00",
                        close: timeInputs[1]?.value || "21:00",
                        isOpen: chk ? chk.checked : true
                    };
                }
            });

            const storeData = {
                name: name,
                code: storeCodeInp ? storeCodeInp.value.trim() : "MART001",
                owner: ownerNameInp ? ownerNameInp.value.trim() : "Admin Owner",
                type: businessTypeSelect ? businessTypeSelect.value : "Retail Supermarket",
                phone: phoneInp ? phoneInp.value.trim() : "",
                alternatePhone: altPhoneInp ? altPhoneInp.value.trim() : "",
                email: emailInp ? emailInp.value.trim() : "",
                website: websiteInp ? websiteInp.value.trim() : "",
                address: addressInp ? addressInp.value.trim() : "",
                city: cityInp ? cityInp.value.trim() : "",
                state: stateInp ? stateInp.value.trim() : "",
                pincode: pincodeInp ? pincodeInp.value.trim() : "",
                country: countryInp ? countryInp.value.trim() : "India",
                gstNumber: gstInp ? gstInp.value.trim() : "",
                panNumber: panInp ? panInp.value.trim() : "",
                registration: regInp ? regInp.value.trim() : "",
                currency: currencySelect ? currencySelect.value : "₹ INR - Indian Rupee",
                businessHours: Object.keys(businessHours).length ? businessHours : undefined,
                invoiceFooter: invoiceFooterInp ? invoiceFooterInp.value.trim() : "Thank you for shopping with us. Visit again!"
            };
            storeData.logo = pendingLogo;

            const success = saveSettings(storeData, "store");
            if (success) {
                if (typeof logActivity === "function") {
                    logActivity("Settings Updated", "Settings", `Store profile updated for "${storeData.name}".`);
                }
                notifyUser("Store settings saved successfully.", "success");
            } else {
                notifyUser("Could not save store settings to local storage.", "error");
            }
        });
    }
}

function initializeSidebarAppearanceSettings() {
    const section = document.querySelector(".appearance-settings-panel");
    if (!section) return;
    const defaults = { background: "#1f2937", text: "#d1d5db", icon: "#d1d5db", activeBackground: "#4b5563", activeText: "#ffffff", hoverBackground: "#374151", border: "#374151" };
    const presets = {
        default: defaults,
        ocean: { background: "#123047", text: "#dbeafe", icon: "#93c5fd", activeBackground: "#1d4ed8", activeText: "#ffffff", hoverBackground: "#1e40af", border: "#1e3a5f" },
        forest: { background: "#18352c", text: "#d1fae5", icon: "#86efac", activeBackground: "#166534", activeText: "#ffffff", hoverBackground: "#14532d", border: "#24483a" }
    };
    const inputIds = { background: "sidebarBackground", text: "sidebarText", icon: "sidebarIcon", activeBackground: "sidebarActiveBackground", activeText: "sidebarActiveText", hoverBackground: "sidebarHoverBackground", border: "sidebarBorder" };
    const current = getSettings().appearance || {};
    const saved = Object.assign({}, defaults, current.sidebar || {});
    const preset = document.getElementById("sidebarPreset");
    const preview = document.getElementById("sidebarAppearancePreview");
    const values = () => Object.fromEntries(Object.entries(inputIds).map(([key, id]) => [key, document.getElementById(id)?.value || defaults[key]]));
    const updatePreview = () => {
        const colors = values();
        if (preview) Object.entries({ background: "--mms-sidebar-bg", text: "--mms-sidebar-text", icon: "--mms-sidebar-icon", activeBackground: "--mms-sidebar-active-bg", activeText: "--mms-sidebar-active-text", hoverBackground: "--mms-sidebar-hover-bg", border: "--mms-sidebar-border" }).forEach(([key, variable]) => preview.style.setProperty(variable, colors[key]));
    };
    Object.entries(inputIds).forEach(([key, id]) => { const input = document.getElementById(id); if (input) { input.value = saved[key]; input.addEventListener("input", () => { if (preset) preset.value = "custom"; updatePreview(); }); } });
    const presetValues = Object.keys(presets).find(name => Object.keys(defaults).every(key => saved[key].toLowerCase() === presets[name][key].toLowerCase())) || "custom";
    if (preset) { preset.value = presetValues; preset.addEventListener("change", () => { const colors = presets[preset.value]; if (colors) Object.entries(inputIds).forEach(([key, id]) => { const input = document.getElementById(id); if (input) input.value = colors[key]; }); updatePreview(); }); }
    updatePreview();
    document.getElementById("saveSidebarAppearance")?.addEventListener("click", () => {
        const success = saveSettings({ sidebar: values() }, "appearance");
        if (success) { if (window.MMSTheme) window.MMSTheme.apply(getSettings()); notifyUser("Sidebar appearance saved.", "success"); }
        else notifyUser("Could not save sidebar appearance. Sign in as an administrator and try again.", "error");
    });
    document.getElementById("resetSidebarAppearance")?.addEventListener("click", () => {
        Object.entries(inputIds).forEach(([key, id]) => { const input = document.getElementById(id); if (input) input.value = defaults[key]; });
        if (preset) preset.value = "default";
        updatePreview();
        if (saveSettings({ sidebar: defaults }, "appearance")) {
            if (window.MMSTheme) window.MMSTheme.apply(getSettings());
            notifyUser("Sidebar colors reset to the classic preset.", "success");
        } else notifyUser("Could not reset sidebar colors. Sign in as an administrator and try again.", "error");
    });
}


/* =========================================================
   2. BILLING SETTINGS PAGE (billing-settings.html & billing-setting.html)
   ========================================================= */
function initializeBillingSettingsPage() {
    const container = document.querySelector(".page-content");
    if (!container) return;

    const settings = getSettings();
    const billing = settings.billing || {};

    // Map fields by label or attributes
    const prefixInp = findControlByLabel(container, "Invoice Prefix");
    const startNumInp = findControlByLabel(container, "Starting Invoice Number");
    const formatSelect = findControlByLabel(container, "Invoice Format");
    const sizeSelect = findControlByLabel(container, "Invoice Size");

    const gstSelect = findControlByLabel(container, "GST Billing");
    const gstPctSelect = findControlByLabel(container, "GST Percentage");
    const taxTypeSelect = findControlByLabel(container, "Tax Type");
    const priceTaxSelect = findControlByLabel(container, "Product Price Includes Tax");

    const discSelect = findControlByLabel(container, "Discount");
    const discTypeSelect = findControlByLabel(container, "Discount Type");
    const maxDiscInp = findControlByLabel(container, "Maximum Discount");

    const creditSelect = findControlByLabel(container, "Allow Credit Sales");
    const creditLimitInp = findControlByLabel(container, "Default Credit Limit");
    const dueReminderSelect = findControlByLabel(container, "Due Payment Reminder");

    const roundingSelect = findControlByLabel(container, "Bill Rounding");
    const roundingMethodSelect = findControlByLabel(container, "Rounding Method");
    const changeSelect = findControlByLabel(container, "Allow Change Amount");

    const autoPrintSelect = findControlByLabel(container, "Auto Print Invoice");
    const printAfterSelect = findControlByLabel(container, "Print After Billing");
    const paperSizeSelect = findControlByLabel(container, "Paper Size");

    // Populate invoice settings
    if (prefixInp) prefixInp.value = billing.invoicePrefix || "BILL";
    if (startNumInp) startNumInp.value = billing.startingNumber || 1001;
    if (formatSelect && billing.invoiceFormat) formatSelect.value = billing.invoiceFormat;
    if (sizeSelect && billing.invoiceSize) sizeSelect.value = billing.invoiceSize;

    // Populate tax settings
    if (gstSelect) gstSelect.value = billing.gstEnabled !== false ? "Enabled" : "Disabled";
    if (gstPctSelect && billing.gstPercentage !== undefined) {
        const valStr = `${billing.gstPercentage}%`;
        Array.from(gstPctSelect.options).forEach(opt => {
            if (opt.textContent.trim() === valStr || opt.value === String(billing.gstPercentage)) opt.selected = true;
        });
    }
    if (taxTypeSelect && billing.taxType) taxTypeSelect.value = billing.taxType;
    if (priceTaxSelect) priceTaxSelect.value = billing.priceIncludesTax ? "Yes" : "No";

    // Populate discounts
    if (discSelect) discSelect.value = billing.discountEnabled !== false ? "Enabled" : "Disabled";
    if (discTypeSelect && billing.discountType) discTypeSelect.value = billing.discountType;
    if (maxDiscInp && billing.maxDiscount !== undefined) maxDiscInp.value = billing.maxDiscount;

    // Populate payment methods
    const payMethods = billing.paymentMethods || { cash: true, upi: true, card: true, bankTransfer: true, credit: false };
    const payMethodMap = {
        cash: findCheckboxByText(container, "Cash"),
        upi: findCheckboxByText(container, "UPI"),
        card: findCheckboxByText(container, "Card"),
        bankTransfer: findCheckboxByText(container, "Bank Transfer"),
        credit: findCheckboxByText(container, "Credit / Due")
    };
    for (const [key, chk] of Object.entries(payMethodMap)) {
        if (chk && payMethods[key] !== undefined) chk.checked = !!payMethods[key];
    }

    // Populate credit settings
    if (creditSelect) creditSelect.value = billing.creditEnabled !== false ? "Yes" : "No";
    if (creditLimitInp && billing.creditLimit !== undefined) creditLimitInp.value = billing.creditLimit;
    if (dueReminderSelect) dueReminderSelect.value = billing.dueReminder !== false ? "Enabled" : "Disabled";

    // Populate rounding
    if (roundingSelect) roundingSelect.value = billing.roundingEnabled !== false ? "Enabled" : "Disabled";
    if (roundingMethodSelect && billing.roundingMethod) roundingMethodSelect.value = billing.roundingMethod;
    if (changeSelect) changeSelect.value = billing.allowChange !== false ? "Yes" : "No";

    // Populate print
    if (autoPrintSelect) autoPrintSelect.value = billing.autoPrint ? "Enabled" : "Disabled";
    if (printAfterSelect) printAfterSelect.value = billing.printAfterBilling !== false ? "Yes" : "No";
    if (paperSizeSelect && billing.paperSize) paperSizeSelect.value = billing.paperSize;

    // Populate billing rules checkboxes
    const chkPreventStock = findCheckboxByText(container, "Prevent Billing When Stock Is Insufficient");
    const chkNegativeStock = findCheckboxByText(container, "Allow Negative Stock");
    const chkCancelBill = findCheckboxByText(container, "Allow Bill Cancellation");
    const chkEditBill = findCheckboxByText(container, "Allow Bill Editing");

    if (chkPreventStock) chkPreventStock.checked = billing.preventInsufficientStock !== false;
    if (chkNegativeStock) chkNegativeStock.checked = !!billing.allowNegativeStock;
    if (chkCancelBill) chkCancelBill.checked = billing.allowBillCancellation !== false;
    if (chkEditBill) chkEditBill.checked = !!billing.allowBillEditing;

    // Save button
    const saveBtn = container.querySelector(".settings-actions .btn-primary") ||
                    container.querySelector(".form-actions .primary-btn") ||
                    Array.from(container.querySelectorAll("button")).find(b => /save billing/i.test(b.textContent));

    if (saveBtn) {
        saveBtn.addEventListener("click", function (e) {
            e.preventDefault();

            const prefixVal = prefixInp ? prefixInp.value.trim() : "BILL";
            const startNumVal = startNumInp ? Number.parseInt(startNumInp.value, 10) : 1001;

            if (!prefixVal) {
                notifyUser("Invoice prefix cannot be empty.", "error");
                prefixInp?.focus();
                return;
            }

            // Parse GST percentage
            let gstPct = 12;
            if (gstPctSelect) {
                const match = gstPctSelect.value.match(/\d+/);
                if (match) gstPct = Number.parseInt(match[0], 10);
            }

            const billingData = {
                invoicePrefix: prefixVal,
                startingNumber: isNaN(startNumVal) || startNumVal < 1 ? 1001 : startNumVal,
                invoiceFormat: formatSelect ? formatSelect.value : "BILL-1001",
                invoiceSize: sizeSelect ? sizeSelect.value : "A4",
                gstEnabled: gstSelect ? gstSelect.value === "Enabled" : true,
                gstPercentage: gstPct,
                taxType: taxTypeSelect ? taxTypeSelect.value : "CGST + SGST",
                priceIncludesTax: priceTaxSelect ? priceTaxSelect.value === "Yes" : false,
                discountEnabled: discSelect ? discSelect.value === "Enabled" : true,
                discountType: discTypeSelect ? discTypeSelect.value : "Percentage",
                maxDiscount: maxDiscInp ? Math.max(0, Math.min(100, Number(maxDiscInp.value) || 20)) : 20,
                paymentMethods: {
                    cash: payMethodMap.cash ? payMethodMap.cash.checked : true,
                    upi: payMethodMap.upi ? payMethodMap.upi.checked : true,
                    card: payMethodMap.card ? payMethodMap.card.checked : true,
                    bankTransfer: payMethodMap.bankTransfer ? payMethodMap.bankTransfer.checked : true,
                    credit: payMethodMap.credit ? payMethodMap.credit.checked : false
                },
                creditEnabled: creditSelect ? creditSelect.value === "Yes" : true,
                creditLimit: creditLimitInp ? Math.max(0, Number(creditLimitInp.value) || 10000) : 10000,
                dueReminder: dueReminderSelect ? dueReminderSelect.value === "Enabled" : true,
                roundingEnabled: roundingSelect ? roundingSelect.value === "Enabled" : true,
                roundingMethod: roundingMethodSelect ? roundingMethodSelect.value : "Nearest Rupee",
                allowChange: changeSelect ? changeSelect.value === "Yes" : true,
                autoPrint: autoPrintSelect ? autoPrintSelect.value === "Enabled" : false,
                printAfterBilling: printAfterSelect ? printAfterSelect.value === "Yes" : true,
                paperSize: paperSizeSelect ? paperSizeSelect.value : "A4",
                preventInsufficientStock: chkPreventStock ? chkPreventStock.checked : true,
                allowNegativeStock: chkNegativeStock ? chkNegativeStock.checked : false,
                allowBillCancellation: chkCancelBill ? chkCancelBill.checked : true,
                allowBillEditing: chkEditBill ? chkEditBill.checked : false
            };

            const success = saveSettings(billingData, "billing");
            if (success) {
                if (typeof logActivity === "function") {
                    logActivity("Settings Updated", "Settings", "Billing rules, tax and discount preferences updated.");
                }
                notifyUser("Billing settings saved successfully.", "success");
            } else {
                notifyUser("Could not save billing settings.", "error");
            }
        });
    }
}


/* =========================================================
   3. INVENTORY SETTINGS PAGE (inventory-settings.html)
   ========================================================= */
function initializeInventorySettingsPage() {
    const container = document.querySelector(".page-content");
    if (!container) return;

    const settings = getSettings();
    const inv = settings.inventory || {};

    // Controls by ID
    const defaultMinInp = document.getElementById("defaultMinimum");
    const defaultMaxInp = document.getElementById("defaultMaximum");
    const reorderLevelInp = document.getElementById("reorderLevel");
    const stockUnitSelect = document.getElementById("stockUnit");

    const expiryTrackingSelect = document.getElementById("expiryTracking");
    const expiryAlertSelect = document.getElementById("expiryAlert");
    const expiredSaleSelect = document.getElementById("expiredSale");
    const nearExpirySelect = document.getElementById("nearExpiry");

    const valuationMethodSelect = document.getElementById("valuationMethod");
    const sellingValueSelect = document.getElementById("sellingValue");

    const adjPermSelect = document.getElementById("adjustmentPermission");
    const adjReasonSelect = document.getElementById("adjustmentReason");
    const negStockSelect = document.getElementById("negativeStock");
    const adjHistorySelect = document.getElementById("adjustmentHistory");

    // Checkboxes by text
    const chkLowStock = findCheckboxByText(container, "Low Stock Alert");
    const chkOutOfStock = findCheckboxByText(container, "Out of Stock Alert");
    const chkReorder = findCheckboxByText(container, "Reorder Alert");
    const chkOverstock = findCheckboxByText(container, "Overstock Alert");

    const chkPurchaseAdds = findCheckboxByText(container, "Purchase Adds Stock");
    const chkBillDeducts = findCheckboxByText(container, "Bill Deducts Stock");
    const chkReturnsAdd = findCheckboxByText(container, "Returns Add Stock");
    const chkDamageReduces = findCheckboxByText(container, "Damage Reduces Stock");

    const chkShowValue = findCheckboxByText(container, "Show Stock Value");
    const chkShowMin = findCheckboxByText(container, "Show Minimum Stock");
    const chkShowUpdated = findCheckboxByText(container, "Show Last Updated Date");

    // Populate inputs
    if (defaultMinInp) defaultMinInp.value = inv.defaultMinimumStock !== undefined ? inv.defaultMinimumStock : 10;
    if (defaultMaxInp) defaultMaxInp.value = inv.defaultMaximumStock !== undefined ? inv.defaultMaximumStock : 500;
    if (reorderLevelInp) reorderLevelInp.value = inv.reorderLevel !== undefined ? inv.reorderLevel : 20;
    if (stockUnitSelect && inv.defaultStockUnit) stockUnitSelect.value = inv.defaultStockUnit;

    if (chkLowStock) chkLowStock.checked = inv.lowStockAlerts !== false;
    if (chkOutOfStock) chkOutOfStock.checked = inv.outOfStockAlerts !== false;
    if (chkReorder) chkReorder.checked = inv.reorderAlerts !== false;
    if (chkOverstock) chkOverstock.checked = !!inv.overstockAlerts;

    if (expiryTrackingSelect) expiryTrackingSelect.value = inv.expiryTracking !== false ? "Enabled" : "Disabled";
    if (expiryAlertSelect && inv.expiryDays) expiryAlertSelect.value = `${inv.expiryDays} Days`;
    if (expiredSaleSelect) expiredSaleSelect.value = inv.expiredSale ? "Yes" : "No";
    if (nearExpirySelect && inv.nearExpiryStatus) nearExpirySelect.value = inv.nearExpiryStatus;

    if (valuationMethodSelect && inv.valuationMethod) valuationMethodSelect.value = inv.valuationMethod;
    if (sellingValueSelect) sellingValueSelect.value = inv.showSellingValue !== false ? "Yes" : "No";

    const movement = inv.movement || {};
    if (chkPurchaseAdds) chkPurchaseAdds.checked = movement.purchaseAddsStock !== false;
    if (chkBillDeducts) chkBillDeducts.checked = movement.billDeductsStock !== false;
    if (chkReturnsAdd) chkReturnsAdd.checked = movement.returnsAddStock !== false;
    if (chkDamageReduces) chkDamageReduces.checked = movement.damageReducesStock !== false;

    if (adjPermSelect && inv.adjustmentPermission) adjPermSelect.value = inv.adjustmentPermission;
    if (adjReasonSelect) adjReasonSelect.value = inv.requireAdjustmentReason !== false ? "Required" : "Optional";
    if (negStockSelect) negStockSelect.value = inv.allowNegativeStock ? "Yes" : "No";
    if (adjHistorySelect) adjHistorySelect.value = inv.keepAdjustmentHistory !== false ? "Enabled" : "Disabled";

    const display = inv.display || {};
    if (chkShowValue) chkShowValue.checked = display.showStockValue !== false;
    if (chkShowMin) chkShowMin.checked = display.showMinimumStock !== false;
    if (chkShowUpdated) chkShowUpdated.checked = display.showLastUpdated !== false;

    // Save button
    const saveBtn = container.querySelector(".form-actions .primary-btn") ||
                    Array.from(container.querySelectorAll("button")).find(b => /save inventory/i.test(b.textContent));

    if (saveBtn) {
        saveBtn.addEventListener("click", function (e) {
            e.preventDefault();

            let expiryDaysNum = 30;
            if (expiryAlertSelect) {
                const match = expiryAlertSelect.value.match(/\d+/);
                if (match) expiryDaysNum = Number.parseInt(match[0], 10);
            }

            const inventoryData = {
                defaultMinimumStock: defaultMinInp ? Math.max(0, Number(defaultMinInp.value) || 10) : 10,
                defaultMaximumStock: defaultMaxInp ? Math.max(1, Number(defaultMaxInp.value) || 500) : 500,
                reorderLevel: reorderLevelInp ? Math.max(0, Number(reorderLevelInp.value) || 20) : 20,
                defaultStockUnit: stockUnitSelect ? stockUnitSelect.value : "Pieces",
                lowStockAlerts: chkLowStock ? chkLowStock.checked : true,
                outOfStockAlerts: chkOutOfStock ? chkOutOfStock.checked : true,
                reorderAlerts: chkReorder ? chkReorder.checked : true,
                overstockAlerts: chkOverstock ? chkOverstock.checked : false,
                expiryTracking: expiryTrackingSelect ? expiryTrackingSelect.value === "Enabled" : true,
                expiryDays: expiryDaysNum,
                expiredSale: expiredSaleSelect ? expiredSaleSelect.value === "Yes" : false,
                nearExpiryStatus: nearExpirySelect ? nearExpirySelect.value : "Warning",
                valuationMethod: valuationMethodSelect ? valuationMethodSelect.value : "Purchase Price",
                showSellingValue: sellingValueSelect ? sellingValueSelect.value === "Yes" : true,
                movement: {
                    purchaseAddsStock: chkPurchaseAdds ? chkPurchaseAdds.checked : true,
                    billDeductsStock: chkBillDeducts ? chkBillDeducts.checked : true,
                    returnsAddStock: chkReturnsAdd ? chkReturnsAdd.checked : true,
                    damageReducesStock: chkDamageReduces ? chkDamageReduces.checked : true
                },
                adjustmentPermission: adjPermSelect ? adjPermSelect.value : "Admin Only",
                requireAdjustmentReason: adjReasonSelect ? adjReasonSelect.value === "Required" : true,
                allowNegativeStock: negStockSelect ? negStockSelect.value === "Yes" : false,
                keepAdjustmentHistory: adjHistorySelect ? adjHistorySelect.value === "Enabled" : true,
                display: {
                    showStockValue: chkShowValue ? chkShowValue.checked : true,
                    showMinimumStock: chkShowMin ? chkShowMin.checked : true,
                    showLastUpdated: chkShowUpdated ? chkShowUpdated.checked : true
                }
            };

            const success = saveSettings(inventoryData, "inventory");
            if (success) {
                if (typeof logActivity === "function") {
                    logActivity("Settings Updated", "Settings", "Inventory thresholds, alerts and valuation settings updated.");
                }
                notifyUser("Inventory settings saved successfully.", "success");
            } else {
                notifyUser("Could not save inventory settings.", "error");
            }
        });
    }
}


/* =========================================================
   4. EMPLOYEE SETTINGS PAGE (employee-settings.html)
   ========================================================= */
function initializeEmployeeSettingsPage() {
    const container = document.querySelector(".page-content");
    if (!container) return;

    const settings = getSettings();
    const emp = settings.employee || {};

    // Controls by ID
    const idFormatSelect = document.getElementById("employeeIdFormat");
    const defaultStatusSelect = document.getElementById("defaultStatus");
    const empTypeSelect = document.getElementById("employeeType");
    const salaryFreqSelect = document.getElementById("salaryFrequency");

    const workStartInp = document.getElementById("workStart");
    const workEndInp = document.getElementById("workEnd");
    const workingHoursInp = document.getElementById("workingHours");
    const lateGraceSelect = document.getElementById("lateGrace");

    const chkCheckInOut = findCheckboxByText(container, "Enable Check-In / Check-Out");
    const chkTrackLate = findCheckboxByText(container, "Track Late Arrivals");
    const chkTrackEarly = findCheckboxByText(container, "Track Early Departure");

    const overtimeStatusSelect = document.getElementById("overtimeStatus");
    const overtimeRateInp = document.getElementById("overtimeRate");
    const overtimeApprovalSelect = document.getElementById("overtimeApproval");
    const overtimeMinimumSelect = document.getElementById("overtimeMinimum");

    const annualLeaveInp = document.getElementById("annualLeave");
    const sickLeaveInp = document.getElementById("sickLeave");
    const casualLeaveInp = document.getElementById("casualLeave");
    const leaveApprovalSelect = document.getElementById("leaveApproval");

    const chkHalfDay = findCheckboxByText(container, "Allow Half-Day Leave");
    const chkLeaveReason = findCheckboxByText(container, "Require Leave Reason");
    const chkCarryForward = findCheckboxByText(container, "Allow Leave Carry Forward");

    const payrollDateInp = document.getElementById("payrollDate");
    const salaryCalcSelect = document.getElementById("salaryCalculation");
    const absentDeductSelect = document.getElementById("absentDeduction");
    const salaryPaymentSelect = document.getElementById("salaryPayment");

    const chkIncludeOvertime = findCheckboxByText(container, "Include Overtime in Payroll");
    const chkIncludeBonus = findCheckboxByText(container, "Include Bonuses");
    const chkTrackSalary = findCheckboxByText(container, "Track Salary Payment Status");

    // Populate values
    if (idFormatSelect && emp.idFormat) idFormatSelect.value = emp.idFormat;
    if (defaultStatusSelect && emp.defaultStatus) defaultStatusSelect.value = emp.defaultStatus;
    if (empTypeSelect && emp.employeeType) empTypeSelect.value = emp.employeeType;
    if (salaryFreqSelect && emp.salaryFrequency) salaryFreqSelect.value = emp.salaryFrequency;

    if (workStartInp && emp.workStart) workStartInp.value = emp.workStart;
    if (workEndInp && emp.workEnd) workEndInp.value = emp.workEnd;
    if (workingHoursInp) workingHoursInp.value = emp.workingHours !== undefined ? emp.workingHours : 8;
    if (lateGraceSelect && emp.lateGrace) lateGraceSelect.value = emp.lateGrace;

    if (chkCheckInOut) chkCheckInOut.checked = emp.checkInOut !== false;
    if (chkTrackLate) chkTrackLate.checked = emp.trackLate !== false;
    if (chkTrackEarly) chkTrackEarly.checked = emp.trackEarlyDeparture !== false;

    if (overtimeStatusSelect) overtimeStatusSelect.value = emp.overtimeStatus !== false ? "Enabled" : "Disabled";
    if (overtimeRateInp) overtimeRateInp.value = emp.overtimeRate !== undefined ? emp.overtimeRate : 150;
    if (overtimeApprovalSelect && emp.overtimeApproval) overtimeApprovalSelect.value = emp.overtimeApproval;
    if (overtimeMinimumSelect && emp.overtimeMinimum) overtimeMinimumSelect.value = emp.overtimeMinimum;

    if (annualLeaveInp) annualLeaveInp.value = emp.annualLeave !== undefined ? emp.annualLeave : 18;
    if (sickLeaveInp) sickLeaveInp.value = emp.sickLeave !== undefined ? emp.sickLeave : 12;
    if (casualLeaveInp) casualLeaveInp.value = emp.casualLeave !== undefined ? emp.casualLeave : 10;
    if (leaveApprovalSelect && emp.leaveApproval) leaveApprovalSelect.value = emp.leaveApproval;

    if (chkHalfDay) chkHalfDay.checked = emp.allowHalfDay !== false;
    if (chkLeaveReason) chkLeaveReason.checked = emp.requireLeaveReason !== false;
    if (chkCarryForward) chkCarryForward.checked = !!emp.leaveCarryForward;

    if (payrollDateInp) payrollDateInp.value = emp.payrollDate !== undefined ? emp.payrollDate : 1;
    if (salaryCalcSelect && emp.salaryCalculation) salaryCalcSelect.value = emp.salaryCalculation;
    if (absentDeductSelect) absentDeductSelect.value = emp.absentDeduction !== false ? "Enabled" : "Disabled";
    if (salaryPaymentSelect && emp.salaryPayment) salaryPaymentSelect.value = emp.salaryPayment;

    if (chkIncludeOvertime) chkIncludeOvertime.checked = emp.includeOvertimeInPayroll !== false;
    if (chkIncludeBonus) chkIncludeBonus.checked = emp.includeBonuses !== false;
    if (chkTrackSalary) chkTrackSalary.checked = emp.trackSalaryStatus !== false;

    // Save button
    const saveBtn = container.querySelector(".form-actions .primary-btn") ||
                    Array.from(container.querySelectorAll("button")).find(b => /save employee/i.test(b.textContent));

    if (saveBtn) {
        saveBtn.addEventListener("click", function (e) {
            e.preventDefault();

            const employeeData = {
                idFormat: idFormatSelect ? idFormatSelect.value : "EMP-001",
                defaultStatus: defaultStatusSelect ? defaultStatusSelect.value : "Active",
                employeeType: empTypeSelect ? empTypeSelect.value : "Full Time",
                salaryFrequency: salaryFreqSelect ? salaryFreqSelect.value : "Monthly",
                workStart: workStartInp ? workStartInp.value : "09:00",
                workEnd: workEndInp ? workEndInp.value : "18:00",
                workingHours: workingHoursInp ? Math.max(1, Math.min(24, Number(workingHoursInp.value) || 8)) : 8,
                lateGrace: lateGraceSelect ? lateGraceSelect.value : "10 Minutes",
                checkInOut: chkCheckInOut ? chkCheckInOut.checked : true,
                trackLate: chkTrackLate ? chkTrackLate.checked : true,
                trackEarlyDeparture: chkTrackEarly ? chkTrackEarly.checked : true,
                overtimeStatus: overtimeStatusSelect ? overtimeStatusSelect.value === "Enabled" : true,
                overtimeRate: overtimeRateInp ? Math.max(0, Number(overtimeRateInp.value) || 150) : 150,
                overtimeApproval: overtimeApprovalSelect ? overtimeApprovalSelect.value : "Manager / Admin",
                overtimeMinimum: overtimeMinimumSelect ? overtimeMinimumSelect.value : "30 Minutes",
                annualLeave: annualLeaveInp ? Math.max(0, Number(annualLeaveInp.value) || 18) : 18,
                sickLeave: sickLeaveInp ? Math.max(0, Number(sickLeaveInp.value) || 12) : 12,
                casualLeave: casualLeaveInp ? Math.max(0, Number(casualLeaveInp.value) || 10) : 10,
                leaveApproval: leaveApprovalSelect ? leaveApprovalSelect.value : "Manager / Admin",
                allowHalfDay: chkHalfDay ? chkHalfDay.checked : true,
                requireLeaveReason: chkLeaveReason ? chkLeaveReason.checked : true,
                leaveCarryForward: chkCarryForward ? chkCarryForward.checked : false,
                payrollDate: payrollDateInp ? Math.max(1, Math.min(28, Number(payrollDateInp.value) || 1)) : 1,
                salaryCalculation: salaryCalcSelect ? salaryCalcSelect.value : "Working Days Based",
                absentDeduction: absentDeductSelect ? absentDeductSelect.value === "Enabled" : true,
                salaryPayment: salaryPaymentSelect ? salaryPaymentSelect.value : "Bank Transfer",
                includeOvertimeInPayroll: chkIncludeOvertime ? chkIncludeOvertime.checked : true,
                includeBonuses: chkIncludeBonus ? chkIncludeBonus.checked : true,
                trackSalaryStatus: chkTrackSalary ? chkTrackSalary.checked : true
            };

            const success = saveSettings(employeeData, "employee");
            if (success) {
                if (typeof logActivity === "function") {
                    logActivity("Settings Updated", "Settings", "Employee hours, leave and payroll settings updated.");
                }
                notifyUser("Employee settings saved successfully.", "success");
            } else {
                notifyUser("Could not save employee settings.", "error");
            }
        });
    }
}


/* =========================================================
   5. NOTIFICATION SETTINGS PAGE (notification-settings.html)
   ========================================================= */
function initializeNotificationSettingsPage() {
    const container = document.querySelector(".page-content");
    if (!container) return;

    const settings = getSettings();
    const notif = settings.notifications || {};
    const rules = notif.rules || {};

    const notifStatusSelect = document.getElementById("notificationStatus");
    const notifSoundSelect = document.getElementById("notificationSound");
    const notifDurationSelect = document.getElementById("notificationDuration");
    const notifPosSelect = document.getElementById("notificationPosition");

    const expiryNotifSelect = document.getElementById("expiryNotification");
    const expiryDaysSelect = document.getElementById("expiryDays");

    if (notifStatusSelect) notifStatusSelect.value = notif.enabled !== false ? "Enabled" : "Disabled";
    if (notifSoundSelect) notifSoundSelect.value = notif.sound !== false ? "Enabled" : "Disabled";
    if (notifDurationSelect && notif.duration) notifDurationSelect.value = notif.duration;
    if (notifPosSelect && notif.position) notifPosSelect.value = notif.position;

    if (expiryNotifSelect) expiryNotifSelect.value = notif.expiry !== false ? "Enabled" : "Disabled";
    if (expiryDaysSelect && notif.expiryDays) expiryDaysSelect.value = `${notif.expiryDays} Days`;

    // Map all notification rule checkboxes by unique descriptive text
    function getRuleKey(chk) {
        const item = chk.closest(".notification-rule, label");
        const title = item?.querySelector("strong")?.textContent.trim() || item?.textContent.trim() || "";
        return title.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    }

    const allChecks = Array.from(container.querySelectorAll("input[type='checkbox']"));
    allChecks.forEach(chk => {
        const key = getRuleKey(chk);
        if (rules[key] !== undefined) {
            chk.checked = !!rules[key];
        }
    });

    const saveBtn = container.querySelector(".form-actions .primary-btn") ||
                    Array.from(container.querySelectorAll("button")).find(b => /save notification/i.test(b.textContent));

    if (saveBtn) {
        saveBtn.addEventListener("click", function (e) {
            e.preventDefault();

            let expiryDaysNum = 30;
            if (expiryDaysSelect) {
                const match = expiryDaysSelect.value.match(/\d+/);
                if (match) expiryDaysNum = Number.parseInt(match[0], 10);
            }

            const updatedRules = Object.assign({}, rules);
            allChecks.forEach(chk => {
                const key = getRuleKey(chk);
                if (key) updatedRules[key] = chk.checked;
            });

            // Map major categories to top-level booleans for fast lookup in modules
            const notifData = {
                enabled: notifStatusSelect ? notifStatusSelect.value === "Enabled" : true,
                sound: notifSoundSelect ? notifSoundSelect.value === "Enabled" : true,
                duration: notifDurationSelect ? notifDurationSelect.value : "5 Seconds",
                position: notifPosSelect ? notifPosSelect.value : "Top Right",
                expiry: expiryNotifSelect ? expiryNotifSelect.value === "Enabled" : true,
                expiryDays: expiryDaysNum,
                lowStock: updatedRules["low_stock_alert"] !== false,
                outOfStock: updatedRules["out_of_stock_alert"] !== false,
                duePayment: updatedRules["due_payment_reminder"] !== false,
                payroll: updatedRules["salary_generated"] !== false,
                leaveRequest: updatedRules["leave_request"] !== false,
                rules: updatedRules
            };

            const success = saveSettings(notifData, "notifications");
            if (success) {
                if (typeof logActivity === "function") {
                    logActivity("Settings Updated", "Settings", "Notification preferences and alert rules saved.");
                }
                notifyUser("Notification settings saved successfully.", "success");
            } else {
                notifyUser("Could not save notification settings.", "error");
            }
        });
    }
}


/* =========================================================
   6. BACKUP & DATA PAGE (backup-settings.html)
   ========================================================= */
function initializeBackupSettingsPage() {
    const container = document.querySelector(".page-content");
    if (!container) return;

    // 1. Calculate live database size
    let totalBytes = 0;
    if (typeof STORAGE_KEYS !== "undefined") {
        Object.values(STORAGE_KEYS).forEach(k => {
            const item = localStorage.getItem(k);
            if (item) totalBytes += (k.length + item.length) * 2;
        });
    }
    const sizeKB = (totalBytes / 1024).toFixed(2);

    const sizeEl = document.querySelector(".backup-details div:nth-child(2) strong");
    if (sizeEl) sizeEl.textContent = `${sizeKB} KB`;

    const dbEl = document.querySelector(".backup-details div:nth-child(3) strong");
    if (dbEl) {
        dbEl.textContent = "LocalStorage (Ready)";
        dbEl.style.color = "#10b981";
    }

    const today = typeof getToday === "function" ? getToday() : new Date().toISOString().slice(0, 10);

    const exportJson = (filename, data) => {
        const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 500);
    };

    const downloadText = (filename, content, type) => {
        const url = URL.createObjectURL(new Blob([content], { type }));
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 500);
    };

    const collectAllData = () => {
        const res = {};
        if (typeof STORAGE_KEYS !== "undefined") {
            Object.values(STORAGE_KEYS).forEach(k => {
                res[k] = Storage.get(k, null);
            });
        }
        return res;
    };

    // Backup Now Button
    const backupBtn = Array.from(document.querySelectorAll("button")).find(b => /backup now/i.test(b.textContent));
    backupBtn?.addEventListener("click", function () {
        exportJson(`mms_backup_${today}.json`, collectAllData());
        const lastBackupEl = document.querySelector(".backup-details div:first-child strong");
        const nowStr = new Date().toLocaleString("en-IN");
        if (lastBackupEl) lastBackupEl.textContent = nowStr;

        const curSettings = getSettings();
        curSettings.backup = curSettings.backup || {};
        curSettings.backup.lastBackup = nowStr;
        saveSettings(curSettings);

        if (typeof logActivity === "function") logActivity("Database Backup", "Settings", `Created a JSON backup (${sizeKB} KB).`);
        notifyUser("Backup downloaded as JSON.", "success");
    });

    // Populate last backup if saved
    const savedBackup = getSettings().backup || {};
    if (savedBackup.lastBackup) {
        const lastBackupEl = document.querySelector(".backup-details div:first-child strong");
        if (lastBackupEl) lastBackupEl.textContent = savedBackup.lastBackup;
    }

    // Data export selections
    const selectedCollections = () => {
        const checked = Array.from(document.querySelectorAll(".data-export-grid input[type='checkbox']:checked"));
        const map = {
            Products: [STORAGE_KEYS.PRODUCTS],
            Inventory: [STORAGE_KEYS.INVENTORY, STORAGE_KEYS.STOCK_ADJUSTMENTS],
            Suppliers: [STORAGE_KEYS.SUPPLIERS, STORAGE_KEYS.PURCHASES],
            Customers: [STORAGE_KEYS.CUSTOMERS, STORAGE_KEYS.BILLS],
            Employees: [STORAGE_KEYS.EMPLOYEES, STORAGE_KEYS.ATTENDANCE, STORAGE_KEYS.LEAVES, STORAGE_KEYS.PAYROLL],
            Attendance: [STORAGE_KEYS.ATTENDANCE, STORAGE_KEYS.LEAVES],
            Billing: [STORAGE_KEYS.BILLS],
            Expenses: [STORAGE_KEYS.EXPENSES]
        };
        const keys = new Set();
        checked.forEach(input => {
            const label = input.closest("label")?.querySelector("strong")?.textContent.trim();
            (map[label] || []).forEach(k => keys.add(k));
        });
        return Array.from(keys);
    };

    const exportRows = keys => keys.flatMap(key => {
        const value = Storage.get(key, []);
        const records = Array.isArray(value) ? value : [value];
        return records.filter(record => record && typeof record === "object").map(record => ({
            collection: key.replace("mms_", ""),
            id: record.id || "",
            name: record.name || record.customerName || record.supplierName || record.employeeName || "",
            date: record.date || record.billDate || record.purchaseDate || "",
            status: record.status || record.paymentStatus || "",
            amount: record.amount ?? record.grandTotal ?? "",
            details: JSON.stringify(record)
        }));
    });

    const quoteCsv = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csvColumns = ["Collection", "ID", "Name", "Date", "Status", "Amount", "Record JSON"];

    const exportCsvBtn = Array.from(document.querySelectorAll(".data-export-actions button")).find(b => /export csv/i.test(b.textContent));
    exportCsvBtn?.addEventListener("click", () => {
        const rows = exportRows(selectedCollections());
        const content = "\uFEFF" + [csvColumns, ...rows.map(row => [row.collection, row.id, row.name, row.date, row.status, row.amount, row.details])].map(row => row.map(quoteCsv).join(",")).join("\r\n");
        downloadText(`mms_export_${today}.csv`, content, "text/csv;charset=utf-8");
        notifyUser(`Exported ${rows.length} records as CSV.`, "success");
    });

    const exportExcelBtn = Array.from(document.querySelectorAll(".data-export-actions button")).find(b => /export excel/i.test(b.textContent));
    exportExcelBtn?.addEventListener("click", () => {
        const rows = exportRows(selectedCollections());
        const escape = val => String(val ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
        const html = `<table><thead><tr>${csvColumns.map(col => `<th>${escape(col)}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${[row.collection, row.id, row.name, row.date, row.status, row.amount, row.details].map(val => `<td>${escape(val)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
        downloadText(`mms_export_${today}.xls`, `<!doctype html><html><meta charset="utf-8"><body>${html}</body></html>`, "application/vnd.ms-excel");
        notifyUser(`Exported ${rows.length} records as Excel.`, "success");
    });

    const exportAllBtn = Array.from(document.querySelectorAll(".data-export-actions button")).find(b => /export all data/i.test(b.textContent));
    exportAllBtn?.addEventListener("click", () => {
        exportJson(`mms_full_export_${today}.json`, collectAllData());
        notifyUser("All application data exported as JSON.", "success");
    });

    // Restore Backup Handler
    const fileInput = document.getElementById("backupFile");
    const restoreBtn = document.querySelector(".restore-area button");
    restoreBtn?.addEventListener("click", () => {
        if (!fileInput?.files?.length) {
            notifyUser("Please select a JSON backup file first.", "warning");
            return;
        }
        if (!window.confirm("Restoring this backup will update matching local data collections. Do you want to continue?")) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const imported = JSON.parse(String(reader.result || ""));
                if (!imported || Array.isArray(imported) || typeof imported !== "object") throw new Error("Backup file must contain a valid JSON object.");
                const allowed = new Set(Object.values(STORAGE_KEYS));
                const entries = Object.entries(imported).filter(([k, val]) => allowed.has(k) && val !== undefined);
                if (!entries.length) throw new Error("No recognized MMS data collections found in the file.");

                let count = 0;
                for (const [key, value] of entries) {
                    if (Storage.set(key, value)) count++;
                }

                if (typeof logActivity === "function") {
                    logActivity("Database Restore", "Settings", `Restored ${count} data collections from JSON backup.`);
                }
                notifyUser(`Successfully restored ${count} data collections. Reloading...`, "success");
                setTimeout(() => window.location.reload(), 800);
            } catch (err) {
                notifyUser(err.message || "Invalid backup file.", "error");
            }
        };
        reader.onerror = () => notifyUser("Failed to read the backup file.", "error");
        reader.readAsText(fileInput.files[0]);
    });

    // Clear temp / Reset settings / Delete all actions
    const dataActions = document.querySelectorAll(".data-management-item");
    dataActions.forEach(item => {
        const label = item.querySelector("strong")?.textContent || "";
        const button = item.querySelector("button");
        if (/clear temporary/i.test(label)) {
            button?.addEventListener("click", () => {
                const keys = Object.keys(localStorage).filter(k => k.startsWith("mms_temp_"));
                keys.forEach(k => localStorage.removeItem(k));
                notifyUser(keys.length ? `Cleared ${keys.length} temporary entries.` : "No temporary data found.", "success");
            });
        }
        if (/reset application settings/i.test(label)) {
            button?.addEventListener("click", () => {
                if (!window.confirm("Reset settings to default values? Your products, billing and inventory data will be kept intact.")) return;
                const defs = typeof DEFAULT_SETTINGS !== "undefined" ? DEFAULT_SETTINGS : {};
                if (!Storage.set(STORAGE_KEYS.SETTINGS, defs)) {
                    notifyUser("Could not reset settings.", "error");
                    return;
                }
                notifyUser("Settings reset to defaults. Reloading...", "success");
                setTimeout(() => window.location.reload(), 600);
            });
        }
        if (/delete all application data/i.test(label)) {
            button?.addEventListener("click", () => {
                if (!window.confirm("CAUTION: This will permanently wipe all local database records. Are you completely sure?")) return;
                if (!Storage.clear()) {
                    notifyUser("Could not delete data.", "error");
                    return;
                }
                window.location.reload();
            });
        }
    });

    // Automatic Backup Form
    const backupStatus = document.getElementById("backupStatus");
    const backupFrequency = document.getElementById("backupFrequency");
    const backupTime = document.getElementById("backupTime");
    const retention = document.getElementById("retention");

    if (backupStatus) backupStatus.value = savedBackup.enabled ? "Enabled" : "Disabled";
    if (backupFrequency && savedBackup.frequency) backupFrequency.value = savedBackup.frequency;
    if (backupTime && savedBackup.time) backupTime.value = savedBackup.time;
    if (retention && savedBackup.retention) retention.value = savedBackup.retention;

    const saveBackupBtn = Array.from(document.querySelectorAll(".form-actions button")).find(b => /save backup settings/i.test(b.textContent));
    saveBackupBtn?.addEventListener("click", () => {
        const updatedBackup = {
            enabled: backupStatus?.value === "Enabled",
            frequency: backupFrequency?.value || "Every Week",
            time: backupTime?.value || "23:00",
            retention: retention?.value || "30 Days",
            lastBackup: savedBackup.lastBackup || "Never"
        };
        const success = saveSettings(updatedBackup, "backup");
        if (success) {
            notifyUser("Backup preferences saved successfully.", "success");
        } else {
            notifyUser("Could not save backup settings.", "error");
        }
    });
}


/* =========================================================
   ROUTER INITIALIZATION
   Runs when DOM is fully loaded.
   ========================================================= */
if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", function () {
        const path = (window.location && window.location.pathname) ? window.location.pathname.toLowerCase() : "";
        const adminSettingsPage = /\/(settings|store-settings|billing-settings|billing-setting|inventory-settings|employee-settings|notification-settings|backup-settings)\.html$/.test(path);
        if (adminSettingsPage && !hasLocalAdminSession()) {
            const loginPath = /[\\/]pages[\\/]/i.test(path) ? "../index.html" : "index.html";
            window.location.replace(loginPath);
            return;
        }

        if (path.includes("store-settings.html")) {
            initializeStoreSettingsPage();
            initializeSidebarAppearanceSettings();
        } else if (path.includes("billing-settings.html") || path.includes("billing-setting.html")) {
            initializeBillingSettingsPage();
        } else if (path.includes("inventory-settings.html")) {
            initializeInventorySettingsPage();
        } else if (path.includes("employee-settings.html")) {
            initializeEmployeeSettingsPage();
        } else if (path.includes("notification-settings.html")) {
            initializeNotificationSettingsPage();
        } else if (path.includes("backup-settings.html")) {
            initializeBackupSettingsPage();
        } else if (path.endsWith("settings.html") || path.includes("/settings.html") || path.includes("\\settings.html")) {
            initializeSettingsOverviewPage();
        }
    });
}
