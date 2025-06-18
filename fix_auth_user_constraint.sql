-- Diagnóstico e Correção do Erro "Database error saving new user"
-- Autor: Assistente AI
-- Data: 2025-01-07

-- =============================================
-- DIAGNÓSTICO DO PROBLEMA
-- =============================================

-- 1. Verificar a constraint que está causando o problema
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'users'
  AND kcu.column_name = 'auth_user_id';

-- 2. Verificar se há triggers na tabela auth.users
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
  AND event_object_schema = 'auth';

-- 3. Verificar se há funções relacionadas a usuários
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND (routine_name LIKE '%user%' OR routine_name LIKE '%auth%')
  AND routine_type = 'FUNCTION';

-- =============================================
-- POSSÍVEL SOLUÇÃO 1: REMOVER A CONSTRAINT PROBLEMÁTICA
-- =============================================

-- ATENÇÃO: Execute apenas se você tiver certeza de que a constraint
-- está causando o problema e não é necessária para a integridade dos dados

-- Remover a foreign key constraint (DESCOMENTE SE NECESSÁRIO)
-- ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_auth_user_id_fkey;

-- =============================================
-- POSSÍVEL SOLUÇÃO 2: CRIAR UM TRIGGER CORRETO
-- =============================================

-- Se você quiser manter a sincronização entre auth.users e public.users,
-- mas de forma que não bloqueie a criação de usuários:

-- Função para criar perfil de usuário automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (auth_user_id, email, nome)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email)
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro mas não bloqueia a criação do usuário
    RAISE WARNING 'Erro ao criar perfil do usuário: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Trigger para executar a função quando um usuário é criado
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- VERIFICAÇÃO FINAL
-- =============================================

-- Verificar se o trigger foi criado corretamente
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
  AND event_object_schema = 'auth'
  AND trigger_name = 'on_auth_user_created';

-- Verificar se a função existe
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'handle_new_user';