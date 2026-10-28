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
    const headerActions = document.querySelector(".page-header");
    if (headerActions && !document.getElementById("markAllReadBtn")) {
        const markAllBtn = document.createElement("button");
        markAllBtn.id = "markAllReadBtn";
        markAllBtn.className = "primary-btn";
        markAllBtn.textContent = "✓ Mark All as Read";
        headerActions.appendChild(markAllBtn);

        markAllBtn.addEventListener("click", function () {
            notifications.forEach(n => n.read = true);
            saveNotifications(notifications);
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
            }

            div.innerHTML = `
                <div class="notification-item-icon">${icon}</div>
                <div class="notification-item-content">
                    <div class="notification-item-title">
                        <h3>${notif.title}</h3>
                        <span class="notification-badge ${priorityLower}-badge" style="text-transform: capitalize;">
                            ${notif.priority || "Normal"}
                        </span>
                    </div>
                    <p>${notif.message}</p>
                    <span class="notification-time">${notif.date || "Today"}</span>
                </div>
                <div class="notification-item-action" style="display:flex; align-items:center; gap:8px;">
                    <a href="${link}" class="action-btn" style="text-decoration:none;">${linkText}</a>
                    ${!notif.read ? `
                        <button class="action-btn mark-read-btn" data-id="${notif.id}" style="color:#10b981; border-color:#10b981;">✓ Read</button>
                    ` : ""}
                    <button class="action-btn del-notif-btn" data-id="${notif.id}" style="color:#ef4444; border-color:#ef4444;">🗑</button>
                </div>
            `;
            notifPanel.appendChild(div);
        });

        // Attach action handlers
        notifPanel.querySelectorAll(".mark-read-btn").forEach(btn => {
            btn.addEventListener("click", function () {
                const id = this.getAttribute("data-id");
                const item = notifications.find(n => n.id === id);
                if (item) {
                    item.read = true;
                    saveNotifications(notifications);
                    renderNotifications();
                }
            });
        });

        notifPanel.querySelectorAll(".del-notif-btn").forEach(btn => {
            btn.addEventListener("click", function () {
                const id = this.getAttribute("data-id");
                notifications = notifications.filter(n => n.id !== id);
                saveNotifications(notifications);
                renderNotifications();
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
