import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Alert, RefreshControl, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Camera, Mic, Edit3, ChevronDown, Calendar, MicOff, Play, Pause, Paperclip, X } from 'lucide-react-native';
import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/Colors';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { GeminiService } from '@/lib/gemini';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';

// Tipos do Supabase
type Diario = Database['public']['Tables']['diarios']['Row'];
type Anexo = Database['public']['Tables']['diario_anexos']['Row'];
type DiarioInsert = Database['public']['Tables']['diarios']['Insert'];
type AnexoInsert = Database['public']['Tables']['diario_anexos']['Insert'];

// Tipos customizados
type AnexoPendente = { uri: string; tipo: 'foto' | 'audio' };
type EntradaDiarioCompleta = Diario & { diario_anexos: Anexo[] };

export default function DiarioScreen() {
  const [entradas, setEntradas] = useState<EntradaDiarioCompleta[]>([]);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [newEntryText, setNewEntryText] = useState('');
  const [anexosParaSalvar, setAnexosParaSalvar] = useState<AnexoPendente[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dayStreak, setDayStreak] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingUri, setPlayingUri] = useState<string | null>(null);

  useEffect(() => {
    loadEntradas();
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  const loadEntradas = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

            const { data: diarioData, error } = await supabase
        .from('diarios')
        .select('*, diario_anexos(*)')
        .eq('user_id', user.id)
        .order('data_registro', { ascending: false });

      if (error) throw error;

            if (diarioData) {
        setEntradas(diarioData);
        setDayStreak(calculateDayStreak(diarioData));
      }
    } catch (error) {
      console.error('Erro ao carregar entradas:', error);
      Alert.alert('Erro', 'Não foi possível carregar o histórico do diário.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadEntradas();
  }, [loadEntradas]);

    const calculateDayStreak = (diarioEntries: Diario[]) => {
    if (!diarioEntries || diarioEntries.length === 0) return 0;
    const uniqueDates = [...new Set(diarioEntries.map(entry => new Date(entry.data_registro).toISOString().split('T')[0]))].sort((a, b) => b.localeCompare(a));
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) return 0;
    let streak = 1;
    for (let i = 0; i < uniqueDates.length - 1; i++) {
      const currentDate = new Date(uniqueDates[i]);
      const previousDate = new Date(uniqueDates[i + 1]);
      const diffTime = currentDate.getTime() - previousDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) streak++;
      else break;
    }
    return streak;
  };

  const salvarDiario = async () => {
    if (!newEntryText.trim() && anexosParaSalvar.length === 0) {
      Alert.alert('Atenção', 'Escreva um texto ou adicione uma mídia para salvar.');
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');

      // 1. Salvar a entrada de texto principal
                        const newEntry: DiarioInsert = {
        user_id: user.id,
        texto: newEntryText.trim(),
      };

      const { data: diarioData, error: diarioError } = await supabase
        .from('diarios')
        .insert(newEntry)
        .select()
        .single();

      if (diarioError) throw diarioError;

      // 2. Fazer upload e salvar os anexos
      if (anexosParaSalvar.length > 0) {
        for (const anexo of anexosParaSalvar) {
          const blob = await new Promise<Blob>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.onload = () => resolve(xhr.response);
            xhr.onerror = (e) => reject(new TypeError('Network request failed'));
            xhr.responseType = 'blob';
            xhr.open('GET', anexo.uri, true);
            xhr.send(null);
          });

          const fileExt = anexo.uri.split('.').pop();
          const fileName = `${user.id}/${new Date().toISOString().replace(/:/g, '-')}.${fileExt}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('diario_midia')
            .upload(fileName, blob, { contentType: blob.type, upsert: false });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage.from('diario_midia').getPublicUrl(uploadData.path);

          const newAnexo: AnexoInsert = {
            diario_id: diarioData.id,
            user_id: user.id,
            anexo_url: urlData.publicUrl,
            tipo_anexo: anexo.tipo,
          };
                                              const { error: anexoError } = await supabase.from('diario_anexos').insert(newAnexo);
          if (anexoError) throw anexoError;
        }
      }
      
      // 3. (Opcional) Chamar Gemini para análise
      if (newEntryText.trim()) {
        try {
          const feedback = await GeminiService.analisarEntradaDiario(newEntryText.trim());
          if (feedback) Alert.alert('Reflexão IA', feedback);
        } catch (geminiError) {
          console.log('Erro ao gerar feedback Gemini:', geminiError);
        }
      }

      // 4. Limpar e atualizar
      setNewEntryText('');
      setAnexosParaSalvar([]);
      Alert.alert('Sucesso!', 'Sua entrada foi salva no diário!');
      loadEntradas();

    } catch (error) {
      console.error('Erro ao salvar diário:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao salvar sua entrada.');
    } finally {
      setSaving(false);
    }
  };

  const adicionarAnexo = (uri: string, tipo: 'foto' | 'audio') => {
    setAnexosParaSalvar(prev => [...prev, { uri, tipo }]);
  };

  const removerAnexo = (uri: string) => {
    setAnexosParaSalvar(prev => prev.filter(a => a.uri !== uri));
  };

  const lidarComFoto = () => {
    Alert.alert("Adicionar Foto", "Como você quer adicionar uma foto?", [
      { text: "Tirar Foto", onPress: abrirCamera },
      { text: "Escolher da Galeria", onPress: escolherDaGaleria },
      { text: "Cancelar", style: "cancel" }
    ]);
  };

  const abrirCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera.');
      return;
    }
    let result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.5 });
    if (!result.canceled) {
      adicionarAnexo(result.assets[0].uri, 'foto');
    }
  };

  const escolherDaGaleria = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.5 });
    if (!result.canceled) {
      adicionarAnexo(result.assets[0].uri, 'foto');
    }
  };

  const iniciarGravacao = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
                  const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Falha ao iniciar gravação', err);
    }
  };

  const pararGravacao = async () => {
    setIsRecording(false);
    await recording?.stopAndUnloadAsync();
    const uri = recording?.getURI();
    if (uri) {
      adicionarAnexo(uri, 'audio');
    }
    setRecording(null);
  };

  const tocarAudio = async (uri: string) => {
    if (playingUri === uri) {
      await sound?.stopAsync();
      setPlayingUri(null);
    } else {
      if (sound) await sound.unloadAsync();
      const { sound: newSound } = await Audio.Sound.createAsync({ uri });
      setSound(newSound);
      setPlayingUri(uri);
      await newSound.playAsync();
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) setPlayingUri(null);
      });
    }
  };

  const renderEntrada = (item: EntradaDiarioCompleta) => {
    const isExpanded = expandedEntry === item.id;
    return (
      <Card key={item.id} style={styles.entryCard}>
        <TouchableOpacity onPress={() => setExpandedEntry(isExpanded ? null : item.id)}>
          <View style={styles.entryHeader}>
            <View style={styles.entryDateContainer}>
              <Calendar size={16} color={Colors.neutral.gray400} />
              <Text style={styles.entryDate}>{format(new Date(item.data_registro), "d 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR })}</Text>
            </View>
            <ChevronDown size={20} color={Colors.neutral.gray400} style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }} />
          </View>
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.entryContent}>
            {item.texto && <Text style={styles.entryText}>{item.texto}</Text>}
            <View style={styles.anexosContainer}>
              {item.diario_anexos?.map(anexo => (
                <View key={anexo.id}>
                  {anexo.tipo_anexo === 'foto' && <Image source={{ uri: anexo.anexo_url }} style={styles.entryImage} />}
                  {anexo.tipo_anexo === 'audio' && (
                    <TouchableOpacity style={styles.audioPlayer} onPress={() => tocarAudio(anexo.anexo_url)}>
                      {playingUri === anexo.anexo_url ? <Pause size={20} color={Colors.primary.dark} /> : <Play size={20} color={Colors.primary.dark} />}
                      <Text style={styles.audioPlayerText}>Tocar Áudio</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
            {item.sentimento_analisado && <Text style={styles.transcription}>Análise IA: {item.sentimento_analisado}</Text>}
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: Spacing.sm }}>
            <ArrowLeft size={24} color={Colors.neutral.white} />
          </TouchableOpacity>
          <Text style={styles.title}>Meu Diário</Text>
          <View style={styles.dayBadge}>
            <Text style={styles.dayText}>{dayStreak} {dayStreak === 1 ? 'dia' : 'dias'} de foco</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary.accent} />}
      >
        <Card style={styles.newEntryCard}>
          <View style={styles.newEntryHeader}>
            <Edit3 size={20} color={Colors.neutral.gray800} />
            <Text style={styles.newEntryTitle}>Nova Entrada</Text>
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="Como você se sente hoje?"
            multiline
            value={newEntryText}
            onChangeText={setNewEntryText}
            placeholderTextColor={Colors.neutral.gray400}
          />
          
          {/* Anexos Pendentes */}
          <View style={styles.anexosPendentesContainer}>
            {anexosParaSalvar.map((anexo, index) => (
              <View key={index} style={styles.anexoPendenteItem}>
                {anexo.tipo === 'foto' ? (
                  <Image source={{ uri: anexo.uri }} style={styles.anexoPendenteImagem} />
                ) : (
                  <View style={styles.anexoPendenteAudio}>
                    <Mic size={16} color={Colors.primary.dark} />
                    <Text style={styles.anexoPendenteTexto}>Áudio gravado</Text>
                  </View>
                )}
                <TouchableOpacity onPress={() => removerAnexo(anexo.uri)} style={styles.removerAnexoButton}>
                  <X size={16} color={Colors.neutral.white} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <View style={styles.actionButtons}>
            <View style={styles.mediaButtons}>
              <TouchableOpacity style={styles.mediaButton} onPress={lidarComFoto}>
                <Camera size={24} color={Colors.primary.dark} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.mediaButton, isRecording && styles.recordingButton]} onPress={isRecording ? pararGravacao : iniciarGravacao}>
                {isRecording ? <MicOff size={24} color={Colors.neutral.white} /> : <Mic size={24} color={Colors.primary.dark} />}
              </TouchableOpacity>
            </View>
            <Button 
              label="Salvar"
              onPress={salvarDiario} 
              isLoading={saving}
              style={{ flex: 1, marginLeft: Spacing.md }}
            />
          </View>
        </Card>

        <Text style={styles.historyTitle}>Histórico</Text>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary.accent} style={{ marginTop: Spacing.xl }}/>
        ) : entradas.length > 0 ? (
          entradas.map(renderEntrada)
        ) : (
          <Text style={styles.emptyState}>Nenhuma entrada ainda.</Text>
        )}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.appBackground },
  header: { backgroundColor: Colors.primary.dark, paddingBottom: Spacing.md },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  title: { fontWeight: Fonts.weights.bold, fontSize: Fonts.sizes.title, color: Colors.neutral.white },
  dayBadge: { backgroundColor: Colors.primary.accent, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.lg },
  dayText: { fontWeight: Fonts.weights.bold, fontSize: Fonts.sizes.small, color: Colors.neutral.white },
  content: { paddingHorizontal: Spacing.lg },
  newEntryCard: { marginTop: Spacing.lg, marginBottom: Spacing.lg },
  newEntryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  newEntryTitle: { marginLeft: Spacing.sm, fontWeight: Fonts.weights.medium, fontSize: Fonts.sizes.subtitle, color: Colors.neutral.gray800 },
  textInput: { backgroundColor: Colors.neutral.gray100, borderRadius: BorderRadius.md, padding: Spacing.md, fontWeight: Fonts.weights.regular, fontSize: Fonts.sizes.body, color: Colors.neutral.gray800, minHeight: 100, textAlignVertical: 'top' },
  actionButtons: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md },
  mediaButtons: { flexDirection: 'row', gap: Spacing.md },
  mediaButton: { backgroundColor: Colors.primary.light, padding: Spacing.md, borderRadius: BorderRadius.xl },
  recordingButton: { backgroundColor: Colors.error },
  historyTitle: { fontWeight: Fonts.weights.bold, fontSize: Fonts.sizes.title, color: Colors.neutral.gray800, marginBottom: Spacing.md },
  entryCard: { marginBottom: Spacing.md },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryDateContainer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  entryDate: { fontWeight: Fonts.weights.medium, fontSize: Fonts.sizes.body, color: Colors.neutral.gray800 },
  entryContent: { marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.neutral.gray100, paddingTop: Spacing.md },
  entryText: { fontWeight: Fonts.weights.regular, fontSize: Fonts.sizes.body, color: Colors.neutral.gray800, lineHeight: 24 },
  transcription: { marginTop: Spacing.md, padding: Spacing.md, backgroundColor: Colors.neutral.gray100, borderRadius: BorderRadius.md, fontWeight: Fonts.weights.regular, fontStyle: 'italic', color: Colors.neutral.gray400 },
  anexosContainer: { marginTop: Spacing.md, gap: Spacing.md },
  entryImage: { width: '100%', height: 200, borderRadius: BorderRadius.md },
  audioPlayer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.neutral.gray100, padding: Spacing.sm, borderRadius: BorderRadius.md, alignSelf: 'flex-start' },
  audioPlayerText: { fontWeight: Fonts.weights.medium, fontSize: Fonts.sizes.body, color: Colors.primary.dark },
  emptyState: { textAlign: 'center', marginTop: Spacing.xxl, fontWeight: Fonts.weights.regular, fontSize: Fonts.sizes.body, color: Colors.neutral.gray400 },
  bottomSpacing: { height: Spacing.xxl },
  anexosPendentesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.md },
  anexoPendenteItem: { position: 'relative' },
  anexoPendenteImagem: { width: 60, height: 60, borderRadius: BorderRadius.md },
  anexoPendenteAudio: { width: 60, height: 60, borderRadius: BorderRadius.md, backgroundColor: Colors.neutral.gray100, justifyContent: 'center', alignItems: 'center' },
    anexoPendenteTexto: { fontSize: 12, color: Colors.neutral.gray400, marginTop: Spacing.xs },
  removerAnexoButton: { position: 'absolute', top: -5, right: -5, backgroundColor: Colors.error, borderRadius: 10, padding: 2 },
});
