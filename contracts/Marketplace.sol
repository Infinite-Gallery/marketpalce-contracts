// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "./LibOrder.sol";
import "./TransferProxy.sol";

import "@openzeppelin/contracts/access/Ownable.sol";

contract Marketplace is Ownable {
    mapping(bytes32 => bool) cancelOrder;
    address proxyAddr;

    function setProxy(address transferProxy) external onlyOwner {
        proxyAddr = transferProxy;
    }

    function cancelSingle(LibOrder.Order memory order) public {
        bytes32 hashBytes = LibOrder.hash(order);
        require(cancelOrder[hashBytes] == false, "the order has been canceled");
        cancelOrder[hashBytes] = true;
    }

    function isCanceled(
        LibOrder.Order memory order
    ) internal view returns (bool) {
        bytes32 hashBytes = LibOrder.hash(order);
        return cancelOrder[hashBytes];
    }

    function matchSingle(
        LibOrder.Order memory leftOrder,
        bytes memory leftSign,
        LibOrder.Order memory rightOrder,
        bytes memory rightSign
    ) public payable {
        require(
            leftOrder.dir == LibOrder.TradeDir.sell &&
                rightOrder.dir == LibOrder.TradeDir.buy,
            "trade direction is invalid"
        );
        require(
            !isCanceled(leftOrder) && !isCanceled(rightOrder),
            "Order is canceled"
        );
        require(
            leftOrder.maker == msg.sender || rightOrder.maker == msg.sender,
            "No authority"
        );
        require(
            LibOrder.matchSign(leftOrder, leftSign),
            "Left order sign error"
        );
        require(
            LibOrder.matchSign(rightOrder, rightSign),
            "Right order sign error"
        );

        (
            LibAsset.BaseAsset memory leftAsset,
            LibAsset.BaseAsset memory rightAsset
        ) = LibOrder.matchOrder(leftOrder, rightOrder);

        cancelSingle(leftOrder);
        cancelSingle(rightOrder);

        transferFrom(leftOrder.maker, rightOrder.maker, leftAsset);
        transferFrom(rightOrder.maker, leftOrder.maker, rightAsset);
    }

    function transferFrom(
        address from,
        address to,
        LibAsset.BaseAsset memory baseAsset
    ) internal {
        if (baseAsset.code.baseType == LibAsset.AssetType.eth) {
            LibAsset.transferFrom(from, to, baseAsset);
        } else {
            TransferProxy(proxyAddr).transferFrom(from, to, baseAsset);
        }
    }
}
