import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gpxzykdevxgoqcrbcobg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdweHp5a2Rldnhnb3FjcmJjb2JnIiwicm9sZUE6ImFub24iLCJpYXQiOjE3NTIyNTM2NDgsImV4cCI6MjA2NzgyOTY0OH0.JLz9z8i6YXMfnEKk6AM3VLi32uM35sIDqm6CQYdxACw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});