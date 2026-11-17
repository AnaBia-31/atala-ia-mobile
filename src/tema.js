// =====================================================================
// TEMA: cores, modo escuro e tamanho da fonte
// As cores são as mesmas do src/input.css da extensão. No modo escuro só
// mudam as cores que lá ficam dentro de ".dark" (o resto é igual).
// O modo escuro e o tamanho da fonte são salvos na hora (como o
// localStorage do script.js), sem precisar do botão "Salvar alterações".
// =====================================================================
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { armazenamento } from './api';

const CORES_FIXAS = {
  white: '#FFFCF7',
  hoverOffWhite: '#EBD7BC',
  darkBlue: '#263F50',
  lightBlue: '#B9D0DC',
  secondaryBlue: '#6E8796',
  secondaryOffWhite: '#E8DFD2',
  lightSecondary: '#F6E4D8',
  lightSecondaryGreen: '#E8EFE5',
  success: '#43664D',
  orange: '#E29578',
  darkOrange: '#B26548',
  hoverOrange: '#EDA58A',
  blue: '#5D8198',
  lightGray: '#C3C2B9',
  cinzaFixo: '#706F66', // text-[#706F66] na extensão (não muda no modo escuro)
  escuroFixo: '#22181C', // text-[#22181C] na extensão (não muda no modo escuro)
};

export const CORES_CLARO = {
  ...CORES_FIXAS,
  offWhite: '#FFF8EE',
  dark: '#22181C',
  gray: '#706F66',
  navFundo: '#FFF8EE',
  navIcone: '#706F66',
  navbar: '#5D8198',
  // Cor do item ativo da barra de navegação e do título "Últimos 30 dias".
  // Na extensão a classe "dark-green" não existia no tema claro, então
  // aparecia na cor do texto escuro; no modo escuro ela fica laranja.
  destaque: '#22181C',
};

export const CORES_ESCURO = {
  ...CORES_FIXAS,
  offWhite: '#22181C',
  dark: '#FFF8EE',
  gray: '#FFFCF7',
  navFundo: '#150A0E',
  navIcone: '#FFFCF7',
  navbar: '#150A0E',
  destaque: '#E29578',
};

// Ajuste da fonte em px, igual ao script.js: passos de 2px, entre -6 e +10.
const FONTE_MIN = -6;
const FONTE_MAX = 10;

const ContextoTema = createContext(null);

export function ProvedorTema({ children }) {
  const [escuro, setEscuro] = useState(false);
  const [ajusteFonte, setAjusteFonte] = useState(0);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    (async () => {
      setEscuro((await armazenamento.ler('theme', 'light')) === 'dark');
      setAjusteFonte(Number(await armazenamento.ler('fontOffset', 0)) || 0);
      setCarregado(true);
    })();
  }, []);

  const definirEscuro = useCallback((valor) => {
    setEscuro(valor);
    armazenamento.gravar('theme', valor ? 'dark' : 'light');
  }, []);

  const mudarFonte = useCallback((passo) => {
    setAjusteFonte((atual) => {
      const novo = passo === 0 ? 0 : Math.min(Math.max(atual + passo, FONTE_MIN), FONTE_MAX);
      armazenamento.gravar('fontOffset', novo);
      return novo;
    });
  }, []);

  const valor = useMemo(() => ({
    cores: escuro ? CORES_ESCURO : CORES_CLARO,
    escuro,
    definirEscuro,
    ajusteFonte,
    // mudarFonte(-2) diminui, mudarFonte(2) aumenta, mudarFonte(0) volta ao normal
    mudarFonte,
    carregado,
  }), [escuro, definirEscuro, ajusteFonte, mudarFonte, carregado]);

  return <ContextoTema.Provider value={valor}>{children}</ContextoTema.Provider>;
}

export function useTema() {
  return useContext(ContextoTema);
}
