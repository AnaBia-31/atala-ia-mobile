// =====================================================================
// COMUNICAÇÃO COM O BACKEND E ARMAZENAMENTO LOCAL
// Igual à extensão (src/api.js): o app usa apenas as rotas públicas da API
// (análise e preços dos produtos). O Histórico, os Alertas e as preferências
// ficam guardados no próprio celular (AsyncStorage, no lugar do chrome.storage).
// =====================================================================
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ATALA_API_URL } from './config';

export const armazenamento = {
  async ler(chave, padrao = null) {
    try {
      const valor = await AsyncStorage.getItem(chave);
      return valor === null ? padrao : (JSON.parse(valor) ?? padrao);
    } catch (e) {
      return padrao;
    }
  },
  async gravar(chave, valor) {
    await AsyncStorage.setItem(chave, JSON.stringify(valor));
  },
};

export class ErroApi extends Error {
  constructor(mensagem, status) {
    super(mensagem);
    this.status = status;
  }
}

export const api = {
  async requisicao(metodo, caminho, corpo) {
    let resposta;
    try {
      resposta = await fetch(`${ATALA_API_URL}${caminho}`, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: corpo ? JSON.stringify(corpo) : undefined,
      });
    } catch (e) {
      throw new ErroApi('Não foi possível conectar ao servidor do Atala.IA.', 0);
    }
    const dados = await resposta.json().catch(() => null);
    if (!resposta.ok) {
      const mensagem = dados && typeof dados.detail === 'string' ? dados.detail : 'Algo deu errado. Tente de novo.';
      throw new ErroApi(mensagem, resposta.status);
    }
    return dados;
  },

  observar: (produto) => api.requisicao('POST', '/produtos/observar', produto),
  produto: (id) => api.requisicao('GET', `/produtos/${id}`),
  historicoPrecos: (id, dias = 30) => api.requisicao('GET', `/produtos/${id}/historico?dias=${dias}`),
};

// Busca os dados atuais de vários produtos na API (ignora os que falharem).
export async function buscarProdutos(ids) {
  const resultados = await Promise.allSettled(ids.map((id) => api.produto(id)));
  const porId = {};
  resultados.forEach((r, i) => { if (r.status === 'fulfilled') porId[ids[i]] = r.value; });
  if (ids.length && !Object.keys(porId).length) {
    const falha = resultados.find((r) => r.status === 'rejected');
    if (falha) throw falha.reason;
  }
  return porId;
}

// ---------- Histórico local: produtos analisados neste celular ----------
export const historicoLocal = {
  async listar() {
    return armazenamento.ler('atalaHistorico', []);
  },
  async registrar(produtoId) {
    const lista = (await this.listar()).filter((i) => i.produto_id !== produtoId);
    lista.unshift({ produto_id: produtoId, visto_em: new Date().toISOString() });
    await armazenamento.gravar('atalaHistorico', lista.slice(0, 50));
  },
};

// ---------- Alertas locais: um por produto ----------
export const alertasLocais = {
  async listar() {
    return armazenamento.ler('atalaAlertas', []);
  },
  async salvar(produtoId, precoAlvo) {
    const lista = (await this.listar()).filter((a) => a.produto_id !== produtoId);
    lista.unshift({ produto_id: produtoId, preco_alvo: precoAlvo, ativo: true, criado_em: new Date().toISOString() });
    await armazenamento.gravar('atalaAlertas', lista);
  },
  async definirAtivo(produtoId, ativo) {
    const lista = await this.listar();
    const alerta = lista.find((a) => a.produto_id === produtoId);
    if (alerta) {
      alerta.ativo = ativo;
      // Religado: pode notificar de novo, mesmo que já tenha avisado antes.
      if (ativo) delete alerta.notificado_preco;
    }
    await armazenamento.gravar('atalaAlertas', lista);
  },
  // Guarda o preço que já virou notificação ({ produto_id: preço }; null = pode avisar de novo).
  async marcarNotificados(precos) {
    if (!Object.keys(precos).length) return;
    const lista = await this.listar();
    lista.forEach((a) => {
      if (a.produto_id in precos) a.notificado_preco = precos[a.produto_id];
    });
    await armazenamento.gravar('atalaAlertas', lista);
  },
  async ativoPara(produtoId) {
    return (await this.listar()).some((a) => a.produto_id === produtoId && a.ativo);
  },
};

// ---------- Preferências da tela Ajustes ----------
export const PREFERENCIAS_PADRAO = {
  alerta_queda: true,
  resumo_semanal: true,
  analisar_ao_abrir: true,
  intervalo: '6h',
  moeda: 'BRL',
};

export const preferencias = {
  async ler() {
    return { ...PREFERENCIAS_PADRAO, ...(await armazenamento.ler('atalaPreferencias', {})) };
  },
  async salvar(prefs) {
    await armazenamento.gravar('atalaPreferencias', prefs);
  },
};
