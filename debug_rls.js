/**
 * Script de Debug para RLS (Row Level Security)
 * Autor: Capitão Henrique
 * Data: 2025-01-07
 * Versão: 1.0
 */

import { supabase } from './lib/supabase';
import { getCurrentUserId } from './lib/userUtils';

/**
 * Função para debugar problemas de RLS
 */
export const debugRLS = async () => {
  console.log('=== DEBUG RLS INICIADO ===' );
  
  try {
    // 1. Verificar autenticação
    console.log('1. Verificando autenticação...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Erro de autenticação:', authError);
      return;
    }
    
    if (!user) {
      console.error('Usuário não autenticado');
      return;
    }
    
    console.log('✅ Usuário autenticado:', {
      id: user.id,
      email: user.email,
      role: user.role
    });
    
    // 2. Verificar se usuário existe na tabela users
    console.log('2. Verificando usuário na tabela users...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, auth_user_id, nome')
      .eq('auth_user_id', user.id)
      .single();
    
    if (userError) {
      console.error('Erro ao buscar usuário na tabela users:', userError);
      return;
    }
    
    console.log('✅ Usuário encontrado na tabela users:', userData);
    
    // 3. Testar getCurrentUserId
    console.log('3. Testando getCurrentUserId...');
    const currentUserId = await getCurrentUserId();
    console.log('✅ getCurrentUserId retornou:', currentUserId);
    
    // 4. Verificar sessão do Supabase
    console.log('4. Verificando sessão do Supabase...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Erro ao obter sessão:', sessionError);
      return;
    }
    
    console.log('✅ Sessão ativa:', {
      access_token: session?.access_token ? 'Presente' : 'Ausente',
      refresh_token: session?.refresh_token ? 'Presente' : 'Ausente',
      expires_at: session?.expires_at
    });
    
    // 5. Buscar um post para testar
    console.log('5. Buscando post para teste...');
    const { data: posts, error: postsError } = await supabase
      .from('chats_forum')
      .select('id')
      .limit(1);
    
    if (postsError || !posts || posts.length === 0) {
      console.error('Erro ao buscar posts ou nenhum post encontrado:', postsError);
      return;
    }
    
    const testPostId = posts[0].id;
    console.log('✅ Post para teste:', testPostId);
    
    // 6. Testar inserção de like
    console.log('6. Testando inserção de like...');
    const { data: likeData, error: likeError } = await supabase
      .from('likes_forum')
      .insert({
        post_id: testPostId,
        user_id: currentUserId
      })
      .select();
    
    if (likeError) {
      console.error('❌ Erro ao inserir like:', likeError);
      console.error('Detalhes do erro:', {
        code: likeError.code,
        message: likeError.message,
        details: likeError.details,
        hint: likeError.hint
      });
    } else {
      console.log('✅ Like inserido com sucesso:', likeData);
      
      // Limpar o like de teste
      await supabase
        .from('likes_forum')
        .delete()
        .eq('post_id', testPostId)
        .eq('user_id', currentUserId);
      console.log('✅ Like de teste removido');
    }
    
    // 7. Testar inserção de comentário
    console.log('7. Testando inserção de comentário...');
    const { data: commentData, error: commentError } = await supabase
      .from('comentarios_forum')
      .insert({
        post_id: testPostId,
        user_id: currentUserId,
        conteudo: 'Comentário de teste - DEBUG RLS'
      })
      .select();
    
    if (commentError) {
      console.error('❌ Erro ao inserir comentário:', commentError);
      console.error('Detalhes do erro:', {
        code: commentError.code,
        message: commentError.message,
        details: commentError.details,
        hint: commentError.hint
      });
    } else {
      console.log('✅ Comentário inserido com sucesso:', commentData);
      
      // Limpar o comentário de teste
      await supabase
        .from('comentarios_forum')
        .delete()
        .eq('id', commentData[0].id);
      console.log('✅ Comentário de teste removido');
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado durante debug:', error);
  }
  
  console.log('=== DEBUG RLS FINALIZADO ===');
};

/**
 * Função para verificar políticas RLS específicas
 */
export const checkRLSPolicies = async () => {
  console.log('=== VERIFICANDO POLÍTICAS RLS ===');
  
  try {
    // Verificar se RLS está habilitado nas tabelas
    const tables = ['likes_forum', 'comentarios_forum'];
    
    for (const table of tables) {
      console.log(`Verificando tabela: ${table}`);
      
      // Tentar uma operação simples para verificar se RLS está funcionando
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.error(`❌ Erro ao acessar ${table}:`, error);
      } else {
        console.log(`✅ Acesso à tabela ${table} funcionando`);
      }
    }
  } catch (error) {
    console.error('❌ Erro ao verificar políticas RLS:', error);
  }
  
  console.log('=== VERIFICAÇÃO RLS FINALIZADA ===');
};