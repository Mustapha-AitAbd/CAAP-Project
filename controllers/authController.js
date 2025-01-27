const { createBlock } = require("../utils/blockchain");

exports.registerUser = async (req, res) => {
  const { username, password } = req.body;

// Checking input data
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    // Hash the password with SHA-256
    const hashedPassword = require("crypto").createHash("sha256").update(password).digest("hex");

    // Create the block with the user data
    const blockData = { username, password: hashedPassword };
    const block = await createBlock(blockData);

    // Sending the response with the user ID and private key
    res.status(200).json({
      userId: block.index,  
      privateKey: block.privateKey, 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while registering the user" });
  }
};

// function to retrieve the blockchain chain
exports.getBlockchain = (req, res) => {
  try {
    res.status(200).json({
      blockchain: blockchain,  // Returns the current blockchain
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while fetching the blockchain" });
  }
};
