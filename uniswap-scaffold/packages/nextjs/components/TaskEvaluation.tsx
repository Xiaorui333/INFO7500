"use client";
import React, { useState } from "react";

export function TaskEvaluation() {
  const [instruction, setInstruction] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [result, setResult] = useState("");
  const [apiKey, setApiKey] = useState("");

  async function handleEvaluate() {
    if (!instruction) {
      console.warn("Please enter a natural language instruction.");
      return;
    }
    if (!correctAnswer) {
      console.warn("Please enter the correct answer.");
      return;
    }
    if (!apiKey) {
      console.warn("Please enter your OpenAI API Key.");
      return;
    }

    try {
      // Call OpenAI API to evaluate the instruction
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
              content: "You are a helpful assistant that evaluates natural language instructions against correct answers.",
            },
            {
              role: "user",
              content: `Instruction: ${instruction}\nCorrect Answer: ${correctAnswer}`,
            },
          ],
        }),
      });

      const data = await response.json();
      const evaluation = data.choices[0].message.content;
      setResult(evaluation);
    } catch (err: unknown) {
      console.error("Task evaluation failed:", err);
      setResult(`Error: ${err instanceof Error ? err.message : err}`);
    }
  }

  return (
    <div style={{ border: "1px solid #ddd", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
      <h3>Task Evaluation</h3>

      <div style={{ marginBottom: "0.5rem" }}>
        <label>Instruction:</label>
        <input
          type="text"
          placeholder="e.g. Swap 1 Token A for Token B"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          style={{ marginLeft: "0.5rem", width: "300px" }}
        />
      </div>

      <div style={{ marginBottom: "0.5rem" }}>
        <label>Correct Answer:</label>
        <input
          type="text"
          placeholder="e.g. The transaction should swap 1 Token A for 1 Token B"
          value={correctAnswer}
          onChange={(e) => setCorrectAnswer(e.target.value)}
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

      <button onClick={handleEvaluate} style={{ padding: "0.5rem 1rem" }}>
        Evaluate
      </button>

      {result && <p style={{ marginTop: "1rem" }}>{result}</p>}
    </div>
  );
} 