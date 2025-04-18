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
  const apiKey = process.env.OPENAI_API_KEY;

  if (!instruction) {
    return res.status(400).json({ error: "Instruction is required" });
  }

  if (!apiKey) {
    return res.status(500).json({ error: "OpenAI API key is not configured" });
  }

  try {
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
            content: "You are a helpful assistant that explains data analysis results in natural language. Convert the query results into a clear, concise answer to the user's original question. Be direct and specific in your response."
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
    const result = data.choices[0]?.message?.content || "No response generated";

    return res.status(200).json({ result });
  } catch (error) {
    console.error("Error in OpenAI chat:", error);
    return res.status(500).json({ error: "Failed to process request with OpenAI" });
  }
}