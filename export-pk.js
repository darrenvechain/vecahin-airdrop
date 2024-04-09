const { HDNode } = require("@vechain/sdk-core");
const { read } = require("read");

const start = async () => {
  const mnemonic = await read({
    prompt: "Mnemonic: ",
    silent: true,
    replace: "*",
  });

  const hdNode = HDNode.fromMnemonic(mnemonic.split(" "));

  for (let index = 0; index < 100; index++) {
    const child = hdNode.derive(index);

    const isCorrectAddress = await read({
      prompt: `Is ${child.address} correct? (y/n): `,
    });

    if (isCorrectAddress !== "y") {
      continue;
    }

    console.log(`Private Key: ${child.privateKey.toString("hex")}`);
    break;
  }
};


start();