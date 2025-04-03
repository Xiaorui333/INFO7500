// "use client";
// import React, { useState } from "react";
// import { useAccount, useWriteContract } from "wagmi";
// import tokenAbi from "~~/abis/TestERC20.json";

// const TOKENA_ADDRESS = process.env.NEXT_PUBLIC_TOKENA_ADDRESS as `0x${string}`;
// const TOKENB_ADDRESS = process.env.NEXT_PUBLIC_TOKENB_ADDRESS as `0x${string}`;

// /**
//  * A simple Debug UI to mint tokens on your TestERC20 contracts.
//  */
// export default function DebugMintPage() {
//   const { address: connectedWallet } = useAccount();

//   // State for which token to mint, how many, and who receives them
//   const [selectedToken, setSelectedToken] = useState<`0x${string}`>(TOKENA_ADDRESS);
//   const [recipient, setRecipient] = useState<string>("");
//   const [amount, setAmount] = useState("1000"); // default 1000

//   // Wagmi's `useWriteContract` for calling `mint`
//   const { writeContract, isLoading } = useWriteContract();

//   async function handleMint() {
//     if (!selectedToken) {
//       console.error("No token address selected!");
//       return;
//     }
//     // If no recipient specified, fallback to connected wallet
//     const to = recipient || connectedWallet;
//     if (!to) {
//       console.error("No connected wallet or recipient!");
//       return;
//     }

//     try {
//       // Convert the user input to a BigInt
//       // If your token uses 18 decimals, multiply by 1e18
//       const bigAmount = BigInt(Number(amount) * 1e18);

//       const tx = await writeContract({
//         address: selectedToken,
//         abi: tokenAbi,
//         functionName: "mint",
//         args: [to, bigAmount],
//       });

//       console.log("Mint TX sent:", tx);
//       // Optionally wait for confirmation:
//       // await tx.wait()
//       // console.log("Mint confirmed:", receipt)
//     } catch (err) {
//       console.error("Mint failed:", err);
//     }
//   }

//   return (
//     <main style={{ padding: "2rem" }}>
//       <h1>Debug Mint Tokens</h1>

//       <div style={{ marginBottom: "1rem" }}>
//         <label style={{ marginRight: "0.5rem" }}>Select Token:</label>
//         <select
//           value={selectedToken}
//           onChange={(e) => setSelectedToken(e.target.value as `0x${string}`)}
//         >
//           <option value={TOKENA_ADDRESS}>Token A ({TOKENA_ADDRESS.slice(0, 10)}...)</option>
//           <option value={TOKENB_ADDRESS}>Token B ({TOKENB_ADDRESS.slice(0, 10)}...)</option>
//         </select>
//       </div>

//       <div style={{ marginBottom: "1rem" }}>
//         <label>Recipient Address (optional):</label>
//         <input
//           style={{ width: "100%", marginTop: "0.5rem" }}
//           placeholder={`Defaults to ${connectedWallet || "No wallet connected"}`}
//           value={recipient}
//           onChange={(e) => setRecipient(e.target.value)}
//         />
//       </div>

//       <div style={{ marginBottom: "1rem" }}>
//         <label>Amount to Mint:</label>
//         <input
//           type="number"
//           style={{ marginLeft: "0.5rem" }}
//           value={amount}
//           onChange={(e) => setAmount(e.target.value)}
//         />
//       </div>

//       <button onClick={handleMint} disabled={isLoading}>
//         {isLoading ? "Minting..." : "Mint Tokens"}
//       </button>
//     </main>
//   );
// }


"use client";
import React, { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import tokenAbi from "~~/abis/TestERC20.json";

const TOKENA_ADDRESS = process.env.NEXT_PUBLIC_TOKENA_ADDRESS as `0x${string}`;
const TOKENB_ADDRESS = process.env.NEXT_PUBLIC_TOKENB_ADDRESS as `0x${string}`;

/**
 * A simple Debug UI to mint tokens on your TestERC20 contracts.
 */
export default function DebugMintPage() {
  const { address: connectedWallet } = useAccount();

  // State for which token to mint, how many, and who receives them
  const [selectedToken, setSelectedToken] = useState<`0x${string}`>(TOKENA_ADDRESS);
  const [recipient, setRecipient] = useState<string>("");
  const [amount, setAmount] = useState("1000"); // default 1000
  const [loading, setLoading] = useState(false);

  // Use writeContractAsync from wagmi's useWriteContract hook.
  const { writeContractAsync, error } = useWriteContract();

  async function handleMint() {
    if (!selectedToken) {
      console.error("No token address selected!");
      return;
    }
    // If no recipient specified, fallback to connected wallet
    const to = recipient || connectedWallet;
    if (!to) {
      console.error("No connected wallet or recipient!");
      return;
    }

    try {
      setLoading(true);
      // Convert the user input to a BigInt (assuming 18 decimals)
      const bigAmount = BigInt(Number(amount) * 1e18);

      // If tokenAbi is a full artifact, use tokenAbi.abi; otherwise, tokenAbi itself
      const abiToUse = tokenAbi ? tokenAbi: tokenAbi;

      const tx = await writeContractAsync({
        address: selectedToken,
        abi: abiToUse,
        functionName: "mint",
        args: [to, bigAmount],
      });

      console.log("Mint TX sent:", tx);
      // Optionally wait for confirmation:
      // await tx.wait();
      // console.log("Mint confirmed:", receipt);
    } catch (err) {
      console.error("Mint failed:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Debug Mint Tokens</h1>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ marginRight: "0.5rem" }}>Select Token:</label>
        <select
          value={selectedToken}
          onChange={(e) => setSelectedToken(e.target.value as `0x${string}`)}
        >
          <option value={TOKENA_ADDRESS}>
            Token A ({TOKENA_ADDRESS.slice(0, 10)}…)
          </option>
          <option value={TOKENB_ADDRESS}>
            Token B ({TOKENB_ADDRESS.slice(0, 10)}…)
          </option>
        </select>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label>Recipient Address (optional):</label>
        <input
          style={{ width: "100%", marginTop: "0.5rem" }}
          placeholder={`Defaults to ${connectedWallet || "No wallet connected"}`}
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label>Amount to Mint:</label>
        <input
          type="number"
          style={{ marginLeft: "0.5rem" }}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <button onClick={handleMint} disabled={loading}>
        {loading ? "Minting..." : "Mint Tokens"}
      </button>

      {error && <p style={{ color: "red" }}>Error: {error.message}</p>}
    </main>
  );
}



