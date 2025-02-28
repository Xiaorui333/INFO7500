import requests
import json
import os

# Load Chainstack RPC credentials from environment variables
RPC_URL = os.environ.get("CHAINSTACK_RPC_URL")
RPC_USER = os.environ.get("CHAINSTACK_RPC_USER", "")
RPC_PASSWORD = os.environ.get("CHAINSTACK_RPC_PASSWORD", "")

def getblock(num: int):

    # Step 1: Get block hash for the given height
    payload_hash = {
        "method": "getblockhash",
        "params": [num],
        "jsonrpc": "2.0",
        "id": 0
    }
    headers = {"Content-Type": "application/json"}

    response_hash = requests.post(
        RPC_URL,
        headers=headers,
        data=json.dumps(payload_hash),
        auth=(RPC_USER, RPC_PASSWORD) if RPC_USER else None,  # Handle cases with no authentication
        timeout=30,
    )
    response_hash.raise_for_status()
    block_hash = response_hash.json().get("result")

    # Step 2: Get full block details using the block hash
    payload_block = {
        "method": "getblock",
        "params": [block_hash, 2],  
        "jsonrpc": "2.0",
        "id": 1
    }

    response_block = requests.post(
        RPC_URL,
        headers=headers,
        data=json.dumps(payload_block),
        auth=(RPC_USER, RPC_PASSWORD) if RPC_USER else None,
        timeout=30,
    )
    response_block.raise_for_status()

    return response_block.json()["result"]  

if __name__ == "__main__":
    block_number = 9999
    block_data = getblock(block_number)
    print(json.dumps(block_data, indent=4))
