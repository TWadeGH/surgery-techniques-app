import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.jsx'
import { ToastProvider } from './components/common'

// Error handling for initial render
try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  createRoot(rootElement).render(
    <StrictMode>
      <ToastProvider>
        <App />
      </ToastProvider>
    </StrictMode>,
  );
} catch (error) {
  console.error('Failed to render app:', error);
  // Fallback UI if render fails
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: sans-serif;">
      <h1>Application Error</h1>
      <p>Failed to load the application. Please check the console for details.</p>
      <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto;">${error.message}\n${error.stack}</pre>
    </div>
  `;
}
