const ethers = require("ethers");
const crypto = require("crypto");
const Redis = require("ioredis");
const { getBlockchain } = require("./blockchain");

// Local Ganache provider configuration
const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:7545");

// Redis Configuration
const redis = new Redis(); // By default, Redis listens on 127.0.0.1:6379

// Function to calculate the SHA-256 hash
const calculateHash = (data) => {
  return crypto.createHash("sha256").update(data).digest("hex");
};

// Function to sign a token with a private key
const signTokenWithPrivateKey = async (privateKey, challengeToken) => {
  try {
    const wallet = new ethers.Wallet(privateKey);
    const signature = await wallet.signMessage(challengeToken);
    return signature;
  } catch (error) {
    console.error("Error signing token:", error.message);
    throw new Error("Token signing failed");
  }
};

// Function to send data to the blockchain system
const sendToBlockchain = (userId, signedToken) => {
  try {
    // Hash the user ID and signed token into strings
    const hashedUserId = crypto.createHash("sha256").update(userId.toString()).digest("hex");  
    const hashedSignedToken = crypto.createHash("sha256").update(signedToken.toString()).digest("hex"); 

    // Simulate a blockchain response
    return {  
      hashedUserId,
      hashedSignedToken,
    };
  } catch (error) {
    console.error("Error during blockchain data processing:", error.message);
    throw new Error("Blockchain data processing failed");
  }
};


// Function to retrieve and sign the token
const retrieveAndSignToken = async (hashedUserId) => {
  try {
    // Step 1: Retrieve the token from Redis
    const blockchainData = getBlockchain();
    const storedToken = await redis.get(`challengeToken:${hashedUserId}`);
    if (!storedToken) {
      throw new Error("Token not found in Redis.");
    }

    console.log(`Token retrieved from Redis : ${storedToken}`);

     // Step 2: Search the user in the blockchain by index
     const userBlock = blockchainData.find((block) => {
      const blockHash = calculateHash(block.index.toString());  
      return blockHash === hashedUserId.toString();
    });


    if (!userBlock) {
      throw new Error("User information not found in blockchain.");
    }

    console.log("Block containing user found:", userBlock);

    // Step 3: Extract the user's private key from the block
    const userPrivateKey = userBlock.privateKey;
    console.log(`Extracted user private key: ${userPrivateKey}`);

    // Step 4: Sign the token with the user's private key
    const wallet = new ethers.Wallet(userPrivateKey);
    const userSignedToken = await wallet.signMessage(storedToken);


    // Step 6: Prepare the response
    const response = {
      userId: userBlock.index,
      storedToken,
      userSignedToken,
      userPrivateKey,
    };

    console.log("Generated response:", response);
    return response;
  } catch (error) {
    console.error("Error while retrieving and signing the token:", error);
    throw error;
  }
};


// Function to validate tokens signed with the BFT mechanism via Ganache
/*const validateTokensWithBFT = async (userSignedToken, signature) => {
  try {
    // Récupérer les comptes Ganache comme nœuds
    const accounts = await provider.listAccounts();
    const totalNodes = accounts.length;

    const userSignedTokenString = userSignedToken.toString();
    const signatureString = signature.toString();

    if (totalNodes === 0) {
      throw new Error("Aucun nœud disponible dans Ganache.");
    }

    let validResponses = 0;

    // Simuler la validation par chaque nœud
    for (const account of accounts) {
      const wallet = new ethers.Wallet(account, provider);

      // Simuler une comparaison entre les tokens avec le nœud
      const isValid = userSignedToken === signature;

      if (isValid) {
        validResponses += 1;
      }
    }

    // Calculer le seuil BFT (2/3 des nœuds doivent valider)
    const threshold = Math.ceil((2 / 3) * totalNodes);
    return validResponses >= threshold;
  } catch (error) {
    console.error("Erreur lors de la validation BFT :", error.message);
    throw new Error("Échec de la validation des tokens avec BFT.");
  }
};*/

const validateTokensWithBFT = async (userSignedToken, signature) => {
  try {
    const accounts = await provider.listAccounts();
    const totalNodes = accounts.length;

    if (totalNodes === 0) {
      throw new Error("No nodes available in Ganache.");
    }

    const threshold = Math.ceil((2 / 3) * totalNodes); // Threshold for consensus
    let votes = []; // Stores node votes

    // **Phase 1: Preparation**
    const leader = accounts[0]; // First count as leader
    console.log(`Leader: ${leader}`);

    for (let i = 1; i < totalNodes; i++) {
      const nodeAddress = accounts[i]; // Using the node address

      // Simulate a validation based on the comparison of tokens
      const isValid = userSignedToken === signature;

      // **Phase 2: Pre-confirmation**
      console.log(`Node ${i} (${nodeAddress}) validates the proposal: ${isValid}`);
      votes.push({ node: nodeAddress, vote: isValid });
    }

    // **Phase 3: Confirmation**
    const positiveVotes = votes.filter((vote) => vote.vote).length;
    if (positiveVotes >= threshold) {
      console.log("Consensus reached: Validation successful.");
      return true; // Consensus reached
    } else {
      console.log("Consensus not reached: Validation failed.");
      return false; // Consensus failed
    }
  } catch (error) {
    console.error("Error during PBFT validation:", error.message);
    throw new Error("Failed to validate tokens with PBFT.");
  }
};

module.exports = {
  signTokenWithPrivateKey,
  sendToBlockchain,
  retrieveAndSignToken,
  validateTokensWithBFT,
};