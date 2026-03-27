const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

global.io = io;

mongoose.connect("mongodb://127.0.0.1:27017/duckcoding", { useNewUrlParser:true, useUnifiedTopology:true });

app.use(express.static(path.join(__dirname,"public")));
app.use(express.urlencoded({ extended:true }));

// Simula login
app.use((req,res,next)=>{
  req.user = { _id:"user123", username:"Teste" };
  next();
});

app.set("view engine","ejs");

// Rotas
const botRoutes = require("./routes/bot");
app.use("/bot", botRoutes);

const Bot = require("./models/Bot");

app.get("/dashboard", async (req,res)=>{
  const bots = await Bot.find({ userId: req.user._id });
  res.render("dashboard", { user: req.user, bots });
});

// Socket.io
io.on("connection", socket=>{
  const userId = socket.handshake.query.userId;
  socket.join(userId);
});

server.listen(3000, ()=>console.log("Server running on http://localhost:3000"));