// UnifiedNLI.tsx
"use client";
import React, { useState } from "react";
import { useAccount } from "wagmi";
import { Swap } from "~~/components/Swap";
import { AddLiquidity } from "~~/components/addLiquidity";
import { RemoveLiquidity } from "~~/components/removeLiquidity";
import { PoolAnalytics } from "~~/components/PoolAnalytics";
import { SwapPriceDistribution } from "~~/components/SwapPriceDistribution";

interface UnifiedNLIProps {
  routerAddress: `0x${string}`;
  tokenA: `0x${string}`;
  tokenB: `0x${string}`;
  pairAddress: `0x${string}`;
}

export function UnifiedNLI({ routerAddress, tokenA, tokenB, pairAddress }: UnifiedNLIProps) {
  const [instruction, setInstruction] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [openAiQueryResults, setOpenAiQueryResults] = useState<any[]>([]);
  const [openAiNaturalResponse, setOpenAiNaturalResponse] = useState<string | null>(null);
  
  const [customLlmResult, setCustomLlmResult] = useState<string | null>(null);
  const [customLlmQueryResults, setCustomLlmQueryResults] = useState<any[]>([]);
  const [customLlmNaturalResponse, setCustomLlmNaturalResponse] = useState<string | null>(null);

  const [showSwap, setShowSwap] = useState<boolean>(false);
  const [showAddLiquidity, setShowAddLiquidity] = useState<boolean>(false);
  const [showRemoveLiquidity, setShowRemoveLiquidity] = useState<boolean>(false);
  const [showPoolAnalytics, setShowPoolAnalytics] = useState<boolean>(false);
  const [showSwapPriceDistribution, setShowSwapPriceDistribution] = useState<boolean>(false);
  

  const { status: accountStatus } = useAccount();
  const isConnected = accountStatus === 'connected';

  const handleParseInstruction = async () => {
    if (!instruction.trim()) {
      setError('Please enter an instruction');
      return;
    }

    setIsProcessing(true);
    setError(null);
    // Reset OpenAI states
    setResult(null);
    setOpenAiQueryResults([]);
    setOpenAiNaturalResponse(null);
    // Reset Custom LLM states
    setCustomLlmResult(null);
    setCustomLlmQueryResults([]);
    setCustomLlmNaturalResponse(null);
    // Reset UI states
    setShowSwap(false);
    setShowAddLiquidity(false);
    setShowRemoveLiquidity(false);
    setShowPoolAnalytics(false);
    setShowSwapPriceDistribution(false);

    const [openaiRes, customRes] = await Promise.allSettled([
      fetch('/api/openai-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction }),
      }).then(r => r.json()),
      fetch('/api/custom-llm-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction }),
      }).then(r => r.json()),
    ]);
    console.log('[UnifiedNLI] openaiRes:', openaiRes);
    console.log('[UnifiedNLI] customRes:', customRes);

    // OpenAI result processing
    if (openaiRes.status === 'fulfilled') {
      const data = openaiRes.value;
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data.result);
        if (data.result?.function === 'customDataAnalysis') {
          const sqlQuery = data.result.arguments.sqlQuery;
          console.log('[UnifiedNLI] Executing OpenAI SQL query:', sqlQuery);
          
          // Execute SQL query
          const baseUrl = window.location.origin;
          const sqlRes = await fetch(`${baseUrl}/api/execute-sql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: sqlQuery }),
          }).then(r => r.json());
          
          if (sqlRes.error) {
            setError(sqlRes.error);
          } else {
            setOpenAiQueryResults(sqlRes.data);
            
            // Generate natural language response for OpenAI
            const nlRes = await fetch(`${baseUrl}/api/openai-chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                instruction: `Based on the following SQL query results, provide a clear and concise answer to the original question: "${instruction}"\n\nQuery results: ${JSON.stringify(sqlRes.data)}`
              }),
            }).then(r => r.json());
            
            if (nlRes.error) {
              setError(nlRes.error);
            } else {
              setOpenAiNaturalResponse(nlRes.result);
            }
          }
        }
        // Handle other operations...
        if (data.operation) {
          if (data.operation.type === 'swap') setShowSwap(true);
          if (data.operation.type === 'addLiquidity') setShowAddLiquidity(true);
          if (data.operation.type === 'removeLiquidity') setShowRemoveLiquidity(true);
        }
        if (data.result?.function === 'performStandardAnalysis') {
          const { analysisType } = data.result.arguments;
          if (analysisType === 'pool') setShowPoolAnalytics(true);
          if (analysisType === 'price') setShowSwapPriceDistribution(true);
        }
      }
    }

    // Custom LLM result processing
    if (customRes.status === 'fulfilled') {
      const data = customRes.value;
      if (data.error) {
        setError(data.error);
      } else {
        setCustomLlmResult(data.result);
        
        // Extract SQL query from Custom LLM response
        if (data.result && typeof data.result === 'string') {
          const sqlMatch = data.result.match(/```sql\n([\s\S]*?)\n```/);
          if (sqlMatch) {
            const sqlQuery = sqlMatch[1].trim();
            console.log('[UnifiedNLI] Executing Custom LLM SQL query:', sqlQuery);
            
            // Execute SQL query
            const baseUrl = window.location.origin;
            const sqlRes = await fetch(`${baseUrl}/api/execute-sql`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: sqlQuery }),
            }).then(r => r.json());
            
            if (!sqlRes.error) {
              setCustomLlmQueryResults(sqlRes.data);
              
              // Generate natural language response for Custom LLM
              const nlRes = await fetch(`${baseUrl}/api/openai-chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  instruction: `Based on the following SQL query results and the Custom LLM's explanation, provide a clear and concise answer to the original question: "${instruction}"\n\nCustom LLM explanation: ${data.result}\n\nQuery results: ${JSON.stringify(sqlRes.data)}`
                }),
              }).then(r => r.json());
              
              if (!nlRes.error) {
                setCustomLlmNaturalResponse(nlRes.result);
              }
            }
          }
        }
      }
    }

    setIsProcessing(false);
  };

  return (
    <div className='flex flex-col gap-4 p-4 bg-base-200 rounded-lg'>
      <h2 className='text-xl font-bold'>Natural Language Interface</h2>

      {/* Instruction input */}
      <div className='form-control'>
        <label className='label'><span className='label-text'>Instruction:</span></label>
        <textarea
          className='textarea textarea-bordered h-24'
          placeholder='Enter your instruction (e.g., "Swap 0.1 ETH for USDC")'
          value={instruction}
          onChange={e => setInstruction(e.target.value)}
        />
      </div>

      <button
        className={`btn btn-primary ${isProcessing ? 'loading' : ''}`}
        onClick={handleParseInstruction}
        disabled={isProcessing}
      >
        Parse Instruction
      </button>

      {error && <div className='alert alert-error'><span>{error}</span></div>}

      {/* Two LLMs side by side */}
      {(result || customLlmResult) && (
        <div className='mt-4 flex gap-4'>
          {result && (
            <div className='card bg-base-100 shadow-xl flex-1'>
              <div className='card-body'>
                <h3 className='card-title'>OpenAI Response</h3>
                <pre className='whitespace-pre-wrap'>{JSON.stringify(result, null, 2)}</pre>
                {openAiQueryResults.length > 0 && (
                  <div className='mt-4'>
                    <h4 className='text-lg font-semibold mb-2'>Query Results</h4>
                    <table className='min-w-full divide-y divide-gray-200'>
                      <thead className='bg-gray-50'>
                        <tr>
                          {Object.keys(openAiQueryResults[0]).map(key => (
                            <th key={key} className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className='bg-white divide-y divide-gray-200'>
                        {openAiQueryResults.map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {Object.values(row).map((val, colIndex) => (
                              <td key={colIndex} className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                                {val != null ? String(val) : ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {openAiNaturalResponse && (
                  <div className='mt-4'>
                    <h4 className='text-lg font-semibold mb-2'>Answer</h4>
                    <p className='text-gray-700'>{openAiNaturalResponse}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {customLlmResult && (
            <div className='card bg-base-100 shadow-xl flex-1'>
              <div className='card-body'>
                <h3 className='card-title'>Custom LLM Response</h3>
                <pre className='whitespace-pre-wrap'>{customLlmResult}</pre>
                {customLlmQueryResults.length > 0 && (
                  <div className='mt-4'>
                    <h4 className='text-lg font-semibold mb-2'>Query Results</h4>
                    <table className='min-w-full divide-y divide-gray-200'>
                      <thead className='bg-gray-50'>
                        <tr>
                          {Object.keys(customLlmQueryResults[0]).map(key => (
                            <th key={key} className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className='bg-white divide-y divide-gray-200'>
                        {customLlmQueryResults.map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {Object.values(row).map((val, colIndex) => (
                              <td key={colIndex} className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                                {val != null ? String(val) : ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {customLlmNaturalResponse && (
                  <div className='mt-4'>
                    <h4 className='text-lg font-semibold mb-2'>Answer</h4>
                    <p className='text-gray-700'>{customLlmNaturalResponse}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contract operation & analytics components */}
      {showSwap && <Swap tokenIn={tokenA} tokenOut={tokenB} />}
      {showAddLiquidity && <AddLiquidity routerAddress={routerAddress} tokenA={tokenA} tokenB={tokenB} />}
      {showRemoveLiquidity && <RemoveLiquidity tokenA={tokenA} tokenB={tokenB} pairAddress={pairAddress} />}
      {showPoolAnalytics && <PoolAnalytics pairAddress={pairAddress} />}
      {showSwapPriceDistribution && <SwapPriceDistribution pairAddress={pairAddress} />}
    </div>
  );
}