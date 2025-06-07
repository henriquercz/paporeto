import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Alert, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, Camera, Mic, Edit3, ChevronDown, Calendar } from 'lucide-react-native';
import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/Colors';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase, DiarioEntrada } from '@/lib/supabase';
import { GeminiService } from '@/lib/gemini';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DiarioScreen() {
  const [entradas, setEntradas] = useState<DiarioEntrada[]>([]);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [newEntry, setNewEntry] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEntradas();
  }, []);

  const loadEntradas = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('diarios')
        .select('*')
        .eq('user_id', user.id)
        .order('data_registro', { ascending: false });

      if (error) {
        console.error('Erro ao carregar entradas:', error);
        return;
      }

      setEntradas(data || []);
    } catch (error) {
      console.error('Erro ao carregar entradas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadEntradas();
  };

  const salvarEntradaTexto = async () => {
    if (!newEntry.trim()) {
      Alert.alert('Atenção', 'Digite algo antes de salvar');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const novaEntrada = {
        user_id: user.id,
        texto: newEntry.trim(),
        tipo: 'texto' as const,
        data_registro: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('diarios')
        .insert(novaEntrada);

      if (error) {
        Alert.alert('Erro', 'Não foi possível salvar a entrada');
        return;
      }

      // Gerar feedback do Gemini (opcional)
      try {
        const feedback = await GeminiService.analisarEntradaDiario(newEntry);
        if (feedback) {
          Alert.alert('Reflexão IA', feedback);
        }
      } catch (geminiError) {
        console.log('Erro ao gerar feedback Gemini:', geminiError);
        // Não mostrar erro para o usuário, é funcionalidade opcional
      }

      setNewEntry('');
      Alert.alert('Sucesso!', 'Entrada salva no seu diário!');
      loadEntradas();
    } catch (error) {
      console.error('Erro ao salvar entrada:', error);
      Alert.alert('Erro', 'Ocorreu um erro inesperado');
    } finally {
      setSaving(false);
    }
  };

  const abrirCamera = () => {
    Alert.alert(
      'Câmera',
      'Funcionalidade de foto será implementada em breve!',
      [{ text: 'OK' }]
    );
  };

  const iniciarGravacao = () => {
    if (isRecording) {
      setIsRecording(false);
      Alert.alert(
        'Gravação',
        'Funcionalidade de áudio será implementada em breve!',
        [{ text: 'OK' }]
      );
    } else {
      setIsRecording(true);
      Alert.alert(
        'Gravando...',
        'Funcionalidade de áudio será implementada em breve!',
        [
          { text: 'Parar', onPress: () => setIsRecording(false) }
        ]
      );
    }
  };

  const toggleExpandEntry = (entryId: string) => {
    setExpandedEntry(expandedEntry === entryId ? null : entryId);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm', { locale: ptBR });
  };

  const getDaysSinceEntry = (dateString: string) => {
    const days = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Hoje';
    if (days === 1) return 'Ontem';
    return `${days} dias atrás`;
  };

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={[Colors.primary.light, Colors.primary.dark]} 
        style={styles.header}
      >
        <SafeAreaView>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={Colors.neutral.white} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.title}>Diário</Text>
            <View style={styles.dayBadge}>
              <Text style={styles.dayText}>DIA 3</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Nova Entrada */}
        <Card style={styles.newEntryCard}>
          <View style={styles.newEntryHeader}>
            <Edit3 size={20} color={Colors.primary.accent} strokeWidth={2} />
            <Text style={styles.newEntryTitle}>Como foi seu dia?</Text>
          </View>
          
          <TextInput
            style={styles.textInput}
            placeholder="Escreva seus pensamentos, sentimentos ou reflexões..."
            placeholderTextColor={Colors.neutral.gray400}
            value={newEntry}
            onChangeText={setNewEntry}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <View style={styles.actionButtons}>
            <View style={styles.mediaButtons}>
              <TouchableOpacity 
                style={styles.mediaButton}
                onPress={abrirCamera}
              >
                <Camera size={20} color={Colors.neutral.white} strokeWidth={2} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.mediaButton,
                  isRecording && styles.mediaButtonRecording
                ]}
                onPress={iniciarGravacao}
              >
                <Mic size={20} color={Colors.neutral.white} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <Button
              title={saving ? "Salvando..." : "Salvar"}
              onPress={salvarEntradaTexto}
              disabled={saving || !newEntry.trim()}
              variant="primary"
              style={styles.saveButton}
            />
          </View>
        </Card>

        {/* Histórico de Entradas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notas recentes:</Text>
          
          {entradas.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>Ainda não há entradas no seu diário</Text>
              <Text style={styles.emptySubtext}>Que tal começar escrevendo sobre como você se sente hoje?</Text>
            </Card>
          ) : (
            entradas.map((entrada) => {
              const isExpanded = expandedEntry === entrada.id;
              
              return (
                <Card key={entrada.id} style={styles.entryCard}>
                  <TouchableOpacity 
                    onPress={() => toggleExpandEntry(entrada.id)}
                    style={styles.entryHeader}
                  >
                    <View style={styles.entryInfo}>
                      <Text style={styles.entryDay}>
                        {getDaysSinceEntry(entrada.data_registro)}
                      </Text>
                      <Text style={styles.entryDate}>
                        {formatDate(entrada.data_registro)} • {formatTime(entrada.data_registro)}
                      </Text>
                    </View>
                    <ChevronDown 
                      size={20} 
                      color={Colors.neutral.gray400}
                      style={[
                        styles.chevron,
                        isExpanded && styles.chevronExpanded
                      ]}
                    />
                  </TouchableOpacity>

                  {isExpanded && entrada.texto && (
                    <View style={styles.entryContent}>
                      <Text style={styles.entryText}>{entrada.texto}</Text>
                      {entrada.transcricao && (
                        <View style={styles.transcription}>
                          <Text style={styles.transcriptionLabel}>Transcrição do áudio:</Text>
                          <Text style={styles.transcriptionText}>{entrada.transcricao}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </Card>
              );
            })
          )}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  dayBadge: {
    backgroundColor: Colors.primary.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  dayText: {
    fontSize: Fonts.sizes.small,
    fontWeight: Fonts.weights.bold,
    color: Colors.neutral.white,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.neutral.gray100,
    paddingHorizontal: Spacing.lg,
    marginTop: -Spacing.md,
  },
  newEntryCard: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  newEntryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  newEntryTitle: {
    fontSize: Fonts.sizes.subtitle,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary.dark,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Fonts.sizes.body,
    color: Colors.neutral.gray800,
    minHeight: 100,
    marginBottom: Spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  mediaButton: {
    backgroundColor: Colors.primary.dark,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaButtonRecording: {
    backgroundColor: Colors.error,
  },
  saveButton: {
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Fonts.sizes.subtitle,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary.dark,
    marginBottom: Spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: Fonts.sizes.body,
    fontWeight: Fonts.weights.medium,
    color: Colors.neutral.gray400,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: Fonts.sizes.small,
    color: Colors.neutral.gray400,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  entryCard: {
    marginBottom: Spacing.md,
    padding: 0,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  entryInfo: {
    flex: 1,
  },
  entryDay: {
    fontSize: Fonts.sizes.body,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary.dark,
  },
  entryDate: {
    fontSize: Fonts.sizes.small,
    color: Colors.neutral.gray400,
    marginTop: 2,
  },
  chevron: {
    transform: [{ rotate: '0deg' }],
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  entryContent: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: Spacing.md,
  },
  entryText: {
    fontSize: Fonts.sizes.body,
    color: Colors.neutral.gray800,
    lineHeight: 22,
  },
  transcription: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.md,
  },
  transcriptionLabel: {
    fontSize: Fonts.sizes.small,
    fontWeight: Fonts.weights.medium,
    color: Colors.primary.dark,
    marginBottom: Spacing.sm,
  },
  transcriptionText: {
    fontSize: Fonts.sizes.small,
    color: Colors.neutral.gray800,
    lineHeight: 18,
  },
  bottomSpacing: {
    height: 100,
  },
});