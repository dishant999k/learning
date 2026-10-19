const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
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
        default: 0
    },
    minimumStock: {
        type: Number,
        default: 0
    },
    location: {
        type: String,
        required: true,
        trim: true
    },
    expiryDate: {
        type: Date,
        default: null
    },
    purchaseDate: {
        type: Date,
        default: null
    },
    warrantyDate: {
        type: Date,
        default: null
    },
    notes: {
        type: String,
        default: ""
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Inventory", inventorySchema);
