/* =========================================================
   MART MANAGEMENT SYSTEM
   LOGIN AUTHENTICATION
   ========================================================= */

const loginForm = document.getElementById("loginForm");

// Reflect saved store identity on the login screen without substituting demo data.
try {
    const saved = typeof Storage !== "undefined" ? Storage.get("mms_settings", {}) : {};
    const store = saved?.store || {};
    const title = document.querySelector(".login-header h1");
    if (title && store.name) title.textContent = store.name;
    if (store.logo) {
        const mark = document.createElement("img");
        mark.src = store.logo;
        mark.alt = `${store.name || "Store"} logo`;
        mark.style.cssText = "display:block;max-width:96px;max-height:72px;object-fit:contain;margin:0 auto 12px";
        mark.onerror = () => mark.remove();
        title?.before(mark);
    }
} catch (error) { /* The default login identity remains available if saved branding cannot be read. */ }

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
                message.textContent = "Invalid email or password.";
                message.style.color = "#ef4444";
            }
        }
    });
}
