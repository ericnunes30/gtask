import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Set initial theme based on localStorage before rendering the app
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

createRoot(document.getElementById("root")!).render(<App />);
