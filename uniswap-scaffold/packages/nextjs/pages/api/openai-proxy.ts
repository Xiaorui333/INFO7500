import { NextApiRequest, NextApiResponse } from 'next';

// 定义函数类型
type OperationType = 'swap' | 'addLiquidity' | 'removeLiquidity';
type AnalysisType = 'pool' | 'price' | 'custom';
type DisplayMode = 'table' | 'chart';

// 定义函数参数类型
interface ContractOpParams {
  contractOpType: 'swap' | 'add' | 'remove';
  amountA?: string;
  amountB?: string;
  lpTokens?: string;
}

interface StandardAnalysisParams {
  analysisType: 'pool' | 'price';
  displayMode: 'table' | 'chart';
}

interface CustomAnalysisParams {
  sqlQuery: string;
}

// 定义函数
const functions = [
  {
    name: "performContractOp",
    description: "Perform a contract operation on Uniswap V2",
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
          description: "Amount of LP tokens to remove (for remove liquidity)"
        }
      },
      required: ["contractOpType"]
    }
  },
  {
    name: "performStandardAnalysis",
    description: "Perform a standard analysis on Uniswap V2 data",
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
          enum: ["table", "chart"],
          description: "How to display the analysis results"
        }
      },
      required: ["analysisType", "displayMode"]
    }
  },
  {
    name: "customDataAnalysis",
    description: "Perform a custom data analysis using SQL",
    parameters: {
      type: "object",
      properties: {
        sqlQuery: {
          type: "string",
          description: "The SQL query to execute for custom analysis. Use standard SQL syntax that works with PostgreSQL. Include appropriate WHERE clauses, aggregation functions, and ORDER BY clauses. Limit results to a reasonable number."
        }
      },
      required: ["sqlQuery"]
    }
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { instruction } = req.body;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!instruction) {
    return res.status(400).json({ error: 'Instruction is required' });
  }

  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API key is required' });
  }

  try {
    // 调用OpenAI API
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
            Make sure all amounts are valid numbers that can be parsed by JavaScript's parseFloat function.`,
          },
          {
            role: "user",
            content: instruction,
          },
        ],
        functions: functions,
        function_call: "auto"
      }),
    });

    const data = await response.json();
    console.log("OpenAI response:", data);

    if (data.error) {
      return res.status(400).json({ error: data.error.message || 'OpenAI API error' });
    }

    // 检查响应是否包含函数调用
    const fnCall = data.choices[0].message.function_call;
    if (!fnCall) {
      return res.status(400).json({ error: "Could not understand the instruction" });
    }

    const { name, arguments: argStr } = fnCall;
    const args = JSON.parse(argStr);
    console.log("Function call:", name, args);

    let result: any = { function: name, arguments: args };
    let operation = null;
    let customAnalysisResult = null;
    let customAnalysisData = null;
    let sqlQuery = null;
    let naturalResponse = null;

    // 处理不同类型的函数调用
    if (name === "performContractOp") {
      operation = {
        type: args.contractOpType === "swap" ? "swap" : 
              args.contractOpType === "add" ? "addLiquidity" : "removeLiquidity",
        params: args
      };
    } else if (name === "performStandardAnalysis") {
      // 标准分析不需要额外处理
    } else if (name === "customDataAnalysis") {
      sqlQuery = args.sqlQuery;
      
      try {
        // 执行SQL查询
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const sqlResponse = await fetch(`${baseUrl}/api/execute-sql`, {
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
        
        customAnalysisResult = "Query executed successfully.";
        customAnalysisData = sqlData.data || [];
        
        // 生成自然语言回答
        try {
          let naturalResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
          naturalResponse = naturalData.choices[0].message.content;
        } catch (naturalError) {
          console.error("Failed to generate natural response:", naturalError);
          naturalResponse = "I found the data but couldn't generate a natural language response.";
        }
      } catch (sqlError) {
        console.error("Failed to execute SQL query:", sqlError);
        customAnalysisResult = `Error executing SQL query: ${sqlError instanceof Error ? sqlError.message : 'Unknown error'}`;
        customAnalysisData = null;
      }
    }

    // 返回结果
    return res.status(200).json({
      result,
      operation,
      customAnalysisResult,
      customAnalysisData,
      sqlQuery,
      naturalResponse
    });
  } catch (error) {
    console.error("Error processing instruction:", error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    });
  }
} 