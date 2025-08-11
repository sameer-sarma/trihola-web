import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ifqkrxsgxunconjscebb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmcWtyeHNneHVuY29uanNjZWJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0Nzk1NDgsImV4cCI6MjA1OTA1NTU0OH0.sOIRLNBR-L-zwNFY0qmaSk8Ov4CTFav53CtR7gwxAKc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
