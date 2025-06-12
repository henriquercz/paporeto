import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, RefreshControl, FlatList, Image, ActivityIndicator, Alert } from 'react-native';
import { Calendar, Users } from 'lucide-react-native';
import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/Colors';
import { Card } from '@/components/ui/Card';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { formatDistanceToNow, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/database.types';
import CriarTopicoModal from '@/components/modals/CriarTopicoModal';
import MarcarEncontroModal from '@/components/modals/MarcarEncontroModal';
import EncontroCard from '@/components/cards/EncontroCard';

const getInitials = (name: string | undefined | null): string => {
  if (!name || name.trim() === '') return '';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};

type ChatForumRow = Database['public']['Tables']['chats_forum']['Row'] & {
  users: Database['public']['Tables']['users']['Row'] | null;
};

export default function ComunidadeScreen() {
  const [topicos, setTopicos] = useState<ChatForumRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [criarTopicoModalVisible, setCriarTopicoModalVisible] = useState(false);
  const [marcarEncontroModalVisible, setMarcarEncontroModalVisible] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<string[]>([]);
  const [filtro, setFiltro] = useState<'todos' | 'relato' | 'dica' | 'ajuda' | 'encontro'>('todos');
  const [userId, setUserId] = useState<string | undefined>();

  const fetchTopicos = useCallback(async () => {
    if (!refreshing) setLoading(true);
    try {
      const response = await supabase
        .from('chats_forum')
        .select('*, users(id, nome, avatar_url)')
        .order('created_at', { ascending: false });

      const { data, error } = response;

      if (error) {
        console.error('Erro ao buscar tópicos:', error);
        Alert.alert('Erro ao Carregar Tópicos', 'Não foi possível carregar os dados. Tente novamente mais tarde.');
        setTopicos([]);
      } else if (data) {
        const processedData = data.map(item => ({
          ...item,
          users: Array.isArray(item.users) ? item.users[0] : item.users,
        }));
        setTopicos(processedData as ChatForumRow[]);
      }
    } catch (e: any) {
      Alert.alert('Erro Inesperado', `Ocorreu um erro: ${e.message}`);
      setTopicos([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    fetchTopicos();
  }, [fetchTopicos]);

  useEffect(() => {
    const fetchUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUserId(user?.id);
    };
    fetchUser();
  }, []);

  const topicosFiltrados = useMemo(() => {
    if (filtro === 'todos') {
      return topicos;
    }
    return topicos.filter(t => t.post_type === filtro);
  }, [filtro, topicos]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTopicos();
  }, [fetchTopicos]);

  const handleOpenCriarTopicoModal = () => setCriarTopicoModalVisible(true);
  const handleCloseCriarTopicoModal = () => setCriarTopicoModalVisible(false);

  const handleTopicCreated = useCallback(async () => {
    fetchTopicos();
    handleCloseCriarTopicoModal();
    // Lógica de pontuação
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
  
        const today = new Date();
        const startOfToday = startOfDay(today).toISOString();
        const endOfToday = endOfDay(today).toISOString();
  
        const { data: existingPoints, error: pointsError } = await supabase
          .from('pontos')
          .select('id')
          .eq('user_id', user.id)
          .eq('motivo', 'post_comunidade')
          .gte('data', startOfToday)
          .lte('data', endOfToday)
          .limit(1);
  
        if (pointsError) {
          console.error('Erro ao verificar pontos existentes:', pointsError);
          return;
        }
  
        if (!existingPoints || existingPoints.length === 0) {
          const { error: insertError } = await supabase.from('pontos').insert({
            user_id: user.id,
            quantidade: 1,
            motivo: 'post_comunidade',
          });
  
          if (insertError) {
            console.error('Erro ao inserir ponto:', insertError);
          }
        }
      } catch (error) {
        console.error('Erro ao processar pontuação do tópico:', error);
      }
  }, [fetchTopicos]);

  const handleOpenMarcarEncontroModal = () => setMarcarEncontroModalVisible(true);
  const handleCloseMarcarEncontroModal = () => setMarcarEncontroModalVisible(false);
  
  const handleEncontroMarcado = useCallback(() => {
    fetchTopicos();
    handleCloseMarcarEncontroModal();
  }, [fetchTopicos]);

  const togglePostExpansion = (postId: string) => {
    setExpandedPosts(prev =>
      prev.includes(postId) ? prev.filter(id => id !== postId) : [...prev, postId]
    );
  };

  const handleParticipantesPress = (chatId: string) => {
    Alert.alert('Funcionalidade em Desenvolvimento', `A lista de participantes para o encontro ${chatId} estará disponível em breve.`);
  };

  const formatarTempo = (dataString: string | null) => {
    if (!dataString) return '';
    try {
      return formatDistanceToNow(new Date(dataString), { addSuffix: true, locale: ptBR });
    } catch (error) {
      console.error("Erro ao formatar data:", error);
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

          </View>
        </SafeAreaView>
      </View>
      
      <View style={styles.filterContainer}>
        {(['todos', 'relato', 'dica', 'ajuda', 'encontro'] as const).map(type => (
          <TouchableOpacity
            key={type}
            style={[styles.filterButton, filtro === type && styles.filterButtonSelected]}
            onPress={() => setFiltro(type)}
          >
            <Text style={[styles.filterButtonText, filtro === type && styles.filterButtonTextSelected]}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        style={styles.content}
        contentContainerStyle={styles.topicsContainer}
        data={topicosFiltrados}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary.accent]} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nenhum tópico encontrado.</Text>
              <Text style={styles.emptySubText}>Que tal criar o primeiro ou mudar o filtro?</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          if (item.post_type === 'encontro') {
            return (
              <EncontroCard 
                item={item}
                userId={userId}
                onParticipantesPress={handleParticipantesPress}
              />
            );
          }

          return (
            <Card style={styles.topicCard}>
              <View style={styles.topicHeader}>
                <View style={styles.authorInfo}>
                  {item.users?.avatar_url ? (
                    <Image source={{ uri: item.users.avatar_url }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarFallbackText}>{getInitials(item.users?.nome)}</Text>
                    </View>
                  )}
                  <View style={styles.authorDetails}>
                    <Text style={styles.authorName}>{item.users?.nome || 'Anônimo'}</Text>
                    <Text style={styles.postTime}>{formatarTempo(item.created_at)}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.topicContent}>
                <Text style={styles.topicTitle}>{item.titulo}</Text>
                <Text style={styles.postContent} numberOfLines={expandedPosts.includes(item.id) ? undefined : 3}>
                  {item.conteudo}
                </Text>
                {(item.conteudo?.length ?? 0) > 150 && (
                  <TouchableOpacity onPress={() => togglePostExpansion(item.id)} style={styles.readMoreButton}>
                    <Text style={styles.readMoreText}>
                      {expandedPosts.includes(item.id) ? 'Ler menos' : 'Ler mais'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          );
        }}
        ListFooterComponent={<View style={styles.bottomSpacing} />}
      />

      <FloatingActionButton onPress={handleOpenCriarTopicoModal} />

      <CriarTopicoModal
        isVisible={criarTopicoModalVisible}
        onClose={handleCloseCriarTopicoModal}
        onTopicCreated={handleTopicCreated}
        onOpenMarcarEncontroModal={() => {
          handleCloseCriarTopicoModal();
          handleOpenMarcarEncontroModal();
        }}
      />

      <MarcarEncontroModal
        isVisible={marcarEncontroModalVisible}
        onClose={handleCloseMarcarEncontroModal}
        onEncontroMarcado={handleEncontroMarcado}
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
    backgroundColor: Colors.neutral.white,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Fonts.sizes.body,
    color: Colors.neutral.gray400,
  },
  header: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: BorderRadius.lg,
    borderBottomRightRadius: BorderRadius.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Fonts.sizes.title,
    fontWeight: Fonts.weights.bold,
    color: Colors.neutral.white,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  iconButton: {
    padding: Spacing.sm,
  },
  content: {
    flex: 1,
  },
  topicsContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xxl * 2,
  },
  emptyText: {
    fontSize: Fonts.sizes.body,
    fontWeight: Fonts.weights.medium,
    color: Colors.neutral.gray800,
  },
  emptySubText: {
    fontSize: Fonts.sizes.small,
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
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutral.gray100,
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
  authorDetails: {
    justifyContent: 'center',
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
    fontSize: Fonts.sizes.body,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary.dark,
    marginBottom: Spacing.xs,
  },
  postContent: {
    fontSize: Fonts.sizes.small,
    color: Colors.neutral.gray800,
    lineHeight: Fonts.sizes.small * 1.6,
  },
  readMoreButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignSelf: 'flex-start',
    marginLeft: -Spacing.md, // Alinha o toque com o texto
  },
  readMoreText: {
    color: Colors.primary.accent,
    fontWeight: Fonts.weights.bold,
    marginTop: Spacing.sm,
  },
  bottomSpacing: {
    height: 100,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.gray100,
  },
  filterButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  filterButtonSelected: {
    backgroundColor: Colors.primary.accent,
  },
  filterButtonText: {
    fontSize: Fonts.sizes.small,
    fontWeight: Fonts.weights.medium,
    color: Colors.primary.dark,
  },
  filterButtonTextSelected: {
    color: Colors.neutral.white,
  },
});