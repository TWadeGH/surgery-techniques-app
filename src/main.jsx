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

  console.log('Starting app render...');
  console.log('Root element found:', rootElement);
  
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <ToastProvider>
          <App />
        </ToastProvider>
      </StrictMode>
    );
    console.log('App rendered successfully');
  } catch (renderError) {
    console.error('Error during render:', renderError);
    throw renderError;
  }
} catch (error) {
  console.error('Failed to render app:', error);
  // Fallback UI if render fails
  const rootElement = document.getElementById('root') || document.body;
  rootElement.innerHTML = `
    <div style="padding: 20px; font-family: sans-serif;">
      <h1>Application Error</h1>
      <p>Failed to load the application. Please check the console for details.</p>
      <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto;">${error.message}\n${error.stack}</pre>
    </div>
  `;
}
