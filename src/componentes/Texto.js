import { Text } from 'react-native';

import { useTema } from '../tema';

// Fontes carregadas no App.js. No celular cada peso é um arquivo de fonte,
// por isso o peso escolhe a família (em vez de usar fontWeight).
const FAMILIAS = {
  inter: {
    normal: 'Inter_400Regular',
    medio: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    negrito: 'Inter_700Bold',
    italico: 'Inter_400Regular_Italic',
  },
  jost: {
    normal: 'Jost_400Regular',
    medio: 'Jost_500Medium',
    semibold: 'Jost_600SemiBold',
    negrito: 'Jost_700Bold',
    italico: 'Jost_400Regular_Italic',
  },
};

// Texto do app. Equivale às classes da extensão, por exemplo:
//   class="text-gray text-[10px] font-semibold font-[Inter]"
//   <Texto cor={cores.gray} tamanho={10} peso="semibold">
// O tamanho recebe o ajuste de fonte da tela Ajustes (-A / A / +A),
// a não ser que "semAjuste" seja usado.
export default function Texto({
  fonte = 'inter',
  peso = 'normal',
  tamanho = 12,
  cor,
  centro = false,
  semAjuste = false,
  style,
  children,
  ...props
}) {
  const { cores, ajusteFonte } = useTema();
  const tamanhoFinal = Math.max(semAjuste ? tamanho : tamanho + ajusteFonte, 6);
  return (
    <Text
      {...props}
      style={[
        {
          fontFamily: FAMILIAS[fonte][peso],
          fontSize: tamanhoFinal,
          color: cor ?? cores.dark,
          textAlign: centro ? 'center' : undefined,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
