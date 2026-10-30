const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
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
    nameKey: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    icon: {
        type: String,
        default: "📦",
        trim: true
    },
    description: {
        type: String,
        default: "",
        trim: true
    }
}, {
    timestamps: true
});

categorySchema.index({ user: 1, nameKey: 1 }, { unique: true });

module.exports = mongoose.model("Category", categorySchema);
