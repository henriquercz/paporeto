/**
 * @file MarcarEncontroModal.tsx
 * @description Modal para marcar encontros da comunidade com seletor de data/hora aprimorado para iOS.
 * @autor Cascade
 * @date 2025-06-11
 * @version 1.3
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/Colors';
import { X, Calendar, Clock } from 'lucide-react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

interface MarcarEncontroModalProps {
  isVisible: boolean;
  onClose: () => void;
  onEncontroMarcado: () => void;
}

const MarcarEncontroModal: React.FC<MarcarEncontroModalProps> = ({ isVisible, onClose, onEncontroMarcado }) => {
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [titulo, setTitulo] = useState('');
  const [local, setLocal] = useState('');
  const [date, setDate] = useState(new Date());
  // Picker state
  const [tempDate, setTempDate] = useState(new Date());
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    if (isVisible) {
      fetchUser();
      // Reset state on open
      setTitulo('');
      setLocal('');
      setDate(new Date());
      setLoading(false);
    }
  }, [isVisible]);

  const handleMarcarEncontro = async () => {
    if (!userId) {
      Alert.alert('Erro', 'Usuário não autenticado. Por favor, tente novamente.');
      return;
    }
    if (!titulo.trim() || !local.trim()) {
      Alert.alert('Campos Obrigatórios', 'Por favor, preencha o título e o local do encontro.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('chats_forum').insert({
        titulo: titulo.trim(),
        conteudo: `Encontro da comunidade em ${local.trim()}.`,
        user_id: userId,
        post_type: 'encontro',
        encontro_local: local.trim(),
        encontro_data_hora: date.toISOString(),
        upvotes: 0,
        is_deleted: false,
      });

      if (error) throw error;

      Alert.alert('Sucesso!', 'Encontro marcado e publicado na comunidade.');
      onEncontroMarcado();
      onClose();
    } catch (error: any) {
      console.error('Erro ao marcar encontro:', error);
      Alert.alert('Erro', `Não foi possível marcar o encontro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const currentDate = selectedDate || tempDate;
    setTempDate(currentDate);
  };

  const showPickerModal = () => {
    setTempDate(date);
    setPickerMode('date');
    setShowPicker(true);
  };

  const handlePickerConfirm = () => {
    if (pickerMode === 'date') {
      setPickerMode('time');
    } else {
      setDate(tempDate);
      setShowPicker(false);
    }
  };

  const handlePickerCancel = () => {
    setShowPicker(false);
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <View style={styles.header}>
              <Text style={styles.modalTitle}>Marcar Novo Encontro</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={Colors.neutral.gray800} />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.label}>Título do Encontro</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Roda de conversa no parque"
                placeholderTextColor={Colors.neutral.gray400}
                value={titulo}
                onChangeText={setTitulo}
              />
              <Text style={styles.label}>Local</Text>
              <TextInput
                style={styles.input}
                placeholder="Endereço ou ponto de referência"
                placeholderTextColor={Colors.neutral.gray400}
                value={local}
                onChangeText={setLocal}
              />
              <Text style={styles.label}>Data e Horário</Text>
              <TouchableOpacity onPress={showPickerModal} style={styles.datePickerButton}>
                <Calendar size={18} color={Colors.neutral.gray400} />
                <Text style={styles.datePickerText}>
                  {`${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                </Text>
              </TouchableOpacity>

              {/* Picker Modal Overlay */}
              {showPicker && (
                <View style={styles.pickerOverlay}>
                  <View style={styles.pickerContainer}>
                    <View style={styles.pickerHeader}>
                      <TouchableOpacity onPress={handlePickerCancel}>
                        <Text style={styles.pickerButtonText}>Cancelar</Text>
                      </TouchableOpacity>
                      <Text style={styles.pickerTitle}>{pickerMode === 'date' ? 'Selecione a Data' : 'Selecione a Hora'}</Text>
                      <TouchableOpacity onPress={handlePickerConfirm}>
                        <Text style={styles.pickerButtonText_confirm}>{pickerMode === 'date' ? 'Próximo' : 'Confirmar'}</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      testID="dateTimePicker"
                      value={tempDate}
                      mode={pickerMode}
                      display="spinner"
                      onChange={handlePickerChange}
                      locale="pt-BR"
                      is24Hour={true}
                    />
                  </View>
                </View>
              )}
            </View>

            <Button
              label={loading ? 'Marcando...' : 'Confirmar Encontro'}
              onPress={handleMarcarEncontro}
              disabled={loading}
              variant='primary'
              style={styles.submitButton}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default MarcarEncontroModal;

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    width: '100%',
    backgroundColor: Colors.neutral.white,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: Fonts.sizes.title,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary.dark,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  formContainer: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Fonts.sizes.body,
    fontWeight: Fonts.weights.medium,
    color: Colors.neutral.gray800,
    marginBottom: Spacing.sm,
  },
  input: {
    width: '100%',
    backgroundColor: Colors.neutral.gray100,
    borderWidth: 1,
    borderColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Fonts.sizes.body,
    color: Colors.primary.dark,
    marginBottom: Spacing.md,
  },
  datePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  datePickerInput: {
    flex: 1,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral.white,
    borderWidth: 1,
    borderColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12, // Ajuste para alinhar altura com TextInput
    gap: Spacing.sm
  },
  datePickerText: {
    fontSize: Fonts.sizes.body,
    color: Colors.neutral.gray800,
  },
  submitButton: {
    marginTop: Spacing.lg,
  },
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerContainer: {
    backgroundColor: Colors.neutral.white,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    paddingBottom: Spacing.lg,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.gray100,
  },
  pickerTitle: {
    fontSize: Fonts.sizes.body,
    fontWeight: Fonts.weights.bold,
    color: Colors.neutral.gray800,
  },
  pickerButtonText: {
    fontSize: Fonts.sizes.body,
    color: Colors.primary.accent,
  },
  pickerButtonText_confirm: {
    fontSize: Fonts.sizes.body,
    color: Colors.primary.accent,
    fontWeight: Fonts.weights.bold,
  },
});
