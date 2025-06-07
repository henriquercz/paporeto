import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/Colors';

interface ProgressBarProps {
  progress: number; // 0-100
  title?: string;
  showPercentage?: boolean;
  color?: string;
  height?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  title,
  showPercentage = true,
  color = Colors.primary.dark,
  height = 8,
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <View style={styles.container}>
      {title && (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {showPercentage && (
            <Text style={styles.percentage}>{Math.round(clampedProgress)}%</Text>
          )}
        </View>
      )}
      <View style={[styles.track, { height }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${clampedProgress}%`,
              backgroundColor: color,
              height,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Fonts.sizes.body,
    fontWeight: Fonts.weights.medium,
    color: Colors.neutral.gray800,
  },
  percentage: {
    fontSize: Fonts.sizes.small,
    fontWeight: Fonts.weights.medium,
    color: Colors.neutral.gray400,
  },
  track: {
    backgroundColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: BorderRadius.sm,
  },
});