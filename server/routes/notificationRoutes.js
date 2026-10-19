const express = require("express");
const Inventory = require("../models/inventory");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();
const DAY_MS = 24 * 60 * 60 * 1000;

router.get("/", authMiddleware, async (req, res) => {
    try {
        const items = await Inventory.find({ user: req.user.id }).select("name quantity minimumStock location expiryDate warrantyDate");
        const now = Date.now();
        const notifications = [];

        for (const item of items) {
            if (item.quantity <= item.minimumStock) {
                notifications.push({
                    id: `stock:${item._id}`,
                    type: "stock",
                    title: item.quantity === 0 ? `${item.name} is out of stock` : `${item.name} is running low`,
                    description: `${item.location} · ${item.quantity} on hand (minimum ${item.minimumStock})`,
                    createdAt: item.updatedAt
                });
            }

            for (const [type, date, windowDays, label] of [
                ["expiry", item.expiryDate, 7, "expires"],
                ["warranty", item.warrantyDate, 30, "warranty ends"]
            ]) {
                if (!date) continue;
                const daysLeft = Math.ceil((new Date(date).getTime() - now) / DAY_MS);
                if (daysLeft <= windowDays && daysLeft >= 0) {
                    notifications.push({
                        id: `${type}:${item._id}`,
                        type,
                        title: `${item.name} ${label} ${daysLeft === 0 ? "today" : `in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`}`,
                        description: item.location,
                        createdAt: item.updatedAt
                    });
                }
            }
        }

        res.json({ notifications });
    } catch (error) {
        res.status(500).json({ message: error.message || "Unable to load notifications" });
    }
});

module.exports = router;