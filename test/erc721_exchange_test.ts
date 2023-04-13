import { Marketplace, TransferProxy, ERC721NFT } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { AssetType, OrderDir, HashAsset, MakeSignOrder } from "./common/utils";

import { expect } from "chai";
import { ethers } from "hardhat";


let account1: SignerWithAddress;
let account2: SignerWithAddress;
let transferProxy: TransferProxy;
let marketplace: Marketplace;
let nft: ERC721NFT;
let tokenId = 1;

describe("erc721 exchange test", function () {
    before(async function () {
        [account1, account2] = await ethers.getSigners();

        const TransferProxy = await ethers.getContractFactory("TransferProxy");
        const Marketplace = await ethers.getContractFactory("Marketplace");
        const ERC721NFT = await ethers.getContractFactory("ERC721NFT");

        transferProxy = await TransferProxy.deploy();
        marketplace = await Marketplace.deploy();
        nft = await ERC721NFT.deploy();

    });

    it("initialize the environment", async function () {
        await marketplace.setProxy(transferProxy.address);
        await transferProxy.setAccessible(marketplace.address);
    });

    it("create test nft", async function () {
        await nft.awardItem(account1.address, "test item");
        await nft.connect(account1).setApprovalForAll(transferProxy.address, true);
    });

    it("exchange", async function () {
        const sellAssetHash = HashAsset(0, AssetType.ERC721, tokenId, nft.address, 1, 0);
        const buyAssetHash = HashAsset(0, AssetType.ETH, 0, ethers.constants.AddressZero, 100, 0);
        
        const sellSignOrder= await MakeSignOrder(OrderDir.sell, account1, sellAssetHash, ethers.constants.AddressZero, buyAssetHash, 1, ethers.constants.AddressZero,0, 0, 1);

        const buySignOrder = await MakeSignOrder(OrderDir.buy, account2, buyAssetHash, account1.address, sellAssetHash, 1, ethers.constants.AddressZero, 0, 0, 1);
        
        const account1BalanceBefore = await ethers.provider.getBalance(account1.address);
 
        await marketplace.connect(account2).matchSingle(sellSignOrder.order, sellSignOrder.sign, buySignOrder.order, buySignOrder.sign, { value: 100});
   
        expect(await ethers.provider.getBalance(account1.address)).to.equal(account1BalanceBefore.add(100));

        expect(await nft.ownerOf(tokenId)).to.equal(account2.address);
    });

});

