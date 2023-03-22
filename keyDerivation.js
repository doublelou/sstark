import { ethers, HDNodeWallet, Mnemonic, concat, sha256 } from "ethers";
import { arrayify } from "@ethersproject/bytes";
import { BigNumber } from "@ethersproject/bignumber";

import { ec, number } from "starknet";

export const baseDerivationPath = "m/44'/9004'/0'/0";

export function getStarkPair(mnemonic, index) {

  const m = Mnemonic.fromPhrase(mnemonic).computeSeed()

  const masterNodeforKey = HDNodeWallet.fromMnemonic(Mnemonic.fromPhrase(mnemonic));

  const masterNode = HDNodeWallet.fromSeed(BigNumber.from(masterNodeforKey.privateKey).toHexString())

  const fullPath = getPathForIndex(index, baseDerivationPath ?? "");
  const childNode = masterNode.derivePath(fullPath);
  const groundKey = grindKey(childNode.privateKey);
  const starkPair = ec.getKeyPair(groundKey);
  return starkPair;
}

export function getPathForIndex(index, baseDerivationPath) {
  return `${baseDerivationPath}/${index}`;
}

// inspired/copied from https://github.com/authereum/starkware-monorepo/blob/51c5df19e7f98399a2f7e63d564210d761d138d1/packages/starkware-crypto/src/keyDerivation.ts#L85
export function grindKey(keySeed) {
  const keyValueLimit = ec.ec.n;
  if (!keyValueLimit) {
    return keySeed;
  }
  const sha256EcMaxDigest = number.toBN(
    "1 00000000 00000000 00000000 00000000 00000000 00000000 00000000 00000000",
    16,
  );
  const maxAllowedVal = sha256EcMaxDigest.sub(sha256EcMaxDigest.mod(keyValueLimit));

  // Make sure the produced key is devided by the Stark EC order,
  // and falls within the range [0, maxAllowedVal).
  let i = 0;
  let key;
  do {
    key = hashKeyWithIndex(keySeed, i);
    i++;
  } while (!key.lt(maxAllowedVal));

  return "0x" + key.umod(keyValueLimit).toString("hex");
}

function hashKeyWithIndex(key, index) {
  const payload = concat([arrayify(key), arrayify(index)]);
  const hash = sha256(payload);
  return number.toBN(hash);
}