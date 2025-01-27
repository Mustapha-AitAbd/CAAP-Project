const ethers = require("ethers");

// Local Ganache provider configuration
const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:7545");

// Function to retrieve the list of blocks and transactions in the blockchain
const getBlockchainInfo = async () => {
  const blockNumber = await provider.getBlockNumber();
  console.log("Last block number:", blockNumber);

  let blockchainInfo = [];
  for (let i = 0; i <= blockNumber; i++) {
    const block = await provider.getBlock(i);
    let blockInfo = {
      number: block.number,
      timestamp: new Date(block.timestamp * 1000).toLocaleString(),
      hash: block.hash,
      transactions: block.transactions,
    };

    let transactionsInfo = [];
    for (const txHash of block.transactions) {
      const tx = await provider.getTransaction(txHash);
      transactionsInfo.push({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: ethers.utils.formatEther(tx.value) + " ETH",
      });
    }

    blockInfo.transactionsDetail = transactionsInfo;
    blockchainInfo.push(blockInfo);
  }

  return blockchainInfo;
};

// Function to retrieve accounts and their balance
const getAccountsAndBalances = async () => {
  const accounts = await provider.listAccounts();
  let accountsInfo = [];
  for (const account of accounts) {
    const balance = await provider.getBalance(account);
    accountsInfo.push({
      account: account,
      balance: ethers.utils.formatEther(balance) + " ETH",
    });
  }
  return accountsInfo;
};


module.exports = { getBlockchainInfo, getAccountsAndBalances };
