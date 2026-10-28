/* =========================================================
   MART MANAGEMENT SYSTEM
   ACTIVITY LOG CONTROLLER
   ========================================================= */

function getActivityLogs() {
    return Storage.get(STORAGE_KEYS.ACTIVITY_LOGS, []);
}

function saveActivityLogs(logs) {
    return Storage.set(STORAGE_KEYS.ACTIVITY_LOGS, logs);
}

function initializeActivityLogPage() {
    const tableBody = document.querySelector(".activity-table tbody");
    if (!tableBody) return;

    let logs = getActivityLogs();
    const today = typeof getToday === "function" ? getToday() : new Date().toISOString().split("T")[0];

    const searchInput = document.getElementById("activitySearch");
    const typeSelect = document.getElementById("activityType");
    const userSelect = document.getElementById("activityUser");
    const dateInput = document.getElementById("activityDate");
    const clearBtn = document.querySelector(".danger-btn");

    if (dateInput) dateInput.value = today;

    // Clear log action
    if (clearBtn) {
        clearBtn.addEventListener("click", function () {
            if (confirm("Are you sure you want to clear the activity log? This cannot be undone.")) {
                logs = [];
                saveActivityLogs(logs);
                renderLogs();
                if (typeof showToast === "function") showToast("Activity logs cleared.");
            }
        });
    }

    function renderLogs(filterList = null) {
        const list = filterList !== null ? filterList : logs;

        // Update cards
        const cards = document.querySelectorAll(".activity-summary .summary-card");
        if (cards.length >= 4) {
            cards[0].querySelector("strong").textContent = logs.length;
            cards[1].querySelector("strong").textContent = logs.filter(l => l.date === today).length;
            cards[2].querySelector("strong").textContent = "1";
            cards[3].querySelector("strong").textContent = logs.filter(l => (l.action || "").includes("Generated") || (l.action || "").includes("Deleted")).length;
        }

        const countSpan = document.querySelector(".activity-count");
        if (countSpan) countSpan.textContent = `${logs.filter(l => l.date === today).length} Today`;

        tableBody.innerHTML = "";

        if (list.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 30px; color: #6b7280;">
                        No activity logs found.
                    </td>
                </tr>
            `;
            return;
        }

        list.slice(0, 100).forEach(log => {
            const tr = document.createElement("tr");
            const timeDisplay = log.timestamp || "Just now";

            tr.innerHTML = `
                <td style="color:#6b7280; font-size:13px;">${timeDisplay}</td>
                <td><strong>${log.user || "Admin Owner"}</strong></td>
                <td>
                    <span style="font-weight:600; color:#1f2937;">${log.action}</span>
                </td>
                <td>
                    <span class="status active" style="font-size:11px; padding:2px 8px;">${log.module || "System"}</span>
                </td>
                <td>${log.details || "-"}</td>
                <td><span style="color:#10b981;">✓ Success</span></td>
            `;
            tableBody.appendChild(tr);
        });
    }

    renderLogs();

    function applyFilters() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
        const moduleFilter = typeSelect ? typeSelect.value : "All Activities";

        const filtered = logs.filter(l => {
            const act = String(l.action || "").toLowerCase();
            const det = String(l.details || "").toLowerCase();
            const matchesSearch = !query || act.includes(query) || det.includes(query);

            let matchesModule = true;
            if (moduleFilter && moduleFilter !== "All Activities") {
                matchesModule = (l.module || "").toLowerCase().includes(moduleFilter.toLowerCase());
            }

            return matchesSearch && matchesModule;
        });

        renderLogs(filtered);
    }

    if (searchInput) searchInput.addEventListener("input", applyFilters);
    if (typeSelect) typeSelect.addEventListener("change", applyFilters);
    if (userSelect) userSelect.addEventListener("change", applyFilters);
    if (dateInput) dateInput.addEventListener("change", applyFilters);
}

document.addEventListener("DOMContentLoaded", function () {
    initializeActivityLogPage();
});
