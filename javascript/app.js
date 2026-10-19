const API_BASE_URL = window.HOMESTOCK_API_URL || "http://localhost:5000/api";
const token = localStorage.getItem("token");
let currentUser = null;

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
}

async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...options.headers
        }
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "login.html";
        throw new Error("Your session has expired. Please sign in again.");
    }
    if (!response.ok) throw new Error(data.message || "Request failed");
    return data;
}

function notify(message) {
    const stack = document.querySelector("#toast-stack");
    if (!stack) return window.alert(message);
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    stack.append(toast);
    window.setTimeout(() => toast.remove(), 3500);
}

function setUserDetails(user) {
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User";
    document.querySelectorAll(".sidebar__user-name").forEach((element) => element.textContent = fullName);
    document.querySelectorAll(".sidebar__user-email").forEach((element) => element.textContent = user.email || "");
    document.querySelectorAll(".avatar").forEach((element) => {
        element.textContent = `${user.firstName?.[0] || "U"}${user.lastName?.[0] || ""}`.toUpperCase();
    });
}

function itemStatus(item) {
    if (Number(item.quantity) <= 0) return "Out of stock";
    if (Number(item.quantity) <= Number(item.minimumStock || 0)) return "Low stock";
    return "In stock";
}

function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

async function loadStock() {
    const { items } = await apiRequest("/inventory");
    const healthy = items.filter((item) => itemStatus(item) === "In stock").length;
    const low = items.filter((item) => itemStatus(item) === "Low stock").length;
    const out = items.filter((item) => itemStatus(item) === "Out of stock").length;
    const values = document.querySelectorAll(".stat__value");
    [healthy, low, out].forEach((value, index) => { if (values[index]) values[index].textContent = value; });

    const tbody = document.querySelector("#stock-table tbody");
    const filter = document.querySelector('[data-filter="status"]');
    const render = () => {
        const selected = filter?.value || "All";
        const visible = items.filter((item) => selected === "All" || itemStatus(item) === selected);
        tbody.innerHTML = visible.map((item) => {
            const status = itemStatus(item);
            const badge = status === "Out of stock" ? "badge--danger" : status === "Low stock" ? "badge--warning" : "badge--success";
            return `<tr data-item-id="${escapeHtml(item._id)}"><td><div class="table__item"><div class="table__thumb">📦</div><div class="table__item-name">${escapeHtml(item.name)}</div></div></td><td>${escapeHtml(item.category)}</td><td>${escapeHtml(item.location)}</td><td><div class="qty-cell"><button class="qty-btn" data-stock-adjust="-1" aria-label="Decrease ${escapeHtml(item.name)}">−</button><span class="qty-value">${item.quantity}</span><button class="qty-btn" data-stock-adjust="1" aria-label="Increase ${escapeHtml(item.name)}">+</button></div></td><td>${item.minimumStock}</td><td><span class="badge ${badge}">${status === "Out of stock" ? "Out" : status === "Low stock" ? "Low" : "In stock"}</span></td><td class="actions"><button class="btn btn--ghost btn--sm" data-restock>Restock</button></td></tr>`;
        }).join("") || '<tr><td colspan="7">No inventory items match this filter.</td></tr>';
    };
    filter?.addEventListener("change", render);
    tbody.addEventListener("click", async (event) => {
        const button = event.target.closest("button");
        const row = button?.closest("tr");
        const item = items.find((entry) => entry._id === row?.dataset.itemId);
        if (!item || !button) return;
        let adjustment = Number(button.dataset.stockAdjust);
        if (button.hasAttribute("data-restock")) adjustment = Math.max(1, item.minimumStock + 1 - item.quantity);
        try {
            await apiRequest(`/inventory/${item._id}/stock`, { method: "PATCH", body: JSON.stringify({ adjustment }) });
            notify("Stock quantity updated");
            await loadStock();
        } catch (error) { notify(error.message); }
    }, { once: true });
    render();
}

async function loadLocations() {
    const grid = document.querySelector("#locations-grid");
    const { locations } = await apiRequest("/locations");
    const maxCount = Math.max(1, ...locations.map((location) => location.itemCount || 0));
    grid.innerHTML = locations.map((location) => `<article class="card loc-card" data-location-id="${escapeHtml(location._id)}"><div class="loc-card__icon">${escapeHtml(location.icon || "📦")}</div><div class="loc-card__name">${escapeHtml(location.name)}</div><div class="loc-card__count">${location.itemCount || 0} items</div><div class="loc-card__bar"><span style="width:${Math.max(4, Math.round((location.itemCount || 0) / maxCount * 100))}%"></span></div><button class="btn btn--ghost btn--sm" data-delete-location ${location.itemCount || !location.managed ? "disabled title=\"Only saved, empty locations can be deleted\"" : ""}>Delete</button></article>`).join("") || "<p>No locations yet. Add one to organize your inventory.</p>";

    const form = document.querySelector("#add-location-form");
    if (form && !form.dataset.bound) {
        form.dataset.bound = "true";
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            const formData = new FormData(form);
            try {
                await apiRequest("/locations", { method: "POST", body: JSON.stringify({ name: formData.get("name"), icon: formData.get("icon") }) });
                form.reset();
                document.querySelector("#add-location-modal")?.classList.remove("is-open");
                notify("Location added");
                await loadLocations();
            } catch (error) { notify(error.message); }
        });
    }
    grid.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-delete-location]");
        if (!button || button.disabled) return;
        const card = button.closest("[data-location-id]");
        try {
            await apiRequest(`/locations/${card.dataset.locationId}`, { method: "DELETE" });
            notify("Location deleted");
            await loadLocations();
        } catch (error) { notify(error.message); }
    }, { once: true });
}

async function loadNotifications() {
    const list = document.querySelector("#notif-list");
    const { notifications } = await apiRequest("/notifications");
    const readKey = `homestock-read-${currentUser.id}`;
    const readIds = new Set(JSON.parse(localStorage.getItem(readKey) || "[]"));
    let activeType = "all";
    const render = () => {
        const visible = notifications.filter((notification) => activeType === "all" || notification.type === activeType);
        list.innerHTML = visible.map((notification) => {
            const isRead = readIds.has(notification.id);
            const age = notification.createdAt ? new Date(notification.createdAt).toLocaleDateString() : "";
            return `<li class="notif ${isRead ? "" : "is-unread"}" data-notif-id="${escapeHtml(notification.id)}"><div class="notif__icon" style="background:var(--warning-soft);color:#9a3412">${notification.type === "stock" ? "!" : notification.type === "expiry" ? "◷" : "✓"}</div><div class="notif__body"><div class="notif__title">${escapeHtml(notification.title)}</div><div class="notif__desc">${escapeHtml(notification.description)}</div></div><div class="notif__time">${escapeHtml(age)}</div></li>`;
        }).join("") || '<li class="notif">No alerts right now.</li>';
        document.querySelectorAll("[data-tab]").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tab === activeType));
    };
    document.querySelectorAll("[data-tab]").forEach((tab) => {
        tab.addEventListener("click", () => { activeType = tab.dataset.tab; render(); });
    });
    list.addEventListener("click", (event) => {
        const row = event.target.closest("[data-notif-id]");
        if (!row) return;
        readIds.add(row.dataset.notifId);
        localStorage.setItem(readKey, JSON.stringify([...readIds]));
        render();
    });
    document.querySelector('[data-action="mark-all-read"]')?.addEventListener("click", () => {
        notifications.forEach((notification) => readIds.add(notification.id));
        localStorage.setItem(readKey, JSON.stringify([...readIds]));
        render();
    });
    render();
}

async function loadInventory() {
    const tbody = document.querySelector("#items-table tbody");
    const { items } = await apiRequest("/inventory");
    const { locations } = await apiRequest("/locations");
    const categorySelect = document.querySelector("#item-category");
    const locationSelect = document.querySelector("#item-location");
    const categoryFilter = document.querySelector('[data-filter="category"]');
    const locationFilter = document.querySelector('[data-filter="location"]');
    const categories = [...new Set([
        ...Array.from(categorySelect?.options || []).map((option) => option.value).filter(Boolean),
        ...items.map((item) => item.category)
    ])].sort();
    const locationNames = [...new Set([
        ...Array.from(locationSelect?.options || []).map((option) => option.value).filter(Boolean),
        ...locations.map((location) => location.name),
        ...items.map((item) => item.location)
    ])].sort();
    const setOptions = (select, values, placeholder) => {
        if (!select) return;
        const selected = select.value;
        select.innerHTML = `<option value="">${placeholder}</option>${values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}`;
        select.value = values.includes(selected) ? selected : "";
    };
    setOptions(categorySelect, categories, "Select category");
    setOptions(locationSelect, locationNames, "Select location");
    setOptions(categoryFilter, categories, "All categories");
    setOptions(locationFilter, locationNames, "All locations");
    const render = () => {
        const search = document.querySelector('[data-filter="search"]')?.value.toLowerCase() || "";
        const category = document.querySelector('[data-filter="category"]')?.value || "";
        const location = document.querySelector('[data-filter="location"]')?.value || "";
        const status = document.querySelector('[data-filter="status"]')?.value || "";
        const visible = items.filter((item) => item.name.toLowerCase().includes(search)
            && (!category || item.category === category)
            && (!location || item.location === location)
            && (!status || itemStatus(item) === status));
        tbody.innerHTML = visible.map((item) => `<tr data-item-id="${escapeHtml(item._id)}"><td><div class="table__item"><div class="table__thumb">📦</div><div><div class="table__item-name">${escapeHtml(item.name)}</div><div class="table__item-sub">${escapeHtml(item.notes || "")}</div></div></div></td><td>${escapeHtml(item.category)}</td><td>${escapeHtml(item.location)}</td><td>${item.quantity}</td><td>${formatDate(item.expiryDate)}</td><td><span class="badge ${itemStatus(item) === "In stock" ? "badge--success" : itemStatus(item) === "Low stock" ? "badge--warning" : "badge--danger"}">${itemStatus(item)}</span></td><td class="actions"><button class="btn btn--ghost btn--sm" data-action="edit-item">Edit</button><button class="btn btn--ghost btn--sm" data-action="delete-item">Delete</button></td></tr>`).join("") || '<tr><td colspan="7">No items found.</td></tr>';
        const summary = document.querySelector(".flex-between .text-muted");
        if (summary) summary.textContent = `Showing ${visible.length} of ${items.length} items`;
    };
    document.querySelectorAll("[data-filter]").forEach((field) => field.addEventListener("input", render));
    const form = document.querySelector("#add-item-form");
    if (form && !form.dataset.bound) {
        form.dataset.bound = "true";
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            const editingId = form.dataset.editingId;
            const body = {
                name: document.querySelector("#item-name").value.trim(),
                category: document.querySelector("#item-category").value,
                location: document.querySelector("#item-location").value,
                quantity: Number(document.querySelector("#item-qty").value),
                minimumStock: Number(document.querySelector("#item-min").value),
                expiryDate: document.querySelector("#item-expiry").value || null,
                warrantyDate: document.querySelector("#item-warranty").value || null,
                notes: document.querySelector("#item-notes").value.trim()
            };
            try {
                await apiRequest(editingId ? `/inventory/${editingId}` : "/inventory", { method: editingId ? "PATCH" : "POST", body: JSON.stringify(body) });
                form.reset();
                delete form.dataset.editingId;
                document.querySelector("#add-item-modal")?.classList.remove("is-open");
                notify(editingId ? "Item updated" : "Item added");
                window.location.reload();
            } catch (error) { notify(error.message); }
        });
    }
    tbody.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-action]");
        const item = items.find((entry) => entry._id === button?.closest("tr")?.dataset.itemId);
        if (!item || !button) return;
        if (button.dataset.action === "delete-item") {
            if (!window.confirm(`Delete ${item.name}?`)) return;
            try {
                await apiRequest(`/inventory/${item._id}`, { method: "DELETE" });
                notify("Item deleted");
                window.location.reload();
            } catch (error) { notify(error.message); }
        } else if (button.dataset.action === "edit-item") {
            form.dataset.editingId = item._id;
            document.querySelector("#item-name").value = item.name;
            document.querySelector("#item-category").value = item.category;
            document.querySelector("#item-location").value = item.location;
            document.querySelector("#item-qty").value = item.quantity;
            document.querySelector("#item-min").value = item.minimumStock;
            document.querySelector("#item-expiry").value = item.expiryDate ? item.expiryDate.slice(0, 10) : "";
            document.querySelector("#item-warranty").value = item.warrantyDate ? item.warrantyDate.slice(0, 10) : "";
            document.querySelector("#item-notes").value = item.notes || "";
            document.querySelector("#add-item-modal h2").textContent = "Edit item";
            document.querySelector("#add-item-modal")?.classList.add("is-open");
        }
    });
    document.querySelectorAll("[data-action=\"open-modal\"]").forEach((button) => button.addEventListener("click", () => {
        if (!form.dataset.editingId) document.querySelector("#add-item-modal h2").textContent = "Add new item";
        document.querySelector(`#${button.dataset.modal}`)?.classList.add("is-open");
    }));
    document.querySelectorAll("[data-modal-close]").forEach((button) => button.addEventListener("click", () => button.closest("[data-modal-root]")?.classList.remove("is-open")));
    document.querySelectorAll('[data-filter="search"]').forEach((field) => field.addEventListener("input", render));
    render();
}

function setupNavigation() {
    document.querySelector('[data-action="toggle-sidebar"]')?.addEventListener("click", () => document.querySelector("#sidebar")?.classList.toggle("is-open"));
    document.querySelectorAll('[data-action="logout"]').forEach((link) => link.addEventListener("click", (event) => {
        event.preventDefault();
        localStorage.removeItem("token");
        window.location.href = "login.html";
    }));
    document.querySelectorAll("[data-modal]").forEach((button) => button.addEventListener("click", () => document.querySelector(`#${button.dataset.modal}`)?.classList.add("is-open")));
    document.querySelectorAll("[data-modal-close]").forEach((button) => button.addEventListener("click", () => button.closest("[data-modal-root]")?.classList.remove("is-open")));
}

async function initializeApp() {
    const page = document.body.dataset.page;
    if (page === "stock" || page === "inventory") {
        document.querySelectorAll("#stock-table tbody, #items-table tbody").forEach((tbody) => tbody.replaceChildren());
    }
    if (page === "locations") document.querySelector("#locations-grid")?.replaceChildren();
    if (page === "notifications") document.querySelector("#notif-list")?.replaceChildren();
    if (!token) {
        window.location.href = "login.html";
        return;
    }
    setupNavigation();
    try {
        const { user } = await apiRequest("/auth/profile");
        currentUser = user;
        setUserDetails(user);
        if (page === "stock") await loadStock();
        if (page === "locations") await loadLocations();
        if (page === "notifications") await loadNotifications();
        if (page === "inventory") await loadInventory();
    } catch (error) {
        if (error.message !== "Your session has expired. Please sign in again.") notify(error.message);
    }
}

document.addEventListener("DOMContentLoaded", initializeApp);
