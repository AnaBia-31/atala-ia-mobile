// =====================================================================
// HISTÓRICO (carregarHistorico do app.js)
// Produtos analisados neste celular nos últimos 7 dias, com o preço
// atual vindo da API. Puxe a lista para baixo para atualizar.
// =====================================================================
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { RotateCcwClock } from 'lucide-react-native';

import { buscarProdutos, historicoLocal } from '../api';
import ImagemProduto from '../componentes/ImagemProduto';
import Texto from '../componentes/Texto';
import { formatarPreco } from '../formatacao';
import { useTema } from '../tema';

const UMA_SEMANA = 7 * 24 * 60 * 60 * 1000;

export default function TelaHistorico({ ativa, aoAbrirProduto }) {
  const { cores } = useTema();
  const [estado, setEstado] = useState({ mensagem: 'Carregando…', erro: false, itens: [], qtd: 0, economia: 0 });
  const [atualizando, setAtualizando] = useState(false);
  const pedido = useRef(0);

  const carregar = useCallback(async () => {
    const meu = ++pedido.current;
    const umaSemana = Date.now() - UMA_SEMANA;
    const itens = (await historicoLocal.listar()).filter((i) => new Date(i.visto_em).getTime() >= umaSemana);

    try {
      const produtos = await buscarProdutos(itens.map((i) => i.produto_id));
      if (meu !== pedido.current) return;
      const validos = itens.filter((i) => produtos[i.produto_id]);
      let economia = 0;

      const cartoes = validos.map((item) => {
        const { produto, analise } = produtos[item.produto_id];
        const atual = analise.estatisticas.preco_atual;
        const v = analise.estatisticas.pontos_no_historico >= 2 ? analise.estatisticas.variacao_30d_pct : null;
        if (v !== null && v !== undefined && v < 0) economia += atual / (1 + v / 100) - atual; // quanto caiu em R$
        return {
          id: item.produto_id,
          produto,
          atual,
          caiu: v !== null && v !== undefined && v < 0,
          variacao: v === null || v === undefined || Math.abs(v) < 1
            ? 'Preço estável nos últimos 30 dias'
            : `${v < 0 ? '↓' : '↑'} ${Math.abs(v).toFixed(0)}% nos últimos 30 dias`,
        };
      });

      setEstado({
        mensagem: validos.length ? '' : 'Nenhum produto analisado esta semana. Cole o link de um produto ou abra uma loja na tela Produto!',
        erro: false,
        itens: cartoes,
        qtd: validos.length,
        economia,
      });
    } catch (erro) {
      if (meu !== pedido.current) return;
      setEstado((anterior) => ({ ...anterior, mensagem: erro.message, erro: true, itens: [] }));
    }
  }, []);

  // Como na extensão, recarrega toda vez que a aba é aberta.
  useEffect(() => {
    if (ativa) carregar();
  }, [ativa, carregar]);

  async function puxarParaAtualizar() {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  }

  return (
    <ScrollView
      contentContainerStyle={estilos.conteudo}
      refreshControl={<RefreshControl refreshing={atualizando} onRefresh={puxarParaAtualizar} colors={[cores.orange]} tintColor={cores.orange} />}
    >
      <View style={estilos.titulo}>
        <RotateCcwClock size={30} color={cores.orange} strokeWidth={2} />
        <Texto fonte="jost" peso="semibold" tamanho={25}>Histórico</Texto>
      </View>

      <View style={[estilos.resumo, { backgroundColor: cores.hoverOrange, borderColor: cores.darkOrange }]}>
        <View style={estilos.colunaResumo}>
          <Texto fonte="jost" peso="semibold" tamanho={20} cor={cores.offWhite}>
            {estado.qtd} Produto{estado.qtd === 1 ? '' : 's'}
          </Texto>
          <Texto fonte="jost" tamanho={14} cor={cores.offWhite}>analisados esta semana</Texto>
        </View>
        <View style={estilos.colunaResumo}>
          <Texto fonte="jost" peso="semibold" tamanho={20} cor={cores.offWhite}>{formatarPreco(estado.economia)}</Texto>
          <Texto fonte="jost" tamanho={14} cor={cores.offWhite}>de queda identificada</Texto>
        </View>
      </View>

      {estado.mensagem ? (
        <Texto tamanho={12} cor={estado.erro ? cores.darkOrange : cores.gray} centro style={estilos.mensagem}>
          {estado.mensagem}
        </Texto>
      ) : null}

      {estado.itens.map(({ id, produto, atual, caiu, variacao }) => (
        <Pressable
          key={id}
          onPress={() => aoAbrirProduto(produto.url)}
          accessibilityRole="link"
          style={({ pressed }) => [estilos.cartao, { borderColor: pressed ? cores.orange : cores.lightGray }]}
        >
          <ImagemProduto url={produto.imagem_url} largura={64} altura={64} raio={4} />
          <View style={estilos.colunaCartao}>
            <Texto fonte="jost" peso="semibold" tamanho={14} numberOfLines={2}>{produto.titulo}</Texto>
            <Texto fonte="jost" tamanho={11} cor={cores.gray}>{produto.loja}</Texto>
            <Texto fonte="jost" peso="semibold" tamanho={16}>{formatarPreco(atual, produto.moeda)}</Texto>
            <Texto fonte="jost" tamanho={11} cor={caiu ? cores.darkBlue : cores.darkOrange}>{variacao}</Texto>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  conteudo: { paddingTop: 20, paddingBottom: 16, gap: 16 },
  titulo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 12 },
  resumo: {
    flexDirection: 'row',
    gap: 16,
    borderWidth: 2,
    borderRadius: 6,
    padding: 20,
    marginHorizontal: 24,
  },
  colunaResumo: { flex: 1 },
  mensagem: { paddingHorizontal: 32 },
  cartao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderRadius: 6,
    padding: 8,
    marginHorizontal: 24,
  },
  colunaCartao: { flex: 1, minWidth: 0 },
});
