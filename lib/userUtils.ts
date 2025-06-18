/**
 * Utilitários para gerenciamento de usuários
 * Autor: Capitão Henrique
 * Data: 2025-01-07
 * Versão: 1.0
 */

import { supabase } from './supabase';

/**
 * Busca o ID interno do usuário na tabela users baseado no auth_user_id
 * @returns Promise<string | null> - ID do usuário ou null se não encontrado
 */
export const getCurrentUserId = async (): Promise<string | null> => {
  try {
    // Obter usuário autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Erro ao obter usuário autenticado:', authError);
      return null;
    }

    // Buscar ID interno na tabela users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();
    
    if (userError || !userData) {
      console.error('Erro ao buscar dados do usuário na tabela users:', userError);
      return null;
    }

    return userData.id;
  } catch (error) {
    console.error('Erro inesperado ao buscar ID do usuário:', error);
    return null;
  }
};

/**
 * Verifica se o usuário existe na tabela users
 * @param authUserId - ID do usuário autenticado
 * @returns Promise<boolean> - true se o usuário existe
 */
export const userExistsInDatabase = async (authUserId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single();
    
    return !error && !!data;
  } catch (error) {
    console.error('Erro ao verificar existência do usuário:', error);
    return false;
  }
};

/**
 * Busca dados completos do usuário
 * @returns Promise<any | null> - Dados do usuário ou null
 */
export const getCurrentUserData = async (): Promise<any | null> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return null;
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();
    
    if (userError || !userData) {
      return null;
    }

    return userData;
  } catch (error) {
    console.error('Erro ao buscar dados completos do usuário:', error);
    return null;
  }
};