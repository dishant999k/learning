const express = require("express");
const mongoose = require("mongoose");
const Inventory = require("../models/Inventory");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


// ============================
// ADD INVENTORY ITEM
// ============================

router.post("/", authMiddleware, async (req, res) => {

    try {

        const {
            name,
            category,
            quantity,
            minimumStock,
            location,
            expiryDate,
            purchaseDate,
            warrantyDate,
            notes
        } = req.body;

        if (typeof name !== "string" || !name.trim()
            || typeof category !== "string" || !category.trim()
            || typeof location !== "string" || !location.trim()) {
            return res.status(400).json({ message: "Name, category, and location are required" });
        }
        if ((quantity !== undefined && (!Number.isInteger(Number(quantity)) || Number(quantity) < 0))
            || (minimumStock !== undefined && (!Number.isInteger(Number(minimumStock)) || Number(minimumStock) < 0))) {
            return res.status(400).json({ message: "Quantity and minimum stock must be non-negative whole numbers" });
        }

        const item = new Inventory({
            user: req.user.id,
            name,
            category,
            quantity,
            minimumStock,
            location,
            expiryDate,
            purchaseDate,
            warrantyDate,
            notes
        });

        await item.save();

        res.status(201).json({
            message: "Inventory item added successfully",
            item
        });

    } catch (error) {
        const status = ["ValidationError", "CastError"].includes(error.name) ? 400 : 500;
        res.status(status).json({
            message: error.message || "Server Error"
        });

    }

});


// ============================
// GET USER INVENTORY
// ============================

router.get("/", authMiddleware, async (req, res) => {

    try {

        const items = await Inventory.find({ user: req.user.id }).sort({ name: 1 });

        res.status(200).json({
            items
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: "Server Error"
        });

    }

});

router.patch("/:id/stock", authMiddleware, async (req, res) => {
    try {
        const adjustment = Number(req.body.adjustment);
        if (!mongoose.isValidObjectId(req.params.id) || !Number.isInteger(adjustment) || adjustment === 0) {
            return res.status(400).json({ message: "Provide a valid item ID and non-zero whole-number adjustment" });
        }

        const item = await Inventory.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id, quantity: { $gte: -adjustment } },
            { $inc: { quantity: adjustment } },
            { new: true, runValidators: true }
        );
        if (!item) {
            const exists = await Inventory.exists({ _id: req.params.id, user: req.user.id });
            return res.status(exists ? 400 : 404).json({
                message: exists ? "Stock quantity cannot be negative" : "Inventory item not found"
            });
        }
        res.json({ message: "Stock updated", item });
    } catch (error) {
        res.status(500).json({ message: error.message || "Server Error" });
    }
});

router.patch("/:id", authMiddleware, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid inventory item ID" });
        }

        const allowedFields = ["name", "category", "quantity", "minimumStock", "location", "expiryDate", "purchaseDate", "warrantyDate", "notes"];
        const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowedFields.includes(key)));
        if (!Object.keys(updates).length) {
            return res.status(400).json({ message: "Provide at least one supported inventory field to update" });
        }
        if ((updates.quantity !== undefined && (!Number.isInteger(Number(updates.quantity)) || Number(updates.quantity) < 0))
            || (updates.minimumStock !== undefined && (!Number.isInteger(Number(updates.minimumStock)) || Number(updates.minimumStock) < 0))) {
            return res.status(400).json({ message: "Quantity and minimum stock must be non-negative whole numbers" });
        }
        const item = await Inventory.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!item) {
            return res.status(404).json({ message: "Inventory item not found" });
        }
        res.json({ message: "Inventory item updated", item });
    } catch (error) {
        res.status(400).json({ message: error.message || "Unable to update inventory item" });
    }
});

router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid inventory item ID" });
        }

        const item = await Inventory.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        if (!item) {
            return res.status(404).json({ message: "Inventory item not found" });
        }
        res.json({ message: "Inventory item deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message || "Server Error" });
    }
});


module.exports = router;