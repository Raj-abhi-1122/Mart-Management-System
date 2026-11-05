/* Shared product category store and management UI. */
function normalizeProductCategoryName(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
}

function getProductCategories(options = {}) {
    const key = STORAGE_KEYS.PRODUCT_CATEGORIES || "mms_product_categories";
    const saved = Storage.get(key, []);
    const includeInactive = options.includeInactive !== false;
    return (Array.isArray(saved) ? saved : []).map((item, index) => typeof item === "string"
        ? { id: `legacy-${index}`, name: normalizeProductCategoryName(item), active: true }
        : { ...item, name: normalizeProductCategoryName(item?.name), active: item?.active !== false })
        .filter(item => item.name && (includeInactive || item.active));
}

function saveProductCategories(categories) {
    return Storage.set(STORAGE_KEYS.PRODUCT_CATEGORIES || "mms_product_categories", categories);
}

function renameProductCategory(categoryId, proposedName) {
    if (!canManageProductCategories()) return { ok: false, error: "An authorized account is required to manage categories." };
    const name = normalizeProductCategoryName(proposedName);
    if (name.length < 2 || name.length > 40 || /[<>]/.test(name)) return { ok: false, error: "Enter a category name between 2 and 40 characters." };
    const categories = getProductCategories();
    const current = categories.find(category => category.id === categoryId);
    if (!current) return { ok: false, error: "That category could not be found." };
    if (categories.some(category => category.id !== categoryId && category.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return { ok: false, error: "A category with that name already exists." };
    if (current.name === name) return { ok: true, unchanged: true, category: current };
    const updatedCategories = categories.map(category => category.id === categoryId ? { ...category, name, legacy: false, updatedAt: new Date().toISOString() } : category);
    const products = Storage.get(STORAGE_KEYS.PRODUCTS, []).map(product => normalizeProductCategoryName(product.category).toLocaleLowerCase() === current.name.toLocaleLowerCase() ? { ...product, category: name } : product);
    const ok = typeof Storage.setMany === "function"
        ? Storage.setMany([[STORAGE_KEYS.PRODUCT_CATEGORIES, updatedCategories], [STORAGE_KEYS.PRODUCTS, products]])
        : false;
    return ok ? { ok: true, category: updatedCategories.find(category => category.id === categoryId) } : { ok: false, error: "Category changes could not be saved. Existing records were kept." };
}

function canManageProductCategories() {
    const user = Storage.get(STORAGE_KEYS.AUTH_USER, {});
    return !!user?.isLoggedIn && ["owner", "admin", "manager"].includes(String(user.role || "").toLowerCase());
}

function ensureProductCategoryStore() {
    const key = STORAGE_KEYS.PRODUCT_CATEGORIES || "mms_product_categories";
    let categories;
    if (!Storage.exists(key)) {
        const names = new Map();
        Storage.get(STORAGE_KEYS.PRODUCTS, []).forEach(product => {
            const name = normalizeProductCategoryName(product.category);
            if (name && !names.has(name.toLocaleLowerCase())) names.set(name.toLocaleLowerCase(), name);
        });
        categories = Array.from(names.values()).map((name, index) => ({ id: `CAT-${Date.now()}-${index}`, name, active: true, createdAt: new Date().toISOString() }));
        Storage.set(key, categories);
    } else categories = getProductCategories();

    // Adopt legacy category labels still referenced by products; never reclassify products.
    const known = new Set(categories.map(category => category.name.toLocaleLowerCase()));
    let changed = false;
    Storage.get(STORAGE_KEYS.PRODUCTS, []).forEach(product => {
        const name = normalizeProductCategoryName(product.category);
        const token = name.toLocaleLowerCase();
        if (name && !known.has(token)) {
            categories.push({ id: `CAT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, active: true, legacy: true, createdAt: new Date().toISOString() });
            known.add(token);
            changed = true;
        }
    });
    if (changed) saveProductCategories(categories);
    return categories;
}

function populateProductCategorySelect(select, options = {}) {
    if (!select) return;
    const allLabel = options.allLabel || "";
    const selected = select.value;
    const placeholder = select.querySelector("option[value='']")?.textContent || "Select Category";
    select.replaceChildren();
    if (allLabel) select.add(new Option(allLabel, allLabel));
    else select.add(new Option(placeholder, ""));
    getProductCategories({ includeInactive: options.includeInactive === true }).forEach(category => {
        const option = new Option(category.name + (category.active ? "" : " (Inactive)"), category.name);
        select.add(option);
    });
    if (selected && Array.from(select.options).some(option => option.value === selected)) select.value = selected;
}

function initializeProductCategoryManager() {
    const form = document.getElementById("productCategoryForm");
    const list = document.getElementById("productCategoryList");
    if (!form || !list) return;
    const nameInput = document.getElementById("productCategoryName");
    const editIdInput = document.getElementById("productCategoryEditId");
    const search = document.getElementById("productCategorySearch");
    const cancel = document.getElementById("cancelProductCategoryEdit");
    const permitted = canManageProductCategories();
    form.querySelectorAll("input, button").forEach(control => { control.disabled = !permitted; });
    if (!permitted) {
        const note = document.createElement("p"); note.className = "receipt-status"; note.textContent = "Sign in with an authorized Admin, Manager, or Owner account to change categories.";
        form.before(note);
    }

    function render() {
        const query = normalizeProductCategoryName(search?.value).toLocaleLowerCase();
        const categories = getProductCategories().filter(category => !query || category.name.toLocaleLowerCase().includes(query));
        list.replaceChildren();
        if (!categories.length) {
            const empty = document.createElement("p"); empty.textContent = "No categories match your search."; list.appendChild(empty); return;
        }
        categories.sort((a, b) => a.name.localeCompare(b.name)).forEach(category => {
            const row = document.createElement("div"); row.className = "product-category-row";
            const title = document.createElement("strong"); title.textContent = category.name;
            const state = document.createElement("span"); state.className = category.active ? "category-active" : "category-inactive"; state.textContent = category.active ? "Active" : "Inactive";
            const edit = document.createElement("button"); edit.type = "button"; edit.className = "secondary-btn"; edit.textContent = "Edit";
            edit.disabled = !permitted;
            edit.addEventListener("click", () => { nameInput.value = category.name; editIdInput.value = category.id; cancel.hidden = false; nameInput.focus(); });
            const toggle = document.createElement("button"); toggle.type = "button"; toggle.className = "secondary-btn"; toggle.textContent = category.active ? "Deactivate" : "Activate";
            toggle.disabled = !permitted;
            toggle.addEventListener("click", () => {
                if (!canManageProductCategories()) { showToast("An authorized account is required to manage categories.", "error"); return; }
                const products = Storage.get(STORAGE_KEYS.PRODUCTS, []);
                const usage = products.filter(product => normalizeProductCategoryName(product.category).toLocaleLowerCase() === category.name.toLocaleLowerCase()).length;
                if (category.active && usage && !window.confirm(`${usage} existing product(s) use “${category.name}”. Deactivating hides it from new products; existing product and history records keep the category. Continue?`)) return;
                const next = getProductCategories().map(item => item.id === category.id ? { ...item, active: !item.active, updatedAt: new Date().toISOString() } : item);
                if (!saveProductCategories(next)) { showToast("Category status could not be saved.", "error"); return; }
                if (typeof logActivity === "function") logActivity(category.active ? "Category Deactivated" : "Category Activated", "Products", `${category.name}; ${usage} products reference it.`);
                populateCategoryControls();
                if (typeof searchProducts === "function") searchProducts();
                render(); showToast("Category status updated.", "success");
            });
            row.append(title, state, edit, toggle); list.appendChild(row);
        });
    }

    form.addEventListener("submit", event => {
        event.preventDefault();
        if (!canManageProductCategories()) { showToast("Sign in with an authorized account to manage product categories.", "error"); return; }
        const name = normalizeProductCategoryName(nameInput.value);
        if (name.length < 2 || name.length > 40 || /[<>]/.test(name)) { showToast("Enter a category name between 2 and 40 characters.", "error"); nameInput.focus(); return; }
        const categories = getProductCategories();
        const editId = editIdInput.value;
        if (categories.some(category => category.id !== editId && category.name.toLocaleLowerCase() === name.toLocaleLowerCase())) { showToast("A category with that name already exists.", "error"); nameInput.focus(); return; }
        const current = categories.find(category => category.id === editId);
        let next = categories;
        if (current) {
            const result = renameProductCategory(editId, name);
            if (!result.ok) { showToast(result.error, "error"); return; }
            next = getProductCategories();
        } else {
            next = [...categories, { id: typeof generateId === "function" ? generateId("CAT") : `CAT-${Date.now()}`, name, active: true, createdAt: new Date().toISOString() }];
            if (!saveProductCategories(next)) { showToast("Category could not be saved.", "error"); return; }
        }
        if (typeof logActivity === "function") logActivity(current ? "Category Updated" : "Category Added", "Products", current ? `Category renamed to ${name}.` : `Added category ${name}.`);
        form.reset(); editIdInput.value = ""; cancel.hidden = true; populateCategoryControls();
        if (typeof searchProducts === "function") searchProducts();
        render(); showToast("Category saved.", "success");
    });
    cancel?.addEventListener("click", () => { form.reset(); editIdInput.value = ""; cancel.hidden = true; });
    search?.addEventListener("input", render);
    render();
}

function populateCategoryControls() {
    document.querySelectorAll("#categoryFilter, #inventoryCategoryFilter").forEach(select => populateProductCategorySelect(select, { allLabel: "All Categories", includeInactive: true }));
    const productCategory = document.querySelector("#category");
    if (productCategory) {
        const existingValue = productCategory.value || new URLSearchParams(window.location.search).get("id") && Storage.get(STORAGE_KEYS.PRODUCTS, []).find(product => product.id === new URLSearchParams(window.location.search).get("id"))?.category || "";
        populateProductCategorySelect(productCategory);
        if (existingValue && !Array.from(productCategory.options).some(option => option.value === existingValue)) productCategory.add(new Option(`${existingValue} (Existing)`, existingValue));
        if (existingValue) productCategory.value = existingValue;
        const group = productCategory.closest(".form-group");
        group?.querySelector(".category-empty-note")?.remove();
        if (!getProductCategories({ includeInactive: false }).length && group) {
            const note = document.createElement("p"); note.className = "category-empty-note receipt-status";
            const link = document.createElement("a"); link.href = "products.html"; link.textContent = "Manage product categories";
            note.append("No active product categories are configured. ", link);
            group.appendChild(note);
        }
    }
    const inventoryReportCategory = document.querySelector(".inventory-filter-grid select");
    if (inventoryReportCategory) populateProductCategorySelect(inventoryReportCategory, { allLabel: "All Categories", includeInactive: true });
}

if (typeof document !== "undefined") {
    ensureProductCategoryStore();
    document.addEventListener("DOMContentLoaded", () => {
        populateCategoryControls();
        initializeProductCategoryManager();
    });
}
