import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, RefreshControl, FlatList, Image, ActivityIndicator, Alert, TextInput, Modal, ScrollView } from 'react-native';
import { Calendar, Users, Heart, MessageCircle, Send, X } from 'lucide-react-native';
import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/Colors';
import { Card } from '@/components/ui/Card';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { formatDistanceToNow, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/database.types';
import { getCurrentUserId } from '@/lib/userUtils';
import { useUserId } from '@/hooks/useCurrentUser';
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
  likes_count?: number;
  comments_count?: number;
  user_liked?: boolean;
};

type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  conteudo: string;
  created_at: string;
  parent_id?: string | null;
  users: { id: string; nome: string; avatar_url: string | null } | null;
  replies?: Comment[];
};

export default function ComunidadeScreen() {
  const [topicos, setTopicos] = useState<ChatForumRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [criarTopicoModalVisible, setCriarTopicoModalVisible] = useState(false);
  const [marcarEncontroModalVisible, setMarcarEncontroModalVisible] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<string[]>([]);
  const [filtro, setFiltro] = useState<'todos' | 'relato' | 'dica' | 'ajuda' | 'encontro'>('todos');
  const { userId, loading: userLoading } = useUserId();
  
  // Estados para comentários e likes
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [likingPosts, setLikingPosts] = useState<string[]>([]);

  const fetchTopicos = useCallback(async () => {
    if (!refreshing) setLoading(true);
    try {
      // Buscar posts com contadores de likes e comentários
      const { data: posts, error: postsError } = await supabase
        .from('chats_forum')
        .select(`
          *,
          users(id, nome, avatar_url)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('Erro ao buscar tópicos:', postsError);
        Alert.alert('Erro ao Carregar Tópicos', 'Não foi possível carregar os dados. Tente novamente mais tarde.');
        setTopicos([]);
        return;
      }

      if (!posts) {
        setTopicos([]);
        return;
      }

      // Buscar contadores de likes e comentários para cada post
      const postsWithStats = await Promise.all(
        posts.map(async (post) => {
          // Contar likes
          const { count: likesCount } = await supabase
            .from('likes_forum')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          // Contar comentários
          const { count: commentsCount } = await supabase
            .from('comentarios_forum')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          // Verificar se o usuário atual curtiu
          let userLiked = false;
          if (userId) {
            const { data: userLike } = await supabase
              .from('likes_forum')
              .select('id')
              .eq('post_id', post.id)
              .eq('user_id', userId)
              .single();
            userLiked = !!userLike;
          }

          return {
            ...post,
            users: Array.isArray(post.users) ? post.users[0] : post.users,
            likes_count: likesCount || 0,
            comments_count: commentsCount || 0,
            user_liked: userLiked,
          };
        })
      );

      setTopicos(postsWithStats as ChatForumRow[]);
    } catch (e: any) {
      Alert.alert('Erro Inesperado', `Ocorreu um erro: ${e.message}`);
      setTopicos([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing, userId]);

  useEffect(() => {
    fetchTopicos();
  }, [fetchTopicos]);

  // Hook useUserId já gerencia o estado do usuário

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
        const currentUserId = await getCurrentUserId();
        if (!currentUserId) return;
  
        const today = new Date();
        const startOfToday = startOfDay(today).toISOString();
        const endOfToday = endOfDay(today).toISOString();
  
        const { data: existingPoints, error: pointsError } = await supabase
          .from('pontos')
          .select('id')
          .eq('user_id', currentUserId)
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
            user_id: currentUserId,
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

  // Funções para likes e comentários
  const handleLike = useCallback(async (postId: string) => {
    if (!userId) {
      Alert.alert('Erro', 'Você precisa estar logado para curtir um post.');
      return;
    }

    if (likingPosts.includes(postId)) {
      return; // Evita múltiplos cliques
    }

    setLikingPosts(prev => [...prev, postId]);
    
    try {
      const topic = topicos.find(t => t.id === postId);
      if (!topic) return;
      
      const wasLiked = topic.user_liked;
      
      if (wasLiked) {
        // Remover like
        const { error } = await supabase
          .from('likes_forum')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId);
          
        if (error) {
          console.error('Erro ao remover like:', error);
          Alert.alert('Erro', 'Não foi possível remover o like. Tente novamente.');
          return;
        }
      } else {
        // Adicionar like
        const { error } = await supabase
          .from('likes_forum')
          .insert({
            post_id: postId,
            user_id: userId
          });
          
        if (error) {
          console.error('Erro ao adicionar like:', error);
          Alert.alert('Erro', 'Não foi possível adicionar o like. Tente novamente.');
          return;
        }
      }
      
      // Atualizar estado local
      setTopicos(prev => prev.map(topic => {
        if (topic.id === postId) {
          return {
            ...topic,
            user_liked: !wasLiked,
            likes_count: wasLiked ? (topic.likes_count || 0) - 1 : (topic.likes_count || 0) + 1
          };
        }
        return topic;
      }));
    } catch (error) {
      console.error('Erro inesperado ao curtir post:', error);
      Alert.alert('Erro', 'Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setLikingPosts(prev => prev.filter(id => id !== postId));
    }
  }, [userId, likingPosts, topicos]);

  const handleOpenComments = useCallback((postId: string) => {
    setSelectedPostId(postId);
    setCommentsModalVisible(true);
    fetchComments(postId);
  }, []);

  const fetchComments = useCallback(async (postId: string) => {
    setLoadingComments(true);
    try {
      const { data: comments, error } = await supabase
        .from('comentarios_forum')
        .select(`
          *,
          users(id, nome, avatar_url)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar comentários:', error);
        Alert.alert('Erro', 'Não foi possível carregar os comentários.');
        setComments([]);
        return;
      }

      const processedComments = (comments || []).map(comment => ({
        id: comment.id,
        post_id: comment.post_id,
        user_id: comment.user_id,
        conteudo: comment.conteudo,
        created_at: comment.created_at,
        parent_id: comment.parent_id,
        users: Array.isArray(comment.users) ? comment.users[0] : comment.users,
      }));
      
      setComments(processedComments);
    } catch (error) {
      console.error('Erro ao buscar comentários:', error);
      Alert.alert('Erro', 'Ocorreu um erro inesperado ao carregar comentários.');
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }, []);

  const handleAddComment = useCallback(async () => {
    if (!newComment.trim() || !selectedPostId || !userId) {
      Alert.alert('Erro', 'Comentário não pode estar vazio.');
      return;
    }
    
    try {
      // Inserir comentário no banco de dados
      const { data: insertedComment, error } = await supabase
        .from('comentarios_forum')
        .insert({
          post_id: selectedPostId,
          user_id: userId,
          conteudo: newComment.trim()
        })
        .select(`
          *,
          users(id, nome, avatar_url)
        `)
        .single();

      if (error) {
        console.error('Erro ao adicionar comentário:', error);
        Alert.alert('Erro', 'Não foi possível adicionar o comentário. Tente novamente.');
        return;
      }

      if (insertedComment) {
        const processedComment = {
          id: insertedComment.id,
          post_id: insertedComment.post_id,
          user_id: insertedComment.user_id,
          conteudo: insertedComment.conteudo,
          created_at: insertedComment.created_at,
          parent_id: insertedComment.parent_id,
          users: Array.isArray(insertedComment.users) ? insertedComment.users[0] : insertedComment.users,
        };
        
        // Adicionar comentário à lista local
        setComments(prev => [processedComment, ...prev]);
        setNewComment('');
        
        // Atualizar contador de comentários
        setTopicos(prev => prev.map(topic => {
          if (topic.id === selectedPostId) {
            return {
              ...topic,
              comments_count: (topic.comments_count || 0) + 1
            };
          }
          return topic;
        }));
      }
      
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      Alert.alert('Erro', 'Ocorreu um erro inesperado ao adicionar comentário.');
    }
  }, [newComment, selectedPostId, userId]);

  const handleCloseComments = useCallback(() => {
    setCommentsModalVisible(false);
    setSelectedPostId(null);
    setComments([]);
    setNewComment('');
  }, []);

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
              
              {/* Botões de interação */}
              <View style={styles.interactionBar}>
                <TouchableOpacity 
                  style={[styles.interactionButton, item.user_liked && styles.likedButton]}
                  onPress={() => handleLike(item.id)}
                  disabled={likingPosts.includes(item.id)}
                >
                  <Heart 
                    size={18} 
                    color={item.user_liked ? '#e74c3c' : '#666'} 
                    fill={item.user_liked ? '#e74c3c' : 'none'}
                  />
                  <Text style={[styles.interactionText, item.user_liked && styles.likedText]}>
                    {item.likes_count || 0}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.interactionButton}
                  onPress={() => handleOpenComments(item.id)}
                >
                  <MessageCircle size={18} color="#666" />
                  <Text style={styles.interactionText}>
                    {item.comments_count || 0}
                  </Text>
                </TouchableOpacity>
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
      
      {/* Modal de Comentários */}
      <Modal
        visible={commentsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseComments}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Comentários</Text>
            <TouchableOpacity onPress={handleCloseComments} style={styles.closeButton}>
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.commentsContainer}>
             {loadingComments ? (
               <View style={styles.loadingContainer}>
                 <ActivityIndicator size="large" color="#007AFF" />
                 <Text style={styles.loadingText}>Carregando comentários...</Text>
               </View>
             ) : comments.length > 0 ? (
               comments.map((comment) => (
                 <View key={comment.id} style={styles.commentItem}>
                   <View style={styles.commentHeader}>
                     <View style={styles.commentAvatarFallback}>
                       <Text style={styles.commentAvatarText}>
                         {comment.users?.nome?.charAt(0) || 'U'}
                       </Text>
                     </View>
                     <View style={styles.commentInfo}>
                       <Text style={styles.commentUserName}>{comment.users?.nome || 'Usuário'}</Text>
                       <Text style={styles.commentTimestamp}>
                         {formatDistanceToNow(new Date(comment.created_at), {
                           addSuffix: true,
                           locale: ptBR,
                         })}
                       </Text>
                     </View>
                   </View>
                   <Text style={styles.commentContent}>{comment.conteudo}</Text>
                 </View>
               ))
             ) : (
               <View style={styles.emptyCommentsContainer}>
                 <MessageCircle size={48} color="#ccc" />
                 <Text style={styles.emptyCommentsText}>Nenhum comentário ainda</Text>
                 <Text style={styles.emptyCommentsSubtext}>Seja o primeiro a comentar!</Text>
               </View>
             )}
           </ScrollView>
          
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Escreva um comentário..."
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              style={[styles.sendButton, !newComment.trim() && styles.sendButtonDisabled]}
              onPress={handleAddComment}
              disabled={!newComment.trim()}
            >
              <Send size={20} color={newComment.trim() ? '#007AFF' : '#ccc'} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  interactionBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral.gray100,
    gap: Spacing.lg,
  },
  interactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  likedButton: {
    backgroundColor: '#ffeaea',
  },
  interactionText: {
    fontSize: Fonts.sizes.small,
    color: '#666',
    fontWeight: Fonts.weights.medium,
  },
  likedText: {
    color: '#e74c3c',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.neutral.white,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.gray100,
  },
  modalTitle: {
    fontSize: Fonts.sizes.title,
    fontWeight: Fonts.weights.bold,
    color: Colors.neutral.gray800,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  commentsContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  commentItem: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.gray100,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: Spacing.sm,
  },
  commentAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.neutral.gray100,
    marginRight: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAvatarText: {
    fontSize: Fonts.sizes.small,
    fontWeight: Fonts.weights.bold,
    color: Colors.neutral.gray800,
  },
  commentInfo: {
    flex: 1,
  },
  commentUserName: {
    fontSize: Fonts.sizes.subtitle,
    fontWeight: Fonts.weights.medium,
    color: Colors.neutral.gray800,
  },
  commentTimestamp: {
    fontSize: Fonts.sizes.small,
    color: Colors.neutral.gray400,
  },
  commentContent: {
    fontSize: Fonts.sizes.body,
    color: Colors.neutral.gray800,
    lineHeight: Fonts.sizes.body * 1.4,
  },
  emptyCommentsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyCommentsText: {
    fontSize: Fonts.sizes.body,
    fontWeight: Fonts.weights.medium,
    color: Colors.neutral.gray400,
    marginTop: Spacing.md,
  },
  emptyCommentsSubtext: {
    fontSize: Fonts.sizes.small,
    color: Colors.neutral.gray400,
    marginTop: Spacing.xs,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral.gray100,
    backgroundColor: Colors.neutral.white,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Fonts.sizes.body,
    maxHeight: 100,
    marginRight: Spacing.sm,
  },
  sendButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
 });