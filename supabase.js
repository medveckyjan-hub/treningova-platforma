import { createClient } from '@supabase/supabase-js'

// Pripojenie na Supabase projekt „treningova-platforma".
const SUPABASE_URL = 'https://zeynjmgfsqdkpjkllybn.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_f1KP-jxS1vhPXNtoztfikg_yx7Hs4Ez'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
