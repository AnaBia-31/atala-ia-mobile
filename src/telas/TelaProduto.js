// =====================================================================
// TELA PRODUTO (a <section id="product-page"> + renderizarAnalise do app.js)
// Mostra o produto lido da página, o veredito da API, o gráfico e o
// formulário "Criar alerta".
// =====================================================================
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { ArrowUpRight, Bell } from 'lucide-react-native';

import { alertasLocais, api } from '../api';
import { prepararNotificacoes, verificarAlertas } from '../notificacoes';
import GraficoPrecos from '../componentes/GraficoPrecos';
import ImagemProduto from '../componentes/ImagemProduto';
import Texto from '../componentes/Texto';
import { dataDaApi, formatarPreco, tempoRelativo } from '../formatacao';
import { useTema } from '../tema';

// Cores de cada veredito (ESTILO_VEREDITO do app.js).
function estiloVeredito(tipo, cores) {
  const azul = { fundo: cores.lightBlue, borda: cores.secondaryBlue, texto: cores.darkBlue };
  const laranja = { fundo: cores.lightSecondary, borda: cores.darkOrange, texto: cores.darkOrange };
  const neutro = { fundo: cores.secondaryOffWhite, borda: cores.lightGray, texto: cores.escuroFixo };
  return { comprar: azul, esperar: laranja, erro: laranja, neutro, sem_dados: neutro }[tipo] || neutro;
}

// Altura do teclado aberto (0 quando fechado), para dar espaço ao campo do alerta.
function useAlturaTeclado() {
  const [altura, setAltura] = useState(0);
  useEffect(() => {
    const abrir = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setAltura(e.endCoordinates.height));
    const fechar = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setAltura(0));
    return () => {
      abrir.remove();
      fechar.remove();
    };
  }, []);
  return altura;
}

export default function TelaProduto({ analise, ativa, aoVerAnalises, aoNovaAnalise }) {
  const { cores, ajusteFonte } = useTema();
  const { produto: daPagina, detalhe, status, erro } = analise;
  const produto = detalhe?.produto;
  const resultado = detalhe?.analise;
  const e = resultado?.estatisticas;
  const moeda = produto?.moeda || daPagina.moeda;

  const [pontos, setPontos] = useState([]);
  const [alertaAtivo, setAlertaAtivo] = useState(false);
  const [precoAlvo, setPrecoAlvo] = useState('');
  const [mensagemAlerta, setMensagemAlerta] = useState('');
  const [rolagemLigada, setRolagemLigada] = useState(true);
  const rolagem = useRef(null);
  const posicaoAlerta = useRef(0);
  const alturaTeclado = useAlturaTeclado();

  // Novo produto: limpa o formulário do alerta.
  useEffect(() => {
    setPrecoAlvo('');
    setMensagemAlerta('');
  }, [daPagina]);

  // Gráfico: busca o histórico de preços quando a análise chega.
  useEffect(() => {
    setPontos([]);
    if (!produto?.id) return undefined;
    let cancelado = false;
    api.historicoPrecos(produto.id)
      .then((lista) => { if (!cancelado) setPontos(lista || []); })
      .catch(() => { if (!cancelado) setPontos([]); });
    return () => { cancelado = true; };
  }, [produto?.id]);

  // Selo "Alerta ativo" (confere de novo ao voltar para esta aba).
  useEffect(() => {
    if (!produto?.id) {
      setAlertaAtivo(false);
      return;
    }
    alertasLocais.ativoPara(produto.id).then(setAlertaAtivo);
  }, [produto?.id, ativa]);

  async function criarAlerta() {
    if (!detalhe) return;
    const valor = parseFloat(String(precoAlvo).replace(',', '.'));
    if (!(valor > 0)) {
      setMensagemAlerta('Digite o preço que você quer pagar.');
      return;
    }
    await alertasLocais.salvar(produto.id, valor);
    setAlertaAtivo(true);
    setMensagemAlerta(`Alerta criado: vamos avisar quando chegar a ${formatarPreco(valor, moeda)}.`);
    Keyboard.dismiss();

    // Pede a permissão de notificações e já confere: se o preço já chegou lá, a notificação vem na hora.
    const situacao = await prepararNotificacoes().catch(() => 'ok');
    if (situacao === 'desligado') {
      setMensagemAlerta('Alerta criado. As notificações de queda de preço estão desligadas em Ajustes.');
    } else if (situacao === 'sem-permissao') {
      setMensagemAlerta('Alerta criado, mas o celular está bloqueando as notificações do app. Libere nas configurações do celular.');
    } else {
      verificarAlertas().catch(() => {});
    }
  }

  // ---------- Veredito ----------
  let veredito;
  if (status === 'analisando') veredito = { tipo: 'neutro', titulo: 'Analisando o preço…', sub: '' };
  else if (status === 'acordando') veredito = { tipo: 'neutro', titulo: 'Acordando o servidor…', sub: 'Pode levar até 1 minuto' };
  else if (status === 'erro') veredito = { tipo: 'erro', titulo: 'Não foi possível analisar', sub: '' };
  else {
    veredito = {
      tipo: resultado.veredito,
      titulo: resultado.titulo,
      sub: resultado.veredito === 'sem_dados' ? '' : `Confiança: ${Math.round(resultado.confianca * 100)}%`,
    };
  }
  const corVeredito = estiloVeredito(veredito.tipo, cores);

  // ---------- Variação / desconto ----------
  let variacao = null;
  if (e && e.variacao_30d_pct !== null && e.variacao_30d_pct !== undefined
    && e.pontos_no_historico >= 2 && Math.abs(e.variacao_30d_pct) >= 1) {
    const caiu = e.variacao_30d_pct < 0;
    variacao = { texto: `${caiu ? '↓' : '↑'} ${Math.abs(e.variacao_30d_pct).toFixed(0)}% no mês`, azul: caiu };
  } else if (e?.desconto_pct) {
    variacao = { texto: `${e.desconto_pct.toFixed(0)}% off na loja`, azul: true };
  }

  // ---------- "Por quê?" ----------
  let motivos = [];
  let base = '';
  if (status === 'ok') {
    motivos = resultado.motivos || [];
    base = {
      historico: resultado.historico_simulado
        ? 'Histórico SIMULADO para demonstração (linha tracejada no gráfico).'
        : `Baseado em ${e.pontos_no_historico} preços dos últimos 30 dias.`,
      desconto_da_pagina: 'Baseado no desconto anunciado pela loja (ainda sem histórico).',
      sem_dados: '',
    }[resultado.base] || '';
  } else if (status === 'erro') {
    motivos = [erro?.message || 'Algo deu errado. Tente de novo.'];
    if (erro?.status === 0) base = 'Confira sua internet e se o servidor do Atala.IA está no ar.';
  }

  return (
    <ScrollView
      ref={rolagem}
      scrollEnabled={rolagemLigada}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[estilos.conteudo, { paddingBottom: 14 + alturaTeclado }]}
    >
      <View style={estilos.bloco}>
        <View style={estilos.linhaTopo}>
          <Texto tamanho={10} peso="semibold" cor={cores.gray}>ANÁLISE DE PRODUTO</Texto>
          <Pressable onPress={aoNovaAnalise} hitSlop={10} accessibilityRole="button">
            <Texto tamanho={10} peso="semibold" cor={cores.orange}>Analisar outro</Texto>
          </Pressable>
        </View>

        <View style={estilos.linhaProduto}>
          <ImagemProduto url={daPagina.imagem_url} largura={60} altura={54} />
          <View style={estilos.colunaProduto}>
            <Texto tamanho={13} peso="semibold" numberOfLines={2}>{daPagina.titulo}</Texto>
            <Texto tamanho={10} peso="semibold" cor={cores.gray}>{daPagina.loja}</Texto>
            {alertaAtivo && (
              <View style={estilos.selo}>
                <Bell size={10} color={cores.orange} strokeWidth={3} />
                <Texto tamanho={9} cor={cores.orange}>Alerta ativo</Texto>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={estilos.linhaPreco}>
        <View style={{ gap: 2 }}>
          <Texto tamanho={10} cor={cores.gray}>Preço atual</Texto>
          <Texto tamanho={25} peso="semibold">
            {formatarPreco(e ? e.preco_atual : daPagina.preco, moeda)}
          </Texto>
        </View>
        <View style={estilos.colunaVariacao}>
          {variacao && (
            <View
              style={[
                estilos.pilula,
                variacao.azul
                  ? { backgroundColor: cores.lightBlue, borderColor: cores.secondaryBlue }
                  : { backgroundColor: cores.lightSecondary, borderColor: cores.darkOrange },
              ]}
            >
              <Texto tamanho={11} cor={variacao.azul ? cores.darkBlue : cores.darkOrange}>{variacao.texto}</Texto>
            </View>
          )}
          {produto?.atualizado_em ? (
            <Texto tamanho={9} cor={cores.gray}>{tempoRelativo(dataDaApi(produto.atualizado_em))}</Texto>
          ) : null}
        </View>
      </View>

      <View style={[estilos.cartaoGrafico, { backgroundColor: cores.white, borderColor: cores.secondaryOffWhite }]}>
        <View style={estilos.linhaEntre}>
          <Texto tamanho={11} peso="semibold" cor={cores.destaque}>Últimos 30 dias</Texto>
          {e?.minimo_30d && e.pontos_no_historico >= 2 ? (
            <Texto tamanho={9} cor={cores.cinzaFixo}>Mín. {formatarPreco(e.minimo_30d, moeda)}</Texto>
          ) : null}
        </View>
        <GraficoPrecos pontos={pontos} moeda={moeda} aoInteragir={(tocando) => setRolagemLigada(!tocando)} />
      </View>

      <View style={estilos.linhaVeredito}>
        <View
          style={[estilos.veredito, { backgroundColor: corVeredito.fundo, borderColor: corVeredito.borda }]}
          accessibilityLiveRegion="polite"
        >
          <Texto fonte="jost" peso="negrito" tamanho={11} cor={corVeredito.texto} centro numberOfLines={2}>
            {veredito.titulo}
          </Texto>
          {veredito.sub ? <Texto tamanho={9} cor={corVeredito.texto} centro>{veredito.sub}</Texto> : null}
        </View>

        <Pressable
          onPress={aoVerAnalises}
          accessibilityRole="button"
          style={({ pressed }) => [
            estilos.botaoAnalises,
            { backgroundColor: pressed ? cores.hoverOrange : cores.orange, borderColor: cores.darkOrange },
          ]}
        >
          <ArrowUpRight size={15} color={cores.lightSecondary} strokeWidth={2} />
          <Texto tamanho={12} peso="semibold" cor={cores.lightSecondary}>Ver minhas análises</Texto>
        </Pressable>
      </View>

      <View style={estilos.bloco}>
        <Texto tamanho={10} peso="semibold" cor={cores.gray}>POR QUÊ?</Texto>
        {motivos.map((motivo, i) => (
          <View key={i} style={estilos.itemLista}>
            <Texto tamanho={11}>•</Texto>
            <Texto tamanho={11} style={{ flex: 1 }}>{motivo}</Texto>
          </View>
        ))}
        {base ? <Texto tamanho={9} peso="italico" cor={cores.gray}>{base}</Texto> : null}
      </View>

      <View style={estilos.bloco} onLayout={(ev) => { posicaoAlerta.current = ev.nativeEvent.layout.y; }}>
        <Texto tamanho={10} peso="semibold" cor={cores.gray}>CRIAR ALERTA</Texto>
        <View style={estilos.linhaAlerta}>
          <Texto tamanho={11} style={{ flexShrink: 0 }}>Avisar quando chegar a R$</Texto>
          <TextInput
            value={precoAlvo}
            onChangeText={setPrecoAlvo}
            onSubmitEditing={criarAlerta}
            onFocus={() => setTimeout(() => rolagem.current?.scrollTo({ y: Math.max(posicaoAlerta.current - 12, 0) }), 250)}
            placeholder="0,00"
            placeholderTextColor={cores.lightGray}
            keyboardType="decimal-pad"
            returnKeyType="done"
            accessibilityLabel="Preço desejado em reais"
            style={[estilos.campoPreco, { borderColor: cores.lightGray, color: cores.dark, fontSize: 11 + ajusteFonte }]}
          />
          <Pressable
            onPress={criarAlerta}
            accessibilityRole="button"
            disabled={!detalhe}
            style={({ pressed }) => [
              estilos.botaoCriar,
              { backgroundColor: pressed ? cores.hoverOrange : cores.orange, opacity: detalhe ? 1 : 0.6 },
            ]}
          >
            <Texto tamanho={11} peso="semibold" cor={cores.offWhite}>Criar</Texto>
          </Pressable>
        </View>
        {mensagemAlerta ? <Texto tamanho={10} cor={cores.gray}>{mensagemAlerta}</Texto> : null}
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  conteudo: { paddingHorizontal: 18, paddingTop: 14, gap: 12 },
  bloco: { width: '100%', gap: 7 },
  linhaTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  linhaProduto: { flexDirection: 'row', gap: 12 },
  colunaProduto: { flex: 1, minWidth: 0, gap: 4 },
  selo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linhaPreco: { flexDirection: 'row', justifyContent: 'space-between' },
  colunaVariacao: { alignItems: 'flex-end', gap: 5 },
  pilula: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  cartaoGrafico: { borderRadius: 12, borderWidth: 1, padding: 10, gap: 6 },
  linhaEntre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  linhaVeredito: { flexDirection: 'row', gap: 12, minHeight: 50 },
  veredito: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  botaoAnalises: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  itemLista: { flexDirection: 'row', gap: 6, paddingLeft: 4 },
  linhaAlerta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  campoPreco: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  botaoCriar: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
});
