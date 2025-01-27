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

// Instantiating Redis
const redis = new Redis();

const calculateHash = (data) => {
  return crypto.createHash("sha256").update(data).digest("hex");
};


// Route to retrieve information from node 1's blockchain
router.get("/node/1/blockchain", async (req, res) => {
    try {
      const blockchainInfo = await getBlockchainInfo();
      res.json(blockchainInfo);  
    } catch (error) {
      res.status(500).send("Error retrieving blockchain");
    }
  });
  
// Route to retrieve accounts and their balance
router.get("/node/1/accounts", async (req, res) => {
    try {
      const accountsInfo = await getAccountsAndBalances();
      res.json(accountsInfo);  // Retourner les comptes et leur solde
    } catch (error) {
      res.status(500).send("Eerror retrieving accounts");
    }
  });

router.get("/blockchain", (req, res) => {
    const blockchain = getBlockchain();  
    res.status(200).json({
      blockchain: blockchain,  
      length: blockchain.length,  
    });
  });

  // Route for pre-authentication
router.post("/pre-authenticate", async (req, res) => {
    const { userId } = req.body; 
  
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
  
    try {
      const preAuthResponse = await preAuthenticate(userId);
      res.json(preAuthResponse); 
    } catch (error) {
      res.status(500).json({ error: "Pre-authentication failed" });
    }
  });

// Route POST to authenticate the user
router.post("/authenticate", async (req, res) => {
  try {
    const { userId, privateKey, challengeToken } = req.body;

    if (!userId || !privateKey || !challengeToken) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Step 1: Sign the token with the user's private key
    const signature = await authentic.signTokenWithPrivateKey(privateKey, challengeToken);

    // Step 2: Sending the hashed data to the blockchain system
    const blockchainResponse = authentic.sendToBlockchain(userId, signature);

    // Step 3: Retrieve and sign the token via `retrieveAndSignToken`
    const signedTokenData = await authentic.retrieveAndSignToken(userId);

    // Convert tokens to strings
    const userSignedTokenString = signedTokenData.userSignedToken.toString();
    const signatureString = signature.toString();

    // Step 4: Validate tokens with the PBFT mechanism
    const isAuthenticated = await authentic.validateTokensWithBFT(
      userSignedTokenString,
      signatureString
    );



    if (isAuthenticated) {

      // Remove token from Redis
      await redis.del(`challengeToken:${userId}`);
      console.log(`Token removed from Redis for user : ${userId}`);
 
       

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



// Route to find a block by index
router.post('/block', (req, res) => {
  
  const { index } = req.body;
  const blockchain = getBlockchain();

  // Check if the index is provided correctly
  if (index === undefined) {
    return res.status(400).json({ error: "Index is required in the request body" });
  }

  // Find the block corresponding to the index
  //const block = blockchain.find((b) => b.index === index);

  const block = blockchain.find((b) => {
    const blockHash = calculateHash(b.index.toString());  
    return blockHash === index.toString();  
  });
  
  if (block) {
    // If the block is found, return the block
    res.status(200).json(block);
  } else {
    // If the block is not found, return an error 404
    res.status(404).json({ error: "Block not found" });
  }
});


module.exports = router;
