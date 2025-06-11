import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/Colors';

/**
 * @fileoverview Layout para as telas de Meta.
 * @description Este layout gerencia a pilha de navegação para as telas relacionadas a metas,
 *              garantindo uma estrutura de rotas modular e organizada.
 * @author Cascade
 * @date 2025-06-10
 */
export default function MetaLayout() {
  const router = useRouter();

  return (
    <Stack>
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Detalhes da Meta',
          headerTitleAlign: 'center',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ padding: Spacing.sm }}>
              <ArrowLeft size={24} color={Colors.primary.dark} />
            </TouchableOpacity>
          ),
        }}
      />
    </Stack>
  );
}
