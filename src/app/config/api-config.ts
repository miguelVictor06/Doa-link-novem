declare global {
  interface Window {
    __DOALINK_CONFIG__?: {
      apiUrl?: string;
    };
  }
}

const API_PADRAO = 'http://localhost:8080/api';

export function obterApiUrl(): string {
  const configurada = window.__DOALINK_CONFIG__?.apiUrl?.trim();
  return (configurada || API_PADRAO).replace(/\/+$/, '');
}
