/**
 * @file MarcarEncontroModal.tsx
 * @description Modal para marcar encontros da comunidade com seletor de data/hora nativo.
 * @autor Cascade
 * @date 2025-06-10
 * @version 1.2
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

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
        topic: titulo.trim(),
        content: `Encontro da comunidade em ${local.trim()}. Data: ${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        user_id: userId,
        post_type: 'encontro',
        local_encontro: local.trim(),
        data_encontro: date.toISOString(),
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

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
        const newDate = new Date(date);
        newDate.setFullYear(selectedDate.getFullYear());
        newDate.setMonth(selectedDate.getMonth());
        newDate.setDate(selectedDate.getDate());
        setDate(newDate);
    }
  };

  const onTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
        const newDate = new Date(date);
        newDate.setHours(selectedDate.getHours());
        newDate.setMinutes(selectedDate.getMinutes());
        setDate(newDate);
    }
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
              <View style={styles.datePickerContainer}>
                <View style={styles.datePickerInput}>
                  <Text style={styles.label}>Data</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
                    <Calendar size={18} color={Colors.neutral.gray400} />
                    <Text style={styles.datePickerText}>{date.toLocaleDateString('pt-BR')}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.datePickerInput}>
                  <Text style={styles.label}>Horário</Text>
                  <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.datePickerButton}>
                    <Clock size={18} color={Colors.neutral.gray400} />
                    <Text style={styles.datePickerText}>{date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {showDatePicker && (
                <DateTimePicker
                  testID="datePicker"
                  value={date}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                  locale="pt-BR"
                />
              )}
              {showTimePicker && (
                <DateTimePicker
                  testID="timePicker"
                  value={date}
                  mode="time"
                  display="default"
                  is24Hour={true}
                  onChange={onTimeChange}
                />
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
    marginTop: Spacing.md,
    width: '100%',
  },
});
