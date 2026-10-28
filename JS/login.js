/* =========================================================
   MART MANAGEMENT SYSTEM
   LOGIN AUTHENTICATION
   ========================================================= */

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", function(event) {
        // Prevent default refresh
        event.preventDefault();

        // Get input values
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const message = document.getElementById("loginMessage");

        // Accepted mart owner login credentials
        const correctEmail = "admin@gmail.com";
        const correctPassword = "1234";

        if (email.toLowerCase() === correctEmail.toLowerCase() && password === correctPassword) {
            if (message) {
                message.textContent = "✓ Login successful! Redirecting to Mart Dashboard...";
                message.style.color = "#10b981";
            }

            // Save active session
            const user = {
                email: email,
                name: "Admin Mart Owner",
                role: "Owner",
                isLoggedIn: true,
                loginTime: new Date().toISOString()
            };

            if (typeof Storage !== "undefined") {
                Storage.set("mms_auth_user", user);
            } else {
                localStorage.setItem("mms_auth_user", JSON.stringify(user));
            }

            // Open dashboard
            setTimeout(function() {
                window.location.href = "pages/dashboard.html";
            }, 600);
        } else {
            if (message) {
                message.textContent = "Invalid email or password. (Hint: admin@gmail.com / 1234)";
                message.style.color = "#ef4444";
            }
        }
    });
}
