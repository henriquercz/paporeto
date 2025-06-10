import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Alert, RefreshControl, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Camera, Mic, Edit3, ChevronDown, Calendar, MicOff, Play, Pause } from 'lucide-react-native';
import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/Colors';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { Tables } from '../../lib/database.types';
import { GeminiService } from '@/lib/gemini';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';

export default function DiarioScreen() {
  const [entradas, setEntradas] = useState<Tables<'diarios'>[]>([]);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [newEntry, setNewEntry] = useState('');
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
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

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

      if (data) {
        setEntradas(data);
        setDayStreak(calculateDayStreak(data));
      }
    } catch (error) {
      console.error('Erro ao carregar entradas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateDayStreak = (diarioEntries: Tables<'diarios'>[]) => {
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
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
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
      const { error } = await supabase.from('diarios').insert(novaEntrada);
      if (error) {
        Alert.alert('Erro', 'Não foi possível salvar a entrada');
        return;
      }
      try {
        const feedback = await GeminiService.analisarEntradaDiario(newEntry);
        if (feedback) {
          Alert.alert('Reflexão IA', feedback);
        }
      } catch (geminiError) {
        console.log('Erro ao gerar feedback Gemini:', geminiError);
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

  const salvarMidia = async (uri: string, tipo: 'foto' | 'audio') => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split('.').pop();
      const fileName = `${user.id}/${new Date().toISOString()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('diario_midia')
        .upload(fileName, blob, {
          contentType: blob.type ?? (tipo === 'foto' ? 'image/jpeg' : 'audio/mp4'),
          upsert: false,
        });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('diario_midia').getPublicUrl(uploadData.path);
      
      const novaEntrada = {
        user_id: user.id,
        tipo: tipo,
        foto_url: tipo === 'foto' ? urlData.publicUrl : null,
        audio_url: tipo === 'audio' ? urlData.publicUrl : null,
        data_registro: new Date().toISOString(),
      };

      const { error: insertError } = await supabase.from('diarios').insert(novaEntrada);
      if (insertError) throw insertError;
      Alert.alert('Sucesso!', `Sua mídia foi salva no diário!`);
      loadEntradas();
    } catch (error) {
      console.error(`Erro ao salvar ${tipo}:`, error);
      Alert.alert('Erro', `Não foi possível salvar a ${tipo}.`);
    } finally {
      setSaving(false);
    }
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
      await salvarMidia(result.assets[0].uri, 'foto');
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
      await salvarMidia(result.assets[0].uri, 'foto');
    }
  };

  const iniciarGravacao = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Precisamos de acesso ao microfone.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Falha ao iniciar gravação', err);
    }
  };

  const pararGravacao = async () => {
    if (!recording) return;
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    if (uri) {
      await salvarMidia(uri, 'audio');
    }
  };

  const tocarAudio = async (uri: string) => {
    if (playingUri === uri) {
      await sound?.stopAsync();
      setPlayingUri(null);
    } else {
      if (sound) {
        await sound.unloadAsync();
      }
      const { sound: newSound } = await Audio.Sound.createAsync({ uri });
      setSound(newSound);
      setPlayingUri(uri);
      await newSound.playAsync();
      newSound.setOnPlaybackStatusUpdate((status) => {
        if ('didJustFinish' in status && status.didJustFinish) {
          setPlayingUri(null);
        }
      });
    }
  };

  const renderEntrada = (item: Tables<'diarios'>) => {
    const isExpanded = expandedEntry === item.id;
    return (
      <Card key={item.id} style={styles.entryCard}>
        <TouchableOpacity onPress={() => setExpandedEntry(isExpanded ? null : item.id)}>
          <View style={styles.entryHeader}>
            <View style={styles.entryDateContainer}>
              <Calendar size={18} color={Colors.neutral.gray800} />
              <Text style={styles.entryDate}>{format(new Date(item.data_registro), 'PPP', { locale: ptBR })}</Text>
            </View>
            <ChevronDown size={24} color={Colors.neutral.gray400} style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }} />
          </View>
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.entryContent}>
            {item.texto && <Text style={styles.entryText}>{item.texto}</Text>}
            {item.foto_url && <Image source={{ uri: item.foto_url }} style={styles.entryImage} />}
            {item.audio_url && (
              <TouchableOpacity style={styles.audioPlayer} onPress={() => tocarAudio(item.audio_url!)}>
                {playingUri === item.audio_url ? <Pause size={24} color={Colors.primary.accent} /> : <Play size={24} color={Colors.primary.accent} />}
                <Text style={styles.audioPlayerText}>Tocar áudio</Text>
              </TouchableOpacity>
            )}
            {item.transcricao && <Text style={styles.transcription}>{item.transcricao}</Text>}
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={Colors.neutral.white} />
            </TouchableOpacity>
            <Text style={styles.title}>Diário</Text>
            <View style={styles.dayBadge}>
              <Text style={styles.dayText}>DIA {dayStreak}</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary.accent}/>}
      >
        <Card style={styles.newEntryCard}>
          <View style={styles.newEntryHeader}>
            <Edit3 size={20} color={Colors.neutral.gray800} />
            <Text style={styles.newEntryTitle}>Nova Entrada</Text>
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="Como você está se sentindo hoje?"
            multiline
            value={newEntry}
            onChangeText={setNewEntry}
            placeholderTextColor={Colors.neutral.gray400}
          />
          <View style={styles.actionButtons}>
            <View style={styles.mediaButtons}>
              <TouchableOpacity style={styles.mediaButton} onPress={lidarComFoto} disabled={saving || isRecording}>
                <Camera size={20} color={Colors.neutral.white} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.mediaButton, isRecording && styles.recordingButton]} onPress={isRecording ? pararGravacao : iniciarGravacao} disabled={saving}>
                {isRecording 
                  ? <MicOff size={20} color={Colors.neutral.white} strokeWidth={2} />
                  : <Mic size={20} color={Colors.neutral.white} strokeWidth={2} />
                }
              </TouchableOpacity>
            </View>

            <Button 
              title={saving ? "Salvando..." : "Salvar"} 
              onPress={salvarEntradaTexto} 
              disabled={saving || !newEntry.trim() || isRecording}
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
  container: {
    flex: 1,
    backgroundColor: Colors.appBackground,
  },
  header: {
    backgroundColor: Colors.primary.dark,
    paddingBottom: Spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm, 
  },
  title: {
    fontWeight: Fonts.weights.bold,
    fontSize: Fonts.sizes.title,
    color: Colors.neutral.white,
  },
  dayBadge: {
    backgroundColor: Colors.primary.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  dayText: {
    fontWeight: Fonts.weights.bold,
    fontSize: Fonts.sizes.small,
    color: Colors.neutral.white,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  newEntryCard: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  newEntryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  newEntryTitle: {
    marginLeft: Spacing.sm,
    fontWeight: Fonts.weights.medium,
    fontSize: Fonts.sizes.subtitle,
    color: Colors.neutral.gray800,
  },
  textInput: {
    backgroundColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontWeight: Fonts.weights.regular,
    fontSize: Fonts.sizes.body,
    color: Colors.neutral.gray800,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  mediaButton: {
    backgroundColor: Colors.primary.light,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  recordingButton: {
    backgroundColor: Colors.error,
  },
  historyTitle: {
    fontWeight: Fonts.weights.bold,
    fontSize: Fonts.sizes.title,
    color: Colors.neutral.gray800,
    marginBottom: Spacing.md,
  },
  entryCard: {
    marginBottom: Spacing.md,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  entryDate: {
    fontWeight: Fonts.weights.medium,
    fontSize: Fonts.sizes.body,
    color: Colors.neutral.gray800,
  },
  entryContent: {
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral.gray100,
    paddingTop: Spacing.md,
  },
  entryText: {
    fontWeight: Fonts.weights.regular,
    fontSize: Fonts.sizes.body,
    color: Colors.neutral.gray800,
    lineHeight: 24,
  },
  transcription: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.md,
    fontWeight: Fonts.weights.regular,
    fontStyle: 'italic',
    color: Colors.neutral.gray400,
  },
  entryImage: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  audioPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
    backgroundColor: Colors.neutral.gray100,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignSelf: 'flex-start',
  },
  audioPlayerText: {
    fontWeight: Fonts.weights.medium,
    fontSize: Fonts.sizes.body,
    color: Colors.primary.dark,
  },
  emptyState: {
    textAlign: 'center',
    marginTop: Spacing.xxl,
    fontWeight: Fonts.weights.regular,
    fontSize: Fonts.sizes.body,
    color: Colors.neutral.gray400,
  },
  bottomSpacing: {
    height: Spacing.xxl,
  },
});
