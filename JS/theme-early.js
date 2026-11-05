/* Apply saved appearance before the page styles render. */
(function () {
    try {
        const settings = JSON.parse(localStorage.getItem("mms_settings") || "{}");
        const appearance = settings.appearance || {};
        const mode = ["light", "dark", "system"].includes(appearance.mode) ? appearance.mode : "system";
        const media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
        const resolved = mode === "system" ? (media && media.matches ? "dark" : "light") : mode;
        const root = document.documentElement;
        root.dataset.theme = resolved;
        root.dataset.themeMode = mode;
        const sidebar = appearance.sidebar || {};
        const vars = {
            background: "--mms-sidebar-bg", text: "--mms-sidebar-text", icon: "--mms-sidebar-icon",
            activeBackground: "--mms-sidebar-active-bg", activeText: "--mms-sidebar-active-text",
            hoverBackground: "--mms-sidebar-hover-bg", border: "--mms-sidebar-border"
        };
        Object.keys(vars).forEach(key => {
            const value = sidebar[key];
            if (typeof value === "string" && /^#[0-9a-f]{3,8}$/i.test(value)) root.style.setProperty(vars[key], value);
        });
        window.MMSTheme = {
            apply(next) {
                const appearance = next && next.appearance || {};
                const mode = ["light", "dark", "system"].includes(appearance.mode) ? appearance.mode : "system";
                const media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
                root.dataset.theme = mode === "system" ? (media && media.matches ? "dark" : "light") : mode;
                root.dataset.themeMode = mode;
                Object.keys(vars).forEach(key => {
                    const value = appearance.sidebar && appearance.sidebar[key];
                    if (typeof value === "string" && /^#[0-9a-f]{3,8}$/i.test(value)) root.style.setProperty(vars[key], value);
                    else root.style.removeProperty(vars[key]);
                });
            },
            setMode(mode) {
                if (!["light", "dark", "system"].includes(mode)) return false;
                try {
                    const settings = JSON.parse(localStorage.getItem("mms_settings") || "{}");
                    settings.appearance = Object.assign({}, settings.appearance, { mode });
                    localStorage.setItem("mms_settings", JSON.stringify(settings));
                    this.apply(settings);
                    return true;
                } catch (_) { return false; }
            }
        };
        if (media) {
            const listener = () => {
                if (root.dataset.themeMode === "system") root.dataset.theme = media.matches ? "dark" : "light";
            };
            if (media.addEventListener) media.addEventListener("change", listener);
            else if (media.addListener) media.addListener(listener);
        }
    } catch (_) { document.documentElement.dataset.theme = "light"; }
})();
