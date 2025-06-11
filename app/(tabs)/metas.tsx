import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Plus, Target, ChevronDown, Calendar, TrendingUp, Trash2 } from 'lucide-react-native';
import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/Colors';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import CriarMetaModal from '@/components/modals/CriarMetaModal';
import { supabase } from '@/lib/supabase';
import { Tables } from '../../lib/database.types';
import { format, differenceInDays, differenceInSeconds } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserProfileData {
  tipo_vicio: string | null;
  nivel_dependencia: string | null;
}

export default function MetasScreen() {
  const [metas, setMetas] = useState<Tables<'metas'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMeta, setExpandedMeta] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isCriarMetaModalVisible, setIsCriarMetaModalVisible] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCurrentUserId(undefined);
        setUserProfile(null);
        setMetas([]);
        return;
      }
      setCurrentUserId(user.id);

      const { data: userProfileData, error: userProfileError } = await supabase
        .from('users')
        .select('tipo_vicio, nivel_dependencia')
        .eq('auth_user_id', user.id)
        .single();

      if (userProfileError) {
        console.error('Erro ao buscar perfil do usuário:', userProfileError);
        setUserProfile(null);
      } else if (userProfileData) {
        setUserProfile(userProfileData);
      }

      const { data: metasData, error: metasError } = await supabase
        .from('metas')
        .select('id, user_id, tipo_vicio, titulo, descricao, objetivo_numerico, unidade, data_inicio, data_fim_prevista, data_fim, data_conclusao, status, gemini_content, progresso')
        .eq('user_id', user.id)
        .order('data_inicio', { ascending: false });

      if (metasError) {
        console.error('Erro ao carregar metas:', metasError);
        setMetas([]);
      } else {
        setMetas(metasData || []);
      }
    } catch (error) {
      console.error('Erro inesperado ao carregar dados:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleMetaCriada = () => {
    setIsCriarMetaModalVisible(false);
    loadData();
  };

  const handleApagarMeta = async (metaId: string) => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza de que deseja apagar esta meta? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('metas').delete().eq('id', metaId);
            if (error) {
              Alert.alert('Erro', 'Não foi possível apagar a meta.');
            } else {
              Alert.alert('Sucesso', 'Meta apagada com sucesso!');
              loadData();
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const calcularProgresso = (meta: Tables<'metas'>) => {
    if (!meta.data_inicio || !meta.objetivo_numerico || meta.objetivo_numerico <= 0) {
      return { dias: 0, porcentagem: 0 };
    }

    const dataInicio = new Date(meta.data_inicio);
    const hoje = new Date();

    // O objetivo em dias é convertido para o total de segundos esperado para a meta.
    const objetivoTotalEmSegundos = meta.objetivo_numerico * 24 * 60 * 60;

    // Calcula a diferença em segundos desde a data de início.
    const segundosDecorridos = differenceInSeconds(hoje, dataInicio);

    // Se a meta ainda não começou, o progresso é 0.
    if (segundosDecorridos < 0) {
      return { dias: 0, porcentagem: 0 };
    }

    // Calcula a porcentagem de progresso, garantindo que não ultrapasse 100%.
    const porcentagem = Math.min((segundosDecorridos / objetivoTotalEmSegundos) * 100, 100);

    // Os dias completos ainda são úteis para exibição.
    const diasDecorridos = differenceInDays(hoje, dataInicio);

    return { dias: diasDecorridos < 0 ? 0 : diasDecorridos, porcentagem };
  };

  const toggleExpandMeta = (metaId: string) => {
    setExpandedMeta(expandedMeta === metaId ? null : metaId);
  };

  const handleNavigateToMeta = (metaId: string) => {
    router.push({ pathname: '/meta/[id]', params: { id: metaId } });
  };

  const getStatusColor = (status: string) => {
    return status === 'ativa' ? Colors.success : status === 'concluida' ? Colors.primary.accent : Colors.warning;
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary.dark} /></View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: Colors.primary.dark }]}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <Text style={styles.title}>METAS</Text>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary.dark]} tintColor={Colors.primary.dark} />}
      >
        {metas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Card style={styles.emptyCard}>
              <Target size={48} color={Colors.neutral.gray400} strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>Crie sua primeira meta para começar a jornada.</Text>
              <Button
                label={'Criar Nova Meta'}
                onPress={() => setIsCriarMetaModalVisible(true)}
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
                  <TouchableOpacity style={styles.metaHeader} onPress={() => toggleExpandMeta(meta.id)} activeOpacity={0.7}>
                    <View style={styles.metaHeaderTopRow}>
                      <View style={styles.metaMainInfo}>
                        <Target size={20} color={Colors.primary.dark} style={{ marginRight: Spacing.sm }} />
                        <Text style={styles.metaTipo} numberOfLines={1}>{meta.titulo}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
                        {meta.descricao && <Text style={styles.metaDescription}>{meta.descricao}</Text>}
                        <View style={styles.metaStats}>
                          <View style={styles.statItem}>
                            <Calendar size={16} color={Colors.neutral.gray400} />
                            <Text style={styles.statText}>Início: {format(new Date(meta.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}</Text>
                          </View>
                          {meta.data_fim_prevista && (
                            <View style={styles.statItem}>
                              <Calendar size={16} color={Colors.neutral.gray400} />
                              <Text style={styles.statText}>Previsão: {format(new Date(meta.data_fim_prevista), 'dd/MM/yyyy', { locale: ptBR })}</Text>
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
                        label="Acompanhar Meta"
                        onPress={() => handleNavigateToMeta(meta.id)}
                        style={styles.detailsButton}
                        textStyle={styles.detailsButtonText}
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
        onPress={() => setIsCriarMetaModalVisible(true)}
        icon={<Plus size={24} color={Colors.neutral.white} strokeWidth={2} />}
      />

      {currentUserId && userProfile && (
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
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { paddingBottom: Spacing.lg },
  headerContent: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  title: { fontSize: Fonts.sizes.title, fontWeight: Fonts.weights.bold, color: Colors.neutral.white },
  content: { flex: 1, backgroundColor: Colors.neutral.gray100, paddingHorizontal: Spacing.lg, marginTop: -Spacing.md },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: Spacing.xxl },
  emptyCard: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.lg },
  emptyTitle: { fontSize: Fonts.sizes.subtitle, fontWeight: Fonts.weights.medium, color: Colors.neutral.gray400, textAlign: 'center' },
  createButton: { backgroundColor: Colors.primary.light },
  metasList: { paddingTop: Spacing.lg },
  metaCard: { marginBottom: Spacing.md, padding: 0 },
  metaHeader: { padding: Spacing.md },
  metaHeaderTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  metaMainInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  deleteButton: { padding: Spacing.xs },
  metaTipo: { fontSize: Fonts.sizes.body, fontWeight: Fonts.weights.medium, color: Colors.primary.dark, flex: 1 },
  metaProgresso: { fontSize: Fonts.sizes.body, fontWeight: Fonts.weights.bold, color: Colors.primary.dark, marginRight: Spacing.sm },
  chevron: { transform: [{ rotate: '0deg' }] },
  chevronExpanded: { transform: [{ rotate: '180deg' }] },
  statusContainer: { gap: Spacing.sm },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  statusText: { fontSize: Fonts.sizes.small, fontWeight: Fonts.weights.medium, color: Colors.neutral.white },
  metaExpanded: { borderTopWidth: 1, borderTopColor: Colors.border, padding: Spacing.md, gap: Spacing.lg },
  metaDetails: { gap: Spacing.md },
  metaTitle: { fontSize: Fonts.sizes.subtitle, fontWeight: Fonts.weights.bold, color: Colors.primary.dark },
  metaDescription: { fontSize: Fonts.sizes.body, color: Colors.neutral.gray400, lineHeight: 20 },
  metaStats: { gap: Spacing.sm },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statText: { fontSize: Fonts.sizes.small, color: Colors.neutral.gray400 },
  geminiContent: { backgroundColor: Colors.neutral.gray100, borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.sm },
  geminiTitle: { fontSize: Fonts.sizes.body, fontWeight: Fonts.weights.bold, color: Colors.primary.dark },
  geminiText: { fontSize: Fonts.sizes.small, color: Colors.neutral.gray800, lineHeight: 18 },
  bottomSpacing: { height: 100 },
  detailsButton: { backgroundColor: Colors.primary.accent, marginTop: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md },
  detailsButtonText: { color: Colors.neutral.white, fontWeight: Fonts.weights.bold },
});