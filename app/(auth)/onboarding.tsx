import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/Colors';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';
import { GeminiService } from '@/lib/gemini'; // Adicionar se não estiver presente
import { type Database } from '@/lib/database.types';
import { useRouter } from 'expo-router';

interface RpcFinalizarOnboardingResponse {
  status: 'sucesso' | 'erro';
  message?: string;
}

interface FinalizarOnboardingUsuarioArgs {
  p_tipo_vicio: string;
  p_nivel_dependencia: string;
  p_gemini_content: string | null;
}

const TIPOS_VICIO = [
  'Cigarro',
  'Álcool',
  'Maconha',
  'Pornografia',
  'Jogos',
  'Redes Sociais',
  'Outro',
];

const NIVEIS_DEPENDENCIA = [
  { label: 'Leve', value: 'leve' },
  { label: 'Moderado', value: 'moderado' },
  { label: 'Severo', value: 'severo' },
];

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedVicio, setSelectedVicio] = useState('');
  const [customVicio, setCustomVicio] = useState('');
  const router = useRouter();
  const [nivelDependencia, setNivelDependencia] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNext = () => {
    if (currentStep === 0 && !selectedVicio) {
      Alert.alert('Atenção', 'Por favor, selecione o tipo de vício');
      return;
    }
    if (currentStep === 1 && !nivelDependencia) {
      Alert.alert('Atenção', 'Por favor, selecione o nível de dependência');
      return;
    }
    
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinalizarOnboarding();
    }
  };

  const handleFinalizarOnboarding = async () => {
    const vicioFinal = selectedVicio === 'Outro' ? customVicio.trim() : selectedVicio;
    if (!vicioFinal || !nivelDependencia) {
      Alert.alert('Campos incompletos', 'Por favor, preencha todas as informações sobre seu vício e nível de dependência.');
      return;
    }

    setLoading(true);
    try {
      // Etapa 1: Gerar conteúdo da meta com Gemini
      console.log('[OnboardingScreen] Gerando conteúdo da meta com Gemini para o vício:', vicioFinal);
      let geminiContent = '';
      try {
        geminiContent = await GeminiService.gerarConteudoMeta(vicioFinal, nivelDependencia);
        console.log('[OnboardingScreen] Conteúdo da meta gerado pela Gemini:', geminiContent);
        if (!geminiContent) {
          geminiContent = `Conteúdo de apoio para superar o vício em ${vicioFinal}.`; // Fallback
        }
      } catch (geminiError: any) {
        console.error('[OnboardingScreen] Erro ao gerar conteúdo da meta com Gemini:', geminiError);
        Alert.alert(
          'Erro na Geração da Meta',
          `Não foi possível gerar o conteúdo da sua meta inicial: ${geminiError.message}. Por favor, verifique sua chave da API Gemini e tente novamente.`
        );
        // Não precisa de setLoading(false) aqui, o finally principal cuidará disso.
        return; // Parar o fluxo se a Gemini falhar
      }

      // Etapa 2: Chamar a função RPC do Supabase

      // Log para verificar a sessão do Supabase antes da chamada RPC
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('[OnboardingScreen] Erro ao obter sessão do Supabase:', sessionError.message);
        Alert.alert('Erro de Sessão', `Não foi possível verificar sua sessão: ${sessionError.message}. Por favor, tente novamente.`);
        setLoading(false);
        return;
      }
      
      console.log('[OnboardingScreen] Objeto sessionData.session ANTES da chamada RPC:', sessionData.session);
      console.log('[OnboardingScreen] Objeto sessionData.session?.user ANTES da chamada RPC:', sessionData.session?.user);

      if (!sessionData.session || !sessionData.session.user) {
          Alert.alert('Erro de Autenticação', 'Sua sessão não foi encontrada ou está inválida no cliente. Por favor, faça login novamente.');
          console.log('[OnboardingScreen] Bloqueando chamada RPC porque sessionData.session ou sessionData.session.user é nulo/undefined no cliente.');
          setLoading(false);
          router.replace('/(auth)/login'); 
          return;
      }
      // Fim do log de verificação da sessão

      console.log('[OnboardingScreen] Chamando RPC supabase finalizar_onboarding_usuario com:', {
        p_tipo_vicio: vicioFinal,
        p_nivel_dependencia: nivelDependencia,
        p_gemini_content: geminiContent,
      });

      const { data: rpcData, error: rpcError } = await supabase.rpc<'finalizar_onboarding_usuario', Database['public']['Functions']['finalizar_onboarding_usuario']>('finalizar_onboarding_usuario', {
        p_tipo_vicio: vicioFinal,
        p_nivel_dependencia: nivelDependencia,
        p_gemini_content: geminiContent,
      });

      if (rpcError) {
        console.error('[OnboardingScreen] Erro ao chamar RPC finalizar_onboarding_usuario:', rpcError);
        Alert.alert('Erro no Onboarding', `Não foi possível completar seu onboarding: ${rpcError.message}. Tente novamente.`);
        setLoading(false); // Certifique-se de parar o loading em caso de erro na RPC
        return; // Parar o fluxo se a RPC falhar
      }

      console.log('[OnboardingScreen] Resposta da RPC:', rpcData);
      const typedRpcData = rpcData as RpcFinalizarOnboardingResponse | null;

      if (typedRpcData && typedRpcData.status === 'sucesso') {
        Alert.alert('Onboarding Concluído!', 'Seu perfil e meta inicial foram configurados com sucesso. Bem-vindo(a) ao PapoReto!');
        router.replace('/(tabs)');
      } else {
        console.error('[OnboardingScreen] Erro retornado pela RPC:', typedRpcData?.message || 'Erro desconhecido da RPC');
        Alert.alert('Erro no Onboarding', `Não foi possível completar seu onboarding: ${typedRpcData?.message || 'Ocorreu um erro no servidor.'}. Tente novamente.`);
      }
    } catch (e: any) {
      // Este catch é para erros inesperados não tratados pelos blocos try/catch internos
      console.error('[OnboardingScreen] Exceção geral ao finalizar onboarding:', e);
      Alert.alert('Erro Crítico', `Ocorreu um erro inesperado durante o onboarding: ${e.message || 'Por favor, contate o suporte ou tente mais tarde.'}`);
    } finally {
      setLoading(false);
    }
  };

  const renderStepOne = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Escolha o vício que você deseja vencer:</Text>
      <ScrollView style={styles.optionsContainer} showsVerticalScrollIndicator={false}>
        {TIPOS_VICIO.map((vicio) => (
          <TouchableOpacity
            key={vicio}
            style={[
              styles.optionCard,
              selectedVicio === vicio && styles.optionCardSelected,
            ]}
            onPress={() => setSelectedVicio(vicio)}
          >
            <Text style={[
              styles.optionText,
              selectedVicio === vicio && styles.optionTextSelected,
            ]}>
              {vicio}
            </Text>
            {vicio !== 'Outro' && (
              <Plus size={20} color={selectedVicio === vicio ? Colors.neutral.white : Colors.neutral.gray400} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderStepTwo = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Como você avalia seu nível de dependência?</Text>
      <View style={styles.optionsContainer}>
        {NIVEIS_DEPENDENCIA.map((nivel) => (
          <TouchableOpacity
            key={nivel.value}
            style={[
              styles.optionCard,
              nivelDependencia === nivel.value && styles.optionCardSelected,
            ]}
            onPress={() => setNivelDependencia(nivel.value)}
          >
            <Text style={[
              styles.optionText,
              nivelDependencia === nivel.value && styles.optionTextSelected,
            ]}>
              {nivel.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStepThree = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Pronto para começar!</Text>
      <Card style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Resumo do seu perfil:</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Vício:</Text>
          <Text style={styles.summaryValue}>
            {selectedVicio === 'Outro' ? customVicio : selectedVicio}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Nível:</Text>
          <Text style={styles.summaryValue}>
            {NIVEIS_DEPENDENCIA.find(n => n.value === nivelDependencia)?.label}
          </Text>
        </View>
      </Card>
      <Text style={styles.encouragementText}>
        Você está dando o primeiro passo para uma vida mais saudável. 
        Vamos criar sua primeira meta juntos!
      </Text>
    </View>
  );

  const getButtonText = () => {
    if (loading) return 'FINALIZANDO...';
    if (currentStep === 2) return 'INICIAR JORNADA';
    return 'CONTINUAR';
  };

  return (
    <LinearGradient 
      colors={[Colors.primary.light, Colors.primary.dark]} 
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Configuração Inicial</Text>
          <Text style={styles.stepIndicator}>{currentStep + 1} de 3</Text>
        </View>

        <View style={styles.content}>
          {currentStep === 0 && renderStepOne()}
          {currentStep === 1 && renderStepTwo()}
          {currentStep === 2 && renderStepThree()}
        </View>

        <View style={styles.footer}>
          <Button
            title={getButtonText()}
            onPress={handleNext}
            disabled={loading}
            variant="primary"
            size="large"
          />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: Fonts.sizes.title,
    fontWeight: Fonts.weights.bold,
    color: Colors.neutral.white,
  },
  stepIndicator: {
    fontSize: Fonts.sizes.body,
    color: Colors.neutral.white,
    opacity: 0.8,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: Fonts.sizes.subtitle,
    fontWeight: Fonts.weights.bold,
    color: Colors.neutral.white,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  optionsContainer: {
    flex: 1,
  },
  optionCard: {
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionCardSelected: {
    backgroundColor: Colors.primary.accent,
  },
  optionText: {
    fontSize: Fonts.sizes.body,
    fontWeight: Fonts.weights.medium,
    color: Colors.neutral.gray800,
  },
  optionTextSelected: {
    color: Colors.neutral.white,
  },
  summaryCard: {
    marginBottom: Spacing.lg,
  },
  summaryTitle: {
    fontSize: Fonts.sizes.subtitle,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary.dark,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  summaryLabel: {
    fontSize: Fonts.sizes.body,
    color: Colors.neutral.gray400,
  },
  summaryValue: {
    fontSize: Fonts.sizes.body,
    fontWeight: Fonts.weights.medium,
    color: Colors.primary.dark,
  },
  encouragementText: {
    fontSize: Fonts.sizes.body,
    color: Colors.neutral.white,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.9,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
});