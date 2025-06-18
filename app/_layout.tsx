import React, { useState, useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts, Roboto_400Regular, Roboto_500Medium, Roboto_700Bold } from '@expo-google-fonts/roboto';
import * as SplashScreen from 'expo-splash-screen';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';

// Impedir que a splash screen se esconda automaticamente
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Roboto-Regular': Roboto_400Regular,
    'Roboto-Medium': Roboto_500Medium,
    'Roboto-Bold': Roboto_700Bold,
  });

  // Auth state
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const segments = useSegments(); // Hook para obter os segmentos da rota atual

  useEffect(() => {
    // Esconder SplashScreen quando fontes e sessão estiverem carregadas
    if ((fontsLoaded || fontError) && !loading && !profileLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, loading, profileLoading]);

  useEffect(() => {
    // Carregar sessão inicial
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setLoading(false);
    });

    // Escutar mudanças no estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (loading && newSession !== null) {
         setLoading(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleNavigation = async () => {
      if (loading) return;

      const inAuthGroup = (segments as string[]).includes("(auth)");

      if (session) {
        setProfileLoading(true);
        try {
          const { data: profile, error } = await supabase
            .from('users')
            .select('onboarding_completed')
            .eq('auth_user_id', session.user.id)
            .single();

          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching profile', error);
          }

          const onboardingCompleted = profile?.onboarding_completed ?? false;
          const inOnboarding = (segments as string[]).includes('onboarding');
          const inLogin = (segments as string[]).includes('login');
          const inRegister = (segments as string[]).includes('register');

          if (!onboardingCompleted) {
            // Só redireciona para onboarding se não estiver em login/register e não estiver já no onboarding
            if (!inOnboarding && !inLogin && !inRegister) {
              router.replace('/(auth)/onboarding');
            }
          } else {
            if (inAuthGroup) {
              router.replace('/(tabs)');
            }
          }
        } catch (e) {
          console.error('Navigation error:', e);
        } finally {
          setProfileLoading(false);
        }
      } else {
        if (!inAuthGroup) {
          router.replace('/(auth)/welcome');
        }
        setProfileLoading(false);
      }
    };

    handleNavigation();
  }, [session, loading, segments]);

  // Condição de carregamento para fontes e sessão
  if (loading || (!fontsLoaded && !fontError)) {
    return null; // Ou um componente de loading global
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="meta" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="dark" backgroundColor="#1B3347" />
    </>
  );
}