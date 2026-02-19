import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// FORCE OVERRIDE: Using your specific project credentials
const SUPABASE_URL = "https://zikbiesawrowlkhvrbmz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inppa2JpZXNhd3Jvd2xraHZyYm16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzY4MjMsImV4cCI6MjA4Njk1MjgyM30.h6d5Tk2kKY6r7oOEDdAZWVcS28MJWZBvCohLjOJkYmc";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
