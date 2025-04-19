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

type LLMType = 'openai' | 'custom';

export function UnifiedNLI({ routerAddress, tokenA, tokenB, pairAddress }: UnifiedNLIProps) {
  const [selectedLLM, setSelectedLLM] = useState<LLMType>('openai');
  const [instruction, setInstruction] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [naturalResponse, setNaturalResponse] = useState<string | null>(null);

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
    setResult(null);
    setQueryResults([]);
    setNaturalResponse(null);
    setShowSwap(false);
    setShowAddLiquidity(false);
    setShowRemoveLiquidity(false);
    setShowPoolAnalytics(false);
    setShowSwapPriceDistribution(false);

    try {
      // Call the selected LLM API
      const llmRes = await fetch(selectedLLM === 'openai' ? '/api/openai-proxy' : '/api/custom-llm-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction }),
      }).then(r => r.json());

      console.log(`[UnifiedNLI] ${selectedLLM} response:`, llmRes);

      if (llmRes.error) {
        setError(llmRes.error);
        return;
      }

      setResult(llmRes.result);

      // Handle SQL query if present
      let sqlQuery = null;
      if (selectedLLM === 'openai') {
        if (llmRes.result?.function === 'customDataAnalysis') {
          sqlQuery = llmRes.result.arguments.sqlQuery;
        }
      } else {
        // Try to parse Custom LLM response
        try {
          const parsedResult = typeof llmRes.result === 'string' ? JSON.parse(llmRes.result) : llmRes.result;
          if (parsedResult.function === 'customDataAnalysis' && parsedResult.arguments?.sqlQuery) {
            sqlQuery = parsedResult.arguments.sqlQuery;
          }
        } catch (e) {
          if (typeof llmRes.result === 'string') {
            const sqlMatch = llmRes.result.match(/```sql\n([\s\S]*?)\n```/);
            if (sqlMatch) {
              sqlQuery = sqlMatch[1].trim();
            }
          }
        }
      }

      // Execute SQL query if found
      if (sqlQuery) {
        console.log(`[UnifiedNLI] Executing ${selectedLLM} SQL query:`, sqlQuery);
        const baseUrl = window.location.origin;
        const sqlRes = await fetch(`${baseUrl}/api/execute-sql`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: sqlQuery }),
        }).then(r => r.json());

        if (sqlRes.error) {
          setError(sqlRes.error);
        } else {
          setQueryResults(sqlRes.data);

          // Generate natural language response
          const nlRes = await fetch(`${baseUrl}/api/openai-chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              instruction: `Based on the following SQL query results${selectedLLM === 'custom' ? " and the Custom LLM's explanation" : ""}, provide a clear and concise answer to the original question: "${instruction}"\n\n${selectedLLM === 'custom' ? `Custom LLM explanation: ${llmRes.result}\n\n` : ""}Query results: ${JSON.stringify(sqlRes.data)}`
            }),
          }).then(r => r.json());

          if (!nlRes.error) {
            setNaturalResponse(nlRes.result);
          }
        }
      }

      // Handle other operations
      if (selectedLLM === 'openai') {
        if (llmRes.result?.operation) {
          if (llmRes.result.operation.type === 'swap') setShowSwap(true);
          if (llmRes.result.operation.type === 'addLiquidity') setShowAddLiquidity(true);
          if (llmRes.result.operation.type === 'removeLiquidity') setShowRemoveLiquidity(true);
        }
        if (llmRes.result?.function === 'performStandardAnalysis') {
          const { analysisType } = llmRes.result.arguments;
          if (analysisType === 'pool') setShowPoolAnalytics(true);
          if (analysisType === 'price') setShowSwapPriceDistribution(true);
        }
      }
    } catch (error) {
      console.error('[UnifiedNLI] Error:', error);
      setError('Failed to process instruction');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className='flex flex-col gap-4'>
      {/* LLM Selection */}
      <div className='form-control'>
        <label className='label'>
          <span className='label-text'>Please choose your preferred LLM:</span>
        </label>
        <div className='flex gap-4'>
          <button
            className={`btn flex-1 ${selectedLLM === 'openai' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setSelectedLLM('openai')}
          >
            Use OpenAI
          </button>
          <button
            className={`btn flex-1 ${selectedLLM === 'custom' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setSelectedLLM('custom')}
          >
            Use Custom LLM
          </button>
        </div>
      </div>

      {/* Instruction input */}
      <div className='form-control'>
        <label className='label'>
          <span className='label-text'>Instruction:</span>
        </label>
        <textarea
          className='textarea textarea-bordered h-24'
          placeholder='Enter your instruction (e.g., "How many swap events occurred today?")'
          value={instruction}
          onChange={e => setInstruction(e.target.value)}
        />
      </div>

      <button
        className={`btn btn-primary ${isProcessing ? 'loading' : ''}`}
        onClick={handleParseInstruction}
        disabled={isProcessing}
      >
        Process Instruction
      </button>

      {error && (
        <div className='alert alert-error'>
          <span>{error}</span>
        </div>
      )}

      {/* LLM Response and Results */}
      {result && (
        <div className='card bg-base-100 shadow-xl'>
          <div className='card-body'>
            <h3 className='card-title'>{selectedLLM === 'openai' ? 'OpenAI' : 'Custom LLM'} Response</h3>
            <pre className='whitespace-pre-wrap'>{typeof result === 'string' ? result : JSON.stringify(result, null, 2)}</pre>
            
            {queryResults && queryResults.length > 0 && (
              <div className='mt-4'>
                <h4 className='text-lg font-semibold mb-2'>Query Results</h4>
                <table className='min-w-full divide-y divide-gray-200'>
                  <thead className='bg-gray-50'>
                    <tr>
                      {Object.keys(queryResults[0]).map(key => (
                        <th key={key} className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className='bg-white divide-y divide-gray-200'>
                    {queryResults.map((row, rowIndex) => (
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

            {naturalResponse && (
              <div className='mt-4'>
                <h4 className='text-lg font-semibold mb-2'>Answer</h4>
                <p className='text-gray-700'>{naturalResponse}</p>
              </div>
            )}
          </div>
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