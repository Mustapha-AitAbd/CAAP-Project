const { createBlock } = require("../utils/blockchain");

exports.registerUser = async (req, res) => {
  const { username, password } = req.body;

  // Vérification des données d'entrée
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    // Hash du mot de passe avec SHA-256
    const hashedPassword = require("crypto").createHash("sha256").update(password).digest("hex");

    // Création du bloc avec les données de l'utilisateur
    const blockData = { username, password: hashedPassword };
    const block = await createBlock(blockData);

    // Envoi de la réponse avec l'ID utilisateur et clé privée
    res.status(200).json({
      userId: block.index,  // ID de l'utilisateur (index du bloc)
      privateKey: block.privateKey,  // Clé privée générée dans le système blockchain
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while registering the user" });
  }
};

// Nouvelle fonction pour récupérer la blockchain
exports.getBlockchain = (req, res) => {
  try {
    res.status(200).json({
      blockchain: blockchain,  // Retourne la blockchain actuelle
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while fetching the blockchain" });
  }
};
