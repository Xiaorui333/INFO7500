// src/lib/web3.js
import Web3 from "web3";
import TestERC20Artifact from "../../abis/TestERC20.json";

let web3;

if (typeof window !== "undefined" && window.ethereum) {
  // In the browser with MetaMask
  web3 = new Web3(window.ethereum);
} else {
  // On the server or if MetaMask isn't available
  const provider = new Web3.providers.HttpProvider(
    process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL
  );
  web3 = new Web3(provider);
}

export default web3;

// Function to approve tokens for a spender
export async function approveToken(tokenAddress, spender, amount) {
  const accounts = await web3.eth.getAccounts();

  const tokenContract = new web3.eth.Contract(
    TestERC20Artifact.abi, // Use the ABI from the JSON artifact
    tokenAddress
  );

  await tokenContract.methods.approve(spender, amount).send({ from: accounts[0] });
}
