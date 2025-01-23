const express = require("express");
const bodyParser = require("body-parser");
const authRoutes = require("./routes/authRoutes");
const { preAuthenticate } = require("./utils/preAuthenticate");

const app = express();
const port = 3000;

// Middleware pour analyser les données JSON
app.use(bodyParser.json());

// Routes pour l'authentification et l'enregistrement des utilisateurs
app.use("/api/auth", authRoutes);



app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
