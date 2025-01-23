const ethers = require("ethers");
const crypto = require("crypto");
const Redis = require("ioredis");
const { getBlockchain } = require("./blockchain");

// Configuration du fournisseur Ganache local
const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:7545");

// Configuration de Redis
const redis = new Redis(); // Par défaut, Redis écoute sur 127.0.0.1:6379

// Fonction pour calculer le hash SHA-256
const calculateHash = (data) => {
  return crypto.createHash("sha256").update(data).digest("hex");
};

// Fonction pour signer un token avec une clé privée
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

// Fonction pour envoyer les données au système blockchain
const sendToBlockchain = (userId, signedToken) => {
  try {
    // Hacher l'ID utilisateur et le token signé en chaînes de caractères
    const hashedUserId = crypto.createHash("sha256").update(userId.toString()).digest("hex");  // Convertir userId en chaîne de caractères
    const hashedSignedToken = crypto.createHash("sha256").update(signedToken.toString()).digest("hex");  // Convertir signedToken en chaîne de caractères

    // Simuler une réponse de blockchain
    return {  // Retourner l'objet sans syntaxe incorrecte
      hashedUserId,
      hashedSignedToken,
    };
  } catch (error) {
    console.error("Error during blockchain data processing:", error.message);
    throw new Error("Blockchain data processing failed");
  }
};


// Fonction pour récupérer et signer le token
const retrieveAndSignToken = async (hashedUserId) => {
  try {
    // Étape 1 : Récupérer le token depuis Redis
    const blockchainData = getBlockchain();
    const storedToken = await redis.get(`challengeToken:${hashedUserId}`);
    if (!storedToken) {
      throw new Error("Token introuvable dans Redis.");
    }

    console.log(`Token récupéré depuis Redis : ${storedToken}`);

     // Étape 2 : Rechercher l'utilisateur dans la blockchain par index
     const userBlock = blockchainData.find((block) => {
      const blockHash = calculateHash(block.index.toString());  // Utilisation de la fonction calculateHash
      return blockHash === hashedUserId.toString();
    });


    if (!userBlock) {
      throw new Error("Informations utilisateur introuvables dans la blockchain.");
    }

    console.log("Bloc contenant l'utilisateur trouvé :", userBlock);

    // Étape 3 : Extraire la clé privée de l'utilisateur depuis le bloc
    const userPrivateKey = userBlock.privateKey;
    console.log(`Clé privée utilisateur extraite : ${userPrivateKey}`);

    // Étape 4 : Signer le token avec la clé privée de l'utilisateur
    const wallet = new ethers.Wallet(userPrivateKey);
    const userSignedToken = await wallet.signMessage(storedToken);


    // Étape 6 : Préparer la réponse
    const response = {
      userId: userBlock.index,
      storedToken,
      userSignedToken,
      userPrivateKey,
    };

    console.log("Réponse générée :", response);
    return response;
  } catch (error) {
    console.error("Erreur lors de la récupération et signature du token :", error);
    throw error;
  }
};


// Fonction pour valider les tokens signés avec le mécanisme BFT via Ganache
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
      throw new Error("Aucun nœud disponible dans Ganache.");
    }

    const threshold = Math.ceil((2 / 3) * totalNodes); // Seuil pour consensus
    let votes = []; // Stocke les votes des nœuds

    // **Phase 1: Préparation**
    console.log("Phase 1: Préparation - Envoi de la proposition par le leader.");
    const leader = accounts[0]; // Premier compte comme leader
    console.log(`Leader: ${leader}`);

    for (let i = 1; i < totalNodes; i++) {
      const nodeAddress = accounts[i]; // Utilisation de l'adresse du nœud

      // Simuler une validation basée sur la comparaison des tokens
      const isValid = userSignedToken === signature;

      // **Phase 2: Pré-confirmation**
      console.log(`Nœud ${i} (${nodeAddress}) valide la proposition : ${isValid}`);
      votes.push({ node: nodeAddress, vote: isValid });
    }

    // **Phase 3: Confirmation**
    const positiveVotes = votes.filter((vote) => vote.vote).length;
    console.log(
      `Votes positifs : ${positiveVotes}, Seuil requis : ${threshold}`
    );

    if (positiveVotes >= threshold) {
      console.log("Consensus atteint : Validation réussie.");
      return true; // Consensus atteint
    } else {
      console.log("Consensus non atteint : Validation échouée.");
      return false; // Consensus échoué
    }
  } catch (error) {
    console.error("Erreur lors de la validation PBFT :", error.message);
    throw new Error("Échec de la validation des tokens avec PBFT.");
  }
};

module.exports = {
  signTokenWithPrivateKey,
  sendToBlockchain,
  retrieveAndSignToken,
  validateTokensWithBFT,
};