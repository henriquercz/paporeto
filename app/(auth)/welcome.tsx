import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image } from 'react-native';

import { router } from 'expo-router';

import { Colors, Fonts, Spacing } from '@/constants/Colors';
import { Button } from '@/components/ui/Button';

export default function WelcomeScreen() {
  return (
    <View style={[styles.container, { backgroundColor: '#68b0d8' }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Logo/Icon Area */}
          <View style={styles.logoContainer}>
            <View style={styles.iconContainer}>
              <Image source={require('@/assets/images/icon.png')} style={styles.logoImage} />
            </View>
            <Text style={styles.logoText}>Seu Ajudante Diário!</Text>
          </View>

          {/* Welcome Message */}
          <View style={styles.messageContainer}>
            <Text style={styles.welcomeTitle}>Parabéns!</Text>
            <Text style={styles.welcomeSubtitle}>
              Você acaba de iniciar um novo passo em sua vida!
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              title="COMECE AGORA"
              onPress={() => router.push('/(auth)/register')}
              variant="primary"
              size="large"
              style={styles.primaryButton}
            />
            
            <Text style={styles.loginPrompt}>Já tem uma conta?</Text>
            <Button
              title="LOGIN"
              onPress={() => router.push('/(auth)/login')}
              variant="outline"
              size="large"
              style={styles.secondaryButton}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: Spacing.xxl,
  },
  iconContainer: {
    backgroundColor: Colors.neutral.white,
    borderRadius: 80,
    padding: Spacing.lg, // Ajustado para acomodar a imagem
    width: 120, // Ajustado para o tamanho da imagem
    height: 120, // Ajustado para o tamanho da imagem
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoText: {
    fontSize: Fonts.sizes.large,
    fontWeight: Fonts.weights.bold,
    color: Colors.neutral.white,
    textAlign: 'center',
  },
  messageContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  welcomeTitle: {
    fontSize: Fonts.sizes.title,
    fontWeight: Fonts.weights.bold,
    color: Colors.neutral.white,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: Fonts.sizes.subtitle,
    color: Colors.neutral.white,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.9,
  },
  buttonContainer: {
    gap: Spacing.md,
  },
  primaryButton: {
    backgroundColor: Colors.primary.accent,
  },
  loginPrompt: {
    fontSize: Fonts.sizes.body,
    color: Colors.neutral.white,
    textAlign: 'center',
    marginTop: Spacing.sm,
    opacity: 0.8,
  },
  secondaryButton: {
    borderColor: Colors.neutral.white,
    backgroundColor: 'transparent',
  },
  logoImage: {
    width: 180,
    height: 140,
    resizeMode: 'contain',
  },
});