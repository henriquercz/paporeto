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

type Meta = {
  id: string;
  user_id: string;
  tipo_vicio: string;
  titulo: string;
  descricao: string | null;
  objetivo_numerico: number | null;
  unidade: string | null;
  data_inicio: string;
  data_fim_prevista: string | null;
  data_fim: string | null;
  data_conclusao: string | null;
  status: string;
  gemini_content: string | null;
  progresso: number | null;
};

export default function MetasScreen() {
  const [metas, setMetas] = useState<Meta[]>([]);
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
      return { dias: 0, porcentagem: 5 }; // Progresso mínimo mesmo para metas inválidas
    }

    const dataInicio = new Date(meta.data_inicio);
    const hoje = new Date();
    const diasDecorridos = differenceInDays(hoje, dataInicio);
    const diasCalculados = diasDecorridos < 0 ? 0 : diasDecorridos;
    const objetivoTotal = meta.objetivo_numerico || 365;
    
    // Progresso base mínimo para metas recém-criadas (5% inicial)
    const progressoMinimo = 5;
    
    // Progresso base (linear)
    const progressoLinear = Math.min((diasCalculados / objetivoTotal) * 100, 100);
    
    // Sistema de marcos para tornar mais atrativo
    let progressoComMarcos = progressoLinear;
    
    // Se ainda está no início, dar um boost visual
    if (diasCalculados === 0) {
      // Meta recém-criada: mostrar progresso inicial
      progressoComMarcos = progressoMinimo;
    } else if (diasCalculados <= 7) {
      // Nos primeiros 7 dias, cada dia vale mais visualmente (5% a 15%)
      progressoComMarcos = progressoMinimo + ((diasCalculados / 7) * 10);
    } else if (diasCalculados <= 30) {
      // Do dia 8 ao 30, progresso mais acelerado
      const progressoAdicional = ((diasCalculados - 7) / 23) * 25; // 25% nos próximos 23 dias
      progressoComMarcos = 15 + progressoAdicional;
    } else {
      // Após 30 dias, usar progresso linear normal mas com base mínima de 40%
      progressoComMarcos = Math.max(40, progressoLinear);
    }
    
    return { dias: diasCalculados, porcentagem: Math.min(progressoComMarcos, 100) };
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
                            <Text style={styles.statText}>Início: {format(new Date(meta.data_inicio!), 'dd/MM/yyyy', { locale: ptBR })}</Text>
                          </View>
                          {meta.data_fim_prevista && (
                            <View style={styles.statItem}>
                              <Calendar size={16} color={Colors.neutral.gray400} />
                              <Text style={styles.statText}>Previsão: {format(new Date(meta.data_fim_prevista!), 'dd/MM/yyyy', { locale: ptBR })}</Text>
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
  metasList: { paddingTop: Spacing.lg, gap: Spacing.lg },
  metaCard: { 
    marginBottom: 0, 
    padding: 0, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderRadius: BorderRadius.lg
  },
  metaHeader: { padding: Spacing.lg },
  metaHeaderTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  metaMainInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  deleteButton: { padding: Spacing.xs },
  metaTipo: { fontSize: Fonts.sizes.body, fontWeight: Fonts.weights.medium, color: Colors.primary.dark, flex: 1 },
  metaProgresso: { fontSize: Fonts.sizes.body, fontWeight: Fonts.weights.bold, color: Colors.primary.dark, marginRight: Spacing.sm },
  chevron: { transform: [{ rotate: '0deg' }] },
  chevronExpanded: { transform: [{ rotate: '180deg' }] },
  statusContainer: { gap: Spacing.md },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  statusBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md },
  statusText: { fontSize: Fonts.sizes.small, fontWeight: Fonts.weights.medium, color: Colors.neutral.white },
  metaExpanded: { borderTopWidth: 1, borderTopColor: Colors.neutral.gray100, padding: Spacing.lg, gap: Spacing.lg, backgroundColor: Colors.neutral.gray100 },
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