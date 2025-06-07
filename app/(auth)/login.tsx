import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, Alert, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/Colors';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        Alert.alert('Erro no Login', error.message);
        return;
      }

      if (data.user) {
        router.replace('/(tabs)');
      }
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient 
      colors={[Colors.primary.dark, '#0D1721']} // Gradiente de azul escuro para mais escuro 
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.neutral.white} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.title}>Login:</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Digite seu e-mail:"
                placeholderTextColor={Colors.neutral.gray400}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Digite sua senha:"
                placeholderTextColor={Colors.neutral.gray400}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff size={20} color={Colors.neutral.gray400} />
                ) : (
                  <Eye size={20} color={Colors.neutral.gray400} />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Esqueceu sua senha?</Text>
            </TouchableOpacity>

            <Button
              title={loading ? "ENTRANDO..." : "AVANÇAR"}
              onPress={handleLogin}
              disabled={loading}
              variant="primary"
              size="large"
              style={styles.loginButton}
            />
          </View>

          <View style={styles.socialContainer}>
            <Text style={styles.socialText}>Ou entre com:</Text>
            <View style={styles.socialButtons}>
              <TouchableOpacity style={styles.socialButton}>
                <Text style={styles.socialButtonText}>G</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton}>
                <Text style={styles.socialButtonText}>f</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton}>
                <Text style={styles.socialButtonText}>Apple</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backButton: {
    marginRight: Spacing.md,
  },
  title: {
    fontSize: Fonts.sizes.title,
    fontWeight: Fonts.weights.bold,
    color: Colors.neutral.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'space-between',
  },
  formContainer: {
    backgroundColor: Colors.primary.dark,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Fonts.sizes.body,
    color: Colors.neutral.gray800,
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: Spacing.md,
    top: Spacing.md,
    padding: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    color: Colors.primary.accent,
    fontSize: Fonts.sizes.small,
  },
  loginButton: {
    marginTop: Spacing.md,
  },
  socialContainer: {
    alignItems: 'center',
    paddingBottom: Spacing.xl,
  },
  socialText: {
    color: Colors.neutral.white,
    fontSize: Fonts.sizes.body,
    marginBottom: Spacing.md,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  socialButton: {
    backgroundColor: Colors.neutral.white,
    borderRadius: 50,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialButtonText: {
    fontSize: Fonts.sizes.body,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary.dark,
  },
});