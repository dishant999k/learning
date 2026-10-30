const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/user");
const Inventory = require("../models/inventory");
const Location = require("../models/Location");
const Category = require("../models/Category");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


// ============================
// REGISTER
// ============================

router.post("/register", async (req, res) => {

    try {

        const {
            firstName,
            lastName,
            email,
            password
        } = req.body;

        const normalizedEmail = String(email || "").trim().toLowerCase();
        const normalizedFirstName = typeof firstName === "string" ? firstName.trim() : "";
        const normalizedLastName = typeof lastName === "string" ? lastName.trim() : "";
        if (!normalizedFirstName || !normalizedLastName || !/^\S+@\S+\.\S+$/.test(normalizedEmail) || typeof password !== "string" || password.length < 8 || !/\d/.test(password)) {
            return res.status(400).json({ message: "Enter your name, a valid email, and a password of at least 8 characters including a number" });
        }

        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            return res.status(400).json({
                message: "Email already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            firstName: normalizedFirstName,
            lastName: normalizedLastName,
            email: normalizedEmail,
            password: hashedPassword
        });

        await user.save();

        res.status(201).json({
            message: "User Registered Successfully"
        });

    } catch (error) {

        if (error.code === 11000) {
            return res.status(409).json({ message: "Email already exists" });
        }

        res.status(500).json({
            message: "Server Error"
        });
    }

});


// ============================
// LOGIN
// ============================

router.post("/login", async (req, res) => {

    try {

        const { email, password } = req.body;

        if (!email || typeof password !== "string") {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await User.findOne({ email: String(email).trim().toLowerCase() });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                id: user._id
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        res.status(200).json({
            message: "Login Successful",
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email
            }
        });

    } catch (error) {

        res.status(500).json({
            message: "Server Error"
        });
    }

});


// ============================
// PROFILE
// ============================

router.get("/profile", authMiddleware, async (req, res) => {

    try {

        const user = await User.findById(req.user.id)
            .select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(200).json({
            user
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: "Server Error"
        });
    }

});

router.patch("/profile", authMiddleware, async (req, res) => {
    try {
        const firstName = typeof req.body.firstName === "string" ? req.body.firstName.trim() : "";
        const lastName = typeof req.body.lastName === "string" ? req.body.lastName.trim() : "";
        if (!firstName || !lastName || firstName.length > 80 || lastName.length > 80) {
            return res.status(400).json({ message: "Enter a first and last name (up to 80 characters each)" });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        user.firstName = firstName;
        user.lastName = lastName;
        await user.save();

        res.json({
            message: "Profile updated",
            user: { id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email }
        });
    } catch (error) {
        res.status(500).json({ message: error.message || "Unable to update profile" });
    }
});

router.patch("/password", authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (typeof currentPassword !== "string" || typeof newPassword !== "string"
            || newPassword.length < 8 || !/\d/.test(newPassword)) {
            return res.status(400).json({ message: "Enter your current password and a new password of at least 8 characters including a number" });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (!await bcrypt.compare(currentPassword, user.password)) {
            return res.status(401).json({ message: "Current password is incorrect" });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        res.json({ message: "Password updated. Please sign in again." });
    } catch (error) {
        res.status(500).json({ message: error.message || "Unable to update password" });
    }
});

router.delete("/profile", authMiddleware, async (req, res) => {
    try {
        const { password } = req.body;
        if (typeof password !== "string") {
            return res.status(400).json({ message: "Password is required to delete your account" });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (!await bcrypt.compare(password, user.password)) {
            return res.status(401).json({ message: "Password is incorrect" });
        }

        await Promise.all([
            Inventory.deleteMany({ user: user._id }),
            Location.deleteMany({ user: user._id }),
            Category.deleteMany({ user: user._id })
        ]);
        await user.deleteOne();
        res.json({ message: "Account and its data deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message || "Unable to delete account" });
    }
});


// VERY IMPORTANT:
// module.exports must be at the END

module.exports = router;