require("dotenv").config();
const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const passport = require("./auth");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
global.io = io;

mongoose.connect("mongodb://127.0.0.1:27017/duckcoding", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 },
}));

app.use(passport.initialize());
app.use(passport.session());

app.set("view engine", "ejs");

app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}

app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => res.redirect("/dashboard")
);

app.get("/logout", (req, res) => {
  req.logout(() => res.redirect("/"));
});

const botRoutes = require("./routes/bot");
app.use("/bot", botRoutes);

const Bot = require("./models/Bot");

app.get("/", (req, res) => {
  res.render("index", { user: req.user || null });
});

app.get("/login", (req, res) => {
  if (req.isAuthenticated()) return res.redirect("/dashboard");
  res.render("login", { error: null });
});

app.get("/dashboard", ensureAuth, async (req, res) => {
  const bots = await Bot.find({ userId: req.user._id });
  res.render("dashboard", { user: req.user, bots });
});

app.get("/editor", ensureAuth, async (req, res) => {
  const botId = req.query.bot || null;
  const bot = botId ? await Bot.findOne({ _id: botId, userId: req.user._id }) : null;
  res.render("editor", { user: req.user, bot });
});

io.on("connection", socket => {
  socket.on("join", userId => {
    socket.join(userId);
  });
});

server.listen(3000, () => console.log("Server running on http://localhost:3000"));