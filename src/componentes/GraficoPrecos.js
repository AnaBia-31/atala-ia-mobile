// =====================================================================
// GRÁFICO "ÚLTIMOS 30 DIAS" (mesma lógica do gráfico do src/app.js)
// No celular, os gestos substituem o mouse:
// - Encoste e arraste o dedo: mostra o preço daquele dia.
// - Pinça com dois dedos: zoom (o dia entre os dedos fica no lugar).
// - Dois toques: volta ao período inteiro.
// Preços simulados (demonstração) ficam tracejados; os reais, em linha cheia.
// =====================================================================
import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import Svg, { Line, Polyline } from 'react-native-svg';

import { dataDaApi, formatarDia, formatarPreco } from '../formatacao';
import { useTema } from '../tema';
import Texto from './Texto';

const ALTURA = 55;
const MARGEM = 4;
const UM_DIA = 24 * 60 * 60 * 1000;
const DOIS_TOQUES_MS = 300;

const limitar = (valor, min, max) => Math.min(Math.max(valor, min), max);

// Índices dos pontos dentro da janela de zoom (mais um de cada lado, para a linha chegar às bordas).
export function janelaDoGrafico(tempos, ini, fim) {
  const dentro = tempos.map((t, i) => i).filter((i) => tempos[i] >= ini && tempos[i] <= fim);
  let primeiro = dentro.length ? dentro[0] : tempos.findIndex((t) => t > ini);
  if (primeiro < 0) primeiro = tempos.length - 1;
  const ultimo = dentro.length ? dentro[dentro.length - 1] : Math.max(primeiro - 1, 0);
  return {
    dentro: dentro.length ? dentro : [primeiro, ultimo],
    de: Math.max(0, primeiro - 1),
    ate: Math.min(tempos.length - 1, ultimo + 1),
  };
}

// Nova janela de zoom: "novoTamanho" de tempo, com o instante "ancora" na posição "fracao" (0 a 1).
export function janelaComZoom(dados, ancora, fracao, novoTamanho) {
  const total = dados.tMax - dados.tMin;
  const tamanho = limitar(novoTamanho, Math.min(total, 2 * UM_DIA), total);
  const ini = limitar(ancora - fracao * tamanho, dados.tMin, dados.tMax - tamanho);
  return { ini, fim: ini + tamanho };
}

export default function GraficoPrecos({ pontos, moeda, aoInteragir }) {
  const { cores } = useTema();
  const [largura, setLargura] = useState(0);
  const [janelaSalva, setJanelaSalva] = useState(null); // { de: dados, ini, fim }
  const [cursorSalvo, setCursorSalvo] = useState(null); // { de: dados, i }

  const dados = useMemo(() => {
    if (!pontos || pontos.length < 2) return null;
    const tempos = pontos.map((p) => dataDaApi(p.coletado_em).getTime());
    return { pontos, tempos, tMin: Math.min(...tempos), tMax: Math.max(...tempos) };
  }, [pontos]);

  // Zoom e cursor só valem para os dados em que foram feitos (trocar de produto zera tudo).
  const janela = dados && (janelaSalva?.de === dados ? janelaSalva : { ini: dados.tMin, fim: dados.tMax });
  const cursor = dados && cursorSalvo?.de === dados ? cursorSalvo.i : null;

  // Os gestos são criados uma vez só; eles leem os valores atuais por esta referência.
  const atual = useRef({});
  atual.current = { dados, janela, largura, aoInteragir };
  const gesto = useRef({ origemX: 0, pinca: null, ultimoToque: 0, timer: null });

  const responder = useMemo(() => {
    function mostrarPreco(xPx) {
      const { dados: d, janela: j, largura: l } = atual.current;
      if (!d || !l) return;
      const tToque = j.ini + limitar(xPx / l, 0, 1) * (j.fim - j.ini);
      // Ponto visível mais próximo do dedo.
      const { dentro } = janelaDoGrafico(d.tempos, j.ini, j.fim);
      const i = dentro.reduce((melhor, k) =>
        (Math.abs(d.tempos[k] - tToque) < Math.abs(d.tempos[melhor] - tToque) ? k : melhor), dentro[0]);
      setCursorSalvo({ de: d, i });
    }

    function verTudo() {
      setJanelaSalva(null);
      setCursorSalvo(null);
    }

    function pinca(toques) {
      const { dados: d, janela: j, largura: l } = atual.current;
      if (!l) return;
      const [a, b] = toques;
      const distancia = Math.max(Math.abs(a.pageX - b.pageX), 10);
      const fracao = limitar(((a.pageX + b.pageX) / 2 - gesto.current.origemX) / l, 0, 1);
      if (!gesto.current.pinca) {
        // Começo da pinça: guarda o dia que está entre os dedos.
        gesto.current.pinca = { distancia, tamanho: j.fim - j.ini, ancora: j.ini + fracao * (j.fim - j.ini) };
        setCursorSalvo(null);
        return;
      }
      const p = gesto.current.pinca;
      const nova = janelaComZoom(d, p.ancora, fracao, p.tamanho * (p.distancia / distancia));
      setJanelaSalva({ de: d, ...nova });
    }

    function soltar() {
      gesto.current.pinca = null;
      atual.current.aoInteragir?.(false);
      clearTimeout(gesto.current.timer);
      gesto.current.timer = setTimeout(() => setCursorSalvo(null), 2500);
    }

    return PanResponder.create({
      onStartShouldSetPanResponder: () => !!atual.current.dados,
      onMoveShouldSetPanResponder: () => !!atual.current.dados,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (evento) => {
        const { pageX, locationX } = evento.nativeEvent;
        gesto.current.origemX = pageX - locationX;
        clearTimeout(gesto.current.timer);
        atual.current.aoInteragir?.(true);
        const agora = Date.now();
        if (agora - gesto.current.ultimoToque < DOIS_TOQUES_MS) {
          gesto.current.ultimoToque = 0;
          verTudo();
          return;
        }
        gesto.current.ultimoToque = agora;
        mostrarPreco(locationX);
      },
      onPanResponderMove: (evento) => {
        const toques = evento.nativeEvent.touches || [];
        if (toques.length >= 2) {
          pinca(toques);
          return;
        }
        if (gesto.current.pinca) return; // soltou um dos dedos da pinça
        mostrarPreco(evento.nativeEvent.pageX - gesto.current.origemX);
      },
      onPanResponderRelease: soltar,
      onPanResponderTerminate: soltar,
    });
  }, []);

  // A largura é medida sempre (com ou sem dados): a caixa não muda de tamanho
  // quando o histórico chega, então não haveria outra medição depois.
  const medir = (e) => setLargura(e.nativeEvent.layout.width);

  if (!dados) {
    return (
      <>
        <View style={estilos.area} onLayout={medir}>
          <Texto tamanho={10} cor={cores.cinzaFixo} centro style={{ paddingTop: 16 }}>
            Ainda sem histórico para o gráfico
          </Texto>
        </View>
        <View style={estilos.datas} />
      </>
    );
  }

  // ---------- Desenho ----------
  const { ini, fim } = janela;
  const { pontos: pts, tempos } = dados;
  const { dentro, de, ate } = janelaDoGrafico(tempos, ini, fim);

  // A escala vertical se ajusta aos preços visíveis, para o zoom mostrar a variação.
  const precosVisiveis = dentro.map((i) => pts[i].preco);
  const pMin = Math.min(...precosVisiveis);
  const pMax = Math.max(...precosVisiveis);
  const x = (t) => (fim === ini ? 0.5 : (t - ini) / (fim - ini)) * largura;
  const y = (p) => (pMax === pMin ? ALTURA / 2 : MARGEM + (1 - (p - pMin) / (pMax - pMin)) * (ALTURA - 2 * MARGEM));

  const indices = [];
  for (let i = de; i <= ate; i++) indices.push(i);
  const coordenadas = (lista) => lista.map((i) => `${x(tempos[i]).toFixed(1)},${y(pts[i].preco).toFixed(1)}`).join(' ');

  // O primeiro ponto real entra nos dois trechos para a linha não ficar quebrada.
  const primeiroReal = indices.find((i) => !pts[i].simulado);
  const simulados = primeiroReal === undefined ? indices : indices.filter((i) => i <= primeiroReal);
  const reais = primeiroReal === undefined ? [] : indices.filter((i) => i >= primeiroReal);
  const comZoom = fim - ini < dados.tMax - dados.tMin - 1000;

  let marcador = null;
  if (cursor !== null && largura) {
    const ponto = pts[cursor];
    const xPx = x(tempos[cursor]);
    const yPx = y(ponto.preco);
    const dica = `${formatarDia(tempos[cursor])} · ${formatarPreco(ponto.preco, moeda)}${ponto.simulado ? ' (simulado)' : ''}`;
    marcador = { xPx, yPx, dica, simulado: ponto.simulado };
  }

  return (
    <>
      <View
        style={estilos.area}
        onLayout={medir}
        accessibilityLabel="Gráfico de preços dos últimos 30 dias. Arraste para ver o preço de cada dia."
        {...responder.panHandlers}
      >
        <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
          {largura > 0 && (
            <Svg width={largura} height={ALTURA}>
              <Line x1={0} y1={ALTURA / 2} x2={largura} y2={ALTURA / 2} stroke={cores.secondaryOffWhite} strokeWidth={1} />
              {simulados.length >= 2 && (
                <Polyline
                  points={coordenadas(simulados)}
                  fill="none"
                  stroke={cores.orange}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray="4 3"
                  opacity={0.7}
                />
              )}
              {reais.length >= 2 && (
                <Polyline
                  points={coordenadas(reais)}
                  fill="none"
                  stroke={cores.orange}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}
            </Svg>
          )}

          {marcador && (
            <>
              <View style={[estilos.linhaCursor, { left: marcador.xPx, backgroundColor: cores.lightGray }]} />
              <View style={[estilos.anel, { left: marcador.xPx - 7, top: marcador.yPx - 7, backgroundColor: cores.darkOrange }]}>
                <View
                  style={[
                    estilos.ponto,
                    { backgroundColor: cores.orange, borderStyle: marcador.simulado ? 'dashed' : 'solid' },
                  ]}
                />
              </View>
              <Dica xPx={marcador.xPx} yPx={marcador.yPx} largura={largura} texto={marcador.dica} />
            </>
          )}

          {comZoom && (
            <Texto tamanho={9} cor={cores.cinzaFixo} semAjuste style={estilos.dicaZoom}>
              2 toques: ver tudo
            </Texto>
          )}
        </View>
      </View>

      <View style={estilos.datas}>
        <Texto tamanho={9} cor={cores.cinzaFixo}>{formatarDia(ini)}</Texto>
        <Texto tamanho={9} cor={cores.cinzaFixo}>{formatarDia((ini + fim) / 2)}</Texto>
        <Texto tamanho={9} cor={cores.cinzaFixo}>{formatarDia(fim)}</Texto>
      </View>
    </>
  );
}

// Balão com o preço do dia; fica dentro do gráfico (não corta nas bordas).
function Dica({ xPx, yPx, largura, texto }) {
  const [larguraDica, setLarguraDica] = useState(0);
  const left = limitar(xPx - larguraDica / 2, 0, Math.max(largura - larguraDica, 0));
  return (
    <View
      onLayout={(e) => setLarguraDica(e.nativeEvent.layout.width)}
      style={[estilos.dica, { left, bottom: ALTURA - Math.max(yPx - 8, 0), opacity: larguraDica ? 1 : 0 }]}
    >
      <Texto tamanho={10} peso="semibold" cor="#FFF8EE" semAjuste numberOfLines={1}>{texto}</Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  area: { width: '100%', height: ALTURA, zIndex: 1 },
  datas: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 12 },
  linhaCursor: { position: 'absolute', top: 0, bottom: 0, width: 1 },
  anel: { position: 'absolute', width: 14, height: 14, borderRadius: 7, padding: 1 },
  ponto: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#FFFFFF' },
  dica: {
    position: 'absolute',
    backgroundColor: '#22181C',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    zIndex: 10,
  },
  dicaZoom: { position: 'absolute', right: 0, bottom: -2 },
});
