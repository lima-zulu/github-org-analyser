import { createTheme } from '@mui/material/styles';

/**
 * Create Material UI theme based on mode (light/dark)
 */
export const getTheme = mode =>
  createTheme({
    palette: {
      mode,
      ...(mode === 'light'
        ? {
            // Light mode colors
            primary: {
              main: '#0969da',
            },
            secondary: {
              main: '#6e7781',
            },
            background: {
              default: '#ffffff',
              paper: '#f6f8fa',
            },
          }
        : {
            // Dark mode colors
            primary: {
              main: '#58a6ff',
            },
            secondary: {
              main: '#8b949e',
            },
            background: {
              default: '#0d1117',
              paper: '#161b22',
            },
          }),
    },
    typography: {
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ].join(','),
    },
    components: {
      MuiLink: {
        defaultProps: {
          underline: 'hover',
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
          },
        },
      },
    },
  });
