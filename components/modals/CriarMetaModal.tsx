/**
 * @file CriarMetaModal.tsx
 * @description Modal para criação de novas metas pelo usuário.
 * @author Cascade
 * @date 2025-06-06
 * @version 1.0
 */
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Save } from 'lucide-react-native';
import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/Colors';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { type Database } from '@/lib/database.types';
import { GeminiService } from '@/lib/gemini';
import { formatISO, addDays, addHours, addWeeks, addMonths } from 'date-fns';

interface CriarMetaModalProps {
  isVisible: boolean;
  onClose: () => void;
  onMetaCriada: () => void;
  userId?: string; // Passar o ID do usuário para associar a meta
  tipoVicioPadrao?: string;
  nivelDependenciaPadrao?: string;
}

const CriarMetaModal: React.FC<CriarMetaModalProps> = ({
  isVisible,
  onClose,
  onMetaCriada,
  userId,
  tipoVicioPadrao = 'seu hábito',
  nivelDependenciaPadrao = 'moderado',
}) => {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipoVicio, setTipoVicio] = useState(tipoVicioPadrao);
  const [objetivoNumerico, setObjetivoNumerico] = useState('30'); // Default 30 dias
  const [unidade, setUnidade] = useState('dias'); // Default 'dias'
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Resetar campos ao abrir o modal
      setTitulo('');
      setDescricao('');
      setTipoVicio(tipoVicioPadrao || 'seu hábito');
      setObjetivoNumerico('30');
      setUnidade('dias');
      setIsLoading(false); // Garantir que o loading não persista de uma abertura anterior
    }
  }, [isVisible, tipoVicioPadrao]);

  const handleSalvarMeta = async () => {
    if (!userId) {
      Alert.alert('Erro de Autenticação', 'Usuário não identificado. Por favor, tente fazer login novamente.');
      return;
    }
    if (!titulo.trim() || !objetivoNumerico.trim() || !tipoVicio.trim() || !unidade.trim()) {
      Alert.alert('Campos Obrigatórios', 'Por favor, preencha o título, tipo de vício, objetivo e unidade.');
      return;
    }

    const objetivoNum = parseInt(objetivoNumerico, 10);
    if (isNaN(objetivoNum) || objetivoNum <= 0) {
      Alert.alert('Objetivo Inválido', 'O objetivo numérico deve ser um número positivo.');
      return;
    }

    setIsLoading(true);
    try {
      const dataInicio = new Date();
      let dataFim: Date | undefined = undefined;
      const unidadeLower = unidade.trim().toLowerCase();

      if (unidadeLower === 'horas') {
        dataFim = addHours(dataInicio, objetivoNum);
      } else if (unidadeLower === 'dias') {
        dataFim = addDays(dataInicio, objetivoNum);
      } else if (unidadeLower === 'semanas') {
        dataFim = addWeeks(dataInicio, objetivoNum);
      } else if (unidadeLower === 'meses') {
        dataFim = addMonths(dataInicio, objetivoNum);
      }
      // Para unidades como 'vezes', 'unidades', etc., data_fim pode não ser aplicável ou ter outra lógica.
      // Por enquanto, só definimos para unidades de tempo.

      // Gerar conteúdo motivacional com Gemini
      const geminiContent = await GeminiService.gerarConteudoMeta(
        tipoVicio,
        nivelDependenciaPadrao 
      );

      const insertPayload: Database['public']['Tables']['metas']['Insert'] = {
        user_id: userId,
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        tipo_vicio: tipoVicio.trim(),
        objetivo_numerico: objetivoNum,
        unidade: unidade.trim().toLowerCase(),
        data_inicio: formatISO(dataInicio),
        status: 'ativa',
        gemini_content: geminiContent || null,
        data_fim_prevista: dataFim ? formatISO(dataFim) : null,
        data_fim: null, // Será preenchido quando a meta for efetivamente concluída
        data_conclusao: null, // Campo obrigatório conforme o tipo gerado
        progresso: 0, // Inicializa o progresso
      };

      const { data, error } = await supabase.from('metas').insert(insertPayload);

      if (error) {
        console.error('Erro ao salvar meta:', error);
        Alert.alert('Erro ao Salvar', 'Não foi possível criar a meta: ' + error.message);
      } else {
        Alert.alert('Sucesso!', 'Nova meta criada com sucesso!');
        onMetaCriada(); // Callback para atualizar a lista de metas na tela anterior
        onClose(); // Fechar o modal
      }
    } catch (error: any) {
      console.error('Erro inesperado ao salvar meta:', error);
      Alert.alert('Erro Inesperado', `Ocorreu um erro: ${error.message || 'Tente novamente.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose} // Permite fechar com o botão de voltar do Android
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <View style={styles.headerModal}>
              <Text style={styles.modalTitle}>Criar Nova Meta</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={Colors.neutral.gray400} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScrollView} keyboardShouldPersistTaps="handled">
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Título da Meta*</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 30 dias sem açúcar"
                  value={titulo}
                  onChangeText={setTitulo}
                  placeholderTextColor={Colors.neutral.gray400}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Descrição (Opcional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Ex: Melhorar minha saúde e disposição."
                  value={descricao}
                  onChangeText={setDescricao}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor={Colors.neutral.gray400}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Qual Hábito quer Mudar?*</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Cigarro, Álcool, Redes Sociais"
                  value={tipoVicio}
                  onChangeText={setTipoVicio}
                  placeholderTextColor={Colors.neutral.gray400}
                />
              </View>

              <View style={styles.rowInputGroup}>
                <View style={[styles.inputGroup, styles.flexInput]}>
                  <Text style={styles.label}>Objetivo*</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 30"
                    value={objetivoNumerico}
                    onChangeText={setObjetivoNumerico}
                    keyboardType="numeric"
                    placeholderTextColor={Colors.neutral.gray400}
                  />
                </View>
                <View style={[styles.inputGroup, styles.flexInput]}>
                  <Text style={styles.label}>Unidade*</Text>
                  <TextInput 
                    style={styles.input}
                    placeholder="Ex: dias, horas, vezes"
                    value={unidade}
                    onChangeText={setUnidade} 
                    autoCapitalize="none"
                    placeholderTextColor={Colors.neutral.gray400}
                  />
                </View>
              </View>
              <Text style={styles.infoText}>
                Se a unidade for 'dias', a data de fim será calculada automaticamente. Para outras unidades, defina o acompanhamento manualmente.
              </Text>
            </ScrollView>

            <Button
              title={isLoading ? 'Salvando...' : 'Salvar Meta'}
              onPress={handleSalvarMeta}
              disabled={isLoading}
              iconLeft={isLoading ? <ActivityIndicator size="small" color={Colors.neutral.white} /> : <Save size={18} color={Colors.neutral.white} />}
              variant="primary"
              style={styles.saveButton}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end', // Modal sobe da parte inferior
    backgroundColor: 'rgba(0,0,0,0.5)', // Fundo escurecido
  },
  modalView: {
    backgroundColor: Colors.neutral.white,
    borderTopLeftRadius: BorderRadius.xl, // Bordas mais arredondadas
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '90%', // Altura máxima do modal
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3, // Sombra para cima
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 20,
  },
  headerModal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.md, // Espaço extra abaixo do título
    borderBottomWidth: 1, // Linha separadora
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: Fonts.sizes.title, // Tamanho do título aumentado
    fontWeight: Fonts.weights.bold,
    color: Colors.primary.dark,
  },
  closeButton: {
    padding: Spacing.sm, // Área de toque maior
  },
  formScrollView: {
    marginBottom: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  rowInputGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.xs, // Menor espaço antes do infoText
  },
  flexInput: {
    flex: 1,
  },
  label: {
    fontSize: Fonts.sizes.body,
    fontWeight: Fonts.weights.medium,
    color: Colors.neutral.gray800,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.neutral.gray100, // Fundo do input mais suave
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.md : Spacing.sm, // Ajuste de padding vertical para iOS
    fontSize: Fonts.sizes.body,
    color: Colors.neutral.gray800, // Texto do input mais escuro
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingVertical: Spacing.md,
  },
  infoText: {
    fontSize: Fonts.sizes.small,
    color: Colors.neutral.gray400,
    marginTop: Spacing.xs, // Espaçamento ajustado
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  saveButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.md, // Botão maior
  },
});

export default CriarMetaModal;
