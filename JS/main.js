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
function addNotification(title, message, type = "System", priority = "Medium") {
    try {
        if (typeof Storage === "undefined") return;
        const notifs = Storage.get(STORAGE_KEYS.NOTIFICATIONS, []);
        const today = typeof getToday === "function" ? getToday() : new Date().toISOString().split("T")[0];
        const newNotif = {
            id: typeof generateId === "function" ? generateId("NOTIF") : "NOTIF-" + Date.now(),
            title: title,
            message: message,
            type: type,
            priority: priority,
            date: today,
            read: false
        };
        notifs.unshift(newNotif);
        Storage.set(STORAGE_KEYS.NOTIFICATIONS, notifs);
        updateNavbarNotifications();
    } catch (e) {
        console.error("Notification creation error:", e);
    }
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
    if (!container) {
        container = document.createElement("div");
        container.id = "mms-toast-container";
        container.style.cssText = "position: fixed; top: 20px; right: 20px; z-index: 999999; display: flex; flex-direction: column; gap: 10px;";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    const bgColor = type === "success" ? "#10b981" : type === "error" ? "#ef4444" : type === "warning" ? "#f59e0b" : "#3b82f6";
    toast.style.cssText = `background: ${bgColor}; color: #ffffff; padding: 12px 20px; border-radius: 8px; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 8px; animation: slideIn 0.3s ease;`;
    toast.innerHTML = `<span>${type === "success" ? "✓" : type === "error" ? "✕" : "ℹ"}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transition = "opacity 0.3s ease";
        setTimeout(() => toast.remove(), 300);
    }, 3200);
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
    menuItems.forEach(item => {
        const href = item.getAttribute("href");
        if (href) {
            const linkFile = href.substring(href.lastIndexOf("/") + 1);
            if (linkFile === targetFile || linkFile === rawFile) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
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
    const ownerName = settings?.store?.owner || "Admin";
    adminBadges.forEach(badge => {
        badge.innerHTML = `👤 ${ownerName}`;
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

    // Notification counter
    updateNavbarNotifications();

    console.log("Mart Management System - Main controller loaded.");
});
