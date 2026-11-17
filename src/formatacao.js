// Funções de formatação (mesmas da extensão: src/api.js e src/app.js).

// O backend devolve datas em UTC sem fuso ("2026-11-07T20:00:00").
export function dataDaApi(texto) {
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(texto) ? texto : `${texto}Z`);
}

export function formatarPreco(valor, moeda = 'BRL') {
  if (valor === null || valor === undefined) return '—';
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: moeda || 'BRL' }).format(valor);
  } catch (e) {
    return `R$ ${Number(valor).toFixed(2).replace('.', ',')}`;
  }
}

export function tempoRelativo(data) {
  const minutos = Math.round((Date.now() - data.getTime()) / 60000);
  if (minutos < 1) return 'Atualizado agora';
  if (minutos < 60) return `Atualizado há ${minutos} minuto${minutos > 1 ? 's' : ''}`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `Atualizado há ${horas} hora${horas > 1 ? 's' : ''}`;
  const dias = Math.round(horas / 24);
  return `Atualizado há ${dias} dia${dias > 1 ? 's' : ''}`;
}

// "07 nov." (os meses ficam escritos aqui para não depender do suporte a datas do celular)
const MESES = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];

export function formatarDia(t) {
  const d = new Date(t);
  return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]}`;
}

// Acha o link de produto dentro de um texto colado/compartilhado
// ("Olha esse fone! https://www.loja.com/produto?id=1" -> "https://www.loja.com/produto?id=1").
export function extrairLink(texto) {
  const t = String(texto || '').trim();
  const comProtocolo = t.match(/https?:\/\/[^\s<>"']+/i);
  if (comProtocolo) return comProtocolo[0];
  const semProtocolo = t.match(/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/[^\s]*)?$/i);
  return semProtocolo ? `https://${t}` : null;
}
