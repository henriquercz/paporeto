import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, RefreshControl, FlatList, Image } from 'react-native';

import { Users, MessageCircle, Heart, Plus, Calendar, AlertCircle } from 'lucide-react-native';
import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/Colors';
import { Card } from '@/components/ui/Card';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase'; // Importar supabase client
import { Database } from '@/lib/database.types'; // Importar tipos gerados
import { Alert, ActivityIndicator } from 'react-native'; // Importar Alert e ActivityIndicator
import CriarTopicoModal from '@/components/modals/CriarTopicoModal'; // Importar o novo modal
import MarcarEncontroModal from '@/components/modals/MarcarEncontroModal'; // Importar o modal de marcar encontro

const getInitials = (name: string | undefined | null): string => {
  if (!name || name.trim() === '') {
    return '';
  }
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return '';
  }
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
};

// Alias para o tipo de um tópico do fórum
type ChatForumRow = Database['public']['Tables']['chats_forum']['Row'] & {
  users: Database['public']['Tables']['users']['Row'] | null; // Para dados do autor
};

export default function ComunidadeScreen() {
  const [topicos, setTopicos] = useState<ChatForumRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isCriarTopicoModalVisible, setIsCriarTopicoModalVisible] = useState(false);
  const [isMarcarEncontroModalVisible, setIsMarcarEncontroModalVisible] = useState(false);

  const fetchTopicos = async () => {
    if (!refreshing) setLoading(true);
    try {
      // Corrigido: buscar 'nome' em vez de 'nome_completo' da tabela users.
      const response = await supabase
        .from('chats_forum')
        .select('*, users(id, nome, avatar_url)') // Corrigido para 'nome'
        .order('created_at', { ascending: false });

      const { data, error } = response;

      if (error) {
        console.error('Erro ao buscar tópicos com dados do autor:', JSON.stringify(error, null, 2));
        // Verifica se o erro pode ser relacionado a RLS na tabela 'users'
        // (Supabase pode não retornar dados relacionados se a RLS da tabela 'users' bloquear o acesso)
        Alert.alert(
          'Erro ao Carregar Tópicos',
          'Não foi possível carregar os dados completos dos tópicos. Isso pode ser devido às políticas de segurança (RLS) na tabela de usuários. Verifique o console para mais detalhes.'
        );
        // Tenta carregar os tópicos sem os dados do autor como fallback
        const fallbackResponse = await supabase.from('chats_forum').select('*').order('created_at', { ascending: false });
        if (fallbackResponse.data) {
            setTopicos(fallbackResponse.data.map(item => ({ ...item, users: null })) as ChatForumRow[]);
        } else {
            setTopicos([]);
        }
      } else if (data) {
        // Processa os dados para garantir que 'users' seja null se não for um objeto de usuário válido
        const processedData = data.map(item => {
          const usersData = item.users as any; // Cast temporário para inspecionar
          // Verifica se 'usersData' é um objeto e possui uma propriedade 'id' (indicativo de dados de usuário válidos)
          // e não é um objeto de erro do Supabase (que não teria 'id' e poderia ter 'message' ou 'code')
          if (usersData && typeof usersData === 'object' && 'id' in usersData && !('message' in usersData && 'code' in usersData)) {
            return { ...item, users: usersData as Database['public']['Tables']['users']['Row'] };
          }
          return { ...item, users: null }; // Garante que users é null se não for válido
        });
        setTopicos(processedData as ChatForumRow[]);
      }
    } catch (e: any) {
      console.error('Erro inesperado ao buscar tópicos:', e);
      Alert.alert('Erro Inesperado', `Ocorreu um erro: ${e.message}`);
      setTopicos([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTopicos();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTopicos();
  };

  const handleOpenCriarTopicoModal = () => {
    setIsCriarTopicoModalVisible(true);
  };

  const handleCloseCriarTopicoModal = () => {
    setIsCriarTopicoModalVisible(false);
  };

  const handleTopicCreated = async (postType: any) => {
    fetchTopicos(); // Atualiza a lista de tópicos
    setIsCriarTopicoModalVisible(false); // Fecha o modal

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const hojeInicio = startOfDay(new Date()).toISOString();
      const hojeFim = endOfDay(new Date()).toISOString();

      const { data: pontoExistente, error: erroPonto } = await supabase
        .from('pontos')
        .select('id')
        .eq('user_id', user.id)
        .eq('motivo', 'comunidade_post')
        .gte('data', hojeInicio)
        .lte('data', hojeFim)
        .limit(1);

      if (erroPonto) {
        console.error('Erro ao verificar ponto existente (comunidade):', erroPonto);
      }

      if (!pontoExistente || pontoExistente.length === 0) {
        const { error: erroInsercaoPonto } = await supabase
          .from('pontos')
          .insert({ user_id: user.id, quantidade: 1, motivo: 'comunidade_post' });
        
        if (erroInsercaoPonto) {
          console.error('Erro ao inserir ponto (comunidade):', erroInsercaoPonto);
        } else {
          console.log('Ponto por post na comunidade adicionado!');
        }
      }
    } catch (error) {
      console.error('Erro ao processar pontuação por post na comunidade:', error);
    }
  };

  const handleOpenMarcarEncontroModal = () => {
    setIsCriarTopicoModalVisible(false); // Garante que o modal de criar tópico feche
    setIsMarcarEncontroModalVisible(true);
  };

  const handleCloseMarcarEncontroModal = () => {
    setIsMarcarEncontroModalVisible(false);
  };

  const formatarTempo = (dataString: string | null) => {
    if (!dataString) return '';
    try {
      const data = parseISO(dataString);
      const agora = new Date();
      const diferenca = agora.getTime() - data.getTime();
      
      const minutos = Math.floor(diferenca / (1000 * 60));
      const horas = Math.floor(diferenca / (1000 * 60 * 60));
      const dias = Math.floor(diferenca / (1000 * 60 * 60 * 24));

      if (minutos < 1) return 'agora';
      if (minutos < 60) return `${minutos}min`;
      if (horas < 24) return `${horas}h`;
      return `${dias}d`;
    } catch (e) {
      console.error('Erro ao formatar data:', e);
      return '';
    }
  };

  if (loading && topicos.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={Colors.primary.accent} />
        <Text style={styles.loadingText}>Carregando tópicos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: Colors.primary.dark }]}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Comunidade</Text>
            <View style={styles.membersCount}>
              <Users size={20} color={Colors.neutral.white} strokeWidth={2} />
              <Text style={styles.membersText}>{topicos.length} {topicos.length === 1 ? 'tópico' : 'tópicos'}</Text> 
            </View>
          </View>
        </SafeAreaView>
      </View>
      
      <FlatList
          style={styles.content}
          contentContainerStyle={styles.topicsContainer}
          data={topicos}
          keyExtractor={(item: ChatForumRow) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={() => (
            !loading && (
              <View style={styles.emptyContainer}>
                <AlertCircle size={48} color={Colors.neutral.gray400} />
                <Text style={styles.emptyText}>Nenhum tópico encontrado.</Text>
                <Text style={styles.emptySubText}>Que tal criar o primeiro?</Text>
              </View>
            )
          )}
          renderItem={({ item }: { item: ChatForumRow }) => (
            <Card style={styles.topicCard}>
              <View style={styles.topicHeader}>
                <View style={styles.authorInfo}>
                  {item.users?.avatar_url ? (
                    <Image source={{ uri: item.users.avatar_url }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      {item.users?.nome ? (
                        <Text style={styles.avatarFallbackText}>{getInitials(item.users.nome)}</Text>
                      ) : (
                        <Users size={20} color={Colors.neutral.gray400} strokeWidth={2} />
                      )}
                    </View>
                  )}
                  <View style={styles.authorDetails}>
                    <Text style={styles.authorName}>
                      {item.users?.nome || (item.user_id ? 'Carregando...' : 'Autor Desconhecido')}
                    </Text>
                    <Text style={styles.postTime}>{formatarTempo(item.created_at)}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.topicContent}>
                <Text style={styles.topicTitle}>{item.topic || 'Sem título'}</Text>
                <Text style={styles.topicMessage} numberOfLines={3}>{item.content || 'Sem conteúdo.'}</Text>
              </View>

              <View style={styles.topicFooter}>
                <TouchableOpacity style={styles.readMoreButton}>
                  <Text style={styles.readMoreText}>Ler mais</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}
        />

      <FloatingActionButton 
        icon={<Plus size={28} color={Colors.neutral.white} strokeWidth={3}/>}
        onPress={handleOpenCriarTopicoModal} 
      />

      <CriarTopicoModal 
        isVisible={isCriarTopicoModalVisible}
        onClose={handleCloseCriarTopicoModal}
        onTopicCreated={handleTopicCreated}
        onOpenMarcarEncontroModal={handleOpenMarcarEncontroModal} // Nova prop
      />

      <MarcarEncontroModal
        isVisible={isMarcarEncontroModalVisible}
        onClose={handleCloseMarcarEncontroModal}
        // onEncontroMarcado={...} // TODO: Implementar callback quando o encontro for marcado
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.gray100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md, 
    fontSize: Fonts.sizes.body,
    fontWeight: Fonts.weights.regular,
    color: Colors.neutral.gray800,
  },
  header: {
    paddingTop: Spacing.xl, 
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: BorderRadius.lg,
    borderBottomRightRadius: BorderRadius.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md, 
  },
  title: {
    fontSize: Fonts.sizes.title,
    fontWeight: Fonts.weights.bold,
    color: Colors.neutral.white,
  },
  membersCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  membersText: {
    fontSize: Fonts.sizes.small,
    fontWeight: Fonts.weights.regular,
    color: Colors.neutral.white,
    marginLeft: Spacing.sm,
  },
  content: {
    flex: 1,
  },
  topicsContainer: {
    padding: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl * 2,
  },
  emptyText: {
    fontSize: Fonts.sizes.subtitle,
    fontWeight: Fonts.weights.medium,
    color: Colors.neutral.gray800,
    marginTop: Spacing.md,
  },
  emptySubText: {
    fontSize: Fonts.sizes.body,
    fontWeight: Fonts.weights.regular,
    color: Colors.neutral.gray400,
    marginTop: Spacing.sm,
  },
  topicCard: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.neutral.white,
  },
  topicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutral.gray400, 
    marginRight: Spacing.md,
  },
  authorDetails: {
    justifyContent: 'center',
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutral.gray100, // Usar uma cor de placeholder do tema
    marginRight: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: Spacing.sm,
  },
  avatarFallbackText: {
    color: Colors.neutral.gray800,
    fontSize: Fonts.sizes.small,
    fontWeight: Fonts.weights.bold,
  },
  authorName: {
    fontSize: Fonts.sizes.subtitle,
    fontWeight: Fonts.weights.medium,
    color: Colors.neutral.gray800,
  },
  postTime: {
    fontSize: Fonts.sizes.small,
    fontWeight: Fonts.weights.regular,
    color: Colors.neutral.gray400,
  },
  topicContent: {
    marginBottom: Spacing.md,
  },
  topicTitle: {
    fontSize: Fonts.sizes.subtitle,
    fontWeight: Fonts.weights.bold,
    color: Colors.neutral.gray800,
    marginBottom: Spacing.sm,
  },
  topicMessage: {
    fontSize: Fonts.sizes.body,
    fontWeight: Fonts.weights.regular,
    color: Colors.neutral.gray400,
    lineHeight: Fonts.sizes.body * 1.5,
  },
  topicFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.neutral.gray100,
    paddingTop: Spacing.sm,
  },
  readMoreButton: {
    paddingVertical: Spacing.sm, 
    paddingHorizontal: Spacing.md, 
  },
  readMoreText: {
    fontSize: Fonts.sizes.body, 
    fontWeight: Fonts.weights.medium, 
    color: Colors.primary.accent,
  },
  section: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Fonts.sizes.subtitle,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary.dark,
    marginBottom: Spacing.md,
  },
  eventCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary.accent,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  eventTitle: {
    fontSize: Fonts.sizes.body,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary.dark,
  },
  eventDate: {
    fontSize: Fonts.sizes.small,
    color: Colors.primary.accent,
    fontWeight: Fonts.weights.medium,
    marginBottom: Spacing.sm,
  },
  eventDescription: {
    fontSize: Fonts.sizes.small,
    color: Colors.neutral.gray400,
    marginBottom: Spacing.md,
  },
  eventButton: {
    backgroundColor: Colors.primary.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignSelf: 'flex-start',
  },
  eventButtonText: {
    fontSize: Fonts.sizes.small,
    fontWeight: Fonts.weights.medium,
    color: Colors.neutral.white,
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: Spacing.xxl,
    fontSize: Fonts.sizes.body,
    color: Colors.neutral.gray400,
  },
  bottomSpacing: {
    height: 100, // Espaço para o FloatingActionButton não cobrir o último item
  }
});