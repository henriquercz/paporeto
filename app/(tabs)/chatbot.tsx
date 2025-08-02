import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image } from 'react-native';

import { Send, Bot, User } from 'lucide-react-native';
import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/Colors';
import { Card } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';
import { Tables } from '@/lib/database.types'; // Para referência futura de tipos de tabela
import { GeminiService } from '@/lib/gemini';
import { format, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
const blobAvatar = require('@/assets/images/blob.png');

interface Mensagem {
  id: string;
  texto: string;
  isUser: boolean;
  timestamp: Date;
}

export default function ChatbotScreen() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [carregandoHistorico, setCarregandoHistorico] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    carregarHistorico();
    iniciarConversa();
  }, []);

  const carregarHistorico = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('chatbot_conversas')
        .select('id, entrada_usuario, resposta_bot, timestamp')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: true })
        .limit(20); // Últimas 20 conversas

      if (error) {
        console.error('Erro ao carregar histórico:', error);
        return;
      }

      if (data) {
        const mensagensHistorico: Mensagem[] = [];
        data.forEach(conversa => {
          mensagensHistorico.push({
            id: `${conversa.id}-user`,
            texto: conversa.entrada_usuario,
            isUser: true,
            timestamp: new Date(conversa.timestamp),
          });
          mensagensHistorico.push({
            id: `${conversa.id}-bot`,
            texto: conversa.resposta_bot,
            isUser: false,
            timestamp: new Date(conversa.timestamp),
          });
        });
        setMensagens(mensagensHistorico);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setCarregandoHistorico(false);
    }
  };

  const iniciarConversa = () => {
    if (mensagens.length === 0) {
      const mensagemBoasVindas: Mensagem = {
        id: 'welcome',
        texto: 'Olá! 👋 Eu sou o Blob, seu assistente de apoio emocional. Estou aqui para te ajudar em sua jornada de recuperação. Como você está se sentindo hoje?',
        isUser: false,
        timestamp: new Date(),
      };
      setMensagens([mensagemBoasVindas]);
    }
  };

  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || carregando) return;

    const mensagemUsuario: Mensagem = {
      id: Date.now().toString(),
      texto: novaMensagem.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMensagens(prev => [...prev, mensagemUsuario]);
    setNovaMensagem('');
    setCarregando(true);

    try {
      // Buscar contexto das últimas conversas
      const ultimasMensagens = mensagens
        .slice(-6) // Últimas 6 mensagens para contexto
        .map(m => `${m.isUser ? 'Usuário' : 'Assistente'}: ${m.texto}`)
        .join('\n');

      const contexto = ultimasMensagens || '';

      // Gerar resposta com Gemini
      const respostaBot = await GeminiService.responderChatbot(
        mensagemUsuario.texto,
        contexto
      );

      const mensagemBot: Mensagem = {
        id: (Date.now() + 1).toString(),
        texto: respostaBot,
        isUser: false,
        timestamp: new Date(),
      };

      setMensagens(prev => [...prev, mensagemBot]);

      // Salvar conversa no Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('chatbot_conversas')
          .insert({
            user_id: user.id,
            entrada_usuario: mensagemUsuario.texto,
            resposta_bot: respostaBot,
            timestamp: new Date().toISOString(),
          });

        // Lógica de Pontuação
        const hojeInicio = startOfDay(new Date()).toISOString();
        const hojeFim = endOfDay(new Date()).toISOString();

        const { data: pontoExistente, error: erroPonto } = await supabase
          .from('pontos')
          .select('id')
          .eq('user_id', user.id)
          .eq('motivo', 'chatbot_conversa')
          .gte('data', hojeInicio)
          .lte('data', hojeFim)
          .limit(1);

        if (erroPonto) {
          console.error('Erro ao verificar ponto existente (chatbot):', erroPonto);
        }

        if (!pontoExistente || pontoExistente.length === 0) {
          const { error: erroInsercaoPonto } = await supabase
            .from('pontos')
            .insert({ user_id: user.id, quantidade: 1, motivo: 'chatbot_conversa' });
          
          if (erroInsercaoPonto) {
            console.error('Erro ao inserir ponto (chatbot):', erroInsercaoPonto);
          } else {
            console.log('Ponto por conversa com o chatbot adicionado!');
          }
        }
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      
      const mensagemErro: Mensagem = {
        id: (Date.now() + 1).toString(),
        texto: 'Desculpe, não consegui processar sua mensagem no momento. Você pode tentar novamente?',
        isUser: false,
        timestamp: new Date(),
      };
      setMensagens(prev => [...prev, mensagemErro]);
    } finally {
      setCarregando(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  const renderDateSeparator = (date: Date) => {
    const messageDate = date;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let dateText;
    if (messageDate.toDateString() === today.toDateString()) {
      dateText = 'Hoje';
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      dateText = 'Ontem';
    } else {
      dateText = format(messageDate, 'dd/MM/yyyy', { locale: ptBR });
    }

    return (
      <View style={styles.dateSeparator}>
        <View style={styles.dateLine} />
        <Text style={styles.dateText}>{dateText}</Text>
        <View style={styles.dateLine} />
      </View>
    );
  };

  const renderMensagem = (mensagem: Mensagem, index: number) => {
    const previousMessage = index > 0 ? mensagens[index - 1] : null;
    const showAvatar = !previousMessage || previousMessage.isUser !== mensagem.isUser;
    
    // Verificar se precisa mostrar separador de data
    const showDateSeparator = !previousMessage || 
      mensagem.timestamp.toDateString() !== previousMessage.timestamp.toDateString();

    return (
      <View key={mensagem.id}>
        {showDateSeparator && renderDateSeparator(mensagem.timestamp)}
        <View
          style={[
            styles.mensagemContainer,
            mensagem.isUser ? styles.mensagemUsuario : styles.mensagemBot,
          ]}
        >
          <View style={styles.avatarContainer}>
            {mensagem.isUser ? (
              <View style={styles.avatarUser}>
                <User size={16} color={Colors.neutral.white} strokeWidth={2} />
              </View>
            ) : (
              <Image source={blobAvatar} style={styles.avatarBotImage} />
            )}
          </View>
          
          <View style={[
            styles.mensagemBubble,
            mensagem.isUser ? styles.bubbleUsuario : styles.bubbleBot,
          ]}>
            <Text style={[
              styles.mensagemTexto,
              mensagem.isUser ? styles.textoUsuario : styles.textoBot,
            ]}>
              {mensagem.texto}
            </Text>
            <Text style={styles.mensagemHora}>
              {format(mensagem.timestamp, 'HH:mm', { locale: ptBR })}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (carregandoHistorico) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { backgroundColor: Colors.primary.dark }]}>
          <SafeAreaView>
            <View style={styles.headerContent}>
              <Text style={styles.title}>Blob, seu melhor amigo</Text>
              <View style={styles.statusOnline}>
                <View style={styles.statusIndicator} />
                <Text style={styles.statusText}>Online</Text>
              </View>
            </View>
          </SafeAreaView>
        </View>
        
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Carregando conversa...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { backgroundColor: Colors.primary.dark }]}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Blob, seu melhor amigo</Text>
            <View style={styles.statusOnline}>
              <View style={styles.statusIndicator} />
              <Text style={styles.statusText}>Online</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {mensagens.map((mensagem, index) => renderMensagem(mensagem, index))}
        
        {carregando && (
          <View style={[styles.mensagemContainer, styles.mensagemBot]}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarBot}>
                <Bot size={16} color={Colors.neutral.white} strokeWidth={2} />
              </View>
            </View>
            <View style={[styles.mensagemBubble, styles.bubbleBot]}>
              <Text style={styles.carregandoTexto}>Digitando...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <Card style={styles.inputCard}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="Digite sua mensagem..."
              placeholderTextColor={Colors.neutral.gray400}
              value={novaMensagem}
              onChangeText={setNovaMensagem}
              multiline
              maxLength={500}
              editable={!carregando}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!novaMensagem.trim() || carregando) && styles.sendButtonDisabled,
              ]}
              onPress={enviarMensagem}
              disabled={!novaMensagem.trim() || carregando}
            >
              <Send size={20} color={Colors.neutral.white} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </Card>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.gray100,
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
  title: {
    fontSize: Fonts.sizes.title,
    fontWeight: Fonts.weights.bold,
    color: Colors.neutral.white,
  },
  statusOnline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  statusText: {
    fontSize: Fonts.sizes.small,
    color: Colors.neutral.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: Fonts.sizes.body,
    color: Colors.neutral.gray400,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  mensagemContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    alignItems: 'flex-end',
  },
  mensagemUsuario: {
    flexDirection: 'row-reverse',
  },
  mensagemBot: {
    flexDirection: 'row',
  },
  avatarContainer: {
    marginHorizontal: Spacing.sm,
  },
  avatarUser: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBotImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarBot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mensagemBubble: {
    maxWidth: '75%',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  bubbleUsuario: {
    backgroundColor: Colors.primary.dark,
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: Colors.neutral.white,
    borderBottomLeftRadius: 4,
  },
  mensagemTexto: {
    fontSize: Fonts.sizes.body,
    lineHeight: 20,
  },
  textoUsuario: {
    color: Colors.neutral.white,
  },
  textoBot: {
    color: Colors.neutral.gray800,
  },
  mensagemHora: {
    fontSize: Fonts.sizes.small,
    marginTop: Spacing.sm,
    opacity: 0.7,
  },
  carregandoTexto: {
    fontSize: Fonts.sizes.body,
    color: Colors.neutral.gray400,
    fontStyle: 'italic',
  },
  inputContainer: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },
  inputCard: {
    padding: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: Fonts.sizes.body,
    color: Colors.neutral.gray800,
    maxHeight: 100,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  sendButton: {
    backgroundColor: Colors.primary.accent,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.neutral.gray400,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.neutral.gray100,
  },
  dateText: {
    fontSize: Fonts.sizes.small,
    color: Colors.neutral.gray400,
    marginHorizontal: Spacing.md,
    fontWeight: Fonts.weights.medium,
  },
});