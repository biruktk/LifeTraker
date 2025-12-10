import { createClient } from '@supabase/supabase-js'

// --- SUPABASE CONFIGURATION ---
const supabaseUrl = 'https://lbchnwqnhuxqqmchezin.supabase.co';
const supabaseKey = 'sb_publishable_V66c3nkvGr8265KhMu0XpQ_tqbSdQfT';
// ------------------------------

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helpers for the UI to guide the user
const projectId = supabaseUrl.split('//')[1].split('.')[0];
export const SUPABASE_STORAGE_URL = `https://supabase.com/dashboard/project/${projectId}/storage/buckets`;