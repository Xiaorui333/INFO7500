"use client"; // Required for React hooks in Next.js (App Router)

import { useEffect, useState } from "react";
import web3, { approveToken } from "../lib/web3";

export default function HomePage() {
  const [account, setAccount] = useState("");

  // Function to connect MetaMask
  async function connectWallet() {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        setAccount(accounts[0] || "No account found");
      } catch (error) {
        console.error("User rejected request:", error);
      }
    } else {
      alert("Please install MetaMask to connect!");
    }
  }

  // Load account on first render
  useEffect(() => {
    async function loadAccount() {
      if (typeof window !== "undefined" && window.ethereum) {
        const accounts = await web3.eth.getAccounts();
        setAccount(accounts[0] || "No account found");
      }
    }
    loadAccount();
  }, []);

  // Function to approve tokens
  async function handleApprove() {
    if (!account || account === "No account found") {
      alert("Please connect your wallet first!");
      return;
    }

    try {
      await approveToken(
        "0x81F9238721A48590943D3D6B0698774842EcC7aD", // TKA token address
        "0x59743478F3e78203f32692895BFA4DE59A70672E", // Uniswap Router
        web3.utils.toWei("1000", "ether")
      );
      alert("Approval successful!");
    } catch (error) {
      console.error("Approval failed:", error);
      alert("Approval failed. Check console for details.");
    }
  }

  return (
    <div>
      <h1>Home Page</h1>
      <p>Connected account: {account}</p>
      <button onClick={connectWallet}>Connect Wallet</button>
      <br />
      <button onClick={handleApprove}>Approve TKA for Router</button>
    </div>
  );
}
