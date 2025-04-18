// SPDX-License-Identifier: CC-BY-4.0
pragma solidity >=0.4.0;

// taken from https://medium.com/coinmonks/math-in-solidity-part-3-percents-and-proportions-4db014e080b1
// license is CC-BY-4.0
library FullMath {
    /// @notice Calculates the full 512-bit multiplication of x and y
    /// @return l least significant 256 bits
    /// @return h most significant 256 bits
    function fullMul(uint256 x, uint256 y) internal pure returns (uint256 l, uint256 h) {
        // Replaces `uint256 mm = mulmod(x, y, uint256(-1));`
        // `type(uint256).max` = 2^256 - 1, same as old `uint256(-1)` in 0.5.x
        uint256 mm = mulmod(x, y, type(uint256).max);
        l = x * y;
        h = mm - l;
        if (mm < l) h -= 1;
    }

    /// @notice Performs full 512-bit to 256-bit division
    /// @dev Requires that h < d
    function fullDiv(
        uint256 l,
        uint256 h,
        uint256 d
    ) private pure returns (uint256) {
        // Replaces `uint256 pow2 = d & -d;`
        // For unsigned integer d, -d in two's complement is ~d + 1
        uint256 pow2 = d & (~d + 1);

        d /= pow2;
        l /= pow2;

        // Replaces `l += h * ((-pow2) / pow2 + 1);`
        // since `-pow2` => `(~pow2 + 1)`
        uint256 negPow2Div = ((~pow2 + 1) / pow2); 
        l += h * (negPow2Div + 1);

        // Some form of modular inverse using Newton's iteration
        uint256 r = 1;
        r *= 2 - d * r;
        r *= 2 - d * r;
        r *= 2 - d * r;
        r *= 2 - d * r;
        r *= 2 - d * r;
        r *= 2 - d * r;
        r *= 2 - d * r;
        r *= 2 - d * r;

        return l * r;
    }

    /// @notice Multiplies x and y, then divides by d
    /// @dev Reverts if result overflows a uint256 or if d == 0
    function mulDiv(
        uint256 x,
        uint256 y,
        uint256 d
    ) internal pure returns (uint256) {
        (uint256 l, uint256 h) = fullMul(x, y);

        uint256 mm = mulmod(x, y, d);
        if (mm > l) h -= 1;
        l -= mm;

        if (h == 0) {
            // fits in 256 bits
            return l / d;
        }
        require(h < d, "FullMath: FULLDIV_OVERFLOW");
        return fullDiv(l, h, d);
    }
}
