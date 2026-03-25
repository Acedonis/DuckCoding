// index.js
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// Define EJS como template engine
app.set("view engine", "ejs");

// Serve arquivos estáticos sem cache
app.use(express.static("public", { maxAge: 0 }));

// Rota principal
app.get("/", (req, res) => {
  // Aqui podes adicionar mais bots depois se quiser
  res.render("index", { botName: "DuckCoding Bot", status: "Online 🚀" });
});

// Inicia servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});