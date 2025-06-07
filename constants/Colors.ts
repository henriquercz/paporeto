/**
 * Paleta de cores do PapoReto
 * Baseada no design fornecido e diretrizes de acessibilidade
 */

export const Colors = {
  appBackground: '#F5F5F5', // Cinza claro para fundo principal das telas
  // Cores principais
  primary: {
    light: '#68B0D8',    // Azul claro - fundos principais
    dark: '#1B3347',     // Azul escuro - headers, navegação
    accent: '#F4883F',   // Laranja - botões de ação, destaques
  },
  
  // Cores neutras
  neutral: {
    white: '#FFFFFF',
    gray100: '#F5F5F5',  // Segundo plano
    gray400: '#6E6E6E',  // Texto secundário
    gray800: '#1F1F1F',  // Texto principal
  },
  
  // Feedback
  success: '#4CAF50',
  error: '#D9534F',
  warning: '#FF9800',
  
  // Específicas para componentes
  background: '#1B3347', // Azul escuro - Alterado para ser a cor de fundo principal
  surface: '#FFFFFF',
  border: '#E5E5E5',
  
  // Transparências
  overlay: 'rgba(0, 0, 0, 0.5)',
  cardShadow: 'rgba(0, 0, 0, 0.1)',
};

export const Fonts = {
  sizes: {
    small: 16,    // Aumentado de 14
    body: 20,       // Aumentado de 18
    subtitle: 22,   // Aumentado de 20
    title: 28,      // Aumentado de 26
    large: 32,      // Aumentado de 30
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    bold: '700' as const,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};