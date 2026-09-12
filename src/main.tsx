import { createRoot } from 'react-dom/client';
import './styles.css';
import { App } from './app/App';

createRoot(document.getElementById('root')!).render(<App />);

// Prośba o trwałą pamięć: bez niej przeglądarka może wyczyścić dane strony,
// gdy w telefonie kończy się miejsce. Zainstalowana aplikacja dostaje ją zwykle
// od ręki, bez żadnego okienka.
navigator.storage
  ?.persisted?.()
  .then((persisted) => {
    if (!persisted) return navigator.storage.persist?.();
  })
  .catch(() => undefined);
