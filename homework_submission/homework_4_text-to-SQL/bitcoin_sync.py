import os
import time
import json
import requests
import sqlite3

DB_PATH = "bitcoin_chain.db" 

# Read environment variables for Chainstack RPC
RPC_URL = os.environ.get("CHAINSTACK_RPC_URL")
RPC_USER = os.environ.get("CHAINSTACK_RPC_USER")
RPC_PASS = os.environ.get("CHAINSTACK_RPC_PASSWORD")

print("RPC_URL:", RPC_URL)
print("RPC_USER:", RPC_USER)
print("RPC_PASS:", RPC_PASS)


if not RPC_URL or not RPC_USER or not RPC_PASS:
    raise RuntimeError("Missing Chainstack RPC environment variables. "
                       "Please set CHAINSTACK_RPC_URL, CHAINSTACK_RPC_USER, "
                       "and CHAINSTACK_RPC_PASSWORD.")

# ---------------------------------------------------------------------
# 1) CREATE OR VERIFY DATABASE SCHEMA
# ---------------------------------------------------------------------
SCHEMA_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS blocks (
      block_id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT UNIQUE NOT NULL,
      confirmations INTEGER,
      strippedsize INTEGER,
      size INTEGER,
      weight INTEGER,
      height INTEGER,
      version INTEGER,
      versionHex TEXT,
      merkleroot TEXT,
      time INTEGER,
      mediantime INTEGER,
      nonce INTEGER,
      bits TEXT,
      difficulty REAL,
      chainwork TEXT,
      nTx INTEGER,
      previousblockhash TEXT,
      nextblockhash TEXT
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS transactions (
      tx_id INTEGER PRIMARY KEY AUTOINCREMENT,
      block_hash TEXT NOT NULL,
      txid TEXT UNIQUE NOT NULL,
      hash TEXT NOT NULL,
      version INTEGER,
      size INTEGER,
      vsize INTEGER,
      weight INTEGER,
      locktime INTEGER,
      hex TEXT
      -- Optionally add FOREIGN KEY (block_hash) REFERENCES blocks(hash)
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS vin (
      vin_id INTEGER PRIMARY KEY AUTOINCREMENT,
      txid TEXT NOT NULL,
      coinbase TEXT,
      prev_txid TEXT,
      prev_vout INTEGER,
      scriptSig_asm TEXT,
      scriptSig_hex TEXT,
      sequence INTEGER
      -- Optionally FOREIGN KEY (txid) REFERENCES transactions(txid)
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS script_pubkey (
      script_pubkey_id INTEGER PRIMARY KEY AUTOINCREMENT,
      asm TEXT,
      hex TEXT,
      reqSigs INTEGER,
      type TEXT
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS vout (
      vout_id INTEGER PRIMARY KEY AUTOINCREMENT,
      txid TEXT NOT NULL,
      value REAL,
      n INTEGER,
      script_pubkey_id INTEGER
      -- Optionally FOREIGN KEY (txid) REFERENCES transactions(txid)
      -- Optionally FOREIGN KEY (script_pubkey_id) REFERENCES script_pubkey(script_pubkey_id)
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS vout_addresses (
      vout_addr_id INTEGER PRIMARY KEY AUTOINCREMENT,
      vout_id INTEGER NOT NULL,
      address TEXT NOT NULL
      -- Optionally FOREIGN KEY (vout_id) REFERENCES vout(vout_id)
    );
    """
]

def initialize_database(conn):
    """Create tables if they do not exist."""
    for stmt in SCHEMA_STATEMENTS:
        conn.execute(stmt)
    conn.commit()

# ---------------------------------------------------------------------
# 2) HELPER FUNCTIONS
# ---------------------------------------------------------------------
def rpc_call(method, params=None):
    """Make an RPC call to the Chainstack node."""
    if params is None:
        params = []
    headers = {"Content-Type": "application/json"}
    payload = {
        "jsonrpc": "1.0",
        "id": "python-client",
        "method": method,
        "params": params
    }
    resp = requests.post(
        RPC_URL,
        auth=(RPC_USER, RPC_PASS),
        headers=headers,
        data=json.dumps(payload),
        timeout=60
    )
    resp.raise_for_status()
    return resp.json()["result"]

def get_latest_db_block_height(conn):
    """Return the highest block height stored in the local DB, or -1 if none."""
    cur = conn.cursor()
    cur.execute("SELECT MAX(height) FROM blocks;")
    row = cur.fetchone()
    if row and row[0] is not None:
        return row[0]
    return -1

# ---------------------------------------------------------------------
# 3) STORING BLOCK AND TX DATA IN THE DATABASE
# ---------------------------------------------------------------------
def store_block(conn, block_json):
    """
    Store the block and transactions into the DB using our schema.
    """
    cursor = conn.cursor()
    
    # Insert block into blocks table
    block_sql = """
        INSERT OR IGNORE INTO blocks (
          hash, confirmations, strippedsize, size, weight, height, 
          version, versionHex, merkleroot, time, mediantime, nonce, bits, 
          difficulty, chainwork, nTx, previousblockhash, nextblockhash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """
    block_data = (
        block_json.get("hash"),
        block_json.get("confirmations"),
        block_json.get("strippedsize"),
        block_json.get("size"),
        block_json.get("weight"),
        block_json.get("height"),
        block_json.get("version"),
        block_json.get("versionHex"),
        block_json.get("merkleroot"),
        block_json.get("time"),
        block_json.get("mediantime"),
        block_json.get("nonce"),
        block_json.get("bits"),
        block_json.get("difficulty"),
        block_json.get("chainwork"),
        block_json.get("nTx"),
        block_json.get("previousblockhash"),
        block_json.get("nextblockhash"),
    )
    cursor.execute(block_sql, block_data)

    # Store each transaction in this block
    for tx in block_json["tx"]:
        tx_sql = """
            INSERT OR IGNORE INTO transactions (
              block_hash,
              txid, hash, version, size, vsize, weight, locktime, hex
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        """
        tx_data = (
            block_json["hash"],
            tx.get("txid"),
            tx.get("hash"),
            tx.get("version"),
            tx.get("size"),
            tx.get("vsize"),
            tx.get("weight"),
            tx.get("locktime"),
            tx.get("hex")
        )
        cursor.execute(tx_sql, tx_data)
        
        # Insert each input (vin)
        for vin_item in tx.get("vin", []):
            vin_sql = """
                INSERT OR IGNORE INTO vin (
                  txid, coinbase, prev_txid, prev_vout, scriptSig_asm, 
                  scriptSig_hex, sequence
                ) VALUES (?, ?, ?, ?, ?, ?, ?);
            """
            vin_data = (
                tx.get("txid"),
                vin_item.get("coinbase"),
                vin_item.get("txid"),  # referencing the *previous* txid
                vin_item.get("vout"),
                vin_item.get("scriptSig", {}).get("asm"),
                vin_item.get("scriptSig", {}).get("hex"),
                vin_item.get("sequence")
            )
            cursor.execute(vin_sql, vin_data)

        # Insert each output (vout)
        for vout_item in tx.get("vout", []):
            # 1) Insert script_pubkey
            spk_sql = """
                INSERT INTO script_pubkey (asm, hex, reqSigs, type)
                VALUES (?, ?, ?, ?);
            """
            spk_data = (
                vout_item.get("scriptPubKey", {}).get("asm"),
                vout_item.get("scriptPubKey", {}).get("hex"),
                vout_item.get("scriptPubKey", {}).get("reqSigs"),
                vout_item.get("scriptPubKey", {}).get("type")
            )
            cursor.execute(spk_sql, spk_data)
            script_pubkey_id = cursor.lastrowid

            # 2) Insert into vout
            vout_sql = """
                INSERT OR IGNORE INTO vout (
                  txid, value, n, script_pubkey_id
                ) VALUES (?, ?, ?, ?);
            """
            vout_data = (
                tx.get("txid"),
                vout_item.get("value"),
                vout_item.get("n"),
                script_pubkey_id
            )
            cursor.execute(vout_sql, vout_data)
            vout_id = cursor.lastrowid

            # 3) Addresses
            addresses = vout_item.get("scriptPubKey", {}).get("addresses", [])
            for addr in addresses:
                addr_sql = """
                    INSERT INTO vout_addresses (vout_id, address)
                    VALUES (?, ?);
                """
                cursor.execute(addr_sql, (vout_id, addr))

# ---------------------------------------------------------------------
# 4) MAIN LOOP (Periodically update)
# ---------------------------------------------------------------------
def main():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON;")  
    initialize_database(conn)

    while True:
        try:
            # 1) Get the best block hash
            best_block_hash = rpc_call("getbestblockhash")

            # 2) Get the block header to see the tip height
            best_block_header = rpc_call("getblockheader", [best_block_hash])
            tip_height = best_block_header["height"]

            # 3) Check local DB's last known block
            local_height = get_latest_db_block_height(conn)

            # 4) Fetch and store new blocks
            while local_height < tip_height:
                local_height += 1

                # getblockhash by height
                block_hash = rpc_call("getblockhash", [local_height])

                # getblock with verbosity=2
                block_data = rpc_call("getblock", [block_hash, 2])
                
                conn.execute("BEGIN;")
                store_block(conn, block_data)
                conn.commit()

            # 5) Sleep for a few minutes before checking again
            time.sleep(5 * 60)

        except Exception as e:
            print("Error in main loop:", e)
            time.sleep(30)

if __name__ == "__main__":
    main()
