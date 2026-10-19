const express = require("express");
const mongoose = require("mongoose");
const Inventory = require("../models/inventory");
const Location = require("../models/Location");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
    try {
        const [locations, items] = await Promise.all([
            Location.find({ user: req.user.id }).sort({ name: 1 }),
            Inventory.find({ user: req.user.id }).select("location")
        ]);
        const counts = items.reduce((result, item) => {
            result.set(item.location, (result.get(item.location) || 0) + 1);
            return result;
        }, new Map());
        const byName = new Map(locations.map((location) => [location.name.toLowerCase(), location]));

        for (const [name, count] of counts) {
            if (!byName.has(name.toLowerCase())) {
                byName.set(name.toLowerCase(), { _id: `inventory-${name}`, name, icon: "📦", itemCount: count });
            }
        }

        res.json({ locations: Array.from(byName.values()).map((location) => ({
            ...(location.toObject?.() || location),
            managed: Boolean(location.toObject),
            itemCount: counts.get(location.name) || 0
        })) });
    } catch (error) {
        res.status(500).json({ message: error.message || "Unable to load locations" });
    }
});

router.post("/", async (req, res) => {
    try {
        const name = String(req.body.name || "").trim();
        if (!name) {
            return res.status(400).json({ message: "Location name is required" });
        }
        const location = await Location.create({
            user: req.user.id,
            name,
            icon: String(req.body.icon || "📦").trim()
        });
        res.status(201).json({ message: "Location created", location: { ...location.toObject(), managed: true, itemCount: 0 } });
    } catch (error) {
        const duplicate = error.code === 11000;
        res.status(duplicate ? 409 : 400).json({ message: duplicate ? "That location already exists" : error.message });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid location ID" });
        }
        const location = await Location.findOne({ _id: req.params.id, user: req.user.id });
        if (!location) {
            return res.status(404).json({ message: "Location not found" });
        }
        const inUse = await Inventory.exists({ user: req.user.id, location: location.name });
        if (inUse) {
            return res.status(409).json({ message: "Move or remove items in this location before deleting it" });
        }
        await location.deleteOne();
        res.json({ message: "Location deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message || "Unable to delete location" });
    }
});

module.exports = router;