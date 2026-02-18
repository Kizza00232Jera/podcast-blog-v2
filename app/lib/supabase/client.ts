//supabase client designed for the browser
import { createBrowserClient } from '@supabase/ssr'


//it reads my url and public key
//it exports function so that any client component can call it to get ready to use supabase instance
//it will be used where users interact - login, search...
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
