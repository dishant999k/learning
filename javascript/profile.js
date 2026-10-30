const PROFILE_API_URL = window.HOMESTOCK_API_URL || "http://localhost:5000/api";
const profileToken = localStorage.getItem("token") || sessionStorage.getItem("token");

async function profileRequest(path, options = {}) {
    const response = await fetch(`${PROFILE_API_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${profileToken}`,
            ...options.headers
        }
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        window.location.href = "login.html";
        throw new Error("Your session has expired. Please sign in again.");
    }
    if (!response.ok) throw new Error(data.message || "Request failed");
    return data;
}

function showProfileMessage(message) {
    window.alert(message);
}

async function loadProfile() {
    if (!profileToken) {
        window.location.href = "login.html";
        return;
    }

    try {
        const { user } = await profileRequest("/auth/profile");
        document.querySelector("#first").value = user.firstName || "";
        document.querySelector("#last").value = user.lastName || "";
        document.querySelector("#email").value = user.email || "";
        document.querySelector(".avatarName").textContent = `${user.firstName} ${user.lastName}`;
        document.querySelector(".profile-side .text-muted").textContent = user.email;
        document.querySelectorAll(".sidebar__user-name").forEach((element) => {
            element.textContent = `${user.firstName} ${user.lastName}`;
        });
        document.querySelectorAll(".sidebar__user-email").forEach((element) => {
            element.textContent = user.email;
        });
        document.querySelectorAll(".avatar").forEach((element) => {
            element.textContent = `${user.firstName?.[0] || "U"}${user.lastName?.[0] || ""}`.toUpperCase();
        });
        const userId = user.id || user._id;
        loadPreferences(userId);
        bindProfileForms(userId);
    } catch (error) {
        if (error.message !== "Your session has expired. Please sign in again.") {
            showProfileMessage(error.message);
        }
    }
}

function loadPreferences(userId) {
    const key = `homestock-preferences-${userId}`;
    let preferences = {};
    try {
        preferences = JSON.parse(localStorage.getItem(key) || "{}");
    } catch (error) {
        console.error("Could not read notification preferences", error);
    }
    document.querySelectorAll(".setting-row input[type=checkbox]").forEach((input) => {
        if (typeof preferences[input.name] === "boolean") {
            input.checked = preferences[input.name];
        }
        input.addEventListener("change", () => {
            preferences[input.name] = input.checked;
            localStorage.setItem(key, JSON.stringify(preferences));
        });
    });
}

function bindProfileForms(userId) {
    const profileForm = document.querySelector("#profile-form");
    profileForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
            const { user, message } = await profileRequest("/auth/profile", {
                method: "PATCH",
                body: JSON.stringify({
                    firstName: document.querySelector("#first").value,
                    lastName: document.querySelector("#last").value
                })
            });
            document.querySelector(".avatarName").textContent = `${user.firstName} ${user.lastName}`;
            document.querySelectorAll(".sidebar__user-name").forEach((element) => {
                element.textContent = `${user.firstName} ${user.lastName}`;
            });
            document.querySelectorAll(".avatar").forEach((element) => {
                element.textContent = `${user.firstName?.[0] || "U"}${user.lastName?.[0] || ""}`.toUpperCase();
            });
            showProfileMessage(message);
        } catch (error) {
            showProfileMessage(error.message);
        }
    });

    document.querySelector("#password-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const newPassword = document.querySelector("#new-pw").value;
        if (newPassword !== document.querySelector("#confirm-pw").value) {
            showProfileMessage("New passwords do not match");
            return;
        }
        try {
            const { message } = await profileRequest("/auth/password", {
                method: "PATCH",
                body: JSON.stringify({
                    currentPassword: document.querySelector("#current").value,
                    newPassword
                })
            });
            localStorage.removeItem("token");
            sessionStorage.removeItem("token");
            showProfileMessage(message);
            window.location.href = "login.html";
        } catch (error) {
            showProfileMessage(error.message);
        }
    });

    document.querySelector('[data-action="delete-account"]')?.addEventListener("click", async () => {
        if (!window.confirm("This permanently deletes your account and all inventory. Continue?")) return;
        const password = window.prompt("Enter your password to confirm account deletion");
        if (password === null) return;
        try {
            const { message } = await profileRequest("/auth/profile", {
                method: "DELETE",
                body: JSON.stringify({ password })
            });
            localStorage.removeItem("token");
            sessionStorage.removeItem("token");
            localStorage.removeItem(`homestock-read-${userId}`);
            localStorage.removeItem(`homestock-preferences-${userId}`);
            showProfileMessage(message);
            window.location.href = "register.html";
        } catch (error) {
            showProfileMessage(error.message);
        }
    });

    document.querySelectorAll('[data-action="logout"]').forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            localStorage.removeItem("token");
            sessionStorage.removeItem("token");
            window.location.href = "login.html";
        });
    });
}

loadProfile();
