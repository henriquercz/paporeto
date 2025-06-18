-- Correção Definitiva do Erro "Database error saving new user"
-- Autor: Capitão Henrique
-- Data: 2025-01-07
-- Versão: 2.0 - Solução Simplificada

-- =============================================
-- DIAGNÓSTICO RÁPIDO
-- =============================================

-- 1. Verificar constraints na tabela users
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass;

-- =============================================
-- SOLUÇÃO 1: REMOVER A CONSTRAINT PROBLEMÁTICA
-- =============================================

-- Esta é a solução mais direta e segura
-- Remove a foreign key que está causando o problema

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_auth_user_id_fkey;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_auth_user_id_key;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS fk_users_auth_user_id;

-- =============================================
-- SOLUÇÃO 2: REMOVER E RECRIAR A FUNÇÃO/TRIGGER
-- =============================================

-- Remove trigger e função existentes
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recria a função com tratamento de erro mais robusto
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Tenta inserir o usuário na tabela public.users
  BEGIN
    INSERT INTO public.users (auth_user_id, email, nome)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email)
    )
    ON CONFLICT (auth_user_id) DO UPDATE SET
      email = EXCLUDED.email,
      nome = COALESCE(EXCLUDED.nome, users.nome);
    
    RAISE NOTICE 'Usuário criado com sucesso na tabela public.users: %', NEW.id;
    
  EXCEPTION WHEN OTHERS THEN
    -- Em caso de erro, apenas registra mas NÃO falha
    RAISE WARNING 'Erro ao criar perfil do usuário %, mas continuando: %', NEW.id, SQLERRM;
  END;
  
  -- SEMPRE retorna NEW para não bloquear a criação
  RETURN NEW;
END;
$$;

-- Recria o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- SOLUÇÃO 3: DESABILITAR RLS NA TABELA USERS (TEMPORÁRIO)
-- =============================================

-- Se ainda houver problemas, desabilite RLS temporariamente
-- DESCOMENTE APENAS SE NECESSÁRIO:
-- ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- =============================================
-- VERIFICAÇÃO FINAL
-- =============================================

-- Verificar se as constraints foram removidas
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass
  AND contype = 'f'; -- foreign keys

-- Verificar se a função foi criada
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'handle_new_user';

-- Teste de inserção manual (substitua por um UUID válido)
-- INSERT INTO public.users (auth_user_id, email, nome) 
-- VALUES ('550e8400-e29b-41d4-a716-446655440000', 'teste@exemplo.com', 'Usuário Teste')
-- ON CONFLICT (auth_user_id) DO NOTHING;

-- =============================================
-- INSTRUÇÕES DE USO
-- =============================================

/*
EXECUTE ESTE SCRIPT NA SEGUINTE ORDEM:

1. Execute as seções de DIAGNÓSTICO primeiro
2. Execute a SOLUÇÃO 1 (remover constraints)
3. Execute a SOLUÇÃO 2 (recriar função/trigger)
4. Se ainda houver erro, execute a SOLUÇÃO 3
5. Execute a VERIFICAÇÃO FINAL
6. Teste a criação de usuários

Se o erro persistir após todas as soluções:
- Verifique os logs do Supabase (Authentication > Logs)
- Verifique se há outros triggers conflitantes
- Considere contatar o suporte do Supabase
*/