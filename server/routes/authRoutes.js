const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/user");
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
        if (!firstName?.trim() || !lastName?.trim() || !/^\S+@\S+\.\S+$/.test(normalizedEmail) || typeof password !== "string" || password.length < 8 || !/\d/.test(password)) {
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
            firstName,
            lastName,
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


// VERY IMPORTANT:
// module.exports must be at the END

module.exports = router;