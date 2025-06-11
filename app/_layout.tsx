import { useEffect, useState } from 'react';
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
  const [sessionLoading, setSessionLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const segments = useSegments(); // Hook para obter os segmentos da rota atual

  useEffect(() => {
    // Esconder SplashScreen quando fontes e sessão estiverem carregadas
    if ((fontsLoaded || fontError) && !sessionLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, sessionLoading]);

  useEffect(() => {
    // Carregar sessão inicial
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setSessionLoading(false);
    });

    // Escutar mudanças no estado de autenticação
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (sessionLoading && newSession !== null) {
         setSessionLoading(false);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (sessionLoading || !(fontsLoaded || fontError)) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (session) {
      // Usuário está logado. Se ele estiver no grupo de autenticação, redirecione para as abas.
      if (inAuthGroup) {
        router.replace('/(tabs)');
      }
    } else {
      // Usuário não está logado. Se ele não estiver no grupo de autenticação, redirecione para lá.
      if (!inAuthGroup) {
        router.replace('/(auth)/welcome');
      }
    }
  }, [session, sessionLoading, segments, fontsLoaded, fontError]);

  // Condição de carregamento para fontes e sessão
  if (sessionLoading || (!fontsLoaded && !fontError)) {
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