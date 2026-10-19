const form = document.querySelector("#register-form");
const API_BASE_URL = window.HOMESTOCK_API_URL || "http://localhost:5000/api";

if (!form) {
    console.warn("Register form not found on this page.");
} else {
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const firstName = document.querySelector("#first-name").value.trim();
    const lastName = document.querySelector("#last-name").value.trim();
    const email = document.querySelector("#email").value.trim();
    const password = document.querySelector("#password").value;
    const confirmPassword = document.querySelector("#confirm").value;

    if (password !== confirmPassword) {
        alert("Passwords do not match");
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/auth/register`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    firstName,
                    lastName,
                    email,
                    password
                })
            }
        );

        const data = await response.json();

        if (response.ok) {
            alert(data.message);
            window.location.href = "login.html";
        } else {
            alert(data.message);
        }

    } catch (error) {
        console.log(error);
        alert("Server Error");
    }
});
}