import { createClient } from '@supabase/supabase-js'

// 这里会自动读取你在 .env 文件里填写的那些密钥
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)