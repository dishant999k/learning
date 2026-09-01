const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        category: {
            type: String,
            required: true,
            trim: true
        },

        quantity: {
            type: Number,
            required: true,
            min: 0
        },

        minimumStock: {
            type: Number,
            default: 0,
            min: 0
        },

        location: {
            type: String,
            trim: true
        },

        expiryDate: {
            type: Date
        },

        purchaseDate: {
            type: Date
        },

        warrantyDate: {
            type: Date
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Inventory", inventorySchema);