const ethers = require("ethers");
const crypto = require("crypto");
const Redis = require("ioredis");

// Configuration du fournisseur Ganache local
const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:7545");

// Configuration de Redis
const redis = new Redis(); // Par défaut, Redis écoute sur 127.0.0.1:6379

// Fonction pour calculer le hash SHA-256
const calculateHash = (data) => {
  return crypto.createHash("sha256").update(data).digest("hex");
};

// Fonction pour sélectionner un shard avec PRF
const selectShard = (hashedUserId, requestTimestamp, m) => {
  const prfInput = `${hashedUserId}${requestTimestamp}`;
  const prfValue = parseInt(calculateHash(prfInput), 16); // Convertir le hash en entier
  return prfValue % m; // Shard sélectionné
};

// Fonction pour créer un challenge token
const createChallengeToken = async () => {
  const latestBlock = await provider.getBlock("latest");
  const networkTimestamp = Date.now(); // Timestamp actuel en millisecondes

  const challengeToken = calculateHash(`${latestBlock.hash}${networkTimestamp}`);
  return { challengeToken, networkTimestamp };
};

// Fonction pour signer le challenge token par les nœuds du shard
const signChallengeToken = async (challengeToken, shardNodes) => {
  const signedTokens = [];

  // Clé privée et publique fixes du nœud (exemple)
  const privateKey = "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d"; // Clé privée du nœud
  const publicKey = "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1"; // Clé publique du nœud

  // Créer un wallet à partir de la clé privée
  const wallet = new ethers.Wallet(privateKey, provider);

  // Signer le challengeToken avec la clé privée du wallet
  const signature = await wallet.signMessage(challengeToken);

  // Ajouter la clé publique fixe une seule fois au début
  signedTokens.push({
    publicKey: publicKey, // Utilisation de la clé publique fixe
    signature: signature,
  });

  // Utiliser la méthode signer.getAddress() pour obtenir l'adresse publique dans la boucle
  for (const node of shardNodes) {
    const signer = provider.getSigner(node);
    const address = await signer.getAddress();

    signedTokens.push({
      publicKey: address, // Utilisation de la méthode signer.getAddress() pour obtenir l'adresse publique du nœud
      signature: signature,
    });
  }

  return signedTokens;
};

// Fonction principale de pré-authentification
const preAuthenticate = async (userId) => {
  try {
    // Étape 1 : Hachage de l'ID utilisateur
    const hashedUserId = calculateHash(userId);

    // Étape 2 : Générer une requête d'authentification
    const requestTimestamp = Date.now();
    const requestAuth = {
      userId: hashedUserId,
      timestamp: requestTimestamp,
    };

    // Étape 3 : Sélection dynamique d'un shard
    const totalShards = 2; // Nombre total de shards dans le réseau
    const selectedShard = selectShard(hashedUserId, requestTimestamp, totalShards);

    // Étape 4 : Génération d'un challenge token
    const { challengeToken, networkTimestamp } = await createChallengeToken();

    // Stockage du challengeToken dans Redis avec une expiration de 300 secondes
    await redis.setex(`challengeToken:${hashedUserId}`, 3000, challengeToken);

    // Étape 5 : Sélection des nœuds pour le shard
    const allNodes = await provider.listAccounts(); // Liste des nœuds disponibles
    const shardNodes = allNodes.slice(selectedShard * 2, selectedShard * 2 + 2); // Ex : 2 nœuds par shard

    // Étape 6 : Signature du token par les nœuds
    const signedTokens = await signChallengeToken(challengeToken, shardNodes);

    // Étape 7 : Structure de la réponse
    const response = {
      requestAuth,
      selectedShard,
      challengeToken,
      signedTokens,
    };

    return response;
  } catch (error) {
    console.error("Erreur lors de la pré-authentification :", error);
    throw error;
  }
};

module.exports = { preAuthenticate };