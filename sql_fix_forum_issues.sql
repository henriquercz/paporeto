-- Script para corrigir problemas do fórum (likes e comentários)
-- Autor: Capitão Henrique
-- Data: 2025-01-07
-- Versão: 1.0

-- 1. Verificar se há registros órfãos em likes_forum
SELECT 
    lf.id,
    lf.user_id,
    lf.post_id,
    u.id as user_exists,
    cf.id as post_exists
FROM likes_forum lf
LEFT JOIN users u ON lf.user_id = u.id
LEFT JOIN chats_forum cf ON lf.post_id = cf.id
WHERE u.id IS NULL OR cf.id IS NULL;

-- 2. Verificar se há registros órfãos em comentarios_forum
SELECT 
    c.id,
    c.user_id,
    c.post_id,
    u.id as user_exists,
    cf.id as post_exists
FROM comentarios_forum c
LEFT JOIN users u ON c.user_id = u.id
LEFT JOIN chats_forum cf ON c.post_id = cf.id
WHERE u.id IS NULL OR cf.id IS NULL;

-- 3. Limpar registros órfãos em likes_forum
DELETE FROM likes_forum 
WHERE user_id NOT IN (SELECT id FROM users)
   OR post_id NOT IN (SELECT id FROM chats_forum);

-- 4. Limpar registros órfãos em comentarios_forum
DELETE FROM comentarios_forum 
WHERE user_id NOT IN (SELECT id FROM users)
   OR post_id NOT IN (SELECT id FROM chats_forum);

-- 5. Verificar políticas RLS das tabelas
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
ORDER BY tablename, policyname;

-- 6. Recriar políticas RLS se necessário
-- Para likes_forum
DROP POLICY IF EXISTS "Usuários podem ver todos os likes" ON likes_forum;
DROP POLICY IF EXISTS "Usuários podem gerenciar seus próprios likes" ON likes_forum;

CREATE POLICY "Usuários podem ver todos os likes" ON likes_forum
    FOR SELECT USING (true);

CREATE POLICY "Usuários podem gerenciar seus próprios likes" ON likes_forum
    FOR ALL USING (auth.uid()::text IN (
        SELECT auth_user_id FROM users WHERE id = likes_forum.user_id
    ));

-- Para comentarios_forum
DROP POLICY IF EXISTS "Usuários podem ver todos os comentários" ON comentarios_forum;
DROP POLICY IF EXISTS "Usuários podem gerenciar seus próprios comentários" ON comentarios_forum;

CREATE POLICY "Usuários podem ver todos os comentários" ON comentarios_forum
    FOR SELECT USING (true);

CREATE POLICY "Usuários podem gerenciar seus próprios comentários" ON comentarios_forum
    FOR ALL USING (auth.uid()::text IN (
        SELECT auth_user_id FROM users WHERE id = comentarios_forum.user_id
    ));

-- 7. Verificar se as foreign keys estão corretas
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('likes_forum', 'comentarios_forum');

-- 8. Verificar estrutura das tabelas
\d+ likes_forum;
\d+ comentarios_forum;
\d+ users;
\d+ chats_forum;

-- 9. Testar inserção de like (substitua os IDs pelos corretos)
-- INSERT INTO likes_forum (user_id, post_id) 
-- VALUES ('87455bb0-36e4-4c06-b8ca-73fb374fb80a', 'ID_DO_POST_EXISTENTE');

-- 10. Testar inserção de comentário (substitua os IDs pelos corretos)
-- INSERT INTO comentarios_forum (user_id, post_id, conteudo) 
-- VALUES ('87455bb0-36e4-4c06-b8ca-73fb374fb80a', 'ID_DO_POST_EXISTENTE', 'Teste de comentário');

-- 11. Verificar se o usuário específico existe
SELECT id, nome, email, auth_user_id 
FROM users 
WHERE auth_user_id = 'f8da550d-de1c-4b48-b53e-927984fdd2a2';

-- 12. Verificar posts existentes
SELECT id, titulo, post_type, created_at 
FROM chats_forum 
WHERE is_deleted = false 
ORDER BY created_at DESC 
LIMIT 5;