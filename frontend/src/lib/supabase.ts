import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gzulcagpylsoeelaxdgv.supabase.co';
const supabaseAnonKey = 'sb_publishable_6ZoEbLK_Fzpd4AhcrQMGSA_ka4JWL7X';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

