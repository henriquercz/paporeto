import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';

import { router, useFocusEffect } from 'expo-router';
import { type Database } from '@/lib/database.types';
import { BrainCircuit, MessageSquare, BookOpen } from 'lucide-react-native';
import { Calendar, Award, Target, Plus, AlertCircle } from 'lucide-react-native';
import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/Colors';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { supabase } from '@/lib/supabase';
import { Tables } from '../../lib/database.types';
import { format, differenceInDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type User = Database['public']['Tables']['users']['Row'];
type Meta = Database['public']['Tables']['metas']['Row'];
type Ponto = Database['public']['Tables']['pontos']['Row'];

export default function HomeScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lembretes, setLembretes] = useState<any[]>([]); // Estado para futuros lembretes

  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
    }, [])
  );

  const loadUserData = async () => {
    setLoading(true);
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
      const { data: metasData, error: metasError } = await supabase
        .from('metas')
        .select('id, user_id, titulo, descricao, tipo_vicio, data_inicio, data_fim_prevista, data_fim, status, objetivo_numerico, unidade, progresso, data_conclusao, gemini_content')
        .eq('user_id', authUser.id)
        .eq('status', 'ativa')
        .order('data_inicio', { ascending: false });

      if (metasError) console.error('Erro ao carregar metas:', metasError);

      if (metasData) setMetas(metasData);

      // Carregar pontos
      const { data: pontosData } = await supabase
        .from('pontos')
        .select('*')
        .eq('user_id', authUser.id)
        .order('data', { ascending: false });

      if (pontosData) setPontos(pontosData);

      // Lógica para Lembretes de Hoje
      const hojeInicio = startOfDay(new Date()).toISOString();
      const hojeFim = endOfDay(new Date()).toISOString();

      const tarefas = [
        { id: 'diario', table: 'diarios', dateField: 'data_registro', title: 'Registro no Diário', description: 'Anote seus pensamentos e sentimentos.', icon: BookOpen, route: '/(tabs)/diario' },
        { id: 'comunidade', table: 'chats_forum', dateField: 'created_at', title: 'Post na Comunidade', description: 'Compartilhe sua jornada com outros.', icon: MessageSquare, route: '/(tabs)/comunidade' },
        { id: 'chatbot', table: 'chatbot_conversas', dateField: 'timestamp', title: 'Conversa com o Blob', description: 'Converse com seu assistente emocional.', icon: BrainCircuit, route: '/(tabs)/chatbot' },
      ];

      const lembretesPendentes = [];

      for (const tarefa of tarefas) {
        const { data, error } = await supabase
          .from(tarefa.table as any)
          .select('id')
          .eq('user_id', authUser.id)
          .gte(tarefa.dateField, hojeInicio)
          .lte(tarefa.dateField, hojeFim)
          .limit(1);

        if (error) {
          console.error(`Erro ao verificar ${tarefa.id}:`, error);
        }

        if (!data || data.length === 0) {
          lembretesPendentes.push(tarefa);
        }
      }
      setLembretes(lembretesPendentes);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadUserData();
  }, []);

  const totalPontos = pontos.reduce((acc, ponto) => acc + (ponto.quantidade || 0), 0);

  const calcularDiasSemRecaida = (meta: Meta) => {
    const diasDecorridos = differenceInDays(new Date(), new Date(meta.data_inicio));
    return Math.max(0, diasDecorridos);
  };

  const formatarMotivo = (motivo: string | null) => {
    if (!motivo) return '';
    switch (motivo) {
      case 'diario_completo':
        return 'Tarefa: Registro no Diário';
      case 'comunidade_post':
        return 'Tarefa: Post na Comunidade';
      case 'chatbot_conversa':
        return 'Tarefa: Conversa com o Blob';
      case 'meta_concluida':
        return 'Conquista: Meta Concluída!';
      default:
        return motivo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

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
                  <Target size={18} color={Colors.primary.dark} />
                  <Text style={styles.metaTitle} numberOfLines={1}>{meta.titulo}</Text>
                  <Text style={styles.metaStatus}>{meta.status}</Text>
                </View>
                <ProgressBar progress={meta.progresso || 0} />
                <Text style={styles.metaProgress}>
                  {calcularDiasSemRecaida(meta)} dias sem recaídas
                </Text>
                <TouchableOpacity 
                  style={styles.followButton} 
                  onPress={() => router.push(`/meta/${meta.id}`)}
                >
                  <Text style={styles.followButtonText}>Acompanhar Meta</Text>
                </TouchableOpacity>
              </Card>
            ))
          )}
        </View>

        {/* Lembretes do Dia */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lembretes de Hoje</Text>
          </View>
          {lembretes.length > 0 ? (
            lembretes.map((lembrete) => (
              <TouchableOpacity key={lembrete.id} onPress={() => router.push(lembrete.route as any)}>
                <Card style={styles.reminderCard}>
                  <lembrete.icon size={24} color={Colors.primary.dark} />
                  <View style={styles.reminderContent}>
                    <Text style={styles.reminderTitle}>{lembrete.title}</Text>
                    <Text style={styles.reminderDescription}>{lembrete.description}</Text>
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          ) : (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>Você completou todas as suas tarefas diárias!</Text>
              <Text style={styles.emptySubtext}>Bom trabalho! ✨</Text>
            </Card>
          )}
        </View>

        {/* Últimas Conquistas */}
        {pontos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Últimas Conquistas</Text>
            {pontos.slice(0, 3).map((ponto) => (
              <Card key={ponto.id} style={styles.achievementCard}>
                <Award size={16} color={Colors.primary.accent} strokeWidth={2} />
                <View style={styles.achievementContent}>
                  <Text style={styles.achievementText}>{formatarMotivo(ponto.motivo)}</Text>
                  {ponto.data && (
                    <Text style={styles.achievementDate}>
                      {format(new Date(ponto.data), 'dd/MM/yyyy', { locale: ptBR })}
                    </Text>
                  )}
                </View>
                <Text style={styles.achievementPoints}>+{ponto.quantidade || 0}</Text>
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
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: Fonts.sizes.body,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary.dark,
  },
  reminderDescription: {
    fontSize: Fonts.sizes.small,
    color: Colors.neutral.gray400,
    marginTop: 2,
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
    marginTop: Spacing.md,
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
  followButton: {
    backgroundColor: Colors.primary.accent,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  followButtonText: {
    color: Colors.neutral.white,
    fontSize: Fonts.sizes.body,
    fontWeight: Fonts.weights.medium,
  },
});