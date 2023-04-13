import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { LibAsset } from "../../typechain-types/contracts/Marketplace";
import { LibOrder } from "../../typechain-types/contracts/Marketplace";

export const AssetType = {
  NONE: 0,
  ETH: 1,
  ERC20: 2,
  ERC721: 3,
  ERC1155: 4
};

export const OrderDir = {
  sell: 0,
  buy: 1
};


export function HashAsset(settleType: number, baseType: number, extraType: number, contractAddr: string, value: number, extraValue: number): { asset: LibAsset.AssetStruct, hash: Uint8Array } {
  const pack = ethers.utils.solidityPack(
    ["uint8", "uint8", "uint256", "address", "uint256", "uint256"],
    [settleType, baseType, extraType, contractAddr, value, extraValue]
  );
  const asset = { settleType, baseAsset: { code: { baseType, extraType, contractAddr }, value }, extraValue };

  return { asset, hash: ethers.utils.arrayify(ethers.utils.solidityKeccak256(["bytes"], [pack])) };
}

export async function MakeSignOrder(dir: number, makerSigner: SignerWithAddress, makerAsset: { asset: LibAsset.AssetStruct, hash: Uint8Array }, taker: string, takerAsset: { asset: LibAsset.AssetStruct, hash: Uint8Array }, fee: number, feeRecipient: string, startTime: number, endTime: number, salt: number): Promise<{ order: LibOrder.OrderStruct; sign: string; }> {
  const maker = makerSigner.address;
  const pack = ethers.utils.solidityPack(
    ["uint8", "address", "bytes32", "address", "bytes32", "uint256", "address", "uint256", "uint256", "uint256"],
    [dir, maker, makerAsset.hash, taker, takerAsset.hash, fee, feeRecipient, startTime, endTime, salt]
  );
  const order = { dir, maker, makerAsset: makerAsset.asset, taker, takerAsset: takerAsset.asset, fee, feeRecipient, startTime, endTime, salt };
  const sign = await makerSigner.signMessage(ethers.utils.arrayify(ethers.utils.solidityKeccak256(["bytes"], [pack])));

  return { order, sign };
}



