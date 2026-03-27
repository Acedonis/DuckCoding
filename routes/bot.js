const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { startBot, stopBot, sendInput, isRunning } = require("../bot-runner");

// Middleware para verificar login
function ensureAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Não autorizado" });
  next();
}

// Start
router.post("/start/:botId", ensureAuth, async (req, res) => {
  const { botId } = req.params;
  const bot = req.user.bots.find(b => b._id.toString() === botId);
  if (!bot) return res.status(400).json({ error: `botId inválido: ${botId}` });

  const filePath = bot.filePath;
  if (!filePath || !fs.existsSync(filePath)) return res.status(400).json({ error: `filePath inválido para botId: ${botId}` });

  try {
    startBot(req.user._id.toString(), botId, filePath, bot.lang);
    res.json({ success: true, status: "started" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stop
router.post("/stop/:botId", ensureAuth, (req, res) => {
  const { botId } = req.params;
  if (stopBot(req.user._id.toString(), botId)) {
    res.json({ success: true, status: "stopped" });
  } else {
    res.status(400).json({ error: "Bot não estava a correr" });
  }
});

// Run (envia input)
router.post("/run/:botId", ensureAuth, (req, res) => {
  const { botId } = req.params;
  const { input } = req.body;
  if (!input) return res.status(400).json({ error: "input necessário" });

  if (sendInput(req.user._id.toString(), botId, input)) {
    res.json({ success: true });
  } else {
    res.status(400).json({ error: "Bot não está a correr" });
  }
});

// Save (sobrescreve o ficheiro)
router.post("/save/:botId", ensureAuth, (req, res) => {
  const { botId } = req.params;
  const { code } = req.body;
  const bot = req.user.bots.find(b => b._id.toString() === botId);
  if (!bot) return res.status(400).json({ error: `botId inválido: ${botId}` });

  const filePath = bot.filePath;
  if (!filePath) return res.status(400).json({ error: `filePath inválido para botId: ${botId}` });

  try {
    fs.writeFileSync(filePath, code, "utf8");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete
router.post("/delete/:botId", ensureAuth, (req, res) => {
  const { botId } = req.params;
  const botIndex = req.user.bots.findIndex(b => b._id.toString() === botId);
  if (botIndex === -1) return res.status(400).json({ error: `botId inválido: ${botId}` });

  const bot = req.user.bots[botIndex];
  if (bot.filePath && fs.existsSync(bot.filePath)) fs.unlinkSync(bot.filePath);
  stopBot(req.user._id.toString(), botId);

  // Remove do array ou DB
  req.user.bots.splice(botIndex, 1);

  res.json({ success: true });
});

module.exports = router;