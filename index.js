import { Account, ec, json, stark, Provider, hash, Contract, uint256 } from "starknet";

import { getStarkPair } from "./keyDerivation.js";
import { formatEther } from "ethers";

import fs from "fs";

const provider = new Provider({ sequencer: { network: "mainnet-alpha" } });

const accountClassHash = "0x033434ad846cdd5f23eb73ff09fe6fddd568284a0fb7d1be20ee482f044dabe2";
const argentProxyClassHash = "0x25ec026985a3bf9d0cc1fe17326b245dfdc3ff89b8fde106542a3ea56c5a918";

const mnemonic = ""



for (let i = 0; i < 10; i++) {

  let starkKeyPair = getStarkPair(mnemonic, i);

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

  const erc20ABI = json.parse(fs.readFileSync("./src/interfaces/ERC20_abi.json").toString("ascii"));
  const erc20 = new Contract(erc20ABI, "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7", provider);
  const balance = await erc20.balanceOf(contractAddress);

  console.log(`Pre-calculated account contract address: ${contractAddress} Balance - ${formatEther(uint256.uint256ToBN(balance.balance).toString())} ETH`);

  const accountAX = new Account(provider, contractAddress, starkKeyPair);


  // const deployAccountPayload = {
  //   classHash: argentProxyClassHash,
  //   constructorCalldata: constructorCallData,
  //   contractAddress: contractAddress,
  //   addressSalt: starkKeyPublic,
  // };

  // const { transaction_hash, contract_address } = await accountAX.deployAccount(
  //   deployAccountPayload
  // );

  // console.log(`\nAccount contract deployment in progress...\n`);
  // console.log(
  //   `Check deployment transaction status at \n\nhttps://testnet.starkscan.co/tx/${transaction_hash}\n`
  // );
  // console.log(
  //   `Once the transaction is confirmed. The account is deployed at \n\nhttps://testnet.starkscan.co/tx/${contract_address}\n`
  // );

}

