import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2B6F71',
    primaryContainer: '#276668',
    onPrimary: '#ffffff',
    secondary: '#c6e6e7',
    secondaryContainer: '#b6d6d8',
    onSecondary: '#ffffff',
    error: '#d32f2f',
    background: '#f4f6f9',
    surface: '#ffffff',
    surfaceVariant: '#e0e7ef', // used for divider/borders
    onSurface: '#1a2b3c', // text primary
    onSurfaceVariant: '#546e7a', // text secondary
    elevation: {
      ...DefaultTheme.colors.elevation,
      level1: '#ffffff',
    },
  },
  roundness: 10,
};
