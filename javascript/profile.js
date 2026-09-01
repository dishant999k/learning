const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "login.html";
}

const profileForm = document.querySelector("#profile-form");

async function loadProfile() {

    try {

        const response = await fetch(
            "http://localhost:5000/api/auth/profile",
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            alert(data.message);
            localStorage.removeItem("token");
            window.location.href = "login.html";
            return;
        }

        const user = data.user;

        document.querySelector("#first").value =
            user.firstName || "";

        document.querySelector("#last").value =
            user.lastName || "";

        document.querySelector("#email").value =
            user.email || "";

        // Update profile display
        document.querySelector(".avatarName").textContent =
            `${user.firstName} ${user.lastName}`;

        document.querySelector(".profile-side .text-muted").textContent =
            user.email;

        // Update sidebar
        document.querySelector(".sidebar__user-name").textContent =
            `${user.firstName} ${user.lastName}`;

        document.querySelector(".sidebar__user-email").textContent =
            user.email;

    } catch (error) {

        console.log(error);
        alert("Server Error");

    }
}

loadProfile();

const logoutButton = document.querySelector('[data-action="logout"]');

if (logoutButton) {
    logoutButton.addEventListener("click", (e) => {

        e.preventDefault();

        localStorage.removeItem("token");

        window.location.href = "login.html";
    });
}