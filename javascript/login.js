const form = document.querySelector("#login-form");

if (!form) {
    console.warn("Login form not found on this page.");
} else {
form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const email = document.querySelector("#email").value;
    const password = document.querySelector("#password").value;

    try {

const response = await fetch(
    "http://localhost:5000/api/auth/login",
    {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email,
            password
        })
    }
);

        const data = await response.json();

        if (response.ok) {

            alert(data.message);

            // Save JWT Token
            localStorage.setItem("token", data.token);

            // Redirect
            window.location.href = "dashboard.html";

        } else {

            alert(data.message);

        }

    } catch (error) {

        console.log(error);

        alert("Server Error");

    }

});
}