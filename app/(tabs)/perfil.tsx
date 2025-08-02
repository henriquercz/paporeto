import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, Switch, Image, Platform } from 'react-native';

import { router } from 'expo-router';
import { ArrowLeft, Bell, Crown, Settings, LogOut, User, Award, Calendar, TrendingUp, Edit2 } from 'lucide-react-native';
import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/Colors';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { type Database } from '@/lib/database.types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as ImagePicker from 'expo-image-picker';

type User = {
  id: string;
  auth_user_id: string | null;
  nome: string;
  email: string;
  avatar_url: string | null;
  data_cadastro: string;
  tipo_vicio: string | null;
  nivel_dependencia: string | null;
  onboarding_completed: boolean;
  onboarding_concluido: boolean;
};

type Ponto = {
  id: string;
  user_id: string;
  quantidade: number;
  motivo: string;
  data: string;
  meta_id: string | null;
  diario_id: string | null;
};

const formatarMotivo = (motivo: string | null) => {
  if (!motivo) return '';
  switch (motivo) {
    case 'diario_completo':
      return 'Tarefa: Registro no Diário';
    case 'comunidade_post':
      return 'Tarefa: Post na Comunidade';
    case 'chatbot_conversa':
      return 'Tarefa: Conversa com o Blob';
    case 'meta_concluida':
      return 'Conquista: Meta Concluída!';
    default:
      return motivo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
};

export default function PerfilScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // Carregar dados do usuário
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .single();

      if (userData) setUser(userData);

      // Carregar pontos
      const { data: pontosData } = await supabase
        .from('pontos')
        .select('*')
        .eq('user_id', authUser.id)
        .order('data', { ascending: false });

      if (pontosData) setPontos(pontosData);

    } catch (error) {
      console.error('Erro ao carregar dados do perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/(auth)/welcome');
          },
        },
      ]
    );
  };

  const totalPontos = pontos.reduce((sum, p) => sum + p.quantidade, 0);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de permissão para acessar sua galeria de fotos.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      uploadAvatar(asset.uri, asset.mimeType || asset.type, asset.base64);
    }
  };

  const uploadAvatar = async (uri: string, assetMimeType?: string, base64Data?: string | null) => {
    if (!user) return;
    setLoading(true);
    try {
      // Verificar se temos dados base64 válidos
      if (!base64Data || base64Data.length === 0) {
        Alert.alert('Erro', 'Não foi possível processar a imagem. Tente novamente.');
        setLoading(false);
        return;
      }

      // Criar blob a partir dos dados base64
      const response = await fetch(`data:${assetMimeType || 'image/jpeg'};base64,${base64Data}`);
      const blob = await response.blob();
      
      // Verificar se o blob foi criado corretamente
      if (blob.size === 0) {
        Alert.alert('Erro', 'Falha ao processar a imagem. Verifique se a imagem é válida.');
        setLoading(false);
        return;
      }

      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `${user.auth_user_id}/${fileName}`;

      // Determinar content type
      let contentType = assetMimeType || blob.type;
      if (!contentType || contentType === 'application/octet-stream') {
        if (fileExt === 'jpg' || fileExt === 'jpeg') {
          contentType = 'image/jpeg';
        } else if (fileExt === 'png') {
          contentType = 'image/png';
        } else if (fileExt === 'gif') {
          contentType = 'image/gif';
        } else if (fileExt === 'webp') {
          contentType = 'image/webp';
        } else {
          contentType = 'image/jpeg';
        }
      }
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          upsert: true,
          cacheControl: '3600',
          contentType: contentType,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (!publicUrlData.publicUrl) {
        throw new Error('Não foi possível obter a URL pública do avatar.');
      }

      const newAvatarUrl = publicUrlData.publicUrl;

      const { data: updatedUser, error: updateUserError } = await supabase
        .from('users')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', user.id)
        .select()
        .single();

      if (updateUserError) {
        throw updateUserError;
      }

      if (updatedUser) {
        setUser(updatedUser);
        Alert.alert('Sucesso!', 'Sua foto de perfil foi atualizada.');
      }
    } catch (error: any) {
      console.error('Erro ao atualizar foto de perfil:', error);
      Alert.alert('Erro', error.message || 'Não foi possível atualizar sua foto de perfil.');
    } finally {
      setLoading(false);
    }
  };
  const diasCadastrado = user ? Math.floor((Date.now() - new Date(user.data_cadastro).getTime()) / (1000 * 60 * 60 * 24)) : 0;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { backgroundColor: Colors.primary.dark }]}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Perfil</Text>
            <View style={{ width: 24 }} />
          </View>
        </View>
        
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Carregando perfil...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: Colors.primary.dark }]}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={Colors.neutral.white} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.title}>Perfil</Text>
            <View style={{ width: 24 }} />
          </View>
        </SafeAreaView>
      </View>

      <ScrollView style={styles.content}>
        {/* Informações do Usuário */}
        <Card style={styles.userCard}>
          <View style={styles.userInfo}>
            <TouchableOpacity onPress={handlePickImage} style={styles.avatarContainer}>
              {user?.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <User size={32} color={Colors.neutral.white} strokeWidth={2} />
                </View>
              )}
              <View style={styles.editAvatarButton}>
                <Edit2 size={16} color={Colors.neutral.white} />
              </View>
            </TouchableOpacity>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>Olá {user?.nome || 'Usuário'}!</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              <Text style={styles.userSince}>
                Membro há {diasCadastrado} dias
              </Text>
            </View>
          </View>
        </Card>

        {/* Estatísticas */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Award size={24} color={Colors.primary.accent} strokeWidth={2} />
            <Text style={styles.statNumber}>{totalPontos}</Text>
            <Text style={styles.statLabel}>Pontos</Text>
          </Card>
          
          <Card style={styles.statCard}>
            <TrendingUp size={24} color={Colors.success} strokeWidth={2} />
            <Text style={styles.statNumber}>{pontos.length}</Text>
            <Text style={styles.statLabel}>Conquistas</Text>
          </Card>
          
          <Card style={styles.statCard}>
            <Calendar size={24} color={Colors.primary.light} strokeWidth={2} />
            <Text style={styles.statNumber}>{diasCadastrado}</Text>
            <Text style={styles.statLabel}>Dias</Text>
          </Card>
        </View>

        {/* Configurações */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configurações</Text>
          
          <Card style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Bell size={20} color={Colors.primary.dark} strokeWidth={2} />
                <Text style={styles.settingText}>Notificações</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: Colors.neutral.gray400, true: Colors.primary.light }}
                thumbColor={notificationsEnabled ? Colors.primary.dark : Colors.neutral.white}
              />
            </View>
            

          </Card>
        </View>

        {/* Premium */}
        <Card style={styles.premiumCard}>
          <View style={styles.premiumGradient}>
            <View style={styles.premiumHeader}>
              <Crown size={28} color={Colors.primary.accent} strokeWidth={2} />
              <View style={styles.premiumInfo}>
                <Text style={styles.premiumTitle}>Paporeto Premium</Text>
                <Text style={styles.premiumSubtitle}>Desbloqueie todo o potencial</Text>
              </View>
            </View>
            
            <View style={styles.premiumPricing}>
              <Text style={styles.premiumPrice}>R$ 27,90</Text>
              <Text style={styles.premiumPeriod}>por mês</Text>
            </View>
            
            <View style={styles.premiumFeatures}>
              <View style={styles.premiumFeature}>
                <View style={styles.featureIcon}>
                  <Text style={styles.featureEmoji}>🚫</Text>
                </View>
                <Text style={styles.premiumFeatureText}>Experiência sem anúncios</Text>
              </View>
              <View style={styles.premiumFeature}>
                <View style={styles.featureIcon}>
                  <Text style={styles.featureEmoji}>👨‍⚕️</Text>
                </View>
                <Text style={styles.premiumFeatureText}>Contato com profissionais</Text>
              </View>
              <View style={styles.premiumFeature}>
                <View style={styles.featureIcon}>
                  <Text style={styles.featureEmoji}>📚</Text>
                </View>
                <Text style={styles.premiumFeatureText}>Conteúdo exclusivo</Text>
              </View>
              <View style={styles.premiumFeature}>
                <View style={styles.featureIcon}>
                  <Text style={styles.featureEmoji}>✨</Text>
                </View>
                <Text style={styles.premiumFeatureText}>Suporte personalizado</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.premiumButton}
              onPress={() => Alert.alert('Premium', 'Funcionalidade em desenvolvimento')}
            >
              <Text style={styles.premiumButtonText}>Assinar Premium</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Últimas Conquistas */}
        {pontos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Últimas Conquistas</Text>
            {pontos.slice(0, 3).map((ponto) => (
              <Card key={ponto.id} style={styles.achievementCard}>
                <Award size={16} color={Colors.primary.accent} strokeWidth={2} />
                <View style={styles.achievementContent}>
                  <Text style={styles.achievementText}>{formatarMotivo(ponto.motivo)}</Text>
                  <Text style={styles.achievementDate}>
                    {ponto.data ? format(new Date(ponto.data), 'dd/MM/yyyy', { locale: ptBR }) : ''}
                  </Text>
                </View>
                <Text style={styles.achievementPoints}>+{ponto.quantidade}</Text>
              </Card>
            ))}
          </View>
        )}

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={20} color={Colors.error} strokeWidth={2} />
            <Text style={styles.logoutText}>Sair</Text>
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: Fonts.sizes.body,
    color: Colors.neutral.gray400,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.neutral.gray100,
    paddingHorizontal: Spacing.lg,
    marginTop: -Spacing.md,
  },
  userCard: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.neutral.gray100, // Corrigido de gray200
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary.accent,
    padding: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.neutral.white,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: Fonts.sizes.subtitle,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary.dark,
  },
  userEmail: {
    fontSize: Fonts.sizes.body,
    color: Colors.neutral.gray400,
    marginTop: 2,
  },
  userSince: {
    fontSize: Fonts.sizes.small,
    color: Colors.neutral.gray400,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.lg,
  },
  statNumber: {
    fontSize: Fonts.sizes.title,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary.dark,
    marginTop: Spacing.sm,
  },
  statLabel: {
    fontSize: Fonts.sizes.small,
    color: Colors.neutral.gray400,
    marginTop: 4,
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
  settingsCard: {
    padding: 0,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  settingText: {
    fontSize: Fonts.sizes.body,
    color: Colors.primary.dark,
  },
  settingDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  premiumCard: {
    padding: 0,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  premiumGradient: {
    padding: Spacing.xl,
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.lg,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  premiumInfo: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: Fonts.sizes.subtitle,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary.dark,
  },
  premiumSubtitle: {
    fontSize: Fonts.sizes.small,
    color: Colors.neutral.gray400,
    marginTop: 2,
  },
  premiumPricing: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  premiumPrice: {
    fontSize: Fonts.sizes.title,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary.dark,
  },
  premiumPeriod: {
    fontSize: Fonts.sizes.small,
    color: Colors.neutral.gray600,
  },
  premiumFeatures: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  premiumFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureEmoji: {
    fontSize: 16,
  },
  premiumFeatureText: {
    fontSize: Fonts.sizes.body,
    color: Colors.neutral.gray800,
    flex: 1,
  },
  premiumButton: {
    backgroundColor: Colors.primary.dark,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    shadowColor: Colors.primary.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  premiumButtonText: {
    fontSize: Fonts.sizes.body,
    fontWeight: Fonts.weights.bold,
    color: Colors.neutral.gray400,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  achievementContent: {
    flex: 1,
  },
  achievementText: {
    fontSize: Fonts.sizes.body,
    color: Colors.primary.dark,
    fontWeight: Fonts.weights.medium,
  },
  achievementDate: {
    fontSize: Fonts.sizes.small,
    color: Colors.neutral.gray400,
    marginTop: 2,
  },
  achievementPoints: {
    fontSize: Fonts.sizes.body,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary.accent,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  logoutText: {
    fontSize: Fonts.sizes.body,
    fontWeight: Fonts.weights.medium,
    color: Colors.error,
  },
  bottomSpacing: {
    height: 100,
  },
});