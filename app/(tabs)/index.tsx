import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, RefreshControl } from 'react-native';

import { router } from 'expo-router';
import { Calendar, Award, Target, Plus, AlertCircle } from 'lucide-react-native';
import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/Colors';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { supabase } from '@/lib/supabase';
import { Tables } from '../../lib/database.types';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function HomeScreen() {
  const [user, setUser] = useState<Tables<'users'> | null>(null);
  const [metas, setMetas] = useState<Tables<'metas'>[]>([]);
  const [pontos, setPontos] = useState<Tables<'pontos'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lembretes, setLembretes] = useState<any[]>([]); // Estado para futuros lembretes

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // Carregar dados do usuário
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .single();

      if (userData) setUser(userData);

      // Carregar metas ativas
      const { data: metasData } = await supabase
        .from('metas')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('status', 'ativa')
        .order('data_inicio', { ascending: false });

      if (metasData) setMetas(metasData);

      // Carregar pontos
      const { data: pontosData } = await supabase
        .from('pontos')
        .select('*')
        .eq('user_id', authUser.id)
        .order('data', { ascending: false });

      if (pontosData) setPontos(pontosData);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUserData();
  };

  const calcularDiasSemRecaida = (meta: Tables<'metas'>) => {
    const diasDecorridos = differenceInDays(new Date(), new Date(meta.data_inicio));
    return Math.max(0, diasDecorridos);
  };

  const totalPontos = pontos.reduce((sum, p) => sum + p.quantidade, 0);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: Colors.primary.dark }]}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <View style={styles.userInfo}>
              <Text style={styles.greeting}>Olá, {user?.nome || 'Usuário'}!</Text>
              <Text style={styles.subtitle}>Como você está se sentindo hoje?</Text>
            </View>
            <View style={styles.pointsContainer}>
              <Award size={24} color={Colors.primary.accent} strokeWidth={2} />
              <Text style={styles.pointsText}>{totalPontos}</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Status Principal */}
        {metas.length > 0 && (
          <Card style={styles.mainStatusCard}>
            <View style={styles.statusHeader}>
              <Text style={styles.statusTitle}>Progresso Atual</Text>
              <Calendar size={20} color={Colors.primary.dark} strokeWidth={2} />
            </View>
            
            <View style={styles.statusContent}>
              <View style={styles.daysContainer}>
                <Text style={styles.daysNumber}>{calcularDiasSemRecaida(metas[0])}</Text>
                <Text style={styles.daysLabel}>dias sem {metas[0].tipo_vicio}</Text>
              </View>
              
              <ProgressBar
                progress={metas[0] && metas[0].objetivo_numerico ? calcularDiasSemRecaida(metas[0]) / metas[0].objetivo_numerico : calcularDiasSemRecaida(metas[0]) / 30} 
                color={Colors.primary.accent} 
              />
              <Text style={styles.metaProgress}>
                Meta: {metas[0].descricao} (Restam {Math.max(0, (metas[0] && metas[0].objetivo_numerico ? metas[0].objetivo_numerico : 30) - calcularDiasSemRecaida(metas[0]))} dias)
              </Text>
            </View>
          </Card>
        )}

        {/* Metas Ativas */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Suas Metas</Text>
            <Target size={20} color={Colors.primary.dark} strokeWidth={2} />
          </View>
          
          {metas.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>Você ainda não tem metas ativas</Text>
              <Text style={styles.emptySubtext}>Que tal criar sua primeira meta?</Text>
            </Card>
          ) : (
            metas.slice(0, 3).map((meta) => (
              <Card key={meta.id} style={styles.metaCard}>
                <View style={styles.metaHeader}>
                  <Text style={styles.metaTitle}>{meta.titulo}</Text>
                  <Text style={styles.metaStatus}>{meta.status}</Text>
                </View>
                <ProgressBar
                  progress={meta.objetivo_numerico && meta.objetivo_numerico > 0 ? (calcularDiasSemRecaida(meta) / meta.objetivo_numerico) * 100 : 0}
                  showPercentage={false}
                  color={Colors.primary.light}
                />
                <Text style={styles.metaProgress}>
                  {calcularDiasSemRecaida(meta)} de {meta.objetivo_numerico ?? 0} {meta.unidade}
                </Text>
              </Card>
            ))
          )}
        </View>

        {/* Lembretes do Dia */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lembretes de Hoje</Text>
          
          <Card style={styles.reminderCard}>
            <Text style={styles.reminderText}>📝 Registrar no diário</Text>
            <Text style={styles.reminderTime}>Pendente</Text>
          </Card>
          
          <Card style={styles.reminderCard}>
            <Text style={styles.reminderText}>💧 Beber 2L de água</Text>
            <Text style={styles.reminderTime}>Em andamento</Text>
          </Card>
        </View>

        {/* Últimas Conquistas */}
        {pontos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Últimas Conquistas</Text>
            {pontos.slice(0, 3).map((ponto) => (
              <Card key={ponto.id} style={styles.achievementCard}>
                <Award size={16} color={Colors.primary.accent} strokeWidth={2} />
                <View style={styles.achievementContent}>
                  <Text style={styles.achievementText}>{ponto.motivo}</Text>
                  <Text style={styles.achievementDate}>
                    {format(new Date(ponto.data), 'dd/MM/yyyy', { locale: ptBR })}
                  </Text>
                </View>
                <Text style={styles.achievementPoints}>+{ponto.quantidade}</Text>
              </Card>
            ))}
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      <FloatingActionButton
        onPress={() => router.push('/(tabs)/diario')}
        icon={<Plus size={24} color={Colors.neutral.white} strokeWidth={2} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.appBackground, // Usar a nova cor de fundo global
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
  userInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: Fonts.sizes.title,
    fontWeight: Fonts.weights.bold,
    color: Colors.neutral.white,
  },
  subtitle: {
    fontSize: Fonts.sizes.body,
    color: Colors.neutral.white,
    opacity: 0.9,
    marginTop: 4,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  pointsText: {
    fontSize: Fonts.sizes.subtitle,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary.dark,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.neutral.gray100,
    paddingHorizontal: Spacing.lg,
    marginTop: -Spacing.md,
  },
  mainStatusCard: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  statusTitle: {
    fontSize: Fonts.sizes.subtitle,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary.dark,
  },
  statusContent: {
    gap: Spacing.lg,
  },
  daysContainer: {
    alignItems: 'center',
    backgroundColor: Colors.primary.light,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  daysNumber: {
    fontSize: 48,
    fontWeight: Fonts.weights.bold,
    color: Colors.neutral.white,
  },
  daysLabel: {
    fontSize: Fonts.sizes.body,
    color: Colors.neutral.white,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Fonts.sizes.subtitle,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary.dark,
  },
  emptyCard: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: Fonts.sizes.body,
    fontWeight: Fonts.weights.medium,
    color: Colors.neutral.gray400,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: Fonts.sizes.small,
    color: Colors.neutral.gray400,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  metaCard: {
    marginBottom: Spacing.md,
  },
  metaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  metaTitle: {
    fontSize: Fonts.sizes.body,
    fontWeight: Fonts.weights.medium,
    color: Colors.primary.dark,
    flex: 1,
  },
  metaStatus: {
    fontSize: Fonts.sizes.small,
    color: Colors.success,
    fontWeight: Fonts.weights.medium,
  },
  metaProgress: {
    fontSize: Fonts.sizes.small,
    color: Colors.neutral.gray400,
    marginTop: Spacing.sm,
  },
  reminderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  reminderText: {
    fontSize: Fonts.sizes.body,
    color: Colors.primary.dark,
    flex: 1,
  },
  reminderTime: {
    fontSize: Fonts.sizes.small,
    color: Colors.primary.accent,
    fontWeight: Fonts.weights.medium,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  achievementContent: {
    flex: 1,
  },
  achievementText: {
    fontSize: Fonts.sizes.body,
    color: Colors.primary.dark,
    fontWeight: Fonts.weights.medium,
  },
  achievementDate: {
    fontSize: Fonts.sizes.small,
    color: Colors.neutral.gray400,
    marginTop: 2,
  },
  achievementPoints: {
    fontSize: Fonts.sizes.body,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary.accent,
  },
  bottomSpacing: {
    height: 100,
  },
});