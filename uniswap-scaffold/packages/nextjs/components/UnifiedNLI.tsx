"use client";
import React, { useState } from "react";
import { useAccount } from "wagmi";
import { Swap } from "~~/components/Swap";
import { AddLiquidity } from "~~/components/addLiquidity";
import { RemoveLiquidity } from "~~/components/removeLiquidity";
import { PoolAnalytics } from "~~/components/PoolAnalytics";
import { SwapPriceDistribution } from "~~/components/SwapPriceDistribution";
import { parseUnits } from "viem";

interface UnifiedNLIProps {
  routerAddress: `0x${string}`;
  tokenA: `0x${string}`;
  tokenB: `0x${string}`;
  pairAddress: `0x${string}`;
}

type OperationType = "swap" | "add" | "remove" | "analysis" | "contractOp" | "dataAnalysis" | null;
type AnalysisType = "pool" | "price" | "custom" | null;
type DisplayMode = "chart" | "text" | null;

export function UnifiedNLI({ routerAddress, tokenA, tokenB, pairAddress }: UnifiedNLIProps) {
  const [instruction, setInstruction] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [result, setResult] = useState("");
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [lpTokens, setLpTokens] = useState("");
  const [operationType, setOperationType] = useState<OperationType>(null);
  const [analysisType, setAnalysisType] = useState<AnalysisType>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(null);
  const [showComponent, setShowComponent] = useState(false);
  const [customAnalysisResult, setCustomAnalysisResult] = useState<string | null>(null);
  const [customAnalysisData, setCustomAnalysisData] = useState<Record<string, any>[] | null>(null);
  const [sqlQuery, setSqlQuery] = useState<string | null>(null);
  const [naturalResponse, setNaturalResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { status: accountStatus } = useAccount();
  const isConnected = accountStatus === 'connected';

  async function handleUnifiedNLI() {
    if (!isConnected) {
      setResult("Please connect your wallet.");
      return;
    }
    if (!instruction) {
      setResult("Please enter a natural language instruction.");
      return;
    }
    if (!apiKey) {
      setResult("Please enter your OpenAI API Key.");
      return;
    }

    // Reset states before parsing new instruction
    setOperationType(null);
    setAnalysisType(null);
    setDisplayMode(null);
    setShowComponent(false);
    setCustomAnalysisResult(null);
    setCustomAnalysisData(null);
    setSqlQuery(null);
    setNaturalResponse(null);
    setResult("Processing your instruction...");
    setIsLoading(true);

    try {
      // Define functions for OpenAI Function Calling
      const functions = [
        {
          type: "function",
          function: {
            name: "performContractOp",
            description: "User wants to perform a contract operation like swap, add liquidity, or remove liquidity.",
            parameters: {
              type: "object",
              properties: {
                contractOpType: { 
                  type: "string", 
                  enum: ["swap", "add", "remove"],
                  description: "The type of contract operation to perform"
                },
                amountA: { 
                  type: "string", 
                  description: "Amount of token A (for swap or add liquidity)" 
                },
                amountB: { 
                  type: "string", 
                  description: "Amount of token B (for add liquidity)" 
                },
                lpTokens: { 
                  type: "string", 
                  description: "Amount of LP tokens (for remove liquidity)" 
                }
              },
              required: ["contractOpType"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "performStandardAnalysis",
            description: "User wants to perform a standard analysis like pool analytics or swap price distribution.",
            parameters: {
              type: "object",
              properties: {
                analysisType: { 
                  type: "string", 
                  enum: ["pool", "price"],
                  description: "The type of analysis to perform"
                },
                displayMode: { 
                  type: "string", 
                  enum: ["chart", "text"],
                  description: "How to display the analysis results" 
                }
              },
              required: ["analysisType", "displayMode"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "customDataAnalysis",
            description: "User requests a custom data analysis on uniswap_events. Return a valid SELECT query in sqlQuery.",
            parameters: {
              type: "object",
              properties: {
                sqlQuery: { 
                  type: "string",
                  description: "A valid SQL SELECT query to analyze the data. The query should return multiple rows and columns that will be aggregated into JSON." 
                }
              },
              required: ["sqlQuery"]
            }
          }
        }
      ];

      // Call OpenAI API with Function Calling
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `You are a helpful assistant that parses natural language instructions into structured parameters for Uniswap V2 operations.
              You can determine if the user wants to perform a contract operation or a data analysis.
              
              For contract operations, call the performContractOp function.
              For standard analysis (pool or price), call the performStandardAnalysis function.
              For custom analysis queries, call the customDataAnalysis function with a valid SQL query.
              
              When generating SQL queries for custom analysis:
              1. Use standard SQL syntax that works with PostgreSQL
              2. Include appropriate WHERE clauses to filter data
              3. Use aggregation functions like COUNT, SUM, AVG when appropriate
              4. Include ORDER BY clauses to sort results logically
              5. Limit results to a reasonable number (e.g., LIMIT 100)
              
              Make sure all amounts are valid numbers that can be parsed by JavaScript's parseFloat function.`,
            },
            {
              role: "user",
              content: instruction,
            },
          ],
          tools: functions,
          tool_choice: "auto"
        }),
      });

      const data = await response.json();
      console.log("OpenAI response:", data);

      // Check if the response contains a function call
      if (data.choices[0].message.tool_calls) {
        const toolCall = data.choices[0].message.tool_calls[0];
        console.log("Function call:", toolCall);
        
        // Parse the function arguments
        const args = JSON.parse(toolCall.function.arguments);
        
        if (toolCall.function.name === "performContractOp") {
          // Handle contract operation
          setOperationType("contractOp");
          
          if (args.contractOpType === "swap") {
            // Validate the amount for swap
            const amountAValue = parseFloat(args.amountA);
            
            if (isNaN(amountAValue) || amountAValue <= 0) {
              throw new Error("Invalid amountA: must be a positive number");
            }
            
            // Set the amount
            setAmountA(amountAValue.toString());
            setResult("Swap parameters set. You can proceed with swapping.");
            setShowComponent(true); // Show the swap component
          } else if (args.contractOpType === "add") {
            // Validate the amounts for add liquidity
            const amountAValue = parseFloat(args.amountA);
            const amountBValue = parseFloat(args.amountB);
            
            if (isNaN(amountAValue) || amountAValue <= 0) {
              throw new Error("Invalid amountA: must be a positive number");
            }
            if (isNaN(amountBValue) || amountBValue <= 0) {
              throw new Error("Invalid amountB: must be a positive number");
            }
            
            // Set the amounts
            setAmountA(amountAValue.toString());
            setAmountB(amountBValue.toString());
            setResult("Add liquidity parameters set. You can proceed with adding liquidity.");
            setShowComponent(true); // Show the add liquidity component
          } else if (args.contractOpType === "remove") {
            // Validate the LP tokens for remove liquidity
            const lpTokensValue = parseFloat(args.lpTokens);
            
            if (isNaN(lpTokensValue) || lpTokensValue <= 0) {
              throw new Error("Invalid lpTokens: must be a positive number");
            }
            
            // Set the LP tokens
            setLpTokens(lpTokensValue.toString());
            setResult("Remove liquidity parameters set. You can proceed with removing liquidity.");
            setShowComponent(true); // Show the remove liquidity component
          }
        } else if (toolCall.function.name === "performStandardAnalysis") {
          // Handle standard analysis
          setOperationType("dataAnalysis");
          setAnalysisType(args.analysisType);
          setDisplayMode(args.displayMode);
          
          if (args.analysisType === "pool") {
            setResult("Pool analytics parameters set. You can view the pool analytics.");
          } else {
            setResult("Swap price distribution parameters set. You can view the swap price distribution.");
          }
          setShowComponent(true); // Show the analysis component
        } else if (toolCall.function.name === "customDataAnalysis") {
          // Handle custom analysis
          setOperationType("dataAnalysis");
          setAnalysisType("custom");
          setSqlQuery(args.sqlQuery);
          setCustomAnalysisResult("Processing your custom analysis query...");
          setShowComponent(true);
          
          try {
            // 调用 API 路由执行 SQL 查询
            const sqlResponse = await fetch('/api/execute-sql', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ query: args.sqlQuery }),
            });
            
            if (!sqlResponse.ok) {
              const errorData = await sqlResponse.json();
              throw new Error(`SQL query failed: ${errorData.error || 'Unknown error'}`);
            }
            
            const sqlData = await sqlResponse.json();
            console.log("SQL query results:", sqlData);
            
            // 设置查询结果
            setCustomAnalysisResult("Query executed successfully.");
            setCustomAnalysisData(sqlData.data || []);
            
            // 生成自然语言回答
            try {
              const naturalResponse = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                  model: "gpt-3.5-turbo",
                  messages: [
                    {
                      role: "system",
                      content: `You are a helpful assistant that explains data analysis results in natural language.
                      Convert the query results into a clear, concise answer to the user's original question.
                      Be direct and specific in your response.`,
                    },
                    {
                      role: "user",
                      content: `Original question: ${instruction}
                      SQL query: ${args.sqlQuery}
                      Query results: ${JSON.stringify(sqlData.data || [])}
                      
                      Please provide a natural language answer to the original question based on these results.`,
                    },
                  ],
                }),
              });
              
              const naturalData = await naturalResponse.json();
              const naturalAnswer = naturalData.choices[0].message.content;
              setNaturalResponse(naturalAnswer);
            } catch (naturalError) {
              console.error("Failed to generate natural response:", naturalError);
              setNaturalResponse("I found the data but couldn't generate a natural language response.");
            }
          } catch (sqlError) {
            console.error("Failed to execute SQL query:", sqlError);
            setCustomAnalysisResult(`Error executing SQL query: ${sqlError instanceof Error ? sqlError.message : 'Unknown error'}`);
            setCustomAnalysisData(null);
          }
        }
      } else {
        // No function call, just a regular response
        console.log("No function call, regular response:", data.choices[0].message.content);
        setResult("I couldn't understand your instruction. Please try again with a clearer instruction.");
      }
    } catch (err: unknown) {
      console.error("UnifiedNLI process failed:", err);
      setResult(`Error: ${err instanceof Error ? err.message : err}`);
      setShowComponent(false); // Hide the component on error
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={{ border: "1px solid #ddd", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
      <h3>Uniswap Operations using Natural Language</h3>
      {!isConnected && <p style={{ color: "orange" }}>Please connect your wallet.</p>}

      <div style={{ marginBottom: "0.5rem" }}>
        <label>Instruction:</label>
        <input
          type="text"
          placeholder="e.g. Swap 10 Token A for Token B, Add 100 Token A and 50 Token B to the pool, Remove 50% of my liquidity, Show me the pool analytics, Analyze the swap price distribution, How many Mint events occurred this month?"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          style={{ marginLeft: "0.5rem", width: "300px" }}
        />
      </div>

      <div style={{ marginBottom: "0.5rem" }}>
        <label>OpenAI API Key:</label>
        <input
          type="password"
          placeholder="Enter your OpenAI API Key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          style={{ marginLeft: "0.5rem", width: "300px" }}
        />
      </div>

      <button 
        onClick={handleUnifiedNLI} 
        style={{ padding: "0.5rem 1rem", marginBottom: "1rem" }}
        disabled={isLoading}
      >
        {isLoading ? "Processing..." : "Parse Instruction"}
      </button>

      {result && <p style={{ marginTop: "1rem", marginBottom: "1rem" }}>{result}</p>}

      {showComponent && operationType === "contractOp" && (
        <>
          {amountA && !amountB && !lpTokens && (
            <div style={{ marginTop: "1rem" }}>
              <h4>Swap Operation</h4>
              <Swap 
                key={`swap-${amountA}`}
                tokenIn={tokenA} 
                tokenOut={tokenB} 
                initialAmount={amountA}
              />
            </div>
          )}

          {amountA && amountB && !lpTokens && (
            <div style={{ marginTop: "1rem" }}>
              <h4>Add Liquidity Operation</h4>
              <AddLiquidity 
                key={`add-${amountA}-${amountB}`}
                routerAddress={routerAddress} 
                tokenA={tokenA} 
                tokenB={tokenB} 
                initialAmountA={amountA}
                initialAmountB={amountB}
              />
            </div>
          )}

          {!amountA && !amountB && lpTokens && (
            <div style={{ marginTop: "1rem" }}>
              <h4>Remove Liquidity Operation</h4>
              <RemoveLiquidity 
                key={`remove-${lpTokens}`}
                tokenA={tokenA} 
                tokenB={tokenB} 
                pairAddress={pairAddress} 
                initialLpTokens={lpTokens}
              />
            </div>
          )}
        </>
      )}

      {showComponent && operationType === "dataAnalysis" && (
        <>
          {analysisType === "pool" && (
            <div style={{ marginTop: "1rem" }}>
              <h4>Pool Analytics</h4>
              <PoolAnalytics 
                key={`pool-analytics-${displayMode}`}
                pairAddress={pairAddress} 
                token0Symbol="Token A" 
                token1Symbol="Token B" 
              />
            </div>
          )}

          {analysisType === "price" && (
            <div style={{ marginTop: "1rem" }}>
              <h4>Swap Price Distribution</h4>
              <SwapPriceDistribution 
                key={`swap-price-distribution-${displayMode}`}
                pairAddress={pairAddress} 
              />
            </div>
          )}

          {analysisType === "custom" && (
            <div style={{ marginTop: "1rem" }}>
              <h4>Custom Analysis</h4>
              {customAnalysisResult === "Processing your custom analysis query..." ? (
                <div className="text-center py-4">Processing your query...</div>
              ) : (
                <div className="p-4 bg-base-200 rounded-lg">
                  {sqlQuery && (
                    <div className="mb-4">
                      <h5 className="font-medium mb-2">SQL Query:</h5>
                      <pre className="bg-base-300 p-2 rounded text-xs overflow-x-auto">{sqlQuery}</pre>
                    </div>
                  )}
                  
                  {naturalResponse ? (
                    <div className="mb-4">
                      <h5 className="font-medium mb-2">Answer:</h5>
                      <p>{naturalResponse}</p>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <h5 className="font-medium mb-2">Query Result:</h5>
                      <p>{customAnalysisResult}</p>
                    </div>
                  )}
                  
                  {customAnalysisData && customAnalysisData.length > 0 ? (
                    <>
                      <h5 className="font-medium mb-2">Data:</h5>
                      <div className="overflow-x-auto">
                        <table className="table table-zebra w-full">
                          <thead>
                            <tr>
                              {Object.keys(customAnalysisData[0] || {}).map(key => (
                                <th key={key}>{key}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {customAnalysisData.map((row: Record<string, any>, index: number) => (
                              <tr key={index}>
                                {Object.values(row).map((value: any, i: number) => (
                                  <td key={i}>{value !== null ? String(value) : 'null'}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">No data returned from the query.</div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
} 