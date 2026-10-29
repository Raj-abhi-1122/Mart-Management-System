/* =========================================================
   MART MANAGEMENT SYSTEM
   COMMON APPLICATION CONTROLLER & SERVICES
   ========================================================= */

// Ensure core database is available
if (typeof initializeDatabase === "function") {
    initializeDatabase();
}

/**
 * Log an activity to LocalStorage
 */
function logActivity(action, module, details, user = "Admin Owner") {
    try {
        if (typeof Storage === "undefined") return;
        const logs = Storage.get(STORAGE_KEYS.ACTIVITY_LOGS, []);
        const today = typeof getToday === "function" ? getToday() : new Date().toISOString().split("T")[0];
        const newLog = {
            id: typeof generateId === "function" ? generateId("ACT") : "ACT-" + Date.now(),
            timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
            date: today,
            user: user,
            action: action,
            module: module,
            details: details
        };
        logs.unshift(newLog);
        // Keep max 200 activity logs
        if (logs.length > 200) logs.pop();
        Storage.set(STORAGE_KEYS.ACTIVITY_LOGS, logs);
    } catch (e) {
        console.error("Activity log error:", e);
    }
}

/**
 * Create a new notification
 */
function addNotification(title, message, type = "System", priority = "Medium", dedupeKey = "") {
    try {
        if (typeof Storage === "undefined") return;
        const notifs = Storage.get(STORAGE_KEYS.NOTIFICATIONS, []);
        const today = typeof getToday === "function" ? getToday() : new Date().toISOString().split("T")[0];
        const uniqueKey = dedupeKey || `event:${type}:${title}:${message}:${today}`;
        if (notifs.some(item => item.dedupeKey === uniqueKey)) return false;
        const newNotif = {
            id: typeof generateId === "function" ? generateId("NOTIF") : "NOTIF-" + Date.now(),
            title: title,
            message: message,
            type: type,
            priority: priority,
            date: today,
            createdAt: new Date().toISOString(),
            read: false,
            dedupeKey: uniqueKey
        };
        notifs.unshift(newNotif);
        if (!Storage.set(STORAGE_KEYS.NOTIFICATIONS, notifs)) return false;
        updateNavbarNotifications();
        return true;
    } catch (e) {
        console.error("Notification creation error:", e);
    }
}

function notificationRuleEnabled(key) {
    const settings = Storage.get(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    const preferences = settings?.notifications || {};
    if (preferences.enabled === false || preferences.enabled === "Disabled") return false;
    if (preferences[key] === false) return false;
    if (preferences.rules?.[key] === false) return false;
    return true;
}

function refreshConditionNotifications() {
    if (typeof Storage === "undefined") return;
    const settings = Storage.get(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    const prefs = settings?.notifications || {};
    const alerts = [];
    const today = typeof getToday === "function" ? getToday() : new Date().toISOString().slice(0, 10);
    const products = Storage.get(STORAGE_KEYS.PRODUCTS, []);
    if (prefs.enabled !== false && prefs.enabled !== "Disabled") {
        products.forEach(product => {
            if ((product.status || "Active") === "Inactive") return;
            const stock = Number(product.stock) || 0;
            const minimum = Number(product.minimumStock) || 0;
            if (stock <= 0 && prefs.outOfStock !== false && prefs.rules?.outOfStockAlert !== false) {
                alerts.push({ key: `stock:${product.id}:out`, productName: product.name, title: "Out of Stock", message: `${product.name} is out of stock.`, type: "Inventory", priority: "Critical" });
            } else if (stock > 0 && stock <= minimum && prefs.lowStock !== false && prefs.rules?.lowStockAlert !== false) {
                alerts.push({ key: `stock:${product.id}:low`, productName: product.name, title: "Low Stock", message: `${product.name} has ${stock} units remaining (minimum ${minimum}).`, type: "Inventory", priority: "High" });
            }
            if (product.expiryDate && prefs.expiry !== false) {
                const days = Number(prefs.expiryDays) || 30;
                const daysLeft = Math.ceil((new Date(`${product.expiryDate}T00:00:00`) - new Date(`${today}T00:00:00`)) / 86400000);
                if (Number.isFinite(daysLeft) && daysLeft <= days) {
                    const expired = daysLeft < 0;
                    if ((!expired && prefs.rules?.nearExpiryAlert !== false) || (expired && prefs.rules?.expiredProductAlert !== false)) alerts.push({ key: `expiry:${product.id}:${expired ? "expired" : "near"}`, productName: product.name, title: expired ? "Product Expired" : "Product Near Expiry", message: `${product.name} ${expired ? `expired ${Math.abs(daysLeft)} days ago` : `expires in ${daysLeft} days`}.`, type: "Inventory", priority: expired ? "Critical" : "High" });
                }
            }
        });
        if (prefs.duePayment !== false && prefs.rules?.pendingPaymentAlert !== false) {
            Storage.get(STORAGE_KEYS.BILLS, []).filter(bill => Number(bill.dueAmount) > 0).forEach(bill => alerts.push({ key: `bill-due:${bill.id || bill.billNumber}`, title: "Customer Payment Due", message: `${bill.customerName || "Customer"} has ₹${Number(bill.dueAmount).toFixed(2)} due on bill ${bill.id || bill.billNumber}.`, type: "Billing", priority: "Medium" }));
        }
        if (prefs.supplierDue !== false && prefs.rules?.pendingSupplierPayment !== false) {
            Storage.get(STORAGE_KEYS.PURCHASES, []).filter(purchase => !purchase.cancelled && Number(purchase.dueAmount) > 0).forEach(purchase => alerts.push({ key: `purchase-due:${purchase.id}`, supplierName: purchase.supplierName || "supplier", title: "Supplier Payment Due", message: `₹${Number(purchase.dueAmount).toFixed(2)} is due to ${purchase.supplierName || "supplier"} for ${purchase.invoiceNumber || purchase.id}.`, type: "Purchase", priority: "Medium" }));
        }
    }
    const stored = Storage.get(STORAGE_KEYS.NOTIFICATIONS, []);
    const liveKeys = new Set(alerts.map(alert => alert.key));
    const dismissed = new Set(prefs.dismissedConditions || []);
    let settingsChanged = false;
    Array.from(dismissed).forEach(key => { if (!liveKeys.has(key)) { dismissed.delete(key); settingsChanged = true; } });
    let changed = false;
    stored.forEach(item => {
        if (item.conditionKey && !liveKeys.has(item.conditionKey) && !item.resolvedAt) {
            item.resolvedAt = new Date().toISOString();
            item.read = true;
            changed = true;
        }
    });
    const existingActiveKeys = new Set(stored.filter(item => item.conditionKey && !item.resolvedAt).map(item => item.conditionKey));
    alerts.forEach(alert => {
        if (dismissed.has(alert.key)) return;
        if (existingActiveKeys.has(alert.key)) return;
        const subject = String(alert.productName || alert.supplierName || "").toLowerCase();
        const titleToken = alert.title.toLowerCase().split(" ")[0];
        const legacy = subject ? stored.find(item => !item.conditionKey && !item.resolvedAt && item.type === alert.type
            && String(item.message || "").toLowerCase().includes(subject)
            && String(item.title || "").toLowerCase().includes(titleToken)) : null;
        if (legacy) {
            legacy.conditionKey = alert.key;
            existingActiveKeys.add(alert.key);
            changed = true;
            return;
        }
        stored.unshift({ id: typeof generateId === "function" ? generateId("NOTIF") : `NOTIF-${Date.now()}-${Math.random()}`, title: alert.title, message: alert.message, type: alert.type, priority: alert.priority, date: today, createdAt: new Date().toISOString(), read: false, conditionKey: alert.key });
        existingActiveKeys.add(alert.key);
        changed = true;
    });
    const entries = [];
    if (changed) entries.push([STORAGE_KEYS.NOTIFICATIONS, stored]);
    if (settingsChanged) { settings.notifications.dismissedConditions = Array.from(dismissed); entries.push([STORAGE_KEYS.SETTINGS, settings]); }
    if (entries.length && Storage.setMany(entries)) updateNavbarNotifications();
}

/**
 * Update unread notification badge in navbar
 */
function updateNavbarNotifications() {
    if (typeof Storage === "undefined") return;
    const notifs = Storage.get(STORAGE_KEYS.NOTIFICATIONS, []);
    const unreadCount = notifs.filter(n => !n.read).length;

    // Look for notifications link in sidebar or navbar
    const notifLinks = document.querySelectorAll('a[href*="notifications.html"]');
    notifLinks.forEach(link => {
        let badge = link.querySelector(".notif-badge");
        if (unreadCount > 0) {
            if (!badge) {
                badge = document.createElement("span");
                badge.className = "notif-badge";
                badge.style.cssText = "background: #ef4444; color: white; border-radius: 10px; padding: 1px 7px; font-size: 11px; margin-left: 6px; font-weight: bold;";
                link.appendChild(badge);
            }
            badge.textContent = unreadCount;
        } else if (badge) {
            badge.remove();
        }
    });
}

/**
 * Show clean toast notification on top-right
 */
function showToast(message, type = "success") {
    let container = document.getElementById("mms-toast-container");
    const preferences = Storage.get(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS)?.notifications || {};
    if (!container) {
        container = document.createElement("div");
        container.id = "mms-toast-container";
        container.style.cssText = "position: fixed; z-index: 999999; display: flex; flex-direction: column; gap: 10px;";
        document.body.appendChild(container);
    }
    const positions = {
        "Top Right": "top:20px;right:20px;",
        "Top Center": "top:20px;left:50%;transform:translateX(-50%);",
        "Bottom Right": "bottom:20px;right:20px;",
        "Bottom Center": "bottom:20px;left:50%;transform:translateX(-50%);"
    };
    container.style.cssText = `position:fixed;z-index:999999;display:flex;flex-direction:column;gap:10px;${positions[preferences.notificationPosition] || positions["Top Right"]}`;

    const toast = document.createElement("div");
    const bgColor = type === "success" ? "#10b981" : type === "error" ? "#ef4444" : type === "warning" ? "#f59e0b" : "#3b82f6";
    toast.style.cssText = `background: ${bgColor}; color: #ffffff; padding: 12px 20px; border-radius: 8px; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 8px; animation: slideIn 0.3s ease;`;
    const icon = document.createElement("span");
    icon.textContent = type === "success" ? "✓" : type === "error" ? "✕" : "ℹ";
    const text = document.createElement("span");
    text.textContent = String(message ?? "");
    toast.append(icon, text);
    if (preferences.notificationSound === "Enabled") {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                const audio = new AudioContextClass();
                const oscillator = audio.createOscillator();
                const gain = audio.createGain();
                oscillator.frequency.value = type === "error" ? 520 : 740;
                gain.gain.value = 0.035;
                oscillator.connect(gain); gain.connect(audio.destination);
                oscillator.start(); oscillator.stop(audio.currentTime + 0.08);
                oscillator.onended = () => audio.close();
            }
        } catch (error) { /* Audio is optional and may be unavailable in the browser. */ }
    }
    const duration = String(preferences.notificationDuration || "5 Seconds");
    if (duration === "Until Dismissed") {
        const close = document.createElement("button");
        close.type = "button";
        close.setAttribute("aria-label", "Dismiss notification");
        close.textContent = "×";
        close.style.cssText = "margin-left:8px;border:0;background:transparent;color:white;font-size:20px;cursor:pointer;";
        close.addEventListener("click", () => toast.remove());
        toast.appendChild(close);
    }
    container.appendChild(toast);

    if (duration !== "Until Dismissed") setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transition = "opacity 0.3s ease";
        setTimeout(() => toast.remove(), 300);
    }, (Number.parseInt(duration, 10) || 5) * 1000);
}

/**
 * Handle user logout
 */
function handleLogout(event) {
    if (event) event.preventDefault();
    if (confirm("Are you sure you want to log out of Mart Management System?")) {
        if (typeof Storage !== "undefined") {
            Storage.remove("mms_auth_user");
        } else {
            localStorage.removeItem("mms_auth_user");
        }
        // Redirect to login page
        const isPagesDir = window.location.pathname.includes("/pages/") || window.location.pathname.includes("\\pages\\");
        window.location.href = isPagesDir ? "../index.html" : "index.html";
    }
}

/**
 * Maps sub-pages to their parent sidebar menu item
 */
const SIDEBAR_PARENT_MAP = {
    "add-product.html":           "products.html",
    "add-customer.html":          "customers.html",
    "add-employee.html":          "employees.html",
    "add-expense.html":           "expenses.html",
    "add-supplier.html":          "suppliers.html",
    "add-purchases.html":         "purchases.html",
    "new-bill.html":              "billing.html",
    "bill-details.html":          "billing.html",
    "bill-history.html":          "billing.html",
    "customer-details.html":      "customers.html",
    "employee-details.html":      "employees.html",
    "employee-attendance.html":   "attendance.html",
    "supplier-details.html":      "suppliers.html",
    "stock-adjustment.html":      "inventory.html",
    "leave-management.html":      "attendance.html",
    "payroll.html":               "employees.html",
    "expense-details.html":       "expenses.html",
    "profit-loss.html":           "reports.html",
    "sales-reports.html":         "reports.html",
    "purchase-reports.html":      "reports.html",
    "inventory-reports.html":     "reports.html",
    "attendance-reports.html":    "attendance.html",
    "expense-reports.html":       "expenses.html",
    "store-settings.html":        "settings.html",
    "billing-settings.html":      "settings.html",
    "billing-setting.html":       "settings.html",
    "inventory-settings.html":    "settings.html",
    "employee-settings.html":     "settings.html",
    "notification-settings.html": "settings.html",
    "backup-settings.html":       "settings.html",
    "activity-log.html":          "settings.html",
    "notifications.html":         "notifications.html",
};

/**
 * Highlight active menu in sidebar based on current page URL
 */
function highlightActiveSidebarMenu() {
    const currentPath = window.location.pathname;
    const rawFile = currentPath.substring(currentPath.lastIndexOf("/") + 1) || "dashboard.html";
    // Resolve to the page that should be highlighted (parent or self)
    const targetFile = SIDEBAR_PARENT_MAP[rawFile] || rawFile;

    const menuItems = document.querySelectorAll(".sidebar-menu .menu-item");
    const sidebarNav = document.querySelector(".sidebar nav");
    if (sidebarNav) sidebarNav.setAttribute("aria-label", "Main navigation");
    menuItems.forEach(item => {
        const label = item.textContent.replace(/\s+/g, " ").trim();
        if (label) {
            item.setAttribute("aria-label", label);
            item.title = label;
        }
        const href = item.getAttribute("href");
        if (href) {
            const linkFile = href.substring(href.lastIndexOf("/") + 1);
            if (linkFile === targetFile || linkFile === rawFile) {
                item.classList.add("active");
                item.setAttribute("aria-current", "page");
                if (window.matchMedia?.("(max-width: 900px)").matches) item.scrollIntoView({ block: "nearest", inline: "nearest" });
            } else {
                item.classList.remove("active");
                item.removeAttribute("aria-current");
            }
        }
    });
}

/**
 * Synchronize store branding in header
 */
function syncStoreBranding() {
    if (typeof Storage === "undefined") return;
    const settings = Storage.get(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    const storeName = settings?.store?.name || "Mart System";

    const logoHeaders = document.querySelectorAll(".sidebar-logo h2");
    logoHeaders.forEach(header => {
        header.textContent = "🏪 " + storeName;
    });

    const adminBadges = document.querySelectorAll(".admin-info, .user-info");
    const authUser = Storage.get(STORAGE_KEYS.AUTH_USER, {});
    const ownerName = settings?.store?.owner || authUser?.name || "Admin";
    adminBadges.forEach(badge => {
        badge.textContent = `👤 ${ownerName}`;
    });
}

function initializeAdminProfileMenu() {
    document.querySelectorAll(".admin-info, .user-info").forEach((badge, index) => {
        if (badge.dataset.profileMenuReady) return;
        badge.dataset.profileMenuReady = "true";
        badge.setAttribute("role", "button");
        badge.setAttribute("tabindex", "0");
        badge.setAttribute("aria-haspopup", "menu");
        badge.setAttribute("aria-expanded", "false");
        badge.setAttribute("aria-label", "Open admin profile menu");
        badge.style.cursor = "pointer";
        const wrapper = badge.parentElement;
        if (!wrapper) return;
        wrapper.style.position = "relative";
        let menu = wrapper.querySelector(":scope > .admin-profile-menu");
        if (!menu) {
            menu = document.createElement("div");
            menu.className = "admin-profile-menu";
            menu.id = `admin-profile-menu-${index}`;
            menu.setAttribute("role", "menu");
            menu.hidden = true;
            badge.setAttribute("aria-controls", menu.id);
            const settings = Storage.get(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
            const user = Storage.get(STORAGE_KEYS.AUTH_USER, {});
            const name = settings?.store?.owner || user?.name || "Admin";
            const email = settings?.store?.email || user?.email || "";
            const heading = document.createElement("strong"); heading.className = "profile-menu-name"; heading.textContent = name;
            const subheading = document.createElement("span"); subheading.className = "profile-menu-email"; subheading.textContent = email;
            const profileLink = document.createElement("a"); profileLink.href = "store-settings.html"; profileLink.textContent = "Store and owner profile"; profileLink.setAttribute("role", "menuitem");
            const settingsLink = document.createElement("a"); settingsLink.href = "settings.html"; settingsLink.textContent = "Settings"; settingsLink.setAttribute("role", "menuitem");
            menu.append(heading, subheading, profileLink, settingsLink);
            wrapper.appendChild(menu);
        }
        const toggle = () => { const open = !menu.hidden; document.querySelectorAll(".admin-profile-menu").forEach(item => { item.hidden = true; }); document.querySelectorAll(".admin-info, .user-info").forEach(item => item.setAttribute("aria-expanded", "false")); menu.hidden = open; badge.setAttribute("aria-expanded", String(!open)); };
        badge.addEventListener("click", toggle);
        badge.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggle(); } });
        document.addEventListener("click", event => { if (!wrapper.contains(event.target)) { menu.hidden = true; badge.setAttribute("aria-expanded", "false"); } });
        document.addEventListener("keydown", event => { if (event.key === "Escape" && !menu.hidden) { menu.hidden = true; badge.setAttribute("aria-expanded", "false"); badge.focus(); } });
    });
}

function exportVisibleTablesCsv(filenamePrefix = "mms_report") {
    const tables = Array.from(document.querySelectorAll("main table, .page-content table, .table-container table"));
    const exportTables = tables.filter(table => table.rows.length > 0);
    const sections = [];
    exportTables.forEach((table, index) => {
        if (index) sections.push([]);
        Array.from(table.rows).forEach(row => {
            sections.push(Array.from(row.cells).map(cell => cell.innerText.trim()));
        });
    });
    if (!sections.length) {
        const cards = Array.from(document.querySelectorAll(".summary-card"));
        cards.forEach(card => {
            const label = card.querySelector("h2, h3, span")?.textContent.trim() || "Metric";
            const value = card.querySelector("strong, p")?.textContent.trim() || "";
            sections.push([label, value]);
        });
    }
    if (!sections.length) {
        if (typeof showToast === "function") showToast("There is no report data to export.", "warning");
        return false;
    }
    const quote = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = "\uFEFF" + sections.map(row => row.map(quote).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    const today = typeof getToday === "function" ? getToday() : new Date().toISOString().slice(0, 10);
    link.download = `${filenamePrefix}_${today}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    return true;
}

function initializeTablePagination() {
    const containers = Array.from(document.querySelectorAll(".pagination, .employee-pagination .pagination-buttons, .expense-pagination, .leave-pagination"));
    if (!containers.length) return;
    const table = document.querySelector(".page-content .table-container table");
    const body = table?.tBodies?.[0];
    if (!body) return;

    containers.forEach(container => {
        if (container.dataset.paginationAttached) return;
        container.dataset.paginationAttached = "true";
        const state = { page: 1, rows: [] };
        const pageSize = Math.max(1, Number(container.dataset.pageSize) || 5);

        function render() {
            state.rows = Array.from(body.rows).filter(row => !row.querySelector("td[colspan]") || row.cells.length > 1);
            const totalPages = Math.max(1, Math.ceil(state.rows.length / pageSize));
            state.page = Math.min(Math.max(1, state.page), totalPages);
            container.hidden = totalPages <= 1;
            state.rows.forEach((row, index) => { row.hidden = index < (state.page - 1) * pageSize || index >= state.page * pageSize; });
            const counter = container.parentElement?.querySelector("span") || container.querySelector("span");
            if (counter) {
                const start = state.rows.length ? (state.page - 1) * pageSize + 1 : 0;
                const end = Math.min(state.page * pageSize, state.rows.length);
                const noun = container.closest(".expense-pagination") ? "records" : container.closest(".employee-pagination") ? "employees" : container.closest(".leave-pagination") ? "requests" : "items";
                counter.textContent = `Showing ${start}–${end} of ${state.rows.length} ${noun}`;
            }

            Array.from(container.querySelectorAll("button")).forEach(button => {
                const label = button.textContent.trim();
                if (/^\d+$/.test(label)) {
                    const number = Number(label);
                    button.hidden = number > totalPages;
                    ["active", "active-page", "page-active", "current-page"].forEach(cls => button.classList.toggle(cls, number === state.page && (button.classList.contains(cls) || cls === "active")));
                    button.setAttribute("aria-current", number === state.page ? "page" : "false");
                } else if (/previous|^←|^«/i.test(label)) button.disabled = state.page <= 1;
                else if (/next|→|»$/i.test(label)) button.disabled = state.page >= totalPages;
            });
        }

        container.addEventListener("click", event => {
            const button = event.target.closest("button");
            if (!button || button.disabled || button.hidden) return;
            const label = button.textContent.trim();
            const totalPages = Math.max(1, Math.ceil(state.rows.length / pageSize));
            if (/^\d+$/.test(label)) state.page = Number(label);
            else if (/previous|^←|^«/i.test(label)) state.page--;
            else if (/next|→|»$/i.test(label)) state.page++;
            else return;
            state.page = Math.min(Math.max(1, state.page), totalPages);
            render();
        });
        const observer = new MutationObserver(() => { state.page = 1; render(); });
        observer.observe(body, { childList: true });
        render();
    });
}

/**
 * DOM Ready Initialization
 */
document.addEventListener("DOMContentLoaded", function () {
    // Attach logout listeners
    const logoutLinks = document.querySelectorAll(".logout, a[href*='index.html']");
    logoutLinks.forEach(link => {
        if (link.textContent.toLowerCase().includes("logout") || link.classList.contains("logout")) {
            link.addEventListener("click", handleLogout);
        }
    });

    // Sidebar active state
    highlightActiveSidebarMenu();

    // Store branding sync
    syncStoreBranding();
    initializeAdminProfileMenu();

    // Notification counter
    refreshConditionNotifications();
    updateNavbarNotifications();
    initializeTablePagination();

    // Shared print/export controls used by reports and table pages.
    document.querySelectorAll(".page-actions button, .page-header-actions button, .attendance-table-actions button").forEach(button => {
        if (button.dataset.sharedActionAttached) return;
        const label = button.textContent.trim().toLowerCase();
        if (label.includes("print")) {
            button.dataset.sharedActionAttached = "true";
            button.addEventListener("click", () => window.print());
        } else if (label.includes("export")) {
            button.dataset.sharedActionAttached = "true";
            button.addEventListener("click", () => {
                const pageName = window.location.pathname.split("/").pop().replace(/\.html$/i, "") || "report";
                if (exportVisibleTablesCsv(`mms_${pageName}`) && typeof showToast === "function") showToast("Report exported as CSV.");
            });
        }
    });

    console.log("Mart Management System - Main controller loaded.");
});
