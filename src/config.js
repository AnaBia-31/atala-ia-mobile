import { Platform } from 'react-native';

// Endereço do backend (repositório atala-ia-back).
//
// - Servidor no Render (padrão): 'https://atala-ia-back.onrender.com'
// - Testando com o backend no seu PC: no celular, "127.0.0.1" é o próprio celular,
//   então use o IP do PC na rede Wi-Fi. Rode o backend com
//       uvicorn app.main:app --reload --host 0.0.0.0
//   e inicie o app com
//       EXPO_PUBLIC_API_URL=http://192.168.0.10:8000 npx expo start
//   (troque pelo IP do seu PC; no Windows/PowerShell veja o README).
//
// Na versão web (npx expo start --web), dá para testar contra um backend local
// como na extensão: http://localhost:8081/?api=http://127.0.0.1:8000
const PADRAO = 'https://atala-ia-back.onrender.com';

function enderecoDaApi() {
  if (Platform.OS === 'web' && typeof location !== 'undefined') {
    const local = new URLSearchParams(location.search).get('api');
    if (local && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(local)) return local;
  }
  // process.env.EXPO_PUBLIC_* é trocado pelo valor na hora de gerar o app.
  return (process.env.EXPO_PUBLIC_API_URL || PADRAO).replace(/\/+$/, '');
}

export const ATALA_API_URL = enderecoDaApi();
