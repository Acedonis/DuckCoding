const mongoose = require("mongoose");

const BotSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  filename: { type: String, required: true },
  filepath: { type: String, required: true },
  lang: { type: String, enum: ["python","java","node"], required: true },
  status: { type: String, enum: ["running","offline"], default: "offline" },
});

module.exports = mongoose.model("Bot", BotSchema);