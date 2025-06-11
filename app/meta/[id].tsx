/**
 * @fileoverview Tela de detalhes da meta (Meta Inside) - Versão Aprimorada
 * @author Cascade
 * @date 2025-06-10
 * @version 2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Share } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { type Database } from '@/lib/database.types';
import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/Colors';
import { Button } from '@/components/ui/Button';
import { format, parseISO, intervalToDuration } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Calendar, Target as TargetIcon, Award, Brain, Clock, AlertTriangle, Info, FileText, Send } from 'lucide-react-native';

type Meta = Database['public']['Tables']['metas']['Row'];

const MetaInsideScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRelapseLoading, setIsRelapseLoading] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const fetchMetaDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.from('metas').select('*').eq('id', id).single();
      if (error) throw error;
      if (data) setMeta(data);
    } catch (error) {
      console.error('Erro ao buscar detalhes da meta:', error);
      Alert.alert('Erro', 'Não foi possível carregar os detalhes da meta.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchMetaDetails();
  }, [fetchMetaDetails]);

  useEffect(() => {
    if (!meta || !meta.data_inicio || meta.status !== 'ativa' || isCompleting) {
      if (meta?.status !== 'ativa') {
        setTimeElapsed({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
      return;
    }

    const startDate = parseISO(meta.data_inicio);
    const timer = setInterval(() => {
      const now = new Date();
      const duration = intervalToDuration({ start: startDate, end: now });
      setTimeElapsed({
        days: duration.days || 0,
        hours: duration.hours || 0,
        minutes: duration.minutes || 0,
        seconds: duration.seconds || 0,
      });

      const progressInDays = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      if (meta.objetivo_numerico && progressInDays >= meta.objetivo_numerico) {
        clearInterval(timer);
        handleCompleteMeta();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [meta, isCompleting]);

  const handleShare = async () => {
    if (!meta) return;
    try {
      const timeString = `${timeElapsed.days}d ${timeElapsed.hours}h ${timeElapsed.minutes}m`;
      await Share.share({
        message: `Estou há ${timeString} livre de ${meta.tipo_vicio}! Minha meta atual é: "${meta.titulo}". #PapoRetoApp`,
      });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível compartilhar a meta.');
    }
  };

  const handleRelapse = async () => {
    if (!meta) return;
    Alert.alert(
      'Confirmar Recaída',
      'Sua meta será reiniciada e a contagem de tempo voltará para o zero. Você tem certeza?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            setIsRelapseLoading(true);
            const { error } = await supabase
              .from('metas')
              .update({ data_inicio: new Date().toISOString() })
              .eq('id', meta.id);

            if (error) {
              Alert.alert('Erro', 'Não foi possível registrar a recaída. Tente novamente.');
              console.error('Erro ao registrar recaída:', error.message);
            } else {
              Alert.alert(
                'Contador Reiniciado',
                'Não desanime. A jornada da recuperação é feita de recomeços. Estamos com você!'
              );
              await fetchMetaDetails();
            }
            setIsRelapseLoading(false);
          },
        },
      ]
    );
  };

  const handleCompleteMeta = async () => {
    if (!meta || isCompleting) return;

    setIsCompleting(true);

    try {
      const { error: updateError } = await supabase
        .from('metas')
        .update({ status: 'concluida' })
        .eq('id', meta.id);

      if (updateError) throw updateError;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: pointsError } = await supabase.from('pontos').insert({
          user_id: user.id,
          quantidade: 5,
          motivo: 'meta_concluida',
          meta_id: meta.id,
        });
        if (pointsError) throw pointsError;
      }

      Alert.alert(
        'Meta Concluída!',
        'Parabéns! Você alcançou seu objetivo e ganhou +5 pontos. Continue assim!',
        [{ text: 'OK', onPress: () => fetchMetaDetails() }]
      );
    } catch (error) {
      console.error('Erro ao completar meta:', error);
      Alert.alert('Erro', 'Não foi possível registrar a conclusão da meta. Tente novamente.');
    } finally {
      setIsCompleting(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'ativa':
        return { text: 'Ativa', color: Colors.success, icon: <Award size={16} color={Colors.neutral.white} /> };
      case 'concluida':
        return { text: 'Concluída', color: Colors.primary.accent, icon: <Award size={16} color={Colors.neutral.white} /> };
      case 'falha':
        return { text: 'Falhou', color: Colors.error, icon: <AlertTriangle size={16} color={Colors.neutral.white} /> };
      default:
        return { text: 'Desconhecido', color: Colors.neutral.gray400, icon: <Award size={16} color={Colors.neutral.white} /> };
    }
  };

  const TimeBox = ({ value, label }: { value: number; label: string }) => (
    <View style={styles.timeBox}>
      <Text style={styles.timeValue}>{String(value).padStart(2, '0')}</Text>
      <Text style={styles.timeLabel}>{label}</Text>
    </View>
  );

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary.dark} /></View>;
  }

  if (!meta) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Meta não encontrada.</Text>
        <Button label="Voltar" onPress={() => router.back()} />
      </View>
    );
  }

  const statusInfo = getStatusInfo(meta.status);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>{meta.titulo}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
            {statusInfo.icon}
            <Text style={styles.statusText}>{statusInfo.text}</Text>
          </View>
        </View>

        {meta.status === 'ativa' && (
          <View style={styles.timerCard}>
            <Text style={styles.timerTitle}>Tempo de Foco Contínuo</Text>
            <View style={styles.timerContainer}>
              <TimeBox value={timeElapsed.days} label="dias" />
              <TimeBox value={timeElapsed.hours} label="horas" />
              <TimeBox value={timeElapsed.minutes} label="min" />
              <TimeBox value={timeElapsed.seconds} label="seg" />
            </View>
          </View>
        )}

{meta.status === 'ativa' && (
          <View style={styles.actionButtonContainer}>
            <Button
              label="Tive uma Recaída"
              onPress={handleRelapse}
              variant="destructive"
              isLoading={isRelapseLoading}
              iconLeft={<AlertTriangle size={18} color={Colors.neutral.white} />}
            />
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.cardTitleContainer}>
            <Info size={22} color={Colors.primary.accent} />
            <Text style={styles.cardTitle}>Informações</Text>
          </View>
          <View style={styles.detailRow}>
            <TargetIcon size={20} color={Colors.primary.accent} />
            <Text style={styles.detailText}>Vício: {meta.tipo_vicio}</Text>
          </View>
          <View style={styles.detailRow}>
            <TargetIcon size={20} color={Colors.primary.accent} />
            <Text style={styles.detailText}>Objetivo: {meta.objetivo_numerico} {meta.unidade}</Text>
          </View>
          <View style={styles.detailRow}>
            <Calendar size={20} color={Colors.primary.accent} />
            <Text style={styles.detailText}>
              Início: {format(parseISO(meta.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
            </Text>
          </View>
        </View>

        {meta.descricao && (
          <View style={styles.card}>
            <View style={styles.cardTitleContainer}>
              <FileText size={22} color={Colors.primary.accent} />
              <Text style={styles.cardTitle}>Descrição</Text>
            </View>
            <Text style={styles.description}>{meta.descricao}</Text>
          </View>
        )}

        {meta.gemini_content && (
          <View style={styles.card}>
            <View style={styles.cardTitleContainer}>
              <Brain size={22} color={Colors.primary.accent} />
              <Text style={styles.cardTitle}>Dica do Dia</Text>
            </View>
            <Text style={styles.description}>{meta.gemini_content.replace(/\*\*/g, '')}</Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.cardTitleContainer}>
            <Award size={22} color={Colors.primary.accent} />
            <Text style={styles.cardTitle}>Compartilhe seu Sucesso</Text>
          </View>
          <Text style={styles.description}>
            Seu progresso é uma inspiração! Compartilhe sua jornada e motive outras pessoas a começarem a sua.
          </Text>
          <View style={styles.cardActionButton}>
            <Button
              label="Compartilhar Conquista"
              onPress={handleShare}
              variant="secondary"
              iconLeft={<Send size={18} color={Colors.primary.dark} />}
            />
          </View>
        </View>

        
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.appBackground },
  scrollContent: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.appBackground },
  header: { marginBottom: Spacing.lg, alignItems: 'center' },
  title: { fontSize: Fonts.sizes.title, fontWeight: Fonts.weights.bold, color: Colors.primary.dark, textAlign: 'center', marginBottom: Spacing.md },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.xl },
  statusText: { color: Colors.neutral.white, fontWeight: Fonts.weights.bold, marginLeft: Spacing.sm, fontSize: Fonts.sizes.small },
  timerCard: { backgroundColor: Colors.primary.dark, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg, alignItems: 'center' },
  timerTitle: { fontSize: Fonts.sizes.body, fontWeight: Fonts.weights.medium, color: Colors.neutral.white, marginBottom: Spacing.md },
  timerContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  timeBox: { alignItems: 'center' },
  timeValue: { fontSize: Fonts.sizes.large, fontWeight: Fonts.weights.bold, color: Colors.neutral.white, fontVariant: ['tabular-nums'] },
  timeLabel: { fontSize: Fonts.sizes.small, color: Colors.primary.light, marginTop: Spacing.xs },
  card: { backgroundColor: Colors.neutral.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: Fonts.sizes.subtitle,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary.dark,
    marginLeft: Spacing.md,
  },
  description: { fontSize: Fonts.sizes.body, color: Colors.neutral.gray800, lineHeight: 24 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  detailText: { fontSize: Fonts.sizes.body, color: Colors.neutral.gray800, marginLeft: Spacing.md },
  actionButtonContainer: { marginBottom: Spacing.md, paddingHorizontal: Spacing.md },
  cardActionButton: {
    marginTop: Spacing.lg,
  },
  errorText: { fontSize: Fonts.sizes.body, color: Colors.error, marginBottom: Spacing.lg },
});

export default MetaInsideScreen;
