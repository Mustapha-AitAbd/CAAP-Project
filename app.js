const express = require("express");
const bodyParser = require("body-parser");
const authRoutes = require("./routes/authRoutes");
const { preAuthenticate } = require("./utils/preAuthenticate");

const app = express();
const port = 3000;

// Middleware to parse JSON data
app.use(bodyParser.json());

// Routes for user authentication and registration
app.use("/api/auth", authRoutes);



app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
