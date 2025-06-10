import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';

import { router } from 'expo-router';
import { Plus, Target, ChevronDown, Calendar, TrendingUp, Trash2 } from 'lucide-react-native';
import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/Colors';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import CriarMetaModal from '@/components/modals/CriarMetaModal';
import { supabase } from '@/lib/supabase';
import { Tables } from '../../lib/database.types';
import { GeminiService } from '@/lib/gemini';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserProfileData {
  tipo_vicio?: string | null;
  nivel_dependencia?: string | null;
}

export default function MetasScreen() {
  const [metas, setMetas] = useState<Tables<'metas'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMeta, setExpandedMeta] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isCriarMetaModalVisible, setIsCriarMetaModalVisible] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);

  useEffect(() => {
    loadMetas();
  }, []);

  const loadMetas = async () => {
    setLoading(true); // Garantir que o loading seja true no início
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCurrentUserId(undefined);
        setUserProfile(null);
        setMetas([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      setCurrentUserId(user.id);

      // Fetch user profile data for modal defaults
      const { data: userProfileData, error: userProfileError } = await supabase
        .from('users')
        .select('tipo_vicio, nivel_dependencia')
        .eq('auth_user_id', user.id)
        .single();

      if (userProfileError) {
        console.error('Erro ao buscar perfil do usuário para o modal:', userProfileError);
        setUserProfile(null); // Define como nulo em caso de erro para não passar undefined props
      } else if (userProfileData) {
        setUserProfile(userProfileData);
      }


      const { data, error } = await supabase
        .from('metas')
        .select('*')
        .eq('user_id', user.id)
        .order('data_inicio', { ascending: false });

      if (error) {
        console.error('Erro ao carregar metas:', error);
        return;
      }

      setMetas(data || []);
    } catch (error) {
      console.error('Erro ao carregar metas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleMetaCriada = () => {
    setIsCriarMetaModalVisible(false);
    loadMetas(); // Recarrega as metas para exibir a nova meta
  };

  const handleApagarMeta = async (metaId: string) => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza de que deseja apagar esta meta? Esta ação não pode ser desfeita.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('metas')
                .delete()
                .eq('id', metaId);

              if (error) {
                console.error('Erro ao apagar meta:', error);
                Alert.alert('Erro', 'Não foi possível apagar a meta. Tente novamente.');
                return;
              }
              Alert.alert('Sucesso', 'Meta apagada com sucesso!');
              loadMetas(); // Recarrega a lista de metas
            } catch (err) {
              console.error('Erro inesperado ao apagar meta:', err);
              Alert.alert('Erro', 'Ocorreu um erro inesperado ao apagar a meta.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMetas();
  };

  const calcularProgresso = (meta: Tables<'metas'>) => {
    if (!meta.data_inicio || !meta.objetivo_numerico) return { dias: 0, porcentagem: 0 };
    const dataInicio = new Date(meta.data_inicio);
    const hoje = new Date();
    const diasDecorridos = differenceInDays(hoje, dataInicio);
    const porcentagem = Math.min(Math.max((diasDecorridos / meta.objetivo_numerico) * 100, 0), 100);
    return { dias: diasDecorridos, porcentagem };
  };

  const toggleExpandMeta = (metaId: string) => {
    setExpandedMeta(expandedMeta === metaId ? null : metaId);
  };

  const handleNavigateToMeta = (metaId: string) => {
    router.push({
      pathname: '/meta/[id]',
      params: { id: metaId },
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativa': return Colors.success;
      case 'concluida': return Colors.primary.accent;
      case 'pausada': return Colors.warning;
      default: return Colors.neutral.gray400;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ativa': return 'Ativa';
      case 'concluida': return 'Concluída';
      case 'pausada': return 'Pausada';
      default: return status;
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: Colors.primary.dark }]}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <Text style={styles.title}>METAS</Text>
            <TouchableOpacity style={styles.profileButton}>
              <View style={styles.profileIcon} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {metas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Card style={styles.emptyCard}>
              <Target size={48} color={Colors.neutral.gray400} strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>Crie sua primeira meta:</Text>
              <Button
                title={'Criar Nova Meta'}
                onPress={() => {
                  if (currentUserId) {
                    setIsCriarMetaModalVisible(true);
                  } else {
                    Alert.alert('Usuário não carregado', 'Por favor, aguarde ou tente recarregar a tela.');
                  }
                }}
                variant="primary"
                style={styles.createButton}
              />
            </Card>
          </View>
        ) : (
          <View style={styles.metasList}>
            {metas.map((meta) => {
              const progresso = calcularProgresso(meta);

              const isExpanded = expandedMeta === meta.id;
              return (
                <Card key={meta.id} style={styles.metaCard}>
                  <TouchableOpacity
                    style={styles.metaHeader}
                    onPress={() => toggleExpandMeta(meta.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.metaHeaderTopRow}>
                      <View style={styles.metaMainInfoTouchable}> 
                        <View style={styles.metaMainInfo}>
                          <Target size={20} color={Colors.primary.dark} style={{ marginRight: Spacing.sm }} />
                          <Text style={styles.metaTipo} numberOfLines={1}>{meta.tipo_vicio}</Text>
                        </View>
                      </View>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}> 
                        <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleApagarMeta(meta.id); }} style={styles.deleteButton}>
                          <Trash2 size={20} color={Colors.error} />
                        </TouchableOpacity>
                        <ChevronDown size={24} color={Colors.primary.dark} style={[styles.chevron, isExpanded && styles.chevronExpanded]} />
                      </View>
                    </View>

                    <View style={styles.statusContainer}>
                      <View style={styles.statusRow}>
                        <Text style={styles.metaProgresso}>{progresso.porcentagem.toFixed(0)}%</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(meta.status) }]}>
                          <Text style={styles.statusText}>{getStatusText(meta.status)}</Text>
                        </View>
                      </View>
                    </View>
                    <ProgressBar progress={progresso.porcentagem / 100} />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.metaExpanded}>
                      <View style={styles.metaDetails}>
                        <Text style={styles.metaTitle}>{meta.titulo}</Text>
                        {meta.descricao && <Text style={styles.metaDescription}>{meta.descricao}</Text>}
                        <View style={styles.metaStats}>
                          <View style={styles.statItem}>
                            <Calendar size={16} color={Colors.neutral.gray400} />
                            <Text style={styles.statText}>Início: {format(new Date(meta.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}</Text>
                          </View>
                          {meta.data_fim && (
                            <View style={styles.statItem}>
                              <Calendar size={16} color={Colors.neutral.gray400} />
                              <Text style={styles.statText}>Fim: {format(new Date(meta.data_fim), 'dd/MM/yyyy', { locale: ptBR })}</Text>
                            </View>
                          )}
                          <View style={styles.statItem}>
                            <TrendingUp size={16} color={Colors.neutral.gray400} />
                            <Text style={styles.statText}>Objetivo: {meta.objetivo_numerico} {meta.unidade}</Text>
                          </View>
                        </View>
                      </View>

                      {meta.gemini_content && (
                        <View style={styles.geminiContent}>
                          <Text style={styles.geminiTitle}>✨ Dica da IA</Text>
                          <Text style={styles.geminiText}>{meta.gemini_content}</Text>
                        </View>
                      )}
                      
                      <Button 
                        title="Ver Detalhes da Meta"
                        onPress={() => {
                          console.log('Tentando navegar para meta ID:', meta.id); // Log para depuração
                          handleNavigateToMeta(meta.id);
                        }}
                        style={styles.detailsButton}
                        textStyle={styles.detailsButtonText}
                        variant='primary' // A variante aqui é mais para a estrutura, o estilo customizado vai sobrescrever a cor
                      />
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      <FloatingActionButton
        onPress={() => {
          if (currentUserId) {
            setIsCriarMetaModalVisible(true);
          } else {
            Alert.alert('Usuário não carregado', 'Por favor, aguarde ou tente recarregar a tela.');
          }
        }}
        icon={<Plus size={24} color={Colors.neutral.white} strokeWidth={2} />}
      />

      {currentUserId && (
        <CriarMetaModal
          isVisible={isCriarMetaModalVisible}
          onClose={() => setIsCriarMetaModalVisible(false)}
          onMetaCriada={handleMetaCriada}
          userId={currentUserId}
          tipoVicioPadrao={userProfile?.tipo_vicio ?? undefined}
          nivelDependenciaPadrao={userProfile?.nivel_dependencia ?? undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingBottom: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  title: {
    fontSize: Fonts.sizes.title,
    fontWeight: Fonts.weights.bold,
    color: Colors.neutral.white,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutral.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary.light,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.neutral.gray100,
    paddingHorizontal: Spacing.lg,
    marginTop: -Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Spacing.xxl,
  },
  emptyCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Fonts.sizes.subtitle,
    fontWeight: Fonts.weights.medium,
    color: Colors.neutral.gray400,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: Colors.primary.light,
  },
  metasList: {
    paddingTop: Spacing.lg,
  },
  metaCard: {
    marginBottom: Spacing.md,
    padding: 0,
  },
  metaHeader: {
    padding: Spacing.md,
  },
  metaHeaderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md, // Adicionado para espaçar da ProgressBar
  },
  metaMainInfoTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1, // Para ocupar o espaço disponível e empurrar o botão de lixeira
  },
  metaMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    // marginBottom: Spacing.md, // Movido para metaHeaderTopRow
  },
  deleteButton: {
    padding: Spacing.xs, // Pequeno padding para facilitar o toque
  },
  metaTipo: {
    fontSize: Fonts.sizes.body,
    fontWeight: Fonts.weights.medium,
    color: Colors.primary.dark,
    flex: 1,
  },
  metaProgresso: {
    fontSize: Fonts.sizes.body,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary.dark,
    marginRight: Spacing.sm,
  },
  chevron: {
    marginLeft: Spacing.sm,
    transform: [{ rotate: '0deg' }],
  },
  chevronExpanded: {
    marginLeft: Spacing.sm,
    transform: [{ rotate: '180deg' }],
  },
  statusContainer: {
    gap: Spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    fontSize: Fonts.sizes.small,
    color: Colors.primary.dark,
    textDecorationLine: 'underline',
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: Fonts.sizes.small,
    fontWeight: Fonts.weights.medium,
    color: Colors.neutral.white,
  },
  metaExpanded: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.lg,
  },
  metaDetails: {
    gap: Spacing.md,
  },
  metaTitle: {
    fontSize: Fonts.sizes.subtitle,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary.dark,
  },
  metaDescription: {
    fontSize: Fonts.sizes.body,
    color: Colors.neutral.gray400,
    lineHeight: 20,
  },
  metaStats: {
    gap: Spacing.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statText: {
    fontSize: Fonts.sizes.small,
    color: Colors.neutral.gray400,
  },
  geminiContent: {
    backgroundColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  geminiTitle: {
    fontSize: Fonts.sizes.body,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary.dark,
  },
  geminiText: {
    fontSize: Fonts.sizes.small,
    color: Colors.neutral.gray800,
    lineHeight: 18,
  },
  bottomSpacing: {
    height: 100,
  },
  detailsButton: {
    backgroundColor: Colors.primary.accent, // Cor Laranja
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  detailsButtonText: {
    color: Colors.neutral.white, // Texto branco para contraste
    fontWeight: Fonts.weights.bold,
  },
});