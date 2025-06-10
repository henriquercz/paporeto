/**
 * @file MarcarEncontroModal.tsx
 * @description Modal para marcar encontros da comunidade.
 * @autor Cascade
 * @date 2025-06-07
 * @version 1.0
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
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
import { X } from 'lucide-react-native';
import { Database } from '@/lib/database.types';

// TODO: Definir os campos específicos para marcar encontro e o tipo de inserção correspondente
// Exemplo: type EncontroInsert = Database['public']['Tables']['encontros']['Insert'];

interface MarcarEncontroModalProps {
  isVisible: boolean;
  onClose: () => void;
  // onEncontroMarcado: () => void; // Callback para quando um encontro for criado com sucesso
}

const MarcarEncontroModal: React.FC<MarcarEncontroModalProps> = ({ isVisible, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // TODO: Adicionar estados para os campos do formulário (localização, data, tipoVicio, etc.)
  // Ex: const [localizacao, setLocalizacao] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    if (isVisible) {
      fetchUser();
      // TODO: Resetar campos do formulário ao abrir
    }
  }, [isVisible]);

  const handleMarcarEncontro = async () => {
    if (!userId) {
      Alert.alert('Erro', 'Usuário não autenticado. Por favor, tente novamente.');
      return;
    }
    // TODO: Adicionar validações para os campos do formulário

    setLoading(true);
    Alert.alert('Em Desenvolvimento', 'Funcionalidade de marcar encontro ainda em desenvolvimento.');
    // TODO: Implementar a lógica de inserção na tabela de encontros do Supabase
    // Ex: const { error } = await supabase.from('encontros').insert({ ... });
    setLoading(false);
    // onClose(); // Fechar modal após sucesso ou se desejado
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
              <Text style={styles.placeholderText}>
                Formulário para marcar encontro (localização, data, tipo de dependentes, etc.) será implementado aqui.
              </Text>
              {/* TODO: Adicionar Inputs para os campos do encontro */}
            </View>

            <Button 
              title={loading ? 'Marcando...' : 'Marcar Encontro'}
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

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '90%',
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
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
    marginBottom: Spacing.md,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: Fonts.sizes.body,
    color: Colors.neutral.gray400, // Corrigido de gray500 para gray400
    textAlign: 'center',
    lineHeight: Fonts.sizes.body * 1.5,
  },
  submitButton: {
    marginTop: Spacing.md,
  },
});

export default MarcarEncontroModal;
