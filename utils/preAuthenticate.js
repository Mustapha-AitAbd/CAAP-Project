const ethers = require("ethers");
const crypto = require("crypto");
const Redis = require("ioredis");

// Local Ganache provider configuration
const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:7545");

// Redis Configuration
const redis = new Redis(); 

// Function to calculate the SHA-256 hash
const calculateHash = (data) => {
  return crypto.createHash("sha256").update(data).digest("hex");
};

// Function to select a shard with PRF
const selectShard = (hashedUserId, requestTimestamp, m) => {
  const prfInput = `${hashedUserId}${requestTimestamp}`;
  const prfValue = parseInt(calculateHash(prfInput), 16); // Convert hash to integer
  return prfValue % m; // Selected Shard
};

// Function to create a challenge token
const createChallengeToken = async () => {
  const latestBlock = await provider.getBlock("latest");
  const networkTimestamp = Date.now(); // Current timestamp in milliseconds

  const challengeToken = calculateHash(`${latestBlock.hash}${networkTimestamp}`);
  return { challengeToken, networkTimestamp };
};

// Function to sign the challenge token by the shard nodes
const signChallengeToken = async (challengeToken, shardNodes) => {
  const signedTokens = [];

  // Fixed private and public key of the node (example)
  const privateKey = "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d"; // Clé privée du nœud
  const publicKey = "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1"; // Clé publique du nœud

  // Create a wallet from the private key
  const wallet = new ethers.Wallet(privateKey, provider);

  // Sign the challengeToken with the wallet's private key
  const signature = await wallet.signMessage(challengeToken);

  // Add the fixed public key only once at the beginning
  signedTokens.push({
    publicKey: publicKey, 
    signature: signature,
  });

 // Use the signer.getAddress() method to get the public address in the loop
  for (const node of shardNodes) {
    const signer = provider.getSigner(node);
    const address = await signer.getAddress();

    signedTokens.push({
      publicKey: address, // Using the signer.getAddress() method to get the public address of the node
      signature: signature,
    });
  }

  return signedTokens;
};

// Main pre-authentication function
const preAuthenticate = async (userId) => {
  try {
    // Étape 1 : Hachage de l'ID utilisateur
    const hashedUserId = calculateHash(userId);

    // Step 2: Generate an authentication request
    const requestTimestamp = Date.now();
    const requestAuth = {
      userId: hashedUserId,
      timestamp: requestTimestamp,
    };

    // Step 3: Dynamically selecting a shard
    const totalShards = 2; // Total number of shards in the network
    const selectedShard = selectShard(hashedUserId, requestTimestamp, totalShards);

    // Step 4: Generating a challenge token
    const { challengeToken, networkTimestamp } = await createChallengeToken();

    // Storing the challengeToken in Redis with an expiration of 3000 seconds
    await redis.setex(`challengeToken:${hashedUserId}`, 3000, challengeToken);

    // Step 5: Selecting nodes for the shard
    const allNodes = await provider.listAccounts(); // List of available nodes
    const shardNodes = allNodes.slice(selectedShard * 2, selectedShard * 2 + 2); // Ex : 2 nœuds par shard

    // Step 6: Signature of the token by the nodes
    const signedTokens = await signChallengeToken(challengeToken, shardNodes);

    // Step 7: Response Structure
    const response = {
      requestAuth,
      selectedShard,
      challengeToken,
      signedTokens,
    };

    return response;
  } catch (error) {
    console.error("Error during pre-authentication:", error);
    throw error;
  }
};

module.exports = { preAuthenticate };