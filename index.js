const { ThorClient, HttpClient } = require("@vechain/sdk-network");
const { ethers } = require("ethers");
const { read } = require("read");
const fs = require("fs");
const { addressUtils, fragment } = require("@vechain/sdk-core");

const client = new ThorClient(new HttpClient("https://testnet.vechain.org"));
const transferAbi = {
  name: "transfer",
  inputs: [
    {
      name: "_to",
      type: "address",
    },
    {
      name: "_value",
      type: "uint256",
    },
  ],
  outputs: [],
};

const transferFragment = new fragment.Function(
  ethers.FunctionFragment.from(transferAbi),
);
const contractAddress = "0xaC0CA2a5148E15EF913F9f5Cf8Eb3cf763f5a43f";

const buildClauses = (records) => {
  const clauses = [];

  for (let i = 0; i < records.length; i++) {
    const { address, amount } = records[i];

    const data = transferFragment.encodeInput([address, amount]);

    clauses.push({
      to: contractAddress,
      data,
      value: "0x0",
    });
  }

  if (clauses.length === 0) {
    console.log("No clauses to build");
    throw new Error("No clauses to build");
  }

  if (clauses.length > 100) {
    console.log("Too many clauses");
    throw new Error("Too many clauses");
  }

  return clauses;
};

const airdrop = async (records, privateKey) => {
  const clauses = buildClauses(records);
  const from = addressUtils.fromPrivateKey(Buffer.from(privateKey, "hex"));

  console.log(`From: ${from}`);

  const estimation = await client.gas.estimateGas(
    clauses,
    "0xee9c67d01C630BF62b82F3Ae81fdC63F261B52A0",
  );

  if (estimation.reverted) {
    console.log("Estimation failed");
    throw new Error("Estimation failed");
  }

  const txBody = await client.transactions.buildTransactionBody(
    clauses,
    estimation.totalGas,
  );

  const signed = await client.transactions.signTransaction(txBody, privateKey);

  const tx = await client.transactions.sendTransaction(signed);

  const receipt = tx.wait();

  console.log(receipt);

  console.log(`Tx: ${tx.id}`);

  console.log(`https://explore-testnet.vechain.org/transactions/${tx.txid}`);
};

/**
 * @returns {Array}
 */
const readCsv = (csvFile) => {
  const data = fs.readFileSync(csvFile, "utf8");

  const lines = data.split("\n");
  const records = [];

  for (let i = 0; i < lines.length; i++) {
    const [address, amount] = lines[i].split(",");

    if (!addressUtils.isAddress(address)) {
      console.log(`Invalid address @ L${i + 1}: ${address}`);
      throw new Error("Invalid address");
    }

    if (isNaN(parseInt(amount))) {
      console.log(`Invalid amount @ L${i + 1}: ${amount}`);
      throw new Error("Invalid amount");
    }

    records.push({ address, amount });
  }

  return records;
};

const start = async () => {
  const privateKey = await read({
    prompt: "Private Key: ",
    silent: true,
    replace: "*",
  });

  const csvFile = await read({
    prompt: "CSV File: ",
    default: "addresses.csv",
  });

  if (!fs.existsSync(csvFile)) {
    console.log("File not found", csvFile);
    return;
  }

  const records = readCsv(csvFile);

  console.log(JSON.stringify(records, null, 2));

  const confirm = await read({
    prompt: "Proceed? (y/n): ",
  });

  if (confirm !== "y") {
    console.log("Aborted");
    return;
  }

  await airdrop(records, privateKey);
};

start();
