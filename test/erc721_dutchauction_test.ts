import { Marketplace, TransferProxy, ERC721NFT } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { AssetType, OrderDir, HashAsset, MakeSignOrder } from "./common/utils";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";


let account1: SignerWithAddress;
let account2: SignerWithAddress;
let transferProxy: TransferProxy;
let marketplace: Marketplace;
let nft: ERC721NFT;
let tokenId = 1;

describe("erc721 dutchauction test", function () {
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
        const sellAsset = HashAsset(0, AssetType.ERC721, tokenId, nft.address, 1, 0);
        const auctionAsset = HashAsset(1, AssetType.ETH, 0, ethers.constants.AddressZero, 100, 0);


        const startTime = (await ethers.provider.getBlock("latest")).timestamp;

        // auction will be stop after 100 sec
        const endTime = startTime + 100;
        const sellSignOrder = await MakeSignOrder(OrderDir.sell, account1, sellAsset, ethers.constants.AddressZero, auctionAsset, 1, ethers.constants.AddressZero, startTime, endTime, 1);


        await time.increase(10);

        const curTime = (await ethers.provider.getBlock("latest")).timestamp;
        const chgValue = (curTime - startTime) * (100 - 0) / (endTime - startTime);

        const buyValue = 100 - chgValue;
        const buyAsset = HashAsset(0, AssetType.ETH, 0, ethers.constants.AddressZero, buyValue, 0);

        const buySignOrder = await MakeSignOrder(OrderDir.buy, account2, buyAsset, account1.address, sellAsset, 1, ethers.constants.AddressZero, 0, 0, 1);
        const account1BalanceBefore = await ethers.provider.getBalance(account1.address);

        await marketplace.connect(account2).matchSingle(sellSignOrder.order, sellSignOrder.sign, buySignOrder.order, buySignOrder.sign, { value: buyValue })

        expect(await ethers.provider.getBalance(account1.address)).to.equal(account1BalanceBefore.add(buyValue));

        expect(await nft.ownerOf(tokenId)).to.equal(account2.address);

    });

});