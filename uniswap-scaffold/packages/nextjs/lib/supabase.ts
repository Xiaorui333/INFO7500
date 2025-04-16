import { createClient } from '@supabase/supabase-js';

// 创建 Supabase 客户端实例
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// 创建公共客户端（使用匿名密钥）
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 创建服务角色客户端（使用服务角色密钥，仅在服务器端使用）
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// 执行 SQL 查询的辅助函数
export async function executeSQLQuery(query: string) {
  try {
    // 使用 supabaseAdmin 执行 SQL 查询
    const { data, error } = await supabaseAdmin.rpc('execute_sql', { query });
    
    if (error) {
      console.error('Error executing SQL query:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Failed to execute SQL query:', error);
    throw error;
  }
} 