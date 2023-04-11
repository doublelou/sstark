import { Account, ec, json, stark, Provider, hash, Contract, uint256, number, shortString } from "starknet";
import * as dotenv from 'dotenv'
import { getStarkPair } from "./keyDerivation.js";
import { formatEther } from "ethers";



import fs from "fs";

dotenv.config()


const provider = new Provider({ sequencer: { network: "mainnet-alpha" } });

const accountClassHash = "0x033434ad846cdd5f23eb73ff09fe6fddd568284a0fb7d1be20ee482f044dabe2";
const argentProxyClassHash = "0x25ec026985a3bf9d0cc1fe17326b245dfdc3ff89b8fde106542a3ea56c5a918";

const mnemonic = process.env.MNEMONIC

///////////////////////////
const isNeedToDeploy = false
const isNeedToSwap = false
const isNeedToDeployNFT = false
const isNeedToLendToNostra = false // !! работает только в том случае если на кошельке есть USDC (1$)
///////////////////////////

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

  if (isNeedToDeploy) {
    const deployAccountPayload = {
      classHash: argentProxyClassHash,
      constructorCalldata: constructorCallData,
      contractAddress: contractAddress,
      addressSalt: starkKeyPublic,
    };

    const { transaction_hash, contract_address } = await accountAX.deployAccount(
      deployAccountPayload
    );

    console.log(`\nAccount contract deployment in progress...\n`);
    console.log(
      `Check deployment transaction status at \n\nhttps://starkscan.co/tx/${transaction_hash}\n`
    );
    console.log(
      `Once the transaction is confirmed. The account is deployed at \n\nhttps://starkscan.co/contract/${contract_address}\n`
    );
  }

  if (isNeedToSwap) {
    const { transaction_hash } = await accountAX.execute(
      [
        // Calling the first contract
        {
          contractAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7", //ETH
          entrypoint: "approve",
          calldata: stark.compileCalldata({
            spender: "0x10884171baf1914edc28d7afb619b40a4051cfae78a094a55d230f19e944a28", //MySwap
            amount: { type: 'struct', low: '3000000000000000', high: '0' }, // 0.004 ETH
          })
        },
        // Calling the second contract
        {
          contractAddress: "0x10884171baf1914edc28d7afb619b40a4051cfae78a094a55d230f19e944a28",
          entrypoint: "swap",
          calldata: stark.compileCalldata({
            pool_id: "1",
            token_from_addr: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
            amount_from: { type: 'struct', low: '3000000000000000', high: '0' },
            amount_to_min: { type: 'struct', low: '0', high: '0' },
          })
        }
      ]
    )
    console.log(
      `Check swap transaction status at \n\nhttps://starkscan.co/tx/${transaction_hash}\n`
    );
  }

  if (isNeedToDeployNFT) {

    console.log("Deployment Tx - ERC721 Contract to StarkNet...");

    const compiledErc721 = json.parse(
      fs
        .readFileSync("./src/interfaces/ERC721EnumerableMintableBurnable.json")
        .toString("ascii")
    );

    // const { transaction_hash, contract_address } = await provider.deployContract({
    //   contract: compiledErc721,
    //   constructorCalldata: [
    //     number.hexToDecimalString(shortString.encodeShortString("MyStarkNFT")),
    //     number.hexToDecimalString(shortString.encodeShortString("MSN")),
    //     contractAddress,
    //   ],
    //   addressSalt: starkKeyPublic,
    // });

    const deployResponse = await accountAX.declareDeploy({
      contract: compiledErc721,
      classHash: "0x0633306ed707e0eca5ae2e828d840c760976232000d2dcefdf4089606b590495",
      constructorCalldata: [
        number.hexToDecimalString(shortString.encodeShortString("MyStarkNFT")),
        number.hexToDecimalString(shortString.encodeShortString("MSN")),
        contractAddress,
      ],
    });

    console.log(deployResponse)

    // console.log(
    //   `Follow the tx status on: https://starkscan.co/tx/${transaction_hash}`
    // );
  }

  if (isNeedToLendToNostra) {
    const { transaction_hash } = await accountAX.execute(
      [
        // Calling the first contract
        {
          contractAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8", //USDC
          entrypoint: "approve",
          calldata: stark.compileCalldata({
            spender: "0x29959a546dda754dc823a7b8aa65862c5825faeaaf7938741d8ca6bfdc69e4e", //Nostra
            amount: { type: 'struct', low: '1000000', high: '0' }, // 1 USDC
          })
        },
        // Calling the second contract
        {
          contractAddress: "0x029959a546dda754dc823a7b8aa65862c5825faeaaf7938741d8ca6bfdc69e4e", //Nostra
          entrypoint: "mint",
          calldata: stark.compileCalldata({
            to: contractAddress,
            amount: { type: 'struct', low: '1000000', high: '0' }, // 1 USDC
          })
        }
      ]
    )
    console.log(
      `Check lend transaction status at \n\nhttps://starkscan.co/tx/${transaction_hash}\n`
    );
  }

}

