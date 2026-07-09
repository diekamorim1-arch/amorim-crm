// Cliente Supabase do frontend — usa a chave publicável (sb_publishable_...),
// segura pra expor no bundle do navegador (nunca a service-role key, que só
// existe no backend). Quem de fato isola os dados por tenant a partir daqui
// é o Row Level Security no Postgres, não o sigilo desta chave.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar definidos em .env.local",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
