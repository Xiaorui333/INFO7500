import type { NextApiRequest, NextApiResponse } from "next";

type ResponseData = {
  result?: string;
  error?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { instruction } = req.body;
  const baseUrl = process.env.MODAL_OPENAI_BASE_URL;
  const apiKey = process.env.MODAL_OPENAI_API_KEY;

  if (!instruction) {
    return res.status(400).json({ error: "Instruction is required" });
  }

  if (!baseUrl || !apiKey) {
    return res.status(500).json({ error: "Modal server configuration is missing" });
  }

  try {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "neuralmagic/Meta-Llama-3.1-8B-Instruct-quantized.w4a16",
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
            
            The uniswap_events table has the following columns:
            - id: bigint (primary key)
            - block_number: bigint
            - transaction_hash: text
            - event_name: text (case‑sensitive, must be one of: 'Swap', 'Mint', 'Burn', 'Sync')
            - pair_address: text (the Uniswap V2 pair contract address that emitted the event)
            - token0_address: text (ERC‑20 address of token0 in that pair)
            - token1_address: text (ERC‑20 address of token1 in that pair)
            - timestamp: timestamp without time zone (stored in UTC)
            - data_json: jsonb (the full event arguments as JSON)
            - created_at: timestamp without time zone

            ⚠️ Do NOT reference columns that do not exist (e.g., amount0in, liquidity_a).  
            📘 To extract values from data_json, use JSON operators and cast to numeric, for example:
              (data_json->>'amount0')::numeric  
              (data_json->>'amount1Out')::numeric

            🕒 Time‑based filters examples:
              WHERE timestamp >= NOW() - INTERVAL '24 hours'
              WHERE timestamp BETWEEN '2024-04-01' AND '2024-04-16'

            🔍 Example SQL snippets (no trailing semicolons):
            1. Count Swap events today:
              SELECT COUNT(*) AS count
              FROM uniswap_events
              WHERE event_name = 'Swap'
                AND timestamp >= CURRENT_DATE

            2. Average liquidity per Mint event:
              SELECT AVG((data_json->>'amount0')::numeric + (data_json->>'amount1')::numeric) AS avg_liquidity
              FROM uniswap_events
              WHERE event_name = 'Mint'

            3. Top 5 active pairs last 24h:
              SELECT pair_address, COUNT(*) AS event_count
              FROM uniswap_events
              WHERE timestamp >= NOW() - INTERVAL '1 day'
              GROUP BY pair_address
              ORDER BY event_count DESC
              LIMIT 5
            Make sure all amounts are valid numbers that can be parsed by JavaScript's parseFloat function.`
          },
          {
            role: "user",
            content: instruction
          }
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to get response from Modal server');
    }

    // Extract the content from the response
    const result = data.choices?.[0]?.message?.content;
    
    if (!result) {
      throw new Error('No content in response from Modal server');
    }

    return res.status(200).json({ result });
  } catch (error) {
    console.error("Error in custom LLM chat:", error);
    return res.status(500).json({ error: "Failed to process request with custom LLM" });
  }
}

// 定义函数
const functions = [
  {
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
  },
  {
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
  },
  {
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
]; 