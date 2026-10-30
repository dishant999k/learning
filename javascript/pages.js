function csvCell(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function downloadCsv(filename, headers, rows) {
    const contents = [headers, ...rows].map((row) => row.map((value) => {
        const safeValue = /^[=+\-@]/.test(String(value ?? "")) ? `'${value}` : value;
        return csvCell(safeValue);
    }).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([contents], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function daysUntil(value) {
    if (!value) return null;
    const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
    const target = year && month && day ? new Date(year, month - 1, day) : new Date(value);
    const today = new Date();
    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function setStatValues(values) {
    document.querySelectorAll(".stat__value").forEach((element, index) => {
        if (values[index] !== undefined) element.textContent = values[index];
    });
}

async function loadCategoriesPage() {
    const grid = document.querySelector("#categories-grid");
    const form = document.querySelector("#add-category-form");
    grid.replaceChildren();
    const { categories } = await apiRequest("/categories");

    grid.innerHTML = categories.map((category) => `<article class="card cat-card" data-category-id="${escapeHtml(category._id)}">
      <div class="cat-card__icon">${escapeHtml(category.icon || "📦")}</div>
      <div><div class="cat-card__name">${escapeHtml(category.name)}</div><div class="cat-card__count">${category.itemCount} ${category.itemCount === 1 ? "item" : "items"}</div></div>
      <div class="cat-card__actions"><a class="btn btn--ghost btn--sm" href="inventory.html?category=${encodeURIComponent(category.name)}">View items</a><button class="btn btn--ghost btn--sm" data-delete-category ${category.itemCount || !category.managed ? "disabled title=\"Only saved, empty categories can be deleted\"" : ""}>Delete</button></div>
    </article>`).join("") || "<p>No categories yet. Add one to organize your inventory.</p>";

    if (!form.dataset.bound) {
        form.dataset.bound = "true";
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            const values = new FormData(form);
            try {
                await apiRequest("/categories", {
                    method: "POST",
                    body: JSON.stringify({
                        name: values.get("name"),
                        icon: values.get("icon"),
                        description: values.get("description")
                    })
                });
                form.reset();
                document.querySelector("#add-category-modal")?.classList.remove("is-open");
                notify("Category added");
                await loadCategoriesPage();
            } catch (error) {
                notify(error.message);
            }
        });
    }

    if (!grid.dataset.bound) {
        grid.dataset.bound = "true";
        grid.addEventListener("click", async (event) => {
            const button = event.target.closest("[data-delete-category]");
            if (!button || button.disabled) return;
            const categoryId = button.closest("[data-category-id]")?.dataset.categoryId;
            if (!categoryId || !window.confirm("Delete this category?")) return;
            try {
                await apiRequest(`/categories/${categoryId}`, { method: "DELETE" });
                notify("Category deleted");
                await loadCategoriesPage();
            } catch (error) {
                notify(error.message);
            }
        });
    }
}

async function loadExpiryPage() {
    const { items } = await apiRequest("/inventory");
    const tbody = document.querySelector("#expiry-table tbody");
    const expiringItems = items.filter((item) => item.expiryDate);
    const expired = expiringItems.filter((item) => daysUntil(item.expiryDate) < 0);
    const withinSevenDays = expiringItems.filter((item) => daysUntil(item.expiryDate) >= 0 && daysUntil(item.expiryDate) <= 7);
    const withinThirtyDays = expiringItems.filter((item) => daysUntil(item.expiryDate) >= 0 && daysUntil(item.expiryDate) <= 30);
    setStatValues([expired.length, withinSevenDays.length, withinThirtyDays.length]);
    let activeTab = "expiring";

    const render = () => {
        const shown = expiringItems.filter((item) => {
            const days = daysUntil(item.expiryDate);
            return activeTab === "all" || (activeTab === "expired" ? days < 0 : days >= 0 && days <= 30);
        }).sort((left, right) => new Date(left.expiryDate) - new Date(right.expiryDate));
        tbody.innerHTML = shown.map((item) => {
            const days = daysUntil(item.expiryDate);
            const badge = days < 0 ? "badge--danger" : days <= 7 ? "badge--danger" : "badge--warning";
            const time = days < 0 ? `${Math.abs(days)} days overdue` : days === 0 ? "Today" : `${days} days`;
            return `<tr data-item-id="${escapeHtml(item._id)}"><td><div class="table__item"><div class="table__thumb">📦</div><div class="table__item-name">${escapeHtml(item.name)}</div></div></td><td>${escapeHtml(item.category)}</td><td>${escapeHtml(item.location)}</td><td>${item.quantity}</td><td>${formatDate(item.expiryDate)}</td><td><span class="badge ${badge}">${time}</span></td><td class="actions"><button class="btn btn--ghost btn--sm" data-expiry-action="use" ${item.quantity <= 0 ? "disabled" : ""}>Use one</button><button class="btn btn--ghost btn--sm" data-expiry-action="dispose" ${item.quantity <= 0 ? "disabled" : ""}>Dispose</button></td></tr>`;
        }).join("") || '<tr><td colspan="7">No items match this expiry filter.</td></tr>';
        document.querySelectorAll("[data-tab]").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tab === activeTab));
    };

    document.querySelectorAll("[data-tab]").forEach((tab) => {
        tab.addEventListener("click", () => {
            activeTab = tab.dataset.tab;
            render();
        });
    });
    if (!tbody.dataset.bound) {
        tbody.dataset.bound = "true";
        tbody.addEventListener("click", async (event) => {
            const button = event.target.closest("[data-expiry-action]");
            const itemId = button?.closest("[data-item-id]")?.dataset.itemId;
            if (!itemId || !button) return;
            try {
                const { items: currentItems } = await apiRequest("/inventory");
                const item = currentItems.find((entry) => entry._id === itemId);
                if (!item || item.quantity <= 0) return;
                const adjustment = button.dataset.expiryAction === "dispose" ? -item.quantity : -1;
                await apiRequest(`/inventory/${item._id}/stock`, { method: "PATCH", body: JSON.stringify({ adjustment }) });
                notify(button.dataset.expiryAction === "dispose" ? "Item quantity cleared" : "Quantity reduced");
                window.location.reload();
            } catch (error) {
                notify(error.message);
            }
        });
    }
    render();
}

async function loadWarrantyPage() {
    const { items } = await apiRequest("/inventory");
    const warrantyItems = items.filter((item) => item.warrantyDate);
    const tbody = document.querySelector("#warranty-table tbody");
    const active = warrantyItems.filter((item) => daysUntil(item.warrantyDate) >= 0);
    const expiring = active.filter((item) => daysUntil(item.warrantyDate) <= 90);
    const expired = warrantyItems.filter((item) => daysUntil(item.warrantyDate) < 0);
    setStatValues([active.length, expiring.length, expired.length]);
    tbody.innerHTML = warrantyItems.sort((left, right) => new Date(left.warrantyDate) - new Date(right.warrantyDate)).map((item) => {
        const days = daysUntil(item.warrantyDate);
        const badge = days < 0 ? "badge--danger" : days <= 90 ? "badge--warning" : "badge--success";
        const remaining = days < 0 ? `${Math.abs(days)} days ago` : days === 0 ? "Today" : `${days} days`;
        return `<tr><td><div class="table__item"><div class="table__thumb">📦</div><div class="table__item-name">${escapeHtml(item.name)}</div></div></td><td>${escapeHtml(item.category)}</td><td>${formatDate(item.purchaseDate)}</td><td>${formatDate(item.warrantyDate)}</td><td><span class="badge ${badge}">${remaining}</span></td><td>—</td><td class="actions"><a class="btn btn--ghost btn--sm" href="inventory.html">Edit item</a></td></tr>`;
    }).join("") || '<tr><td colspan="7">No warranty dates have been added to your inventory.</td></tr>';
}

async function loadReportsPage() {
    const { items } = await apiRequest("/inventory");
    const rowsForReport = (report) => {
        switch (report) {
            case "inventory-summary":
                return items.map((item) => [item.name, item.category, item.location, item.quantity, item.minimumStock, item.expiryDate || "", item.warrantyDate || ""]);
            case "monthly-purchase": {
                const now = new Date();
                return items.filter((item) => {
                    const date = item.purchaseDate && new Date(item.purchaseDate);
                    return date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                }).map((item) => [item.name, item.category, item.quantity, item.purchaseDate]);
            }
            case "expiring-items":
                return items.filter((item) => item.expiryDate && daysUntil(item.expiryDate) >= 0 && daysUntil(item.expiryDate) <= 30)
                    .sort((left, right) => new Date(left.expiryDate) - new Date(right.expiryDate))
                    .map((item) => [item.name, item.category, item.location, item.quantity, item.expiryDate]);
            case "low-stock":
                return items.filter((item) => itemStatus(item) !== "In stock")
                    .map((item) => [item.name, item.category, item.location, item.quantity, item.minimumStock, itemStatus(item)]);
            case "warranty-status":
                return items.filter((item) => item.warrantyDate)
                    .map((item) => [item.name, item.category, item.purchaseDate || "", item.warrantyDate]);
            case "location-breakdown": {
                const counts = new Map();
                items.forEach((item) => {
                    const current = counts.get(item.location) || { count: 0, quantity: 0 };
                    current.count += 1;
                    current.quantity += Number(item.quantity);
                    counts.set(item.location, current);
                });
                return Array.from(counts, ([location, count]) => [location, count.count, count.quantity]);
            }
            default:
                return items.map((item) => [item.name, item.category, item.location, item.quantity]);
        }
    };

    document.querySelectorAll("[data-report] [data-action]").forEach((button) => {
        button.addEventListener("click", () => {
            const report = button.closest("[data-report]").dataset.report;
            const rows = rowsForReport(report);
            const headers = {
                "inventory-summary": ["Item", "Category", "Location", "Quantity", "Minimum stock", "Expiry date", "Warranty date"],
                "monthly-purchase": ["Item", "Category", "Quantity", "Purchase date"],
                "expiring-items": ["Item", "Category", "Location", "Quantity", "Expiry date"],
                "low-stock": ["Item", "Category", "Location", "Quantity", "Minimum stock", "Status"],
                "warranty-status": ["Item", "Category", "Purchase date", "Warranty date"],
                "location-breakdown": ["Location", "Item count", "Quantity"]
            }[report];
            if (button.dataset.action === "export-excel") {
                downloadCsv(`${report}.csv`, headers, rows);
                return;
            }

            const printWindow = window.open("", "_blank");
            if (!printWindow) {
                notify("Allow pop-ups to create a printable report");
                return;
            }
            const title = button.closest("[data-report]").querySelector(".report-card__title").textContent;
            const table = `<table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
            printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>body{font:14px Arial,sans-serif;padding:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#eee}h1{font-size:20px}</style></head><body><h1>${escapeHtml(title)}</h1>${table}</body></html>`);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        });
    });
}

async function loadDashboardPage() {
    const { items } = await apiRequest("/inventory");
    const categories = new Set(items.map((item) => item.category));
    const locations = new Set(items.map((item) => item.location));
    const lowStock = items.filter((item) => itemStatus(item) !== "In stock");
    const expiring = items.filter((item) => item.expiryDate && daysUntil(item.expiryDate) >= 0 && daysUntil(item.expiryDate) <= 14)
        .sort((left, right) => new Date(left.expiryDate) - new Date(right.expiryDate));
    document.querySelector('[data-stat="total-items"]').textContent = items.length;
    document.querySelector('[data-stat="total-categories"]').textContent = categories.size;
    document.querySelector('[data-stat="low-stock"]').textContent = lowStock.length;
    document.querySelector('[data-stat="expiring"]').textContent = expiring.length;
    document.querySelector('[data-stat="total-categories"]').closest(".stat").querySelector(".stat__meta").textContent = `Across ${locations.size} locations`;
    document.querySelector('[data-stat="total-items"]').closest(".stat").querySelector(".stat__meta").textContent = "Tracked inventory records";
    document.querySelector('[data-stat="low-stock"]').closest(".stat").querySelector(".stat__meta").textContent = "At or below minimum quantity";
    document.querySelector('[data-stat="expiring"]').closest(".stat").querySelector(".stat__meta").textContent = "Within the next 14 days";

    const recent = [...items].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)).slice(0, 5);
    const recentBody = document.querySelector("#recent-items-table tbody");
    recentBody.innerHTML = recent.map((item) => `<tr><td><div class="table__item"><div class="table__thumb">📦</div><div><div class="table__item-name">${escapeHtml(item.name)}</div><div class="table__item-sub">${escapeHtml(item.notes || "")}</div></div></div></td><td>${escapeHtml(item.category)}</td><td>${escapeHtml(item.location)}</td><td>${item.quantity}</td><td class="text-muted">${formatDate(item.createdAt)}</td></tr>`).join("") || '<tr><td colspan="5">No items yet. Add your first item to get started.</td></tr>';
    const lists = document.querySelectorAll(".mini-list");
    if (lists[0]) {
        lists[0].innerHTML = lowStock.slice(0, 5).map((item) => `<li><div class="mini-list__thumb">📦</div><div class="mini-list__body"><div class="mini-list__title">${escapeHtml(item.name)}</div><div class="mini-list__meta">${item.quantity} on hand · ${escapeHtml(item.location)}</div></div><span class="badge ${item.quantity === 0 ? "badge--danger" : "badge--warning"}">${item.quantity === 0 ? "Out" : "Low"}</span></li>`).join("") || "<li>Everything is well stocked.</li>";
    }
    if (lists[1]) {
        lists[1].innerHTML = expiring.slice(0, 5).map((item) => `<li><div class="mini-list__thumb">📦</div><div class="mini-list__body"><div class="mini-list__title">${escapeHtml(item.name)}</div><div class="mini-list__meta">${daysUntil(item.expiryDate) === 0 ? "Expires today" : `Expires in ${daysUntil(item.expiryDate)} days`}</div></div><span class="badge ${daysUntil(item.expiryDate) <= 7 ? "badge--danger" : "badge--warning"}">${daysUntil(item.expiryDate)}d</span></li>`).join("") || "<li>No items are expiring in the next 14 days.</li>";
    }
}

async function setupPageActions(page) {
    const exportButton = document.querySelector('[data-action="export"]');
    if (exportButton && ["inventory", "stock"].includes(page)) {
        exportButton.addEventListener("click", async () => {
            try {
                const { items } = await apiRequest("/inventory");
                downloadCsv("homestock-inventory.csv",
                    ["Item", "Category", "Location", "Quantity", "Minimum stock", "Expiry date", "Purchase date", "Warranty date", "Notes"],
                    items.map((item) => [item.name, item.category, item.location, item.quantity, item.minimumStock, item.expiryDate || "", item.purchaseDate || "", item.warrantyDate || "", item.notes || ""]));
            } catch (error) {
                notify(error.message);
            }
        });
    }

    document.querySelectorAll('[data-action="open-notifications"]').forEach((button) => {
        button.addEventListener("click", () => { window.location.href = "notifications.html"; });
    });
    document.querySelectorAll('[data-action="notification-settings"]').forEach((button) => {
        button.addEventListener("click", () => { window.location.href = "profile.html"; });
    });
    document.querySelectorAll('[data-action="global-search"]').forEach((input) => {
        input.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" || !input.value.trim()) return;
            event.preventDefault();
            window.location.href = `inventory.html?q=${encodeURIComponent(input.value.trim())}`;
        });
    });

    const search = new URLSearchParams(window.location.search);
    const inventorySearch = document.querySelector('[data-filter="search"]');
    if (inventorySearch && search.has("q")) {
        inventorySearch.value = search.get("q");
        inventorySearch.dispatchEvent(new Event("input", { bubbles: true }));
    }
    const categoryFilter = document.querySelector('[data-filter="category"]');
    if (categoryFilter && search.has("category")) {
        categoryFilter.value = search.get("category");
        categoryFilter.dispatchEvent(new Event("input", { bubbles: true }));
    }
}

async function loadExtraPage(page) {
    await setupPageActions(page);
    if (page === "categories") await loadCategoriesPage();
    if (page === "expiry") await loadExpiryPage();
    if (page === "warranty") await loadWarrantyPage();
    if (page === "reports") await loadReportsPage();
    if (page === "dashboard") await loadDashboardPage();
}
