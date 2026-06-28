import { createClient } from "https://esm.sh/@supabase/supabase-js";

const SUPABASE_URL = "https://bntrxsvuknzibfojwtdy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_3alarvhlOgzSYYbRIl7Y5A_ZfiPqjx_";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabase = createClient(
  "https://프로젝트URL.supabase.co",
  "공개키"
);

export default supabase;

import supabase from "./supabase.js";

// 로그인 코드 작성