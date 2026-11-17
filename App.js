// =====================================================================
// ATALA.IA — APP MOBILE (React Native + Expo)
// Versão para celular do popup da extensão (popup.html + src/*.js).
// Este arquivo faz o papel do popup.html + script.js: monta o cabeçalho,
// as telas e a barra de navegação, e guarda a análise do produto atual
// (o "estado" do app.js).
// =====================================================================
import { useCallback, useEffect, useState } from 'react';
import { AppState, BackHandler, Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from '@expo-google-fonts/inter/useFonts';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_400Regular_Italic } from '@expo-google-fonts/inter/400Regular_Italic';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Jost_400Regular } from '@expo-google-fonts/jost/400Regular';
import { Jost_400Regular_Italic } from '@expo-google-fonts/jost/400Regular_Italic';
import { Jost_500Medium } from '@expo-google-fonts/jost/500Medium';
import { Jost_600SemiBold } from '@expo-google-fonts/jost/600SemiBold';
import { Jost_700Bold } from '@expo-google-fonts/jost/700Bold';

import { api, historicoLocal } from './src/api';
import BarraNavegacao from './src/componentes/BarraNavegacao';
import Cabecalho from './src/componentes/Cabecalho';
import { configurarVerificacaoAutomatica, useAoTocarNotificacao, verificarAlertas } from './src/notificacoes';
import { ProvedorTema, useTema } from './src/tema';
import Navegador from './src/telas/Navegador';
import TelaAjuda from './src/telas/TelaAjuda';
import TelaAjustes from './src/telas/TelaAjustes';
import TelaAlertas from './src/telas/TelaAlertas';
import TelaHistorico from './src/telas/TelaHistorico';
import TelaInicio from './src/telas/TelaInicio';
import TelaProduto from './src/telas/TelaProduto';

export default function App() {
  return (
    <SafeAreaProvider>
      <ProvedorTema>
        <Aplicativo />
      </ProvedorTema>
    </SafeAreaProvider>
  );
}

// Teste do visual no computador (npx expo start --web), igual ao popup.html da extensão:
// http://localhost:8081/?titulo=Fone&preco=199.90&preco_original=259.90
function produtoDeTeste() {
  if (Platform.OS !== 'web' || typeof location === 'undefined') return null;
  const p = new URLSearchParams(location.search);
  if (!p.get('preco')) return null;
  return {
    url: p.get('url') || 'https://www.exemplo.com/produto-teste',
    loja: p.get('loja') || 'Loja de teste',
    titulo: p.get('titulo') || 'Produto de teste',
    preco: parseFloat(p.get('preco')),
    preco_original: p.get('preco_original') ? parseFloat(p.get('preco_original')) : null,
    imagem_url: p.get('imagem') || null,
    moeda: 'BRL',
  };
}

// Mantém a tela montada quando escondida (como as <section class="hidden">),
// para não perder o que já foi carregado ao trocar de aba.
function Pagina({ visivel, children }) {
  return <View style={[StyleSheet.absoluteFill, { display: visivel ? 'flex' : 'none' }]}>{children}</View>;
}

function Aplicativo() {
  const { cores, carregado } = useTema();
  const [fontesProntas, erroFontes] = useFonts({
    Inter_400Regular,
    Inter_400Regular_Italic,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Jost_400Regular,
    Jost_400Regular_Italic,
    Jost_500Medium,
    Jost_600SemiBold,
    Jost_700Bold,
  });

  const [aba, setAba] = useState('produto');
  // analise = { produto (lido da página), detalhe (resposta da API), status, erro }
  // status: 'analisando' | 'acordando' | 'ok' | 'erro'
  const [analise, setAnalise] = useState(null);
  // navegador = { url, analisarSozinho } enquanto uma loja está aberta
  const [navegador, setNavegador] = useState(null);

  // analisarProduto do app.js: manda o produto para a API e guarda no Histórico.
  const analisarProduto = useCallback(async (produto) => {
    setAba('produto');
    setAnalise({ produto, detalhe: null, status: 'analisando', erro: null });
    const mesmoProduto = (a) => a && a.produto === produto;

    // Servidores gratuitos "dormem" sem uso e levam até ~1 minuto para acordar.
    const avisoDemora = setTimeout(() => {
      setAnalise((a) => (mesmoProduto(a) && a.status === 'analisando' ? { ...a, status: 'acordando' } : a));
    }, 4000);

    try {
      const detalhe = await api.observar(produto);
      clearTimeout(avisoDemora);
      await historicoLocal.registrar(detalhe.produto.id);
      setAnalise((a) => (mesmoProduto(a) ? { ...a, detalhe, status: 'ok' } : a));
    } catch (erro) {
      clearTimeout(avisoDemora);
      setAnalise((a) => (mesmoProduto(a) ? { ...a, detalhe: null, status: 'erro', erro } : a));
    }
  }, []);

  useEffect(() => {
    const teste = produtoDeTeste();
    if (teste) analisarProduto(teste);
  }, [analisarProduto]);

  // Notificações dos alertas: confere os preços ao abrir o app e ao voltar para ele.
  useEffect(() => {
    configurarVerificacaoAutomatica();
    verificarAlertas().catch(() => {});
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') verificarAlertas().catch(() => {});
    });
    return () => assinatura.remove();
  }, []);

  // Tocar numa notificação abre a tela de Alertas.
  useAoTocarNotificacao(setAba);

  // Botão "voltar" do Android: de outra aba, volta para Produto.
  useEffect(() => {
    const assinatura = BackHandler.addEventListener('hardwareBackPress', () => {
      if (aba === 'produto') return false;
      setAba('produto');
      return true;
    });
    return () => assinatura.remove();
  }, [aba]);

  const abrirLoja = (url) => setNavegador({ url, analisarSozinho: false });

  if ((!fontesProntas && !erroFontes) || !carregado) {
    return <View style={[estilos.app, { backgroundColor: cores.offWhite }]} />;
  }

  return (
    <View style={[estilos.app, { backgroundColor: cores.offWhite }]}>
      <StatusBar style="light" />
      <Cabecalho />

      <View style={estilos.telas}>
        <Pagina visivel={aba === 'produto'}>
          {analise ? (
            <TelaProduto
              analise={analise}
              ativa={aba === 'produto'}
              aoVerAnalises={() => setAba('historico')}
              aoNovaAnalise={() => setAnalise(null)}
            />
          ) : (
            <TelaInicio
              aoAbrirLink={(url) => setNavegador({ url, analisarSozinho: true })}
              aoAbrirLoja={abrirLoja}
              aoComoFunciona={() => setAba('ajuda')}
            />
          )}
        </Pagina>
        <Pagina visivel={aba === 'historico'}>
          <TelaHistorico ativa={aba === 'historico'} aoAbrirProduto={abrirLoja} />
        </Pagina>
        <Pagina visivel={aba === 'alertas'}>
          <TelaAlertas ativa={aba === 'alertas'} />
        </Pagina>
        <Pagina visivel={aba === 'ajustes'}>
          <TelaAjustes />
        </Pagina>
        <Pagina visivel={aba === 'ajuda'}>
          <TelaAjuda />
        </Pagina>
      </View>

      <BarraNavegacao abaAtiva={aba} aoTrocar={setAba} />

      <Navegador
        url={navegador?.url}
        analisarSozinho={!!navegador?.analisarSozinho}
        aoFechar={() => setNavegador(null)}
        aoAnalisar={(produto) => {
          setNavegador(null);
          analisarProduto(produto);
        }}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  app: { flex: 1 },
  telas: { flex: 1 },
});
