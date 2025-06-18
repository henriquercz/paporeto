-- Script para corrigir políticas RLS
-- Autor: Capitão Henrique
-- Data: 2025-01-07
-- Versão: 1.0

-- =============================================
-- VERIFICAÇÃO INICIAL
-- =============================================

-- Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('likes_forum', 'comentarios_forum')
    AND schemaname = 'public';

-- Verificar políticas existentes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('likes_forum', 'comentarios_forum')
    AND schemaname = 'public';

-- =============================================
-- CORREÇÃO DAS POLÍTICAS RLS
-- =============================================

-- Remover políticas existentes (se houver problemas)
DROP POLICY IF EXISTS "Users can insert their own likes" ON public.likes_forum;
DROP POLICY IF EXISTS "Users can view all likes" ON public.likes_forum;
DROP POLICY IF EXISTS "Users can delete their own likes" ON public.likes_forum;
DROP POLICY IF EXISTS "Users can update their own likes" ON public.likes_forum;

DROP POLICY IF EXISTS "Users can insert their own comments" ON public.comentarios_forum;
DROP POLICY IF EXISTS "Users can view all comments" ON public.comentarios_forum;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comentarios_forum;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comentarios_forum;

-- Habilitar RLS nas tabelas
ALTER TABLE public.likes_forum ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios_forum ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLÍTICAS PARA LIKES_FORUM
-- =============================================

-- Política para SELECT (visualizar todos os likes)
CREATE POLICY "Users can view all likes" ON public.likes_forum
    FOR SELECT
    USING (true);

-- Política para INSERT (usuários podem inserir seus próprios likes)
CREATE POLICY "Users can insert their own likes" ON public.likes_forum
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        user_id IN (
            SELECT id FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Política para DELETE (usuários podem deletar seus próprios likes)
CREATE POLICY "Users can delete their own likes" ON public.likes_forum
    FOR DELETE
    USING (
        auth.uid() IS NOT NULL AND
        user_id IN (
            SELECT id FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

-- =============================================
-- POLÍTICAS PARA COMENTARIOS_FORUM
-- =============================================

-- Política para SELECT (visualizar todos os comentários)
CREATE POLICY "Users can view all comments" ON public.comentarios_forum
    FOR SELECT
    USING (true);

-- Política para INSERT (usuários podem inserir seus próprios comentários)
CREATE POLICY "Users can insert their own comments" ON public.comentarios_forum
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        user_id IN (
            SELECT id FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Política para UPDATE (usuários podem atualizar seus próprios comentários)
CREATE POLICY "Users can update their own comments" ON public.comentarios_forum
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL AND
        user_id IN (
            SELECT id FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        user_id IN (
            SELECT id FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Política para DELETE (usuários podem deletar seus próprios comentários)
CREATE POLICY "Users can delete their own comments" ON public.comentarios_forum
    FOR DELETE
    USING (
        auth.uid() IS NOT NULL AND
        user_id IN (
            SELECT id FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

-- =============================================
-- VERIFICAÇÃO FINAL
-- =============================================

-- Verificar se as políticas foram criadas corretamente
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('likes_forum', 'comentarios_forum')
    AND schemaname = 'public'
ORDER BY tablename, policyname;

-- Testar se um usuário específico pode inserir dados
-- (Execute este teste logado como um usuário)
/*
SELECT 
    auth.uid() as current_auth_id,
    u.id as user_internal_id,
    u.nome as user_name
FROM public.users u
WHERE u.auth_user_id = auth.uid();
*/

-- =============================================
-- COMANDOS DE LIMPEZA (SE NECESSÁRIO)
-- =============================================

-- Remover registros órfãos (likes sem usuário válido)
/*
DELETE FROM public.likes_forum 
WHERE user_id NOT IN (SELECT id FROM public.users);

DELETE FROM public.comentarios_forum 
WHERE user_id NOT IN (SELECT id FROM public.users);
*/

-- =============================================
-- GRANTS NECESSÁRIOS
-- =============================================

-- Garantir que usuários autenticados tenham acesso às tabelas
GRANT SELECT, INSERT, UPDATE, DELETE ON public.likes_forum TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comentarios_forum TO authenticated;
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.chats_forum TO authenticated;

-- Garantir acesso às sequences (para IDs auto-incrementais)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

COMMIT;