require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5500,http://127.0.0.1:5500")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        callback(null, !origin || allowedOrigins.includes(origin));
    }
}));
app.use(express.json());

const authRoutes = require("./routes/authRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const locationRoutes = require("./routes/locationRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const categoryRoutes = require("./routes/categoryRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/categories", categoryRoutes);

app.get("/", (req, res) => {
    res.json({ name: "HomeStock API", status: "ok" });
});

app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

const PORT = process.env.PORT || 5001;

const startServer = async () => {
    if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
        throw new Error("Set MONGO_URI and JWT_SECRET in server/.env before starting the API");
    }

    await connectDB();

    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
};

if (require.main === module) {
    startServer().catch((error) => {
        console.error(`API startup failed: ${error.message}`);
        process.exitCode = 1;
    });
}

module.exports = { app, startServer };