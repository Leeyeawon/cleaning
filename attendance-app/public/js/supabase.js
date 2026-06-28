import { createClient } from "https://esm.sh/@supabase/supabase-js";

const SUPABASE_URL = "https://bntrxsvuknzibfojwtdy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_3alarvhlOgzSYYbRIl7Y5A_ZfiPqjx_";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;