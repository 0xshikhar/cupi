// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @dev Minimal interface for ERC20 token interactions.
 */
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/**
 * @title CupiEscrowVault
 * @notice Trustless Peanut-style escrow vault for off-chain link payments.
 * Sender locks tokens with a claimKeyHash.
 * Recipient claims with a cryptographic signature from the ephemeral claim key.
 * If expired, sender can refund.
 */
contract CupiEscrowVault {
    struct EscrowDeposit {
        address sender;
        address token;
        uint256 amount;
        uint256 expiresAt;
        bool claimed;
    }

    mapping(bytes32 => EscrowDeposit) public deposits;

    event Deposited(
        bytes32 indexed claimKeyHash,
        address indexed sender,
        address token,
        uint256 amount,
        uint256 expiresAt
    );
    event Claimed(bytes32 indexed claimKeyHash, address indexed recipient, uint256 amount);
    event Refunded(bytes32 indexed claimKeyHash, address indexed sender, uint256 amount);

    /**
     * @notice Deposits ERC20 tokens into escrow locked behind a claimKeyHash.
     */
    function deposit(
        bytes32 claimKeyHash,
        address token,
        uint256 amount,
        uint256 validForSeconds
    ) external {
        require(amount > 0, "Invalid amount");
        require(deposits[claimKeyHash].amount == 0, "Deposit already exists");

        bool success = IERC20(token).transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer failed");

        uint256 expiresAt = block.timestamp + validForSeconds;
        deposits[claimKeyHash] = EscrowDeposit({
            sender: msg.sender,
            token: token,
            amount: amount,
            expiresAt: expiresAt,
            claimed: false
        });

        emit Deposited(claimKeyHash, msg.sender, token, amount, expiresAt);
    }

    /**
     * @notice Claims tokens to recipient using a signature from the ephemeral claim key.
     */
    function claim(
        bytes32 claimKeyHash,
        address recipient,
        bytes calldata signature
    ) external {
        EscrowDeposit storage d = deposits[claimKeyHash];
        require(d.amount > 0, "Deposit not found");
        require(!d.claimed, "Already claimed");
        require(block.timestamp <= d.expiresAt, "Deposit expired");

        bytes32 messageHash = keccak256(abi.encodePacked(claimKeyHash, recipient));
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        address recovered = recoverSigner(ethSignedMessageHash, signature);
        require(keccak256(abi.encodePacked(recovered)) == claimKeyHash, "Invalid claim signature");

        d.claimed = true;
        bool sent = IERC20(d.token).transfer(recipient, d.amount);
        require(sent, "Token transfer failed");

        emit Claimed(claimKeyHash, recipient, d.amount);
    }

    /**
     * @notice Refunds expired escrow deposit back to the original sender.
     */
    function refund(bytes32 claimKeyHash) external {
        EscrowDeposit storage d = deposits[claimKeyHash];
        require(d.amount > 0, "Deposit not found");
        require(!d.claimed, "Already claimed");
        require(block.timestamp > d.expiresAt, "Deposit not yet expired");
        require(msg.sender == d.sender, "Only sender can refund");

        d.claimed = true;
        bool sent = IERC20(d.token).transfer(d.sender, d.amount);
        require(sent, "Refund transfer failed");

        emit Refunded(claimKeyHash, d.sender, d.amount);
    }

    /**
     * @dev Internal helper for ECDSA signature recovery.
     */
    function recoverSigner(bytes32 hash, bytes memory sig) internal pure returns (address) {
        require(sig.length == 65, "Invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }

        if (v < 27) {
            v += 27;
        }

        return ecrecover(hash, v, r, s);
    }
}
