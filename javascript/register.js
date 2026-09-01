const form = document.querySelector("#register-form");

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
            "http://localhost:5000/api/auth/register",
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