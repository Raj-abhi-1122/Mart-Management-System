/* =========================================================
   MART MANAGEMENT SYSTEM
   NOTIFICATIONS MODULE
   ========================================================= */

function getNotifications() {
    return Storage.get(STORAGE_KEYS.NOTIFICATIONS, []);
}

function saveNotifications(notifications) {
    const success = Storage.set(STORAGE_KEYS.NOTIFICATIONS, notifications);
    if (success && typeof updateNavbarNotifications === "function") {
        updateNavbarNotifications();
    }
    return success;
}

function initializeNotificationsPage() {
    const notifPanel = document.querySelector(".notification-panel");
    if (!notifPanel) return;

    let notifications = getNotifications();

    const searchInput = document.getElementById("notificationSearch");
    const typeSelect = document.getElementById("notificationType");
    const statusSelect = document.getElementById("notificationStatus");
    const prioritySelect = document.getElementById("notificationPriority");

    // "Mark All as Read" button
    const headerActions = document.querySelector(".notification-header-actions") || document.querySelector(".page-header");
    let markAllBtn = document.getElementById("markAllReadBtn");
    if (headerActions && !markAllBtn) {
        markAllBtn = document.createElement("button");
        markAllBtn.id = "markAllReadBtn";
        markAllBtn.type = "button";
        markAllBtn.className = "primary-btn";
        markAllBtn.textContent = "✓ Mark All as Read";
        headerActions.prepend(markAllBtn);
    }
    if (markAllBtn && !markAllBtn.dataset.handlerAttached) {
        markAllBtn.dataset.handlerAttached = "true";
        markAllBtn.addEventListener("click", function () {
            const updated = getNotifications().map(n => ({ ...n, read: true }));
            if (!saveNotifications(updated)) { if (typeof showToast === "function") showToast("Notifications could not be updated.", "error"); return; }
            notifications = updated;
            renderNotifications();
            if (typeof showToast === "function") showToast("All notifications marked as read.");
        });
    }

    function renderNotifications(filterList = null) {
        const list = filterList !== null ? filterList : notifications;

        // Update summary cards
        const cards = document.querySelectorAll(".notification-summary .summary-card");
        if (cards.length >= 4) {
            const total = notifications.length;
            const unread = notifications.filter(n => !n.read).length;
            const critical = notifications.filter(n => (n.priority || "").toLowerCase() === "critical").length;
            const todayCount = notifications.filter(n => n.date === (typeof getToday === "function" ? getToday() : "")).length;

            cards[0].querySelector("strong").textContent = total;
            cards[1].querySelector("strong").textContent = unread;
            cards[2].querySelector("strong").textContent = critical;
            cards[3].querySelector("strong").textContent = todayCount;
        }

        const countSpan = document.querySelector(".notification-count");
        const unreadCount = notifications.filter(n => !n.read).length;
        if (countSpan) countSpan.textContent = `${unreadCount} Unread`;

        const categoryCounts = { "Inventory Alerts": 0, "Payment Alerts": 0, "Employee Alerts": 0, "System Alerts": 0 };
        notifications.forEach(notif => {
            if (notif.type === "Inventory") categoryCounts["Inventory Alerts"]++;
            else if (["Billing", "Purchase"].includes(notif.type)) categoryCounts["Payment Alerts"]++;
            else if (["Employee", "Attendance", "Leave", "Payroll"].includes(notif.type)) categoryCounts["Employee Alerts"]++;
            else categoryCounts["System Alerts"]++;
        });
        document.querySelectorAll(".notification-category-card").forEach(card => {
            const heading = card.querySelector("h3")?.textContent.trim();
            const count = card.querySelector("strong");
            if (count && categoryCounts[heading] !== undefined) count.textContent = `${categoryCounts[heading]} Notifications`;
        });
        const infoNote = document.querySelector(".notification-center .info-note, .page-content .info-note");
        if (infoNote) infoNote.textContent = "Notifications are stored in this browser and generated from current inventory and payment conditions, plus actions recorded in the system.";

        // Clear existing items in panel (except header)
        const items = notifPanel.querySelectorAll(".notification-item");
        items.forEach(i => i.remove());

        if (list.length === 0) {
            const emptyDiv = document.createElement("div");
            emptyDiv.className = "notification-item";
            emptyDiv.style.cssText = "padding: 30px; text-align: center; color: #6b7280; font-weight: 500;";
            emptyDiv.textContent = "No notifications found matching your filter.";
            notifPanel.appendChild(emptyDiv);
            return;
        }

        list.forEach(notif => {
            const div = document.createElement("div");
            const priorityLower = (notif.priority || "medium").toLowerCase();
            const unreadClass = notif.read ? "" : "unread";
            div.className = `notification-item ${unreadClass} ${priorityLower}`;

            let icon = "🔔";
            let link = "dashboard.html";
            let linkText = "View";

            if (notif.type === "Inventory") {
                icon = priorityLower === "critical" ? "🚨" : "📦";
                link = "inventory.html";
                linkText = "View Inventory";
            } else if (notif.type === "Billing") {
                icon = "🧾";
                link = "billing.html";
                linkText = "View Bills";
            } else if (notif.type === "Purchase") {
                icon = "🛒";
                link = "purchases.html";
                linkText = "View Purchases";
            } else if (notif.type === "Expense") {
                icon = "💸";
                link = "expenses.html";
                linkText = "View Expenses";
            } else if (["Employee", "Attendance", "Leave", "Payroll"].includes(notif.type)) {
                icon = "👥";
                link = notif.type === "Leave" ? "leave-management.html" : notif.type === "Payroll" ? "payroll.html" : "attendance.html";
                linkText = "View Staff";
            }

            const iconNode = document.createElement("div");
            iconNode.className = "notification-item-icon";
            iconNode.textContent = icon;

            const content = document.createElement("div");
            content.className = "notification-item-content";
            const titleRow = document.createElement("div");
            titleRow.className = "notification-item-title";
            const title = document.createElement("h3");
            title.textContent = String(notif.title || "Notification");
            const priority = document.createElement("span");
            priority.className = `notification-badge ${["low", "medium", "high", "critical"].includes(priorityLower) ? priorityLower : "medium"}-badge`;
            priority.style.textTransform = "capitalize";
            priority.textContent = String(notif.priority || "Normal");
            titleRow.append(title, priority);
            const message = document.createElement("p");
            message.textContent = String(notif.message || "");
            const time = document.createElement("span");
            time.className = "notification-time";
            const timestamp = notif.createdAt ? new Date(notif.createdAt) : null;
            time.textContent = timestamp && !Number.isNaN(timestamp.valueOf())
                ? `${notif.date || ""} ${timestamp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`.trim()
                : String(notif.date || "Today");
            content.append(titleRow, message, time);

            const actions = document.createElement("div");
            actions.className = "notification-item-action";
            actions.style.cssText = "display:flex; align-items:center; gap:8px;";
            const viewLink = document.createElement("a");
            viewLink.href = link;
            viewLink.className = "action-btn";
            viewLink.style.textDecoration = "none";
            viewLink.textContent = linkText;
            actions.appendChild(viewLink);
            if (!notif.read) {
                const readButton = document.createElement("button");
                readButton.type = "button";
                readButton.className = "action-btn mark-read-btn";
                readButton.dataset.id = String(notif.id || "");
                readButton.style.cssText = "color:#10b981; border-color:#10b981;";
                readButton.textContent = "✓ Read";
                actions.appendChild(readButton);
            }
            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "action-btn del-notif-btn";
            deleteButton.dataset.id = String(notif.id || "");
            deleteButton.style.cssText = "color:#ef4444; border-color:#ef4444;";
            deleteButton.setAttribute("aria-label", "Delete notification");
            deleteButton.textContent = "🗑";
            actions.appendChild(deleteButton);
            div.append(iconNode, content, actions);
            notifPanel.appendChild(div);
        });

        // Attach action handlers
        notifPanel.querySelectorAll(".mark-read-btn").forEach(btn => {
            btn.addEventListener("click", function () {
                const id = this.getAttribute("data-id");
                const updated = notifications.map(n => String(n.id) === id ? { ...n, read: true } : n);
                if (!saveNotifications(updated)) { if (typeof showToast === "function") showToast("Notification could not be marked as read.", "error"); return; }
                notifications = updated;
                applyFilters();
            });
        });

        notifPanel.querySelectorAll(".del-notif-btn").forEach(btn => {
            btn.addEventListener("click", function () {
                const id = this.getAttribute("data-id");
                if (!window.confirm("Delete this notification?")) return;
                const current = notifications.find(n => String(n.id) === id);
                const updated = notifications.filter(n => String(n.id) !== id);
                if (current?.conditionKey) {
                    const settings = Storage.get(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
                    settings.notifications = settings.notifications || {};
                    settings.notifications.dismissedConditions = Array.from(new Set([...(settings.notifications.dismissedConditions || []), current.conditionKey]));
                    if (!Storage.setMany([[STORAGE_KEYS.SETTINGS, settings], [STORAGE_KEYS.NOTIFICATIONS, updated]])) { if (typeof showToast === "function") showToast("Notification could not be deleted.", "error"); return; }
                    if (typeof updateNavbarNotifications === "function") updateNavbarNotifications();
                } else if (!saveNotifications(updated)) { if (typeof showToast === "function") showToast("Notification could not be deleted.", "error"); return; }
                notifications = updated;
                applyFilters();
            });
        });
    }

    renderNotifications();

    function applyFilters() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
        const typeFilter = typeSelect ? typeSelect.value : "All Types";
        const statusFilterVal = statusSelect ? statusSelect.value : "All";
        const prioFilter = prioritySelect ? prioritySelect.value : "All Priorities";

        const filtered = notifications.filter(n => {
            const title = String(n.title || "").toLowerCase();
            const msg = String(n.message || "").toLowerCase();
            const matchesSearch = !query || title.includes(query) || msg.includes(query);

            let matchesType = true;
            if (typeFilter && typeFilter !== "All Types") {
                matchesType = (n.type || "").toLowerCase() === typeFilter.toLowerCase();
            }

            let matchesStatus = true;
            if (statusFilterVal === "Unread") matchesStatus = !n.read;
            else if (statusFilterVal === "Read") matchesStatus = n.read;

            let matchesPrio = true;
            if (prioFilter && prioFilter !== "All Priorities") {
                matchesPrio = (n.priority || "").toLowerCase() === prioFilter.toLowerCase();
            }

            return matchesSearch && matchesType && matchesStatus && matchesPrio;
        });

        renderNotifications(filtered);
    }

    if (searchInput) searchInput.addEventListener("input", applyFilters);
    if (typeSelect) typeSelect.addEventListener("change", applyFilters);
    if (statusSelect) statusSelect.addEventListener("change", applyFilters);
    if (prioritySelect) prioritySelect.addEventListener("change", applyFilters);
}

document.addEventListener("DOMContentLoaded", function () {
    initializeNotificationsPage();
});
