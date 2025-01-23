const ethers = require("ethers");

// Configuration du fournisseur Ganache local
const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:7545");

const userKeys = {};
// Fonction pour récupérer dynamiquement les nœuds à partir du fournisseur
const getValidators = async () => {
  const signers = await provider.listAccounts();  // Récupérer les adresses des nœuds
  const validators = await Promise.all(signers.map((address) => provider.getSigner(address)));  // Récupérer les signers correspondants
  return validators;
};

// Fonction pour sélectionner un certain pourcentage de validateurs de manière aléatoire
const getRandomValidators = (validatorsList, percentage = 30) => {
  const numberOfValidators = Math.floor((validatorsList.length * percentage) / 100);  // Calculer le nombre de validateurs à sélectionner
  const shuffledValidators = [...validatorsList].sort(() => Math.random() - 0.5);  // Mélanger la liste des validateurs
  return shuffledValidators.slice(0, numberOfValidators);  // Retourner les X premiers validateurs après mélange
};

let blockchain = [];  // La blockchain simulée

// Fonction pour vérifier et ajouter un Genesis Block si nécessaire
const addGenesisBlock = () => {
  if (blockchain.length === 0) {
    const genesisBlock = {
      index: 1,
      timestamp: new Date().toISOString(),
      data: { message: "Genesis Block" },  // Message spécial pour le Genesis Block
      previousHash: null,
      hash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Genesis Block")),  // Hash du message
      privateKey: "0x17856d7938bf94bf3186d751ebe5a448ca86d5d7e055e6cb54fd62f662a883ca",
      publicKey: "0x60E9a1b6B9b94D2f32a92bad046C6866830eF464",
      nonce: 0 // Générer un nonce pour le genesis block
    };

    blockchain.push(genesisBlock);  // Ajouter le Genesis Block à la blockchain
    console.log("Genesis Block added to blockchain");
  }
};

// Fonction de validation PoW pour vérifier si le bloc respecte les critères
const validatePoW = (block, difficulty) => {
  let hash = block.hash;
  let nonce = block.nonce;

  // Simuler la validation PoW en recherchant un nonce qui produit un hash avec les "difficulty" premiers zéros
  while (!hash.startsWith('0'.repeat(difficulty))) {
    nonce++;
    hash = calculateHash(block, nonce);  // Recalculer le hash avec le nouveau nonce
  }

  // Si un nonce valide est trouvé, le bloc est valide
  console.log(`Block valid: ${hash} with nonce: ${nonce}`);
  return { ...block, hash, nonce };  // Retourner le bloc validé avec son nonce
};

// Calculer le hash du bloc avec le nonce
const calculateHash = (block, nonce) => {
  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(JSON.stringify(block) + nonce));
};

// Fonction pour créer un bloc avec validation par les nœuds
exports.createBlock = async (data, difficulty = 1) => {
  try {
    // Ajouter le Genesis Block s'il n'est pas encore dans la blockchain
    addGenesisBlock();

    const block = {
      index: blockchain.length + 1,
      timestamp: new Date().toISOString(),
      data,
      previousHash: blockchain.length ? blockchain[blockchain.length - 1].hash : null,
      nonce: 0, // Initialiser le nonce
    };

    // Calcul du hash initial du bloc
    block.hash = calculateHash(block, block.nonce);

    // Génération d'une clé privée et publique pour l'utilisateur
    const userWallet = ethers.Wallet.createRandom();
    block.privateKey = userWallet.privateKey;
    block.publicKey = userWallet.address;

    // Récupérer les validateurs disponibles
    const allValidators = await getValidators();
    const selectedValidators = getRandomValidators(allValidators, 30);  // Sélectionner 30% des validateurs

    // Effectuer la validation du bloc par PoW (simuler la validation)
    const validBlock = validatePoW(block, difficulty);

    // Validation par les nœuds (PoA)
    const validNodes = await validateBlock(validBlock, difficulty, selectedValidators);

    // Si la majorité des validateurs acceptent, ajouter le bloc à la blockchain
    if (validNodes.length >= Math.ceil(selectedValidators.length / 2)) { // Majority rule
      blockchain.push(validBlock);
      console.log("Block added to blockchain");
      return validBlock;
    } else {
      throw new Error("Block validation failed");
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// Fonction de validation des blocs par les validateurs
const validateBlock = async (block, difficulty, selectedValidators) => {
  const results = await Promise.all(
    selectedValidators.map(async (validator) => {
      // Simuler la validation des blocs avec PoW
      const address = await validator.getAddress();
      console.log(`Validator ${address} is validating the block`);

      // Chaque validateur fait un PoW pour valider le bloc
      const validBlock = validatePoW(block, difficulty);

      // Simuler la validation du bloc après PoW
      const validationResult = validBlock.hash.startsWith('0'.repeat(difficulty)); // Vérifier si le hash respecte la difficulté
      console.log(`Validator ${address} validation result: ${validationResult}`);
      return validationResult;
    })
  );

  // Retourner les validateurs qui ont validé le bloc
  return selectedValidators.filter((_, index) => results[index]);
};

// Fonction pour récupérer la blockchain actuelle
exports.getBlockchain = () => {
  return blockchain;  // Retourne la chaîne de blocs complète
};
