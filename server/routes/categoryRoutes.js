const express = require("express");
const mongoose = require("mongoose");
const Category = require("../models/Category");
const Inventory = require("../models/inventory");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
    try {
        const [savedCategories, items] = await Promise.all([
            Category.find({ user: req.user.id }).sort({ name: 1 }),
            Inventory.find({ user: req.user.id }).select("category")
        ]);
        const counts = items.reduce((result, item) => {
            result.set(item.category, (result.get(item.category) || 0) + 1);
            return result;
        }, new Map());
        const byName = new Map(savedCategories.map((category) => [category.name.toLowerCase(), category]));

        for (const [name, itemCount] of counts) {
            if (!byName.has(name.toLowerCase())) {
                byName.set(name.toLowerCase(), { _id: `inventory-${name}`, name, icon: "📦", description: "", itemCount });
            }
        }

        res.json({
            categories: Array.from(byName.values()).map((category) => ({
                ...(category.toObject?.() || category),
                managed: Boolean(category.toObject),
                itemCount: counts.get(category.name) || 0
            }))
        });
    } catch (error) {
        res.status(500).json({ message: error.message || "Unable to load categories" });
    }
});

router.post("/", async (req, res) => {
    try {
        const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
        if (!name) {
            return res.status(400).json({ message: "Category name is required" });
        }

        const category = await Category.create({
            user: req.user.id,
            name,
            nameKey: name.toLowerCase(),
            icon: typeof req.body.icon === "string" && req.body.icon.trim() ? req.body.icon.trim() : "📦",
            description: typeof req.body.description === "string" ? req.body.description.trim() : ""
        });
        res.status(201).json({ message: "Category created", category: { ...category.toObject(), managed: true, itemCount: 0 } });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "That category already exists" });
        }
        res.status(400).json({ message: error.message || "Unable to create category" });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid category ID" });
        }

        const category = await Category.findOne({ _id: req.params.id, user: req.user.id });
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }
        if (await Inventory.exists({ user: req.user.id, category: category.name })) {
            return res.status(409).json({ message: "Move or remove items in this category before deleting it" });
        }

        await category.deleteOne();
        res.json({ message: "Category deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message || "Unable to delete category" });
    }
});

module.exports = router;
