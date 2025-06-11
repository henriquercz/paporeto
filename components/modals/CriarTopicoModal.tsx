/**
 * @file CriarTopicoModal.tsx
 * @description Modal para criação de novos tópicos no fórum da comunidade.
 * @autor Cascade
 * @date 2025-06-07
 * @version 1.0
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button'; // Corrigido para named import
import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/Colors';
import { X } from 'lucide-react-native';
import { Database } from '@/lib/database.types'; // Corrigido o caminho

type PostType = 'relato' | 'dica' | 'ajuda' | 'encontro';

// Adicionar post_type à definição de inserção.
// Usamos interseção de tipos (&) para combinar o tipo base com nossa propriedade adicional.
type CustomChatsForumInsert = Database['public']['Tables']['chats_forum']['Insert'] & {
  post_type?: PostType;
};

interface CriarTopicoModalProps {
  isVisible: boolean;
  onClose: () => void;
  onTopicCreated: (postType: PostType) => void; // Modificado para passar o tipo de postagem
  onOpenMarcarEncontroModal: () => void;
}

const CriarTopicoModal: React.FC<CriarTopicoModalProps> = ({ isVisible, onClose, onTopicCreated, onOpenMarcarEncontroModal }) => {
  const [postType, setPostType] = useState<PostType>('relato');
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    if (isVisible) {
      fetchUser();
      // Resetar campos ao abrir o modal
      setPostType('relato');
      setTitulo('');
      setConteudo('');
    }
  }, [isVisible]);

  const handleCriarTopico = async () => {
    if (postType === 'encontro') {
      onOpenMarcarEncontroModal();
      onClose(); // Fecha o modal atual
      return;
    }

    if (!titulo.trim()) {
      Alert.alert('Campo Obrigatório', 'Por favor, insira um título.');
      return;
    }
    if (!conteudo.trim()) {
      Alert.alert('Campo Obrigatório', 'Por favor, insira o conteúdo.');
      return;
    }
    if (!userId) {
      Alert.alert('Erro de Autenticação', 'Usuário não identificado. Por favor, tente fazer login novamente.');
      console.error('Tentativa de criar tópico sem userId');
      return;
    }

    setLoading(true);

    const novoTopico: CustomChatsForumInsert = {
      topic: titulo.trim(),
      content: conteudo.trim(),
      user_id: userId,
      is_deleted: false,
      upvotes: 0,
      post_type: postType,
      // parent_message_id, tags, deleted_at serão null por padrão no DB ou podem ser omitidos
    };

    console.log('Enviando novo tópico para Supabase:', JSON.stringify(novoTopico, null, 2));

    try {
      const { error } = await supabase.from('chats_forum').insert(novoTopico as any); // Usar 'as any' temporariamente se CustomChatsForumInsert não for aceito diretamente devido a tipos gerados vs. customizados.

      if (error) {
        console.error('Erro ao criar tópico no Supabase:', JSON.stringify(error, null, 2));
        Alert.alert('Erro ao Criar', `Não foi possível criar o tópico: ${error.message}. Verifique as políticas de segurança (RLS) da tabela 'chats_forum'.`);
      } else {
        Alert.alert('Sucesso', 'Postagem criada com sucesso!');
        onTopicCreated(postType);
        onClose(); 
      }
    } catch (e: any) {
      console.error('Erro inesperado ao criar tópico:', e);
      Alert.alert('Erro Inesperado', `Ocorreu um erro: ${e.message}`);
    } finally {
      setLoading(false);
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
              <Text style={styles.modalTitle}>Nova Postagem</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={Colors.neutral.gray800} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Tipo de Postagem</Text>
            <View style={styles.postTypeContainer}>
              {(['relato', 'dica', 'ajuda', 'encontro'] as PostType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.postTypeButton, postType === type && styles.postTypeButtonSelected]}
                  onPress={() => setPostType(type)}
                >
                  <Text style={[styles.postTypeButtonText, postType === type && styles.postTypeButtonTextSelected]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {postType !== 'encontro' && (
              <View style={styles.formContainer}>
                <Text style={styles.label}>Título</Text>
                <TextInput
                  style={styles.input}
                  placeholder={postType === 'dica' ? 'Qual sua dica?' : postType === 'ajuda' ? 'Qual sua dúvida/pedido?' : 'Assunto do seu relato'}
                  placeholderTextColor={Colors.neutral.gray400}
                  value={titulo}
                  onChangeText={setTitulo}
                  maxLength={150}
                />

                <Text style={styles.label}>Conteúdo</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={`Descreva com mais detalhes...`}
                  placeholderTextColor={Colors.neutral.gray400}
                  value={conteudo}
                  onChangeText={setConteudo}
                  multiline={true}
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>
            )}

            {postType === 'encontro' && (
              <View style={styles.encontroPlaceholderContainer}>
                <Text style={styles.encontroPlaceholderText}>
                  A funcionalidade de "Marcar Encontro" abrirá um formulário específico para detalhes como localização, data e tipo de vício.
                </Text>
              </View>
            )}

            <Button 
              label={loading ? 'Enviando...' : (postType === 'encontro' ? 'Próximo' : 'Publicar')}
              onPress={handleCriarTopico} 
              disabled={loading}
              variant='primary'
              style={styles.submitButton}
            />
            {loading && <ActivityIndicator style={styles.activityIndicator} size="small" color={Colors.primary.dark} />}
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
  },
  label: {
    fontSize: Fonts.sizes.body,
    fontWeight: Fonts.weights.medium,
    color: Colors.neutral.gray800,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.neutral.gray400,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Fonts.sizes.body,
    color: Colors.neutral.gray800,
    backgroundColor: Colors.neutral.white,
  },
  textArea: {
    minHeight: 100,
    maxHeight: 200, 
  },
  postTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.md,
  },
  postTypeButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary.dark,
  },
  postTypeButtonSelected: {
    backgroundColor: Colors.primary.dark,
  },
  postTypeButtonText: {
    fontSize: Fonts.sizes.small,
    color: Colors.primary.dark,
    fontWeight: Fonts.weights.medium,
  },
  postTypeButtonTextSelected: {
    color: Colors.neutral.white,
  },
  encontroPlaceholderContainer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    backgroundColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.md,
    marginVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  encontroPlaceholderText: {
    fontSize: Fonts.sizes.body,
    color: Colors.neutral.gray800,
    textAlign: 'center',
    lineHeight: Fonts.sizes.body * 1.4,
  },
  submitButton: {
    marginTop: Spacing.md,
  },
  activityIndicator: {
    marginTop: Spacing.sm,
  }
});

export default CriarTopicoModal;
