require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());

const authRoutes = require("./routes/authRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const locationRoutes = require("./routes/locationRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/", (req, res) => {
    res.send("Backend is Running...");
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
        throw new Error("Set MONGO_URI and JWT_SECRET in server/.env before starting the API");
    }

    const connected = await connectDB();
    if (!connected) {
        throw new Error("Could not connect to MongoDB; API startup cancelled");
    }

    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
};

startServer().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});