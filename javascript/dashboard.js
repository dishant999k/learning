const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "login.html";
} else {
    const userNameEls = document.querySelectorAll(".sidebar__user-name");
    const userEmailEls = document.querySelectorAll(".sidebar__user-email");

    async function loadUserProfile() {
        try {
            const response = await fetch("http://localhost:5000/api/auth/profile", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                localStorage.removeItem("token");
                window.location.href = "login.html";
                return;
            }

            const user = data.user || {};
            const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();

            userNameEls.forEach((element) => {
                element.textContent = fullName || "User";
            });

            userEmailEls.forEach((element) => {
                element.textContent = user.email || "";
            });
        } catch (error) {
            console.error("Failed to load dashboard profile:", error);
        }
    }

    document.querySelectorAll('[data-action="logout"]').forEach((button) => {
        button.addEventListener("click", (event) => {
            event.preventDefault();
            localStorage.removeItem("token");
            window.location.href = "login.html";
        });
    });

    loadUserProfile();
}


