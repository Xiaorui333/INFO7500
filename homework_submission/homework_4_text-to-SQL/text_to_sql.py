import os
import sqlite3
import openai
import re
import logging

# Configure logging to file
logging.basicConfig(
    level=logging.INFO,
    filename="db_interactive.log",
    format="%(asctime)s %(levelname)s: %(message)s"
)

def get_inputs():
    """
    Prompt the user for their question and the DB path.
    """
    user_question = input("Enter your question: ")
    db_path = input("Enter the absolute path to the DB: ")
    return user_question, db_path

def extract_schema(db_path):
    """
    Connects to the SQLite database at db_path,
    extracts the schema (CREATE TABLE statements),
    and returns it as a string.
    """
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND sql NOT NULL;")
        rows = cursor.fetchall()

    schema_statements = [row[0] for row in rows]
    schema_text = "\n\n".join(schema_statements)
    return schema_text

def build_prompt(schema_text, user_question):
    """
    Builds a prompt that includes:
      - the extracted database schema
      - the user's natural language question
    """
    return f"""
Database schema:
{schema_text}

User's natural language question:
{user_question}
"""

def check_db_integrity(db_path):
    """
    Checks the integrity of the SQLite database.
    Raises an exception if the database is corrupt.
    """
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("PRAGMA integrity_check;")
        result = cursor.fetchone()
        if result[0].lower() != "ok":
            raise Exception(f"Database integrity check failed: {result[0]}")
        else:
            logging.info("Database integrity check passed.")

def run_query():
    """
    Main function that builds the prompt, calls the OpenAI API,
    executes the generated SQL query, and prints the results.
    """
    try:
        # Prompt user for question and DB path
        user_question, db_path = get_inputs()
        
        # Make sure you have your API key set (e.g., export OPENAI_API_KEY=YOUR_KEY)
        openai.api_key = os.environ.get("OPENAI_API_KEY")
        if not openai.api_key:
            raise Exception("Missing required environment variable: OPENAI_API_KEY")

        # Check database integrity
        check_db_integrity(db_path)

        # Extract the current database schema
        schema_text = extract_schema(db_path)
        logging.info("Database schema extracted.")

        # System prompt for the model
        system_prompt = (
            "You are a SQL developer that is an expert in Bitcoin. "
            "You answer natural language questions about the bitcoind database stored in a SQLite database. "
            "Always respond with only correct SQL statements."
        )

        # Build the user prompt (schema + question)
        user_prompt = build_prompt(schema_text, user_question)

        # Call the OpenAI API
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.0
        )

        # Retrieve and clean the generated SQL
        sql_answer = response.choices[0].message.content
        sql_answer = re.sub(r'```(\w+)?\n?', '', sql_answer)
        sql_answer = sql_answer.replace('```', '').strip()

        logging.info("LLM generated SQL: %s", sql_answer)
        print("\n--- LLM Generated SQL ---")
        print(sql_answer)

        # Execute the SQL in the same DB and fetch results
        with sqlite3.connect(db_path) as conn:
            cur = conn.cursor()
            cur.execute(sql_answer)
            results = cur.fetchall()

        print("\n--- Query Results ---")
        for row in results:
            print(row)
        logging.info("Query executed successfully with %d rows returned.", len(results))

    except Exception as e:
        logging.error("Error during run: %s", e)
        print("Error:", e)

if __name__ == "__main__":
    run_query()
