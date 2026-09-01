const express = require("express");
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
            warrantyDate
        } = req.body;

        const item = new Inventory({
            user: req.user.id,
            name,
            category,
            quantity,
            minimumStock,
            location,
            expiryDate,
            purchaseDate,
            warrantyDate
        });

        await item.save();

        res.status(201).json({
            message: "Inventory item added successfully",
            item
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: "Server Error"
        });

    }

});


// ============================
// GET USER INVENTORY
// ============================

router.get("/", authMiddleware, async (req, res) => {

    try {

        const items = await Inventory.find({
            user: req.user.id
        });

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


module.exports = router;