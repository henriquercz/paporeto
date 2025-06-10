import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, Switch, Image, Platform } from 'react-native';

import { router } from 'expo-router';
import { ArrowLeft, Bell, Crown, Settings, LogOut, User, Award, Calendar, TrendingUp, Edit2 } from 'lucide-react-native';
import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/Colors';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { Tables } from '../../lib/database.types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as ImagePicker from 'expo-image-picker';


export default function PerfilScreen() {
  const [user, setUser] = useState<Tables<'users'> | null>(null);
  const [pontos, setPontos] = useState<Tables<'pontos'>[]>([]);
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
      mediaTypes: ['images'], // Usando string literal minúscula
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7, // Reduz a qualidade para otimizar o tamanho
      base64: true, // Solicita a string base64
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const uri = asset.uri;

      console.log('--- DEBUG INÍCIO UPLOAD AVATAR (handlePickImage) ---');
      console.log('ImagePicker Asset:', JSON.stringify(asset, null, 2));
      console.log('Image URI:', uri);
      uploadAvatar(uri, asset.mimeType || asset.type, asset.base64); // Passa o mimeType e base64
    }
  };

  const uploadAvatar = async (uri: string, assetMimeType?: string, base64Data?: string | null) => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      console.log('Blob Size (após fetch e .blob()):', blob.size);
      console.log('Blob Type (do blob):', blob.type);
      const fileExt = uri.split('.').pop()?.toLowerCase(); // Normalizar para minúsculas
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `${user.auth_user_id}/${fileName}`;

    // Lógica aprimorada para determinar o contentType
    console.log('Asset MimeType recebido em uploadAvatar:', assetMimeType);
    let determinedContentType = assetMimeType;
    if (!determinedContentType && blob.type && blob.type !== 'application/octet-stream') {
        determinedContentType = blob.type;
    }
    if ((!determinedContentType || determinedContentType === 'application/octet-stream') && fileExt) {
        if (fileExt === 'jpg' || fileExt === 'jpeg') {
            determinedContentType = 'image/jpeg';
        } else if (fileExt === 'png') {
            determinedContentType = 'image/png';
        } else if (fileExt === 'gif') {
            determinedContentType = 'image/gif';
        } else if (fileExt === 'webp') {
            determinedContentType = 'image/webp';
        }
        // Adicionar mais tipos conforme necessário
    }
    console.log('Determined ContentType para Upload:', determinedContentType);
    console.log('File Path para Upload:', filePath);
    console.log('--- DEBUG FIM UPLOAD AVATAR ---');

      if (!base64Data) {
        console.error('--- ERRO: Dados Base64 não fornecidos para uploadAvatar ---');
        Alert.alert('Erro', 'Não foi possível processar a imagem para upload (Base64 ausente).');
        setLoading(false);
        return;
      }

      const dataUrl = `data:${assetMimeType || 'image/jpeg'};base64,${base64Data}`;
      console.log('--- DEBUG: Data URL preparada para upload (primeiros 100 chars):', dataUrl.substring(0, 100));
      // console.log('--- DEBUG: Comprimento da string Base64:', base64Data.length);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        // Ao enviar uma Data URL, o Supabase SDK a decodifica. O terceiro argumento (fileOptions) ainda é útil.
        .upload(filePath, dataUrl, {
          upsert: true,
          cacheControl: '3600',
          contentType: assetMimeType || 'image/jpeg', // Adiciona o contentType explicitamente
        });

      if (uploadError) {
        console.error('--- ERRO NO UPLOAD DO SUPABASE ---');
        console.error('Detalhes do Erro:', JSON.stringify(uploadError, null, 2));
        throw uploadError;
      }

      console.log('--- SUCESSO NO UPLOAD DO SUPABASE (segundo o SDK) ---');
      console.log('Dados do Upload:', JSON.stringify(uploadData, null, 2));

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
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={Colors.neutral.white} strokeWidth={2} />
            </TouchableOpacity>
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
            
            <View style={styles.settingDivider} />
            
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Settings size={20} color={Colors.primary.dark} strokeWidth={2} />
                <Text style={styles.settingText}>Preferências</Text>
              </View>
            </TouchableOpacity>
          </Card>
        </View>

        {/* Premium */}
        <Card style={styles.premiumCard}>
          <View style={[styles.premiumGradient, { backgroundColor: Colors.primary.dark }]}>
            <Crown size={32} color={Colors.neutral.white} strokeWidth={2} />
            <View style={styles.premiumInfo}>
              <Text style={styles.premiumTitle}>PREMIUM!</Text>
              <Text style={styles.premiumPrice}>R$ 27,90</Text>
              <Text style={styles.premiumPeriod}>Por mês, por 12 meses</Text>
              <Text style={styles.premiumTotal}>Total de R$ 334,80</Text>
              <Text style={styles.premiumAnnual}>Plano anual por: 309,90</Text>
            </View>
            
            <View style={styles.premiumFeatures}>
              <View style={styles.premiumFeature}>
                <Text style={styles.premiumFeatureText}>🚫 Curta o app sem anúncio</Text>
              </View>
              <View style={styles.premiumFeature}>
                <Text style={styles.premiumFeatureText}>📞 Contato de profissionais</Text>
              </View>
              <View style={styles.premiumFeature}>
                <Text style={styles.premiumFeatureText}>📚 Acesso livre aos conteúdos</Text>
              </View>
              <View style={styles.premiumFeature}>
                <Text style={styles.premiumFeatureText}>✅ Tratamento personalizado</Text>
              </View>
            </View>

            <View style={styles.premiumButtons}>
              <Button
                title="ASSINAR"
                onPress={() => Alert.alert('Premium', 'Funcionalidade em desenvolvimento')}
                variant="secondary"
                style={styles.premiumButton}
              />
              <Button
                title="ASSINAR ANUAL"
                onPress={() => Alert.alert('Premium', 'Funcionalidade em desenvolvimento')}
                variant="secondary"
                style={styles.premiumButton}
              />
            </View>
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
                  <Text style={styles.achievementText}>{ponto.motivo}</Text>
                  <Text style={styles.achievementDate}>
                    {format(new Date(ponto.data), 'dd/MM/yyyy', { locale: ptBR })}
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
    padding: Spacing.lg,
  },
  premiumContent: {
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
    color: Colors.neutral.white,
  },
  premiumPrice: {
    fontSize: Fonts.sizes.title,
    fontWeight: Fonts.weights.bold,
    color: Colors.neutral.white,
  },
  premiumPeriod: {
    fontSize: Fonts.sizes.small,
    color: Colors.neutral.white,
    opacity: 0.9,
  },
  premiumTotal: {
    fontSize: Fonts.sizes.small,
    color: Colors.neutral.white,
    opacity: 0.9,
  },
  premiumAnnual: {
    fontSize: Fonts.sizes.small,
    color: Colors.neutral.white,
    opacity: 0.9,
  },
  premiumFeatures: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  premiumFeature: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumFeatureText: {
    fontSize: Fonts.sizes.small,
    color: Colors.neutral.white,
  },
  premiumButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  premiumButton: {
    flex: 1,
    backgroundColor: Colors.neutral.white,
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