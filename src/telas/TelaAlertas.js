// =====================================================================
// ALERTAS (carregarAlertas do app.js)
// Guardados neste celular; o preço atual vem da API.
// =====================================================================
import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { BellRing } from 'lucide-react-native';

import { alertasLocais, buscarProdutos } from '../api';
import ImagemProduto from '../componentes/ImagemProduto';
import Interruptor from '../componentes/Interruptor';
import Texto from '../componentes/Texto';
import { formatarPreco } from '../formatacao';
import { useTema } from '../tema';

export default function TelaAlertas({ ativa }) {
  const { cores } = useTema();
  const [estado, setEstado] = useState({ mensagem: 'Carregando…', erro: false, itens: [] });
  const [atualizando, setAtualizando] = useState(false);
  const pedido = useRef(0);

  // "silencioso": atualiza sem mostrar "Carregando…" (usado ao ligar/desligar um alerta).
  const carregar = useCallback(async (silencioso = false) => {
    const meu = ++pedido.current;
    if (!silencioso) setEstado({ mensagem: 'Carregando…', erro: false, itens: [] });
    const alertas = await alertasLocais.listar();
    if (!alertas.length) {
      setEstado({ mensagem: 'Você ainda não tem alertas. Crie um na tela Produto.', erro: false, itens: [] });
      return;
    }
    try {
      const produtos = await buscarProdutos(alertas.map((a) => a.produto_id));
      if (meu !== pedido.current) return;
      const itens = alertas.filter((a) => produtos[a.produto_id]).map((a) => {
        const { produto, analise } = produtos[a.produto_id];
        const atual = analise.estatisticas.preco_atual;
        return { alerta: a, produto, atual, atingido: a.ativo && atual <= a.preco_alvo };
      });
      setEstado({ mensagem: '', erro: false, itens });
    } catch (erro) {
      if (meu !== pedido.current) return;
      setEstado({ mensagem: erro.message, erro: true, itens: [] });
    }
  }, []);

  useEffect(() => {
    if (ativa) carregar();
  }, [ativa, carregar]);

  async function mudarAlerta(produtoId, ligado) {
    // Muda na tela na hora e depois confere com a API.
    setEstado((anterior) => ({
      ...anterior,
      itens: anterior.itens.map((item) => (item.alerta.produto_id === produtoId
        ? { ...item, alerta: { ...item.alerta, ativo: ligado }, atingido: ligado && item.atual <= item.alerta.preco_alvo }
        : item)),
    }));
    await alertasLocais.definirAtivo(produtoId, ligado);
    carregar(true);
  }

  async function puxarParaAtualizar() {
    setAtualizando(true);
    await carregar(true);
    setAtualizando(false);
  }

  return (
    <ScrollView
      contentContainerStyle={estilos.conteudo}
      refreshControl={<RefreshControl refreshing={atualizando} onRefresh={puxarParaAtualizar} colors={[cores.orange]} tintColor={cores.orange} />}
    >
      <View style={estilos.titulo}>
        <BellRing size={25} color={cores.orange} strokeWidth={2} />
        <Texto fonte="jost" peso="semibold" tamanho={25}>Seus alertas</Texto>
      </View>

      <View style={[estilos.caixa, { borderColor: cores.lightGray }]}>
        {estado.mensagem ? (
          <Texto tamanho={12} cor={estado.erro ? cores.darkOrange : cores.gray} centro style={{ paddingHorizontal: 20 }}>
            {estado.mensagem}
          </Texto>
        ) : null}

        {estado.itens.map(({ alerta, produto, atual, atingido }) => (
          <View key={alerta.produto_id} style={estilos.item}>
            <ImagemProduto url={produto.imagem_url} largura={64} altura={64} borda />
            <View style={estilos.colunaItem}>
              <Texto tamanho={13} peso="semibold" numberOfLines={2}>{produto.titulo}</Texto>
              <Texto tamanho={11} cor={cores.gray}>Preço atual: {formatarPreco(atual, produto.moeda)}</Texto>
              <Texto tamanho={11} cor={cores.gray}>
                Avisar quando chegar a: {formatarPreco(alerta.preco_alvo, produto.moeda)}
              </Texto>
              {atingido ? <Texto tamanho={11} peso="semibold" cor={cores.darkBlue}>✓ Preço atingido!</Texto> : null}
            </View>
            <Interruptor
              ligado={alerta.ativo}
              aoMudar={(ligado) => mudarAlerta(alerta.produto_id, ligado)}
              rotulo={`Alerta de ${produto.titulo}`}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  conteudo: { paddingTop: 20, paddingBottom: 16 },
  titulo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 12 },
  caixa: { borderWidth: 1, borderRadius: 8, marginHorizontal: 10, marginTop: 10, padding: 12, gap: 12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  colunaItem: { flex: 1, minWidth: 0, gap: 2 },
});
