import { createTheme, ThemeOptions } from '@mui/material/styles';

// Common theme options
const commonOptions: ThemeOptions = {
  typography: {
    fontFamily: [
      'Pretendard',
      '-apple-system',
      'BlinkMacSystemFont',
      'system-ui',
      'sans-serif',
    ].join(','),
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        },
      },
    },
  },
};

// Light theme
export const lightTheme = createTheme({
  ...commonOptions,
  palette: {
    mode: 'light',
    primary: {
      main: '#a855f7', // Workbench purple
      light: '#c084fc',
      dark: '#7e22ce',
    },
    secondary: {
      main: '#0ea5e9', // Hub blue
      light: '#38bdf8',
      dark: '#0369a1',
    },
    success: {
      main: '#14b8a6', // Flow teal
      light: '#2dd4bf',
      dark: '#0f766e',
    },
    background: {
      default: '#ffffff',
      paper: '#f9fafb',
    },
    text: {
      primary: '#111827',
      secondary: '#6b7280',
    },
  },
});

// Dark theme
export const darkTheme = createTheme({
  ...commonOptions,
  palette: {
    mode: 'dark',
    primary: {
      main: '#a855f7',
      light: '#c084fc',
      dark: '#7e22ce',
    },
    secondary: {
      main: '#0ea5e9',
      light: '#38bdf8',
      dark: '#0369a1',
    },
    success: {
      main: '#14b8a6',
      light: '#2dd4bf',
      dark: '#0f766e',
    },
    background: {
      default: '#030712',
      paper: '#111827',
    },
    text: {
      primary: '#f9fafb',
      secondary: '#9ca3af',
    },
  },
});
