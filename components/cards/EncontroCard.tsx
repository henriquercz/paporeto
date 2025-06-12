import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Calendar, MapPin, Users, Check, LogOut } from 'lucide-react-native';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/database.types';

type ChatForumRow = Database['public']['Tables']['chats_forum']['Row'] & {
  users: Database['public']['Tables']['users']['Row'] | null;
};

type EncontroCardProps = {
  item: ChatForumRow;
  userId: string | undefined;
  onParticipantesPress: (chatId: string) => void;
};

const EncontroCard = ({ item, userId, onParticipantesPress }: EncontroCardProps) => {
  const [isParticipando, setIsParticipando] = useState(false);
  const [participantesCount, setParticipantesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const checkParticipacao = useCallback(async () => {
    if (!userId) {
        setLoading(false);
        return;
    }
    try {
      const { data, error, count } = await supabase
        .from('chats_forum_participantes')
        .select('*', { count: 'exact' })
        .eq('chat_id', item.id);

      if (error) {
        throw error;
      }

      if (data) {
        setParticipantesCount(count ?? 0);
        const userParticipating = data.some(p => p.user_id === userId);
        setIsParticipando(userParticipating);
      }
    } catch (error) {
      console.error('Erro ao verificar participação:', error);
    } finally {
      setLoading(false);
    }
  }, [item.id, userId]);

  useEffect(() => {
    checkParticipacao();
  }, [checkParticipacao]);

  const handleParticipar = async () => {
    if (!userId) {
      Alert.alert('Erro', 'Você precisa estar logado para participar.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('chats_forum_participantes')
        .insert({ chat_id: item.id, user_id: userId });

      if (error) throw error;

      await checkParticipacao();
    } catch (error: any) {
      console.error('Erro ao participar do encontro:', error);
      Alert.alert('Erro', 'Não foi possível confirmar sua participação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSair = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('chats_forum_participantes')
        .delete()
        .eq('chat_id', item.id)
        .eq('user_id', userId);

      if (error) throw error;

      await checkParticipacao();
    } catch (error: any) {
      console.error('Erro ao sair do encontro:', error);
      Alert.alert('Erro', 'Não foi possível remover sua participação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatarDataEncontro = (data: string | null) => {
    if (!data) return 'Data não definida';
    return format(new Date(data), "dd 'de' MMMM 'às' HH:mm'h'", { locale: ptBR });
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{item.titulo}</Text>
      </View>
      <Text style={styles.description}>{item.conteudo}</Text>
      <View style={styles.infoContainer}>
        <View style={styles.infoItem}>
          <Calendar size={16} color={Colors.primary.dark} />
          <Text style={styles.infoText}>{formatarDataEncontro(item.encontro_data_hora)}</Text>
        </View>
        {item.encontro_local && (
          <View style={styles.infoItem}>
            <MapPin size={16} color={Colors.primary.dark} />
            <Text style={styles.infoText}>{item.encontro_local}</Text>
          </View>
        )}
      </View>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.membrosButton} onPress={() => onParticipantesPress(item.id)}>
          <Users size={16} color={Colors.primary.dark} />
          <Text style={styles.membrosButtonText}>{participantesCount} Confirmados</Text>
        </TouchableOpacity>
        {loading ? (
          <ActivityIndicator color={Colors.primary.dark} />
        ) : isParticipando ? (
          <TouchableOpacity style={[styles.actionButton, styles.sairButton]} onPress={handleSair}>
            <LogOut size={16} color="#FFF" />
            <Text style={styles.actionButtonText}>Sair</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.actionButton, styles.participarButton]} onPress={handleParticipar}>
            <Check size={16} color="#FFF" />
            <Text style={styles.actionButtonText}>Participar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.md,
    marginVertical: Spacing.sm,
    padding: Spacing.md,
    borderLeftWidth: 5,
    borderLeftColor: Colors.primary.accent, // Laranja para destaque
    shadowColor: Colors.neutral.gray800,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Fonts.sizes.subtitle,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary.dark,
  },
  description: {
    fontSize: Fonts.sizes.body,
    color: Colors.neutral.gray400,
    marginBottom: Spacing.md,
  },
  infoContainer: {
    marginBottom: Spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  infoText: {
    fontSize: Fonts.sizes.small,
    color: Colors.neutral.gray400,
    marginLeft: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.neutral.gray100,
    paddingTop: Spacing.md,
    marginTop: Spacing.sm,
  },
  membrosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral.gray100,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  membrosButtonText: {
    fontSize: Fonts.sizes.small,
    fontWeight: Fonts.weights.medium,
    color: Colors.primary.dark,
    marginLeft: Spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: Colors.neutral.white,
    fontSize: Fonts.sizes.small,
    fontWeight: Fonts.weights.bold,
    marginLeft: Spacing.xs,
  },
  participarButton: {
    backgroundColor: Colors.primary.accent,
  },
  sairButton: {
    backgroundColor: Colors.error,
  },
});

export default EncontroCard;
