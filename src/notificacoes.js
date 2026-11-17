// =====================================================================
// NOTIFICAÇÕES DOS ALERTAS
// O app confere o preço dos produtos com alerta e, quando um deles chega ao
// preço desejado, mostra uma notificação do sistema (na barra de
// notificações, com som e na tela bloqueada, como as do WhatsApp).
//
// Quando o app confere os preços:
// - ao abrir o app e ao voltar para ele;
// - logo depois de criar um alerta;
// - em segundo plano, com o app fechado, no intervalo de "Verificar preços"
//   (Ajustes). Só funciona no app instalado (APK): o Expo Go não roda
//   tarefas em segundo plano no Android.
//
// São notificações locais: quem cria a notificação é o próprio celular,
// depois de buscar os preços na API. O servidor não manda push.
// =====================================================================
import { useEffect } from 'react';
import { LogBox, Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import * as Notifications from 'expo-notifications';

import { alertasLocais, buscarProdutos, preferencias } from './api';
import { formatarPreco } from './formatacao';

const TAREFA = 'atala-verificar-alertas';
const CANAL = 'alertas-preco';
const MINUTOS = { '6h': 360, '12h': 720, '24h': 1440 };

const noExpoGo = isRunningInExpoGo();

if (noExpoGo) {
  // Avisos do Expo Go sobre push e segundo plano: são as limitações explicadas acima.
  LogBox.ignoreLogs(['expo-notifications', '[expo-notifications]']);
}

// Com o app aberto, a notificação aparece do mesmo jeito (faixa no topo + som).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ---------- Tarefa em segundo plano (só no app instalado) ----------
// Os módulos são carregados só fora do Expo Go, onde existem de verdade.
const segundoPlano = noExpoGo ? null : carregarSegundoPlano();

function carregarSegundoPlano() {
  try {
    const BackgroundTask = require('expo-background-task');
    const TaskManager = require('expo-task-manager');
    // Precisa ser definida fora dos componentes: com o app fechado, nenhuma tela é montada.
    // (Por isso o index.js importa este arquivo antes de tudo.)
    TaskManager.defineTask(TAREFA, async () => {
      try {
        await verificarAlertas();
        return BackgroundTask.BackgroundTaskResult.Success;
      } catch (e) {
        return BackgroundTask.BackgroundTaskResult.Failed;
      }
    });
    return { BackgroundTask, TaskManager };
  } catch (e) {
    return null;
  }
}

// Liga/desliga a conferência em segundo plano conforme os Ajustes.
export async function configurarVerificacaoAutomatica() {
  if (!segundoPlano) return;
  const { BackgroundTask, TaskManager } = segundoPlano;
  try {
    const prefs = await preferencias.ler();
    const registrada = await TaskManager.isTaskRegisteredAsync(TAREFA);
    if (!prefs.alerta_queda) {
      if (registrada) await BackgroundTask.unregisterTaskAsync(TAREFA);
      return;
    }
    const minutos = MINUTOS[prefs.intervalo] || MINUTOS['6h'];
    if (registrada) {
      // Registrar de novo reinicia a contagem; só faz isso se o intervalo mudou.
      const opcoes = await TaskManager.getTaskOptionsAsync(TAREFA);
      if (opcoes?.minimumInterval === minutos) return;
      await BackgroundTask.unregisterTaskAsync(TAREFA);
    }
    await BackgroundTask.registerTaskAsync(TAREFA, { minimumInterval: minutos });
  } catch (e) {
    // Sem segundo plano o app continua conferindo ao abrir.
  }
}

// ---------- Permissão e canal ----------
let canalPronto = null;

// Android 8+: toda notificação precisa de um canal. Importância alta = faixa no topo + som.
function prepararCanal() {
  if (Platform.OS !== 'android') return Promise.resolve();
  if (!canalPronto) {
    canalPronto = Notifications.setNotificationChannelAsync(CANAL, {
      name: 'Alertas de preço',
      description: 'Avisa quando um produto chega ao preço que você quer pagar.',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      lightColor: '#E0936F',
    }).then((c) => console.log('[atala-debug] canal', JSON.stringify(c)))
      .catch((e) => { console.log('[atala-debug] canal erro', e?.message); canalPronto = null; });
  }
  return canalPronto;
}

// Pede a permissão de notificações (Android 13+ e iOS mostram a pergunta uma vez).
export async function pedirPermissao() {
  await prepararCanal();
  const atual = await Notifications.getPermissionsAsync();
  if (atual.granted) return true;
  if (!atual.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

async function temPermissao() {
  await prepararCanal();
  return (await Notifications.getPermissionsAsync()).granted;
}

// Usado ao criar um alerta: 'ok' | 'desligado' (em Ajustes) | 'sem-permissao'.
export async function prepararNotificacoes() {
  const prefs = await preferencias.ler();
  if (!prefs.alerta_queda) return 'desligado';
  return (await pedirPermissao()) ? 'ok' : 'sem-permissao';
}

// ---------- Conferir os alertas ----------
let conferencia = null;

// Busca os preços atuais e notifica os alertas que chegaram ao preço desejado.
// Cada alerta avisa uma vez; avisa de novo se o preço cair ainda mais ou se
// voltar a subir e depois cair. Devolve quantas notificações mostrou.
export function verificarAlertas() {
  // Evita duas conferências ao mesmo tempo (ex.: criar um alerta logo ao abrir o app).
  if (!conferencia) conferencia = conferir().finally(() => { conferencia = null; });
  return conferencia;
}

async function conferir() {
  const prefs = await preferencias.ler();
  if (!prefs.alerta_queda) return 0;
  const ativos = (await alertasLocais.listar()).filter((a) => a.ativo);
  if (!ativos.length || !(await temPermissao())) return 0;

  const produtos = await buscarProdutos(ativos.map((a) => a.produto_id));
  const avisados = {};
  let enviadas = 0;

  for (const alerta of ativos) {
    const dados = produtos[alerta.produto_id];
    const atual = dados?.analise?.estatisticas?.preco_atual;
    if (typeof atual !== 'number') continue;

    if (atual > alerta.preco_alvo) {
      // Subiu de novo: libera um novo aviso quando voltar a cair.
      if (alerta.notificado_preco != null) avisados[alerta.produto_id] = null;
      continue;
    }
    if (alerta.notificado_preco != null && atual >= alerta.notificado_preco) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Preço atingido! ✓',
        body: `${dados.produto.titulo} está por ${formatarPreco(atual, dados.produto.moeda)} `
          + `(seu alerta: ${formatarPreco(alerta.preco_alvo, dados.produto.moeda)}).`,
        data: { tela: 'alertas', produto_id: alerta.produto_id },
      },
      trigger: Platform.OS === 'android' ? { channelId: CANAL } : null,
    });
    avisados[alerta.produto_id] = atual;
    enviadas += 1;
  }

  await alertasLocais.marcarNotificados(avisados);
  return enviadas;
}

// ---------- Teste (botão em Ajustes) ----------
// Chega em 5 segundos, para dar tempo de sair do app ou bloquear a tela.
export async function enviarNotificacaoDeTeste() {
  if (!(await pedirPermissao())) return false;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Atala.IA',
      body: 'Tudo certo! É assim que vamos avisar quando um produto chegar ao preço que você quer.',
      data: { tela: 'alertas' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      ...(Platform.OS === 'android' ? { channelId: CANAL } : {}),
    },
  });
  return true;
}

// ---------- Tocar na notificação ----------
// Abre a tela pedida na notificação (também quando o app estava fechado).
export function useAoTocarNotificacao(aoAbrirTela) {
  const resposta = Notifications.useLastNotificationResponse();
  useEffect(() => {
    console.log('[atala-debug] resposta', resposta === undefined ? 'undefined' : JSON.stringify(resposta?.notification?.request?.content ?? null));
    const tela = resposta?.notification?.request?.content?.data?.tela;
    if (!tela) return;
    aoAbrirTela(tela);
    Notifications.clearLastNotificationResponse();
  }, [resposta, aoAbrirTela]);
}
