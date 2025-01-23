const express = require("express");
const router = express.Router();
const { registerUser } = require("../controllers/authController");
const { getBlockchain } = require("../utils/blockchain");
const { getBlockchainInfo, getAccountsAndBalances } = require("../utils/Noeud");
const { preAuthenticate } = require("../utils/preAuthenticate");
const authentic = require("../utils/authentication");
router.post("/register", registerUser);
const ethers = require("ethers");
const crypto = require("crypto");
const Redis = require("ioredis");

// Instanciation de Redis
const redis = new Redis();

const calculateHash = (data) => {
  return crypto.createHash("sha256").update(data).digest("hex");
};


// Route pour récupérer les informations de la blockchain du nœud 1
router.get("/node/1/blockchain", async (req, res) => {
    try {
      const blockchainInfo = await getBlockchainInfo();
      res.json(blockchainInfo);  // Retourner les informations de la blockchain
    } catch (error) {
      res.status(500).send("Erreur lors de la récupération de la blockchain");
    }
  });
  
  // Route pour récupérer les comptes et leur solde
router.get("/node/1/accounts", async (req, res) => {
    try {
      const accountsInfo = await getAccountsAndBalances();
      res.json(accountsInfo);  // Retourner les comptes et leur solde
    } catch (error) {
      res.status(500).send("Erreur lors de la récupération des comptes");
    }
  });

router.get("/blockchain", (req, res) => {
    const blockchain = getBlockchain();  // Récupère la blockchain
    res.status(200).json({
      blockchain: blockchain,  // Retourne la blockchain complète
      length: blockchain.length,  // Affiche la taille de la blockchain
    });
  });

  // Route pour la pré-authentification
router.post("/pre-authenticate", async (req, res) => {
    const { userId } = req.body; // Récupération de l'ID utilisateur depuis la requête
  
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
  
    try {
      const preAuthResponse = await preAuthenticate(userId);
      res.json(preAuthResponse); // Retourner la réponse au client
    } catch (error) {
      res.status(500).json({ error: "Pré-authentification échouée" });
    }
  });

// Route POST pour authentifier l'utilisateur
router.post("/authenticate", async (req, res) => {
  try {
    const { userId, privateKey, challengeToken } = req.body;

    if (!userId || !privateKey || !challengeToken) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Étape 1 : Signature du token avec la clé privée de l'utilisateur
    const signature = await authentic.signTokenWithPrivateKey(privateKey, challengeToken);

    // Étape 2 : Envoi des données hachées au système blockchain
    const blockchainResponse = authentic.sendToBlockchain(userId, signature);

    // Étape 3 : Récupérer et signer le token via `retrieveAndSignToken`
    const signedTokenData = await authentic.retrieveAndSignToken(userId);

    // **Nouvelle étape** : Convertir les tokens en chaînes de caractères
    const userSignedTokenString = signedTokenData.userSignedToken.toString();
    const signatureString = signature.toString();

    // Étape 4 : Valider les tokens avec le mécanisme PBFT
    const isAuthenticated = await authentic.validateTokensWithBFT(
      userSignedTokenString,
      signatureString
    );



    if (isAuthenticated) {

      // Supprimer le token de Redis
      await redis.del(`challengeToken:${userId}`);
      console.log(`Token supprimé de Redis pour l'utilisateur : ${userId}`);
 
       

      return res.status(200).json({
        message: "Authentication successful",
        signature,
        signedTokenData,
        blockchainData: blockchainResponse,
      });

     
    } else {
      return res.status(403).json({ error: "Authentication failed: tokens do not match" });
    }
  } catch (error) {
    console.error("Error during authentication:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});



// Route pour trouver un bloc par index en utilisant req.body
router.post('/block', (req, res) => {
  // Récupérer l'index du bloc depuis req.body
  const { index } = req.body;
  const blockchain = getBlockchain();

  // Vérifier si l'index est bien fourni
  if (index === undefined) {
    return res.status(400).json({ error: "Index is required in the request body" });
  }

  // Chercher le bloc correspondant à l'index
  //const block = blockchain.find((b) => b.index === index);

  const block = blockchain.find((b) => {
    const blockHash = calculateHash(b.index.toString());  // Convert index to string
    return blockHash === index.toString();  // Also convert index to string for comparison
  });
  
  if (block) {
    // Si le bloc est trouvé, renvoyer le bloc
    res.status(200).json(block);
  } else {
    // Si le bloc n'est pas trouvé, renvoyer une erreur 404
    res.status(404).json({ error: "Block not found" });
  }
});


module.exports = router;
