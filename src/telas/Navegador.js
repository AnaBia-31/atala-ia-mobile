// =====================================================================
// NAVEGADOR DAS LOJAS (substitui o "ler o produto da aba atual" da extensão)
// ---------------------------------------------------------------------
// No celular o app não consegue ler as abas do Chrome. Então a loja é
// aberta aqui dentro (WebView) e, a cada página carregada, o mesmo leitor
// da extensão (src/extrator.js) é injetado nela. Quando ele encontra um
// produto, aparece o botão "Analisar preço" embaixo.
// Se o usuário colou um link, a análise começa sozinha ("analisarSozinho").
// =====================================================================
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { ArrowLeft, RotateCw, X } from 'lucide-react-native';

import ImagemProduto from '../componentes/ImagemProduto';
import Texto from '../componentes/Texto';
import { EXTRATOR_JS } from '../extrator';
import { formatarPreco } from '../formatacao';
import { useTema } from '../tema';

// Lê a página logo depois de carregar e de novo um pouco depois
// (algumas lojas só mostram o preço depois que a página termina de montar).
const LEITURAS_MS = [600, 2000, 4500];

function produtoValido(p) {
  return !!p && typeof p.titulo === 'string' && typeof p.url === 'string' && typeof p.preco === 'number' && p.preco > 0;
}

function dominio(url) {
  const achou = String(url || '').match(/^https?:\/\/([^/?#]+)/i);
  return achou ? achou[1].replace(/^www\./, '') : '';
}

export default function Navegador({ url, analisarSozinho, aoFechar, aoAnalisar }) {
  const { cores } = useTema();
  const { top, bottom } = useSafeAreaInsets();
  const web = useRef(null);
  const temporizadores = useRef([]);
  const urlAtual = useRef('');
  const jaAnalisou = useRef(false);
  const produtoRef = useRef(null);

  const [pagina, setPagina] = useState({ url: '', podeVoltar: false });
  const [situacao, setSituacao] = useState('carregando'); // carregando | procurando | nenhum | achou
  const [produto, setProduto] = useState(null);

  function limparLeituras() {
    temporizadores.current.forEach(clearTimeout);
    temporizadores.current = [];
  }

  function definirProduto(novo) {
    produtoRef.current = novo;
    setProduto(novo);
  }

  // Abriu (ou trocou) o link: começa do zero.
  useEffect(() => {
    if (!url) return undefined;
    urlAtual.current = url;
    jaAnalisou.current = false;
    definirProduto(null);
    setPagina({ url, podeVoltar: false });
    setSituacao('carregando');
    return limparLeituras;
  }, [url]);

  function lerPagina() {
    limparLeituras();
    if (!produtoRef.current) setSituacao('procurando');
    temporizadores.current = LEITURAS_MS.map((ms) => setTimeout(() => web.current?.injectJavaScript(EXTRATOR_JS), ms));
    temporizadores.current.push(setTimeout(() => {
      if (!produtoRef.current) setSituacao('nenhum');
    }, LEITURAS_MS[LEITURAS_MS.length - 1] + 800));
  }

  function aoMudarNavegacao(nav) {
    if (nav.url !== urlAtual.current) {
      urlAtual.current = nav.url;
      definirProduto(null);
    }
    setPagina({ url: nav.url, podeVoltar: nav.canGoBack });
    if (nav.loading) {
      limparLeituras();
      if (!produtoRef.current) setSituacao('carregando');
    } else {
      lerPagina();
    }
  }

  function aoReceberMensagem(evento) {
    let mensagem;
    try {
      mensagem = JSON.parse(evento.nativeEvent.data);
    } catch (e) {
      return;
    }
    if (!mensagem || mensagem.tipo !== 'atala-produto' || !produtoValido(mensagem.produto)) return;
    definirProduto(mensagem.produto);
    setSituacao('achou');
    if (analisarSozinho && !jaAnalisou.current) {
      jaAnalisou.current = true;
      limparLeituras();
      aoAnalisar(mensagem.produto);
    }
  }

  // Botão "voltar" do Android: volta uma página; na primeira, fecha o navegador.
  function voltar() {
    if (pagina.podeVoltar) web.current?.goBack();
    else fechar();
  }

  function fechar() {
    limparLeituras();
    aoFechar();
  }

  function permitirEndereco(pedido) {
    if (pedido.isTopFrame === false) return true;
    // Links que abririam outros apps (intent://, mailto:...) ficam bloqueados.
    return /^(https?|about|data|blob):/i.test(pedido.url);
  }

  return (
    <Modal
      visible={!!url}
      animationType="slide"
      onRequestClose={voltar}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={[estilos.tela, { backgroundColor: cores.offWhite }]}>
        <View style={[estilos.barraTopo, { backgroundColor: cores.navbar, paddingTop: top + 6 }]}>
          <Pressable onPress={fechar} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fechar loja" style={estilos.botaoIcone}>
            <X size={22} color="#FFF8EE" strokeWidth={2} />
          </Pressable>
          <Pressable
            onPress={() => web.current?.goBack()}
            disabled={!pagina.podeVoltar}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Página anterior"
            style={[estilos.botaoIcone, { opacity: pagina.podeVoltar ? 1 : 0.4 }]}
          >
            <ArrowLeft size={22} color="#FFF8EE" strokeWidth={2} />
          </Pressable>
          <Texto tamanho={13} peso="semibold" cor="#FFF8EE" numberOfLines={1} style={estilos.endereco} semAjuste>
            {dominio(pagina.url)}
          </Texto>
          <Pressable onPress={() => web.current?.reload()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Recarregar" style={estilos.botaoIcone}>
            <RotateCw size={20} color="#FFF8EE" strokeWidth={2} />
          </Pressable>
        </View>

        {url ? (
          <WebView
            ref={web}
            source={{ uri: url }}
            style={estilos.web}
            originWhitelist={['*']}
            onShouldStartLoadWithRequest={permitirEndereco}
            onNavigationStateChange={aoMudarNavegacao}
            onLoadEnd={lerPagina}
            onMessage={aoReceberMensagem}
            setSupportMultipleWindows={false}
            allowsBackForwardNavigationGestures
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={[StyleSheet.absoluteFill, estilos.carregando, { backgroundColor: cores.offWhite }]}>
                <ActivityIndicator color={cores.orange} size="large" />
              </View>
            )}
          />
        ) : null}

        <View
          style={[
            estilos.barraBaixo,
            { backgroundColor: cores.navFundo, borderTopColor: cores.secondaryOffWhite, paddingBottom: 10 + bottom },
          ]}
        >
          {situacao === 'achou' && produto ? (
            <>
              <ImagemProduto url={produto.imagem_url} largura={44} altura={44} />
              <View style={estilos.colunaProduto}>
                <Texto tamanho={12} peso="semibold" numberOfLines={1}>{produto.titulo}</Texto>
                <Texto tamanho={12} cor={cores.gray}>{formatarPreco(produto.preco, produto.moeda)}</Texto>
              </View>
              <Pressable
                onPress={() => {
                  jaAnalisou.current = true;
                  limparLeituras();
                  aoAnalisar(produto);
                }}
                accessibilityRole="button"
                style={({ pressed }) => [
                  estilos.botaoAnalisar,
                  { backgroundColor: pressed ? cores.hoverOrange : cores.orange, borderColor: cores.darkOrange },
                ]}
              >
                <Texto tamanho={12} peso="semibold" cor={cores.lightSecondary}>Analisar preço</Texto>
              </Pressable>
            </>
          ) : situacao === 'nenhum' ? (
            <Texto tamanho={11} cor={cores.gray} style={{ flex: 1 }}>
              Nenhum produto nesta página. Abra a página de um produto para analisar o preço.
            </Texto>
          ) : (
            <>
              <ActivityIndicator color={cores.orange} />
              <Texto tamanho={11} cor={cores.gray} style={{ flex: 1 }}>Procurando o produto na página…</Texto>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  barraTopo: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingBottom: 8 },
  botaoIcone: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  endereco: { flex: 1, textAlign: 'center' },
  web: { flex: 1 },
  carregando: { alignItems: 'center', justifyContent: 'center' },
  barraBaixo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    minHeight: 64,
  },
  colunaProduto: { flex: 1, minWidth: 0 },
  botaoAnalisar: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
});
