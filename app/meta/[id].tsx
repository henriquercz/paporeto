/**
 * @fileoverview Tela de detalhes da meta (Meta Inside).
 * @author Cascade
 * @date 2025-06-06
 * @version 1.0
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { supabase, Meta } from '@/lib/supabase';
import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/Colors';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { format, differenceInDays, parseISO, addHours, differenceInHours, addWeeks, differenceInWeeks, addMonths, differenceInMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Calendar, Target as TargetIcon, Award, Brain, Clock } from 'lucide-react-native';

// Função para renderizar texto formatado (negrito)
const renderFormattedText = (text: string | undefined | null, baseStyle: object, boldStyle: object) => {
  if (!text) return null;

  return text.split('\n\n').map((paragraph, pIndex) => (
    <Text key={`p-${pIndex}`} style={[baseStyle, { marginBottom: Spacing.sm }]}>
      {paragraph.split(/(\*\*.*?\*\*)/g).filter(Boolean).map((segment, sIndex) => {
        if (segment.startsWith('**') && segment.endsWith('**')) {
          return (
            <Text key={`s-${sIndex}`} style={boldStyle}>
              {segment.substring(2, segment.length - 2)}
            </Text>
          );
        }
        return segment;
      })}
    </Text>
  ));
};

export default function MetaInsideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  console.log(`[MetaInsideScreen] MONTADA. ID dos parâmetros: ${id}`);
  const router = useRouter();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log(`[MetaInsideScreen] useEffect disparado. ID atual: ${id}`);
    if (id) {
      fetchMetaDetails();
    } else {
      console.warn('[MetaInsideScreen] useEffect: ID não encontrado nos parâmetros locais. Definindo erro.');
      setError('ID da meta não fornecido.');
      setLoading(false);
    }
  }, [id]);

  const fetchMetaDetails = async () => {
    console.log(`[MetaInsideScreen] fetchMetaDetails INICIADO para ID: ${id}`);
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('metas')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        throw fetchError;
      }
      console.log('[MetaInsideScreen] Dados da meta recebidos do Supabase:', JSON.stringify(data, null, 2));
      if (data) {
        console.log('[MetaInsideScreen] Tentando definir o estado da meta...');
        setMeta(data);
        console.log('[MetaInsideScreen] Estado da meta DEFINIDO.');
      } else {
        console.warn(`[MetaInsideScreen] Nenhum dado retornado do Supabase para a meta ID: ${id}`);
        setError('Meta não encontrada.');
      }
    } catch (e: any) {
      console.error('[MetaInsideScreen] Erro CRÍTICO ao buscar detalhes da meta:', JSON.stringify(e, null, 2));
      setError('Não foi possível carregar os detalhes da meta. Tente novamente.');
    }
    console.log('[MetaInsideScreen] fetchMetaDetails FINALIZADO. Loading será false.');
    setLoading(false);
  };

  const calcularProgresso = (currentMeta: Meta) => {
    console.log('Calculando progresso para meta:', JSON.stringify(currentMeta, null, 2));
    if (!currentMeta.data_inicio || !currentMeta.objetivo_numerico) {
      console.warn('Dados insuficientes para calcular progresso (data_inicio ou objetivo_numerico ausente).');
      return { porcentagem: 0, tempoRestante: '' };
    }
    console.log('Data Início (antes de parseISO):', currentMeta.data_inicio);
    console.log('Data Fim (antes de parseISO, se existir):', currentMeta.data_fim);
    const dataInicio = parseISO(currentMeta.data_inicio);
    const hoje = new Date();
    if (isNaN(dataInicio.getTime())) {
      console.error('ERRO: dataInicio é inválida após parseISO:', currentMeta.data_inicio);
      return { porcentagem: 0, tempoRestante: 'Erro na data de início' };
    }
    let progressoCalculado = 0;
    let dataFimCalculada: Date;
    let tempoRestanteFormatado = '';

    switch (currentMeta.unidade) {
      case 'horas':
        dataFimCalculada = addHours(dataInicio, currentMeta.objetivo_numerico);
        const horasDecorridas = differenceInHours(hoje, dataInicio);
        progressoCalculado = Math.min(Math.max((horasDecorridas / currentMeta.objetivo_numerico) * 100, 0), 100);
        break;
      case 'dias':
        dataFimCalculada = addDays(dataInicio, currentMeta.objetivo_numerico);
        const diasDecorridos = differenceInDays(hoje, dataInicio);
        progressoCalculado = Math.min(Math.max((diasDecorridos / currentMeta.objetivo_numerico) * 100, 0), 100);
        break;
      case 'semanas':
        dataFimCalculada = addWeeks(dataInicio, currentMeta.objetivo_numerico);
        const semanasDecorridas = differenceInWeeks(hoje, dataInicio);
        progressoCalculado = Math.min(Math.max((semanasDecorridas / currentMeta.objetivo_numerico) * 100, 0), 100);
        break;
      case 'meses':
        dataFimCalculada = addMonths(dataInicio, currentMeta.objetivo_numerico);
        const mesesDecorridos = differenceInMonths(hoje, dataInicio);
        progressoCalculado = Math.min(Math.max((mesesDecorridos / currentMeta.objetivo_numerico) * 100, 0), 100);
        break;
      default: // para 'unidades' ou outros tipos, o progresso é o que está no banco
        progressoCalculado = currentMeta.progresso || 0;
        dataFimCalculada = currentMeta.data_fim ? parseISO(currentMeta.data_fim) : hoje;
    }
    
    // Calcula tempo restante
    if (progressoCalculado < 100 && dataFimCalculada > hoje) {
      const diff = differenceInDays(dataFimCalculada, hoje);
      if (diff > 0) tempoRestanteFormatado = `${diff} dias restantes`;
      else {
        const diffHoras = differenceInHours(dataFimCalculada, hoje);
        if (diffHoras > 0) tempoRestanteFormatado = `${diffHoras} horas restantes`;
        else tempoRestanteFormatado = 'Quase lá!';
      }
    } else if (progressoCalculado >= 100) {
      tempoRestanteFormatado = 'Meta concluída!';
    } else {
      tempoRestanteFormatado = 'Tempo esgotado';
    }

    return {
      porcentagem: progressoCalculado,
      tempoRestante: tempoRestanteFormatado
    };
  };

  console.log(`[MetaInsideScreen] RENDER - Estado atual: loading=${loading}, error='${error}', metaExiste=${!!meta}`);
  if (loading) {
    console.log('[MetaInsideScreen] RENDER: Exibindo ActivityIndicator (loading).');
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary.light} /></View>;
  }

  if (error || !meta) {
    console.log(`[MetaInsideScreen] RENDER: Exibindo mensagem de erro ('${error}') ou meta não encontrada.`);
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Meta não encontrada.'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButtonError}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  console.log('[MetaInsideScreen] RENDER: Exibindo conteúdo da meta.');
  const progressoInfo = calcularProgresso(meta);

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: meta.titulo || 'Detalhes da Meta',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: Spacing.md }}>
              <ArrowLeft size={24} color={Colors.primary.dark} />
            </TouchableOpacity>
          ),
          headerTransparent: true,
          headerBackground: () => (
            <View
              style={{
                flex: 1,
                backgroundColor: Colors.neutral.white,
                borderBottomWidth: 1,
                borderBottomColor: Colors.border,
              }}
            />
          ),
          headerTitleStyle: { color: Colors.primary.dark, fontSize: Fonts.sizes.subtitle, fontWeight: Fonts.weights.medium },
          headerTintColor: Colors.primary.dark,
          headerShadowVisible: false,
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <Text style={styles.title}>{meta.titulo}</Text>
          {meta.descricao && <Text style={styles.description}>{meta.descricao}</Text>}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TargetIcon size={20} color={Colors.primary.dark} />
              <Text style={styles.sectionTitle}>Progresso</Text>
            </View>
            <ProgressBar progress={progressoInfo.porcentagem / 100} />
            <View style={styles.progressDetailsRow}>
                <Text style={styles.progressText}>{progressoInfo.porcentagem.toFixed(0)}% concluído</Text>
                {progressoInfo.tempoRestante && <Text style={styles.tempoRestanteText}>{progressoInfo.tempoRestante}</Text>}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Calendar size={20} color={Colors.primary.dark} />
              <Text style={styles.sectionTitle}>Período</Text>
            </View>
            <Text style={styles.detailText}>Início: {format(parseISO(meta.data_inicio), 'dd/MM/yyyy, HH:mm', { locale: ptBR })}</Text>
            {meta.data_fim_prevista && <Text style={styles.detailText}>Fim Previsto: {format(parseISO(meta.data_fim_prevista), 'dd/MM/yyyy, HH:mm', { locale: ptBR })}</Text>}
            <Text style={styles.detailText}>Objetivo: {meta.objetivo_numerico} {meta.unidade}</Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Award size={20} color={Colors.primary.dark} />
              <Text style={styles.sectionTitle}>Status</Text>
            </View>
            <Text style={[styles.detailText, styles.statusText, { color: meta.status === 'ativa' ? Colors.success : Colors.neutral.gray400 }]}>
              {meta.status.charAt(0).toUpperCase() + meta.status.slice(1)}
            </Text>
          </View>

          {meta.gemini_content && (
            <View style={styles.geminiContentContainer}>
              <Text style={styles.geminiContentTitle}>Dicas e Motivação (IA)</Text>
              {renderFormattedText(meta.gemini_content, styles.geminiParagraph, styles.geminiBoldText)}
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

// Adicionar addDays para o cálculo de progresso
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background, // Cor de fundo da tela
  },
  contentContainer: {
    padding: Spacing.lg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.background,
  },
  errorText: {
    fontSize: Fonts.sizes.body,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  backButtonError: {
    backgroundColor: Colors.primary.light,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  backButtonText: {
    color: Colors.neutral.white,
    fontSize: Fonts.sizes.body,
    fontWeight: Fonts.weights.medium,
  },
  card: {
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Fonts.sizes.large, 
    fontWeight: Fonts.weights.bold,
    color: Colors.primary.dark,
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: Fonts.sizes.body,
    color: Colors.neutral.gray800,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Fonts.sizes.subtitle,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary.dark,
    marginBottom: Spacing.sm,
  },
  progressDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  progressText: {
    fontSize: Fonts.sizes.small,
    color: Colors.neutral.gray400,
  },
  tempoRestanteText: {
    fontSize: Fonts.sizes.small,
    color: Colors.primary.dark,
    fontWeight: Fonts.weights.medium,
  },
  detailText: {
    fontSize: Fonts.sizes.body,
    color: Colors.neutral.gray800,
    marginBottom: Spacing.xs,
    lineHeight: 20,
  },
  statusText: {
    fontWeight: Fonts.weights.bold,
  },
  geminiContentContainer: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.neutral.gray100,
  },
  geminiContentTitle: {
    fontSize: Fonts.sizes.subtitle,
    fontWeight: Fonts.weights.medium,
    color: Colors.primary.dark,
    marginBottom: Spacing.sm,
  },
  geminiParagraph: {
    fontSize: Fonts.sizes.body,
    lineHeight: Fonts.sizes.body * 1.5,
    color: Colors.neutral.gray800,
  },
  geminiBoldText: {
    fontWeight: Fonts.weights.bold,
  },
});
