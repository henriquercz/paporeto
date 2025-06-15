import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type Database } from '@/types/database.types'; // Importa os tipos gerados

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Tipa o cliente Supabase com os tipos gerados
export const supabase = createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// As interfaces individuais foram removidas, pois agora são gerenciadas
// pelo arquivo database.types.ts e pela tipagem do cliente Supabase.
// Para usar os tipos de tabelas específicas, você pode fazer:
// import { Tables } from './database.types';
// type MinhaMeta = Tables<'metas'>;
// type NovoUsuario = Tables<'users'>['Insert'];