import { createRoot } from 'react-dom/client';
import App from './app/App.jsx';
import './styles/global.css';
import './styles/theme.css';
import './styles/scrolling.css';
createRoot(document.getElementById('root')).render(<App />);
