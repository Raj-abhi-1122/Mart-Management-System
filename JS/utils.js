/* =========================================================
   MART MANAGEMENT SYSTEM
   PHASE 2 - STEP 1
   COMMON JAVASCRIPT UTILITIES
   ========================================================= */


/*
    Generate a simple unique ID.

    Example:
    const id = generateId("PROD");

    Result:
    PROD-1728123456789
*/

function generateId(prefix = "ID") {

    return prefix + "-" + Date.now();
}


/*
    Format number as Indian currency.

    Example:
    formatCurrency(2500)

    Result:
    ₹2,500.00
*/

function formatCurrency(amount) {

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2
        }
    ).format(Number(amount) || 0);
}


/*
    Get today's date in YYYY-MM-DD format.
*/

function getToday() {

    const today = new Date();

    const year = today.getFullYear();

    const month = String(
        today.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        today.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


/*
    Format a date for displaying to the user.

    Example:
    formatDate("2026-10-05")

    Result:
    05 Oct 2026
*/

function formatDate(dateString) {

    if (!dateString) {
        return "-";
    }

    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


/*
    Safely convert a value to a number.
*/

function toNumber(value) {

    const number = Number(value);

    return isNaN(number) ? 0 : number;
}


/*
    Calculate percentage.
*/

function calculatePercentage(value, total) {

    if (!total || total === 0) {
        return 0;
    }

    return (value / total) * 100;
}


/*
    Simple required-field validation.

    Returns true if the value is not empty.
*/

function isRequired(value) {

    return (
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
    );
}


/*
    Escape HTML special characters to prevent XSS.
    Use whenever inserting user-supplied data via innerHTML.

    Example:
    escapeHtml('<script>alert(1)</script>')
    -> '&lt;script&gt;alert(1)&lt;/script&gt;'
*/

function escapeHtml(str) {
    var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(str === null || str === undefined ? '' : str).replace(/[&<>"']/g, function(c) { return map[c]; });
}


/*
    Truncate a string to maxLen characters, appending '...' if truncated.
*/

function truncate(str, maxLen) {
    maxLen = maxLen || 50;
    var s = String(str === null || str === undefined ? '' : str);
    return s.length > maxLen ? s.slice(0, maxLen) + '...' : s;
}


/*
    Deep-clone a plain object safely via JSON.
*/

function deepClone(obj) {
    try { return JSON.parse(JSON.stringify(obj)); } catch (e) { return obj; }
}
