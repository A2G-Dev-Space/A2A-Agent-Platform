import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';
import { useThemeStore } from './store/useThemeStore';
import { lightTheme, darkTheme } from './utils/theme';
import './styles/index.css';

// Initialize dark mode class on load
const initializeTheme = () => {
  const storedTheme = localStorage.getItem('theme-storage');
  if (storedTheme) {
    const parsed = JSON.parse(storedTheme);
    if (parsed.state?.theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }
};

initializeTheme();

function Root() {
  const theme = useThemeStore((state) => state.theme);
  const muiTheme = theme === 'dark' ? darkTheme : lightTheme;

  return (
    <React.StrictMode>
      <BrowserRouter>
        <MuiThemeProvider theme={muiTheme}>
          <CssBaseline />
          <App />
        </MuiThemeProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);
