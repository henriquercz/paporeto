import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Spacing } from '@/constants/Colors';
import { Plus } from 'lucide-react-native';

interface FloatingActionButtonProps {
  onPress: () => void;
  style?: ViewStyle;
  icon?: React.ReactNode;
  size?: number;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  style,
  icon,
  size = 56,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.fab,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {icon || <Plus size={24} color={Colors.neutral.white} strokeWidth={2} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.primary.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});