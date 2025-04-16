import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '~~/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'SQL query is required' });
    }

    // Clean the query by removing semicolons at the end
    const cleanQuery = query.replace(/;+$/, '');
    
    console.log('Executing SQL query:', cleanQuery);

    // Execute the SQL query using the Supabase admin client
    const { data, error } = await supabaseAdmin.rpc('execute_sql', { query: cleanQuery });

    if (error) {
      console.error('SQL execution error:', error);
      return res.status(500).json({ error: `Error executing query: ${error.message}` });
    }

    // The data is already in JSON format from json_agg
    return res.status(200).json({ data });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}` });
  }
} 