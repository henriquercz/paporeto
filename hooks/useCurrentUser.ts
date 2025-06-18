/**
 * Hook personalizado para gerenciar o estado do usuário atual
 * Autor: Capitão Henrique
 * Data: 2025-01-07
 * Versão: 1.0
 */

import { useState, useEffect } from 'react';
import { getCurrentUserId, getCurrentUserData } from '@/lib/userUtils';
import { supabase } from '@/lib/supabase';

interface UseCurrentUserReturn {
  userId: string | null;
  userData: any | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
}

/**
 * Hook para gerenciar o estado do usuário atual
 * Retorna o ID interno do usuário (não o auth_user_id)
 */
export const useCurrentUser = (): UseCurrentUserReturn => {
  const [userId, setUserId] = useState<string | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar ID do usuário
      const currentUserId = await getCurrentUserId();
      setUserId(currentUserId);

      // Buscar dados completos do usuário
      if (currentUserId) {
        const currentUserData = await getCurrentUserData();
        setUserData(currentUserData);
      } else {
        setUserData(null);
      }
    } catch (err) {
      console.error('Erro ao buscar dados do usuário:', err);
      setError('Erro ao carregar dados do usuário');
      setUserId(null);
      setUserData(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  useEffect(() => {
    fetchUser();

    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await fetchUser();
        } else if (event === 'SIGNED_OUT') {
          setUserId(null);
          setUserData(null);
          setLoading(false);
          setError(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    userId,
    userData,
    loading,
    error,
    refreshUser,
  };
};

/**
 * Hook simplificado que retorna apenas o ID do usuário
 */
export const useUserId = (): { userId: string | null; loading: boolean } => {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const currentUserId = await getCurrentUserId();
        setUserId(currentUserId);
      } catch (error) {
        console.error('Erro ao buscar ID do usuário:', error);
        setUserId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserId();

    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const currentUserId = await getCurrentUserId();
          setUserId(currentUserId);
        } else if (event === 'SIGNED_OUT') {
          setUserId(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { userId, loading };
};