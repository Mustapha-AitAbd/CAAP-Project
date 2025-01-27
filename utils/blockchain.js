const ethers = require("ethers");

// Local Ganache provider configuration
const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:7545");

const userKeys = {};
// Function to dynamically retrieve nodes from the provider
const getValidators = async () => {
  const signers = await provider.listAccounts();  
  const validators = await Promise.all(signers.map((address) => provider.getSigner(address)));  
  return validators;
};

// Function to select a certain percentage of validators randomly
const getRandomValidators = (validatorsList, percentage = 30) => {
  const numberOfValidators = Math.floor((validatorsList.length * percentage) / 100);  
  const shuffledValidators = [...validatorsList].sort(() => Math.random() - 0.5);  
  return shuffledValidators.slice(0, numberOfValidators);  
};

let blockchain = [];  // The simulated blockchain

// Function to check and add a Genesis Block if necessary
const addGenesisBlock = () => {
  if (blockchain.length === 0) {
    const genesisBlock = {
      index: 1,
      timestamp: new Date().toISOString(),
      data: { message: "Genesis Block" },  // Special Message for the Genesis Block
      previousHash: 0,
      hash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Genesis Block")),  // Hash du message
      privateKey: "0x17856d7938bf94bf3186d751ebe5a448ca86d5d7e055e6cb54fd62f662a883ca",
      publicKey: "0x60E9a1b6B9b94D2f32a92bad046C6866830eF464",
      nonce: 0 // Generate a nonce for the genesis block
    };

    blockchain.push(genesisBlock);  // Add the Genesis Block to the blockchain
    console.log("Genesis Block added to blockchain");
  }
};

// PoW validation function to check if the block meets the criteria
const validatePoW = (block, difficulty) => {
  let hash = block.hash;
  let nonce = block.nonce;

  // Simulate PoW validation by searching for a nonce that produces a hash with "difficulty" leading zeros
  while (!hash.startsWith('0'.repeat(difficulty))) {
    nonce++;
    hash = calculateHash(block, nonce);  // Recalculate the hash with the new nonce
  }

  // If a valid nonce is found, the block is valid
  console.log(`Block valid: ${hash} with nonce: ${nonce}`);
  return { ...block, hash, nonce };  // Return the validated block with its nonce
};

// Calculate the block hash with the nonce
const calculateHash = (block, nonce) => {
  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(JSON.stringify(block) + nonce));
};

// Function to create a block with validation by nodes
exports.createBlock = async (data, difficulty = 1) => {
  try {
    // Add the Genesis Block if it is not yet in the blockchain
    addGenesisBlock();

    const block = {
      index: blockchain.length + 1,
      timestamp: new Date().toISOString(),
      data,
      previousHash: blockchain.length ? blockchain[blockchain.length - 1].hash : null,
      nonce: 0, 
    };

    // Calculation of the initial hash of the block
    block.hash = calculateHash(block, block.nonce);

    // Generate a private and public key for the user
    const userWallet = ethers.Wallet.createRandom();
    block.privateKey = userWallet.privateKey;
    block.publicKey = userWallet.address;

    // Retrieve available validators
    const allValidators = await getValidators();
    const selectedValidators = getRandomValidators(allValidators, 30);  // Select 30% of validators

    // Perform block validation by PoW (simulate validation)
    const validBlock = validatePoW(block, difficulty);

    // Validation by nodes (PoA)
    const validNodes = await validateBlock(validBlock, difficulty, selectedValidators);

    // If the majority of validators accept, add the block to the blockchain
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

// Function for validating blocks by validators
const validateBlock = async (block, difficulty, selectedValidators) => {
  const results = await Promise.all(
    selectedValidators.map(async (validator) => {
      // Simulate block validation with PoW
      const address = await validator.getAddress();
      console.log(`Validator ${address} is validating the block`);

      // Each validator does a PoW to validate the block
      const validBlock = validatePoW(block, difficulty);

      // Simulate block validation after PoW
      const validationResult = validBlock.hash.startsWith('0'.repeat(difficulty)); // Vérifier si le hash respecte la difficulté
      console.log(`Validator ${address} validation result: ${validationResult}`);
      return validationResult;
    })
  );

  // Return the validators that validated the block
  return selectedValidators.filter((_, index) => results[index]);
};

// Function to retrieve the current blockchain
exports.getBlockchain = () => {
  return blockchain; // Returns the complete blockchain
};
