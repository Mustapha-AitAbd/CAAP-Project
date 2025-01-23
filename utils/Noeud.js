const ethers = require("ethers");

// Configuration du fournisseur Ganache local (Nœud 1)
const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:7545");

// Fonction pour récupérer la liste des blocs et des transactions dans la blockchain
const getBlockchainInfo = async () => {
  const blockNumber = await provider.getBlockNumber();
  console.log("Dernier numéro de bloc:", blockNumber);

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

// Fonction pour récupérer les comptes et leur solde
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

// Exporter les fonctions
module.exports = { getBlockchainInfo, getAccountsAndBalances };
