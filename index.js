require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
require("./auth");
const db = require("./database");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const http = require("http");
const { Server } = require("socket.io");
const { startBot, stopBot } = require("./bot-runner");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// ==================== PASTAS ====================
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const botsDir = path.join(__dirname, "bots");
if (!fs.existsSync(botsDir)) fs.mkdirSync(botsDir);

// ==================== DEFAULT CODE ====================
const defaultCode = {
  python: '# O teu bot Python\nprint("Hello from DuckCoding!")\n',
  java: '// O teu bot Java\npublic class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello from DuckCoding!");\n  }\n}\n'
};

// ==================== MULTER ====================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = path.join(botsDir, req.user._id);
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

// ==================== CONFIG ====================
app.set("view engine", "ejs");
app.use(express.static("public", { maxAge: 0 }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // 🔥 IMPORTANTE

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// ==================== AUTH ====================
function requireLogin(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}

// ==================== ROTAS ====================
app.get("/", (req, res) => {
  res.render("index", { botName: "DuckCoding Bot", status: "Online" });
});

app.get("/login", (req, res) => {
  if (req.isAuthenticated()) return res.redirect("/dashboard");
  res.render("login", { error: null });
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => res.redirect("/dashboard")
);

app.get("/dashboard", requireLogin, async (req, res) => {
  const bots = await db.bots.find({ userId: req.user._id });
  res.render("dashboard", { user: req.user, bots });
});

// ==================== EDITOR ====================
app.get("/editor", requireLogin, async (req, res) => {
  const botId = req.query.bot;
  let bot = null;

  if (botId) {
    bot = await db.bots.findOne({
      _id: botId,
      userId: req.user._id
    });
  }

  const lang = bot ? bot.lang : "python";

  res.render("editor", {
    user: req.user,
    bot,
    defaultCode: defaultCode[lang]
  });
});

// ==================== UPLOAD ====================
app.post("/bot/upload", requireLogin, upload.single("botfile"), async (req, res) => {
  const { botname, lang } = req.body;
  const file = req.file;

  if (!file) return res.redirect("/dashboard");

  await db.bots.insert({
    userId: req.user._id,
    name: botname || file.originalname,
    filename: file.originalname,
    lang: lang || "python",
    status: "stopped",
    createdAt: new Date()
  });

  res.redirect("/dashboard");
});

// ==================== RUN BOT ====================
app.post("/bot/run", requireLogin, async (req, res) => {
  const { code, name, lang, botId } = req.body;

  const userDir = path.join(botsDir, req.user._id);
  if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });

  const filename = lang === "java"
    ? "Main.java"
    : (name.replace(/\s+/g, "_") + ".py");

  const filePath = path.join(userDir, filename);
  fs.writeFileSync(filePath, code);

  let bot;

  if (botId) {
    await db.bots.update(
      { _id: botId },
      { $set: { code, name, lang, filename, status: "running" } }
    );
    bot = await db.bots.findOne({ _id: botId });
  } else {
    bot = await db.bots.insert({
      userId: req.user._id,
      name,
      filename,
      lang,
      code,
      status: "running",
      createdAt: new Date()
    });
  }

  const proc = startBot(req.user._id, bot._id, filePath, lang);

  proc.stdout.on("data", (d) => {
    io.to(req.user._id).emit("log", {
      botId: bot._id,
      msg: d.toString()
    });
  });

  proc.stderr.on("data", (d) => {
    io.to(req.user._id).emit("log", {
      botId: bot._id,
      msg: d.toString(),
      type: "err"
    });
  });

  proc.on("close", (code) => {
    io.to(req.user._id).emit("log", {
      botId: bot._id,
      msg: "\n[processo terminado com codigo " + code + "]\n",
      type: "sys"
    });

    io.to(req.user._id).emit("bot-stopped");

    db.bots.update(
      { _id: bot._id },
      { $set: { status: "stopped" } }
    );
  });

  res.json({ ok: true, botId: bot._id });
});

// ==================== SAVE ====================
app.post("/bot/save", requireLogin, async (req, res) => {
  const { code, name, lang, botId } = req.body;

  const userDir = path.join(botsDir, req.user._id);
  if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });

  const filename = lang === "java"
    ? "Main.java"
    : (name.replace(/\s+/g, "_") + ".py");

  const filePath = path.join(userDir, filename);
  fs.writeFileSync(filePath, code);

  if (botId) {
    await db.bots.update(
      { _id: botId },
      { $set: { code, name, lang, filename } }
    );
  } else {
    await db.bots.insert({
      userId: req.user._id,
      name,
      filename,
      lang,
      code,
      status: "stopped",
      createdAt: new Date()
    });
  }

  res.json({ ok: true });
});

// ==================== STOP ====================
app.post("/bot/stop-current", requireLogin, async (req, res) => {
  const { botId } = req.body;

  if (botId) {
    stopBot(req.user._id, botId);

    await db.bots.update(
      { _id: botId },
      { $set: { status: "stopped" } }
    );
  }

  res.json({ ok: true });
});

// ==================== DELETE ====================
app.post("/bot/delete/:botId", requireLogin, async (req, res) => {
  const bot = await db.bots.findOne({
    _id: req.params.botId,
    userId: req.user._id
  });

  if (bot) {
    stopBot(req.user._id, bot._id);

    const filePath = path.join(botsDir, req.user._id, bot.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await db.bots.remove({ _id: bot._id });
  }

  res.redirect("/dashboard");
});

// ==================== SOCKET ====================
io.on("connection", (socket) => {
  socket.on("join", (userId) => socket.join(userId));
});

// ==================== START ====================
server.listen(PORT, () => {
  console.log("Servidor rodando em http://localhost:" + PORT);
});