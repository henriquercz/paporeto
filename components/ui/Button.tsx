import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, View, ActivityIndicator } from 'react-native';
import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/Colors';

interface ButtonProps {
  label: string;
  onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'destructive';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  isLoading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  isLoading = false,
  style,
  textStyle,
  iconLeft,
  iconRight,
}) => {
  const buttonStyle = [
    styles.base,
    styles[variant],
    styles[size],
    disabled && styles.disabled,
    style,
  ];

    const textStyleCombined = [
    styles.baseText,
    styles[`${variant}Text` as 'primaryText' | 'secondaryText' | 'outlineText' | 'destructiveText'],
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'primary' ? Colors.neutral.white : Colors.primary.dark} />
      ) : (
        <View style={styles.contentContainer}>
          {iconLeft && <View style={styles.iconWrapper}>{iconLeft}</View>}
          <Text style={textStyleCombined}>{label}</Text>
          {iconRight && <View style={styles.iconWrapper}>{iconRight}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  
  // Variants
  primary: {
    backgroundColor: Colors.primary.accent,
  },
  secondary: {
    backgroundColor: Colors.primary.light,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary.dark,
  },

  destructive: {
    backgroundColor: Colors.error,
  },
  
  // Sizes
  small: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 36,
  },
  medium: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 48,
  },
  large: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    minHeight: 56,
  },
  
  disabled: {
    opacity: 0.5,
  },
  
  // Text styles
  baseText: {
    fontSize: Fonts.sizes.body,
    fontWeight: Fonts.weights.medium,
    textAlign: 'center',
  },
  primaryText: {
    color: Colors.neutral.white,
  },
  secondaryText: {
    color: Colors.primary.dark,
  },
  outlineText: {
    color: Colors.primary.dark,
  },
  destructiveText: {
    color: Colors.neutral.white,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    marginHorizontal: Spacing.xs,
  },
});