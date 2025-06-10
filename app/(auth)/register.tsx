import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, Alert, TouchableOpacity } from 'react-native';

import { router } from 'expo-router';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/Colors';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';

export default function RegisterScreen() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!nome || !email || !password || !confirmPassword) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            nome_completo: nome.trim(),
          },
        },
      });

      console.log('[RegisterScreen] Resultado de supabase.auth.signUp - data:', JSON.stringify(data, null, 2));
      console.log('[RegisterScreen] Resultado de supabase.auth.signUp - error:', error ? error.message : null);

      if (error) {
        Alert.alert('Erro no Cadastro', error.message);
        setLoading(false);
        return;
      }

      if (data && data.user && data.session) {
        console.log('[RegisterScreen] Cadastro bem-sucedido. Usuário e sessão retornados. Navegando para onboarding.');
        // A trigger no Supabase deve cuidar da criação do perfil em public.users
        router.replace('/(auth)/onboarding');
      } else if (data && data.user && !data.session) {
        console.warn('[RegisterScreen] Cadastro retornou usuário, mas SEM SESSÃO. Isso é inesperado com confirmação de email desabilitada.');
        Alert.alert('Atenção', 'Cadastro parcialmente completo, mas sem sessão ativa. Por favor, tente fazer login.');
        router.replace('/(auth)/login');
      } else {
        console.warn('[RegisterScreen] Cadastro não retornou usuário e/ou sessão como esperado. Resposta:', JSON.stringify(data, null, 2));
        Alert.alert('Erro no Cadastro', 'Resposta inesperada do servidor após o cadastro. Tente fazer login ou contate o suporte.');
        router.replace('/(auth)/login');
      }
      setLoading(false);
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors.primary.dark }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.neutral.white} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.title}>PapoReto</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Cadastro:</Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Digite seu nome:"
                placeholderTextColor={Colors.neutral.gray400}
                value={nome}
                onChangeText={setNome}
                autoCapitalize="words"
              />
            </View>

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

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Confirme sua senha:"
                placeholderTextColor={Colors.neutral.gray400}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} color={Colors.neutral.gray400} />
                ) : (
                  <Eye size={20} color={Colors.neutral.gray400} />
                )}
              </TouchableOpacity>
            </View>

            <Button
              label={loading ? "CRIANDO CONTA..." : "AVANÇAR"}
              onPress={handleRegister}
              disabled={loading}
              variant="primary"
              size="large"
              style={styles.registerButton}
            />
          </View>

          <View style={styles.socialContainer}>
            <Text style={styles.socialText}>Ou cadastre-se com:</Text>
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
    color: Colors.primary.accent,
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
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  formTitle: {
    fontSize: Fonts.sizes.subtitle,
    fontWeight: Fonts.weights.bold,
    color: Colors.neutral.white,
    marginBottom: Spacing.sm,
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
  registerButton: {
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