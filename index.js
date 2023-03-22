import { Account, ec, json, stark, Provider, hash } from "starknet";

const provider = new Provider({ sequencer: { network: "mainnet" } });

const accountClassHash = "0x033434ad846cdd5f23eb73ff09fe6fddd568284a0fb7d1be20ee482f044dabe2";
const argentProxyClassHash = "0x25ec026985a3bf9d0cc1fe17326b245dfdc3ff89b8fde106542a3ea56c5a918";

const starkKeyPair = ec.genKeyPair();
const starkKeyPublic = ec.getStarkKey(starkKeyPair);

const constructorCallData = stark.compileCalldata({
  implementation: accountClassHash,
  selector: hash.getSelectorFromName("initialize"),
  calldata: stark.compileCalldata({ signer: starkKeyPublic, guardian: "0" }),
});

const contractAddress = hash.calculateContractAddressFromHash(
  starkKeyPublic, // salt
  argentProxyClassHash,
  constructorCallData,
  0
);

console.log(
  `\nPre-calculated account contract address:\n\n${contractAddress}\n`
);
