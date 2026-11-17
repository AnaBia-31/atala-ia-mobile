// =====================================================================
// AJUSTES (a <section id="settings-page">, carregar/salvarPreferencias do
// app.js e o modo escuro / tamanho da fonte do script.js)
// =====================================================================
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SlidersHorizontal } from 'lucide-react-native';

import { PREFERENCIAS_PADRAO, preferencias } from '../api';
import { configurarVerificacaoAutomatica, enviarNotificacaoDeTeste, pedirPermissao } from '../notificacoes';
import Interruptor from '../componentes/Interruptor';
import Seletor from '../componentes/Seletor';
import Texto from '../componentes/Texto';
import { useTema } from '../tema';

const INTERVALOS = [
  { valor: '6h', rotulo: 'A cada 6 horas' },
  { valor: '12h', rotulo: 'A cada 12 horas' },
  { valor: '24h', rotulo: 'A cada 24 horas' },
];

const MOEDAS = [
  { valor: 'BRL', rotulo: 'R$ (BRL)' },
  { valor: 'USD', rotulo: '$ (USD)' },
  { valor: 'EUR', rotulo: '€ (EUR)' },
  { valor: 'GBP', rotulo: '£ (GBP)' },
];

// Um cartão com borda (os <div> com border-light-gray da extensão).
function Cartao({ titulo, children }) {
  const { cores } = useTema();
  return (
    <View style={[estilos.cartao, { borderColor: cores.lightGray }]}>
      <Texto tamanho={15} peso="semibold" cor={cores.orange}>{titulo}</Texto>
      {children}
    </View>
  );
}

// Uma linha do cartão: textos à esquerda e o controle à direita.
function Linha({ titulo, descricao, children }) {
  const { cores } = useTema();
  return (
    <View style={estilos.linha}>
      <View style={estilos.textosLinha}>
        <Texto tamanho={13} peso="semibold">{titulo}</Texto>
        {descricao ? <Texto tamanho={11} cor={cores.gray}>{descricao}</Texto> : null}
      </View>
      {children}
    </View>
  );
}

// Botões -A / A / +A (o tamanho deles não muda com o ajuste, como na extensão).
function BotaoFonte({ rotulo, tamanho, passo, descricao }) {
  const { cores, mudarFonte } = useTema();
  return (
    <Pressable
      onPress={() => mudarFonte(passo)}
      accessibilityRole="button"
      accessibilityLabel={descricao}
      hitSlop={4}
      style={({ pressed }) => [
        estilos.botaoFonte,
        { borderColor: cores.lightGray, backgroundColor: pressed ? cores.orange : 'transparent' },
      ]}
    >
      {({ pressed }) => (
        <Texto tamanho={tamanho} peso="semibold" semAjuste cor={pressed ? '#FFFFFF' : cores.dark}>{rotulo}</Texto>
      )}
    </Pressable>
  );
}

// Botão pequeno com borda (mesmo visual dos botões de fonte).
function BotaoPequeno({ rotulo, aoTocar, descricao }) {
  const { cores } = useTema();
  return (
    <Pressable
      onPress={aoTocar}
      accessibilityRole="button"
      accessibilityLabel={descricao}
      hitSlop={4}
      style={({ pressed }) => [
        estilos.botaoPequeno,
        { borderColor: cores.lightGray, backgroundColor: pressed ? cores.orange : 'transparent' },
      ]}
    >
      {({ pressed }) => (
        <Texto tamanho={12} peso="semibold" cor={pressed ? '#FFFFFF' : cores.dark}>{rotulo}</Texto>
      )}
    </Pressable>
  );
}

export default function TelaAjustes() {
  const { cores, escuro, definirEscuro } = useTema();
  const [prefs, setPrefs] = useState(PREFERENCIAS_PADRAO);
  const [salvo, setSalvo] = useState(false);
  const [avisoTeste, setAvisoTeste] = useState('');
  const temporizador = useRef(null);

  async function testarNotificacao() {
    const enviada = await enviarNotificacaoDeTeste().catch(() => false);
    setAvisoTeste(enviada
      ? 'Enviada! Saia do app ou bloqueie a tela: ela chega em 5 segundos.'
      : 'O celular está bloqueando as notificações do app. Libere nas configurações do celular.');
  }

  useEffect(() => {
    preferencias.ler().then(setPrefs);
    return () => clearTimeout(temporizador.current);
  }, []);

  const mudar = (chave) => (valor) => setPrefs((atual) => ({ ...atual, [chave]: valor }));

  async function salvar() {
    await preferencias.salvar(prefs);
    // Notificações: pede a permissão se ligou e ajusta o intervalo da conferência automática.
    if (prefs.alerta_queda) pedirPermissao().catch(() => {});
    configurarVerificacaoAutomatica();
    // Feedback visual por 2 segundos, como no script.js.
    setSalvo(true);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setSalvo(false), 2000);
  }

  return (
    <ScrollView contentContainerStyle={estilos.conteudo}>
      <View style={estilos.titulo}>
        <SlidersHorizontal size={25} color={cores.orange} strokeWidth={2} />
        <Texto fonte="jost" peso="semibold" tamanho={25} style={{ flexShrink: 1 }}>Atala.IA do seu jeito:</Texto>
      </View>

      <Cartao titulo="ALERTAS">
        <Linha titulo="Queda de preço" descricao="Notificar quando um alerta chegar ao preço">
          <Interruptor ligado={prefs.alerta_queda} aoMudar={mudar('alerta_queda')} rotulo="Queda de preço" />
        </Linha>
        <Linha titulo="Testar notificação" descricao={avisoTeste || 'Veja como o aviso aparece no celular'}>
          <BotaoPequeno rotulo="Testar" aoTocar={testarNotificacao} descricao="Enviar notificação de teste" />
        </Linha>
        <Linha titulo="Resumo Semanal" descricao="Suas oportunidades, toda segunda">
          <Interruptor ligado={prefs.resumo_semanal} aoMudar={mudar('resumo_semanal')} rotulo="Resumo semanal" />
        </Linha>
      </Cartao>

      <Cartao titulo="MONITORAMENTO">
        <Linha titulo="Verificar preços" descricao="Confere seus alertas com o app fechado">
          <Seletor titulo="Verificar preços" valor={prefs.intervalo} opcoes={INTERVALOS} aoMudar={mudar('intervalo')} />
        </Linha>
        <Linha titulo="Analisar ao abrir uma loja" descricao="Reconheça produtos automaticamente">
          <Interruptor ligado={prefs.analisar_ao_abrir} aoMudar={mudar('analisar_ao_abrir')} rotulo="Analisar ao abrir uma loja" />
        </Linha>
      </Cartao>

      <Cartao titulo="PERSONALIZAÇÃO">
        <Linha titulo="Tamanho da fonte">
          <View style={estilos.botoesFonte}>
            <BotaoFonte rotulo="-A" tamanho={11} passo={-2} descricao="Diminuir fonte" />
            <BotaoFonte rotulo="A" tamanho={13} passo={0} descricao="Fonte normal" />
            <BotaoFonte rotulo="+A" tamanho={15} passo={2} descricao="Aumentar fonte" />
          </View>
        </Linha>
        <Linha titulo="Modo escuro" descricao="Alterne para tons escuros para descansar a vista">
          <Interruptor ligado={escuro} aoMudar={definirEscuro} rotulo="Modo escuro" />
        </Linha>
        <Linha titulo="Moeda padrão">
          <Seletor titulo="Moeda padrão" valor={prefs.moeda} opcoes={MOEDAS} aoMudar={mudar('moeda')} />
        </Linha>
      </Cartao>

      <Pressable
        onPress={salvar}
        accessibilityRole="button"
        style={({ pressed }) => [
          estilos.botaoSalvar,
          { backgroundColor: salvo ? cores.blue : pressed ? '#D08367' : cores.orange, transform: [{ scale: pressed ? 0.95 : 1 }] },
        ]}
      >
        <Texto tamanho={14} peso="semibold" cor={cores.offWhite}>{salvo ? '✓ Salvo com sucesso!' : 'Salvar alterações'}</Texto>
      </Pressable>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  conteudo: { paddingTop: 20, paddingBottom: 28, gap: 15 },
  titulo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 10, marginRight: 10 },
  cartao: { borderWidth: 1, borderRadius: 8, marginHorizontal: 10, padding: 12, gap: 12 },
  linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  textosLinha: { flex: 1, gap: 2 },
  botoesFonte: { flexDirection: 'row', gap: 4 },
  botaoFonte: { width: 32, height: 32, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  botaoPequeno: { height: 32, paddingHorizontal: 14, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  botaoSalvar: {
    alignSelf: 'center',
    width: 200,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 9,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
});
