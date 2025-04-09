// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../core/interfaces/IERC20.sol";

contract TestERC20 is IERC20 {
    string private _name;
    string private _symbol;
    uint8 private _decimals;
    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    constructor(string memory n, string memory s, uint8 d) {
        _name = n;
        _symbol = s;
        _decimals = d;
        _mint(msg.sender, 1000000 * 10**18); // Mint 1M tokens
    }

    function name() external view returns (string memory) {
        return _name;
    }

    function symbol() external view returns (string memory) {
        return _symbol;
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function allowance(address owner, address spender) external view returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        _spendAllowance(from, msg.sender, amount);
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");

        uint256 fromBalance = _balances[from];
        require(fromBalance >= amount, "ERC20: transfer amount exceeds balance");
        unchecked {
            _balances[from] = fromBalance - amount;
            _balances[to] += amount;
        }

        emit Transfer(from, to, amount);
    }

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }

    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: mint to the zero address");

        _totalSupply += amount;
        unchecked {
            _balances[account] += amount;
        }
        emit Transfer(address(0), account, amount);
    }

    function _spendAllowance(address owner, address spender, uint256 amount) internal {
        uint256 currentAllowance = _allowances[owner][spender];
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= amount, "ERC20: insufficient allowance");
            unchecked {
                _allowances[owner][spender] = currentAllowance - amount;
            }
        }
    }
}


//contract TestERC20 {
//    string public name;
//    string public symbol;
//    uint8 public decimals;
//    uint public totalSupply;
//
//    mapping(address => uint) public balanceOf;
//    mapping(address => mapping(address => uint)) public allowance;
//
//    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
//        name = _name;
//        symbol = _symbol;
//        decimals = _decimals;
//    }
//
//    function mint(address to, uint amount) external {
//        totalSupply += amount;
//        balanceOf[to] += amount;
//    }
//
//    function transfer(address to, uint amount) external returns (bool) {
//        balanceOf[msg.sender] -= amount;
//        balanceOf[to] += amount;
//        return true;
//    }
//
//    function approve(address spender, uint amount) external returns (bool) {
//        allowance[msg.sender][spender] = amount;
//        return true;
//    }
//
//    function transferFrom(address from, address to, uint amount) external returns (bool) {
//        uint allowed = allowance[from][msg.sender];
//        if (allowed != type(uint).max) {
//            allowance[from][msg.sender] = allowed - amount;
//        }
//        balanceOf[from] -= amount;
//        balanceOf[to] += amount;
//        return true;
//    }
//}
