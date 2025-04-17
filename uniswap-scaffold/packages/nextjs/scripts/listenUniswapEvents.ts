import { createClient } from '@supabase/supabase-js';
import {
  createPublicClient,
  http,
  Log,
  decodeEventLog,
  Abi,
  GetBlockReturnType,
  GetContractEventsParameters,
} from 'viem';
import { sepolia } from 'viem/chains';
import dotenv from 'dotenv';
import UniswapV2PairABI from '../abis/UniswapV2Pair.json';

// load env
dotenv.config({ path: '.env.local' });

// supabase svc-role client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// viem public client
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL),
});

// the on-chain ABI
const PAIR_ABI = UniswapV2PairABI.abi as Abi;

// your list of pairs
const PAIR_ADDRESSES = [
  process.env.NEXT_PUBLIC_TOKENA_TOKENB_PAIR as `0x${string}`,
  // add more if needed
];

// will hold token0/token1 per pair
const pairMetadata: Record<string, { token0: string; token1: string }> = {};

/** fetch token0 and token1 for each pair once at startup */
async function loadPairMetadata() {
  for (const pair of PAIR_ADDRESSES) {
    if (!pair) continue;
    try {
      const [t0, t1] = await Promise.all([
        publicClient.readContract({ address: pair, abi: PAIR_ABI, functionName: 'token0' }),
        publicClient.readContract({ address: pair, abi: PAIR_ABI, functionName: 'token1' }),
      ]);
      pairMetadata[pair] = {
        token0: String(t0),
        token1: String(t1),
      };
      console.log(`Loaded metadata for ${pair}: token0=${t0}, token1=${t1}`);
    } catch (e) {
      console.error(`Error loading token0/token1 for ${pair}:`, e);
    }
  }
}

// 处理BigInt的JSON replacer函数
function bigintReplacer(key: string, value: any) {
  return typeof value === 'bigint' ? value.toString() : value;
}

async function handleEvent(event: Log, eventName: string, pairAddress: string) {
  try {
    console.log(`🔍 Processing ${eventName} event from ${pairAddress} at block ${event.blockNumber}`);
    
    const blockNumber = event.blockNumber;
    if (!blockNumber) {
      console.log(`⚠️ Skipping event: No block number`);
      return; // 忽略没有 blockNumber 的事件
    }

    const block = await publicClient.getBlock({ blockNumber });
    if (!block || block.timestamp === null) {
      console.log(`⚠️ Skipping event: Failed to fetch block or missing timestamp`);
      throw new Error('Failed to fetch block or missing timestamp');
    }

    const timestamp = block.timestamp as bigint;
    
    console.log(`📝 Decoding event data...`);
    const decoded = decodeEventLog({
      abi: PAIR_ABI,
      data: event.data,
      topics: event.topics,
    });
    console.log(`✅ Event decoded successfully:`, JSON.stringify(decoded, bigintReplacer, 2));

    const meta = pairMetadata[pairAddress] || { token0: null, token1: null };

    // 把 decoded.args 里的 BigInt 转成 string
    const decodedArgsStringified = JSON.parse(JSON.stringify(decoded.args, bigintReplacer));
    console.log(`🔄 Processed args:`, JSON.stringify(decodedArgsStringified, null, 2));

    const rec = {
      block_number: Number(event.blockNumber),
      transaction_hash: event.transactionHash,
      event_name: eventName,
      pair_address: pairAddress,
      token0_address: meta.token0,
      token1_address: meta.token1,
      timestamp: new Date(Number(timestamp) * 1000).toISOString(),
      data_json: decodedArgsStringified,
    };

    console.log(`💾 Inserting event data into database...`);
    const { error } = await supabase.from('uniswap_events').insert([rec]);
    if (error) {
      console.error(`❌ supabase insert error for ${eventName}@${pairAddress}:`, error);
    } else {
      console.log(`✅ inserted ${eventName}@${pairAddress} block ${event.blockNumber}`);
    }
  } catch (err) {
    console.error(`❌ handleEvent error for ${eventName}@${pairAddress}:`, err);
    // 添加更详细的错误信息
    if (err instanceof Error) {
      console.error(`Error details: ${err.message}`);
      console.error(`Error stack: ${err.stack}`);
    }
  }
}

async function startEventListening() {
  console.log('▶️ Starting live event listening');
  for (const pair of PAIR_ADDRESSES) {
    if (!pair) continue;
    
    const eventTypes = ['Swap', 'Mint', 'Burn'] as const;
    
    for (const evName of eventTypes) {
      publicClient.watchContractEvent({
        address: pair,
        abi: PAIR_ABI,
        eventName: evName,
        onLogs: logs => logs.forEach(l => handleEvent(l, evName, pair)),
      });
      console.log(`  • watching ${evName} on ${pair}`);
    }
  }
}

async function fetchHistoricalEvents() {
  console.log('▶️ Fetching historical events (last 1,000 blocks)');
  const currentBlock = await publicClient.getBlockNumber();
  const fromBlock = currentBlock - BigInt(1000);

  for (const pair of PAIR_ADDRESSES) {
    if (!pair) continue;
    console.log(`  • ${pair}: blocks ${fromBlock}–${currentBlock}`);
    try {
      const params: GetContractEventsParameters = {
        address: pair,
        abi: PAIR_ABI,
        eventName: 'Swap' as const,
        fromBlock,
        toBlock: currentBlock,
      };
      
      const swapEvents = await publicClient.getContractEvents(params);
      for (const ev of swapEvents) await handleEvent(ev, 'Swap', pair);
      
      params.eventName = 'Mint' as const;
      const mintEvents = await publicClient.getContractEvents(params);
      for (const ev of mintEvents) await handleEvent(ev, 'Mint', pair);
      
      params.eventName = 'Burn' as const;
      const burnEvents = await publicClient.getContractEvents(params);
      for (const ev of burnEvents) await handleEvent(ev, 'Burn', pair);
      
      console.log(`    ✓ done ${pair}`);
    } catch (err) {
      console.error(`    ❌ historical fetch error ${pair}:`, err);
    }
  }
}

async function main() {
  await loadPairMetadata();
  await fetchHistoricalEvents();
  await startEventListening();
}

main().catch(console.error);
