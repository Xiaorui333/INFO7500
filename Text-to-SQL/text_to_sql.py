import openai
import os

# Load API key from environment variable
openai.api_key = os.getenv('OPENAI_API_KEY')

# Define the structure of the blocks table in SQL
schema = """
CREATE TABLE blocks (
    id INTEGER PRIMARY KEY,
    block_number INTEGER,
    timestamp DATETIME,
    num_transactions INTEGER
);
"""

print("Welcome to the AI-Generated Block Explorer! Ask your blockchain-related questions.")
print("Type 'exit' to quit the program.\n")

while True:
    user_prompt = input("Q: ")

    if user_prompt.lower() == "exit":
        print("Goodbye!")
        break

    try:
        ai_response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an SQL assistant."},
                {"role": "user", "content": f"Schema: {schema}\n\n{user_prompt}"}
            ]
        )

        print("A:", ai_response.choices[0].message.content)
    except Exception as e:
        print(f"An error occurred: {e}")

