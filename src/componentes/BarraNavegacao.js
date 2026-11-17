import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BellRing, ChartNoAxesCombined, CircleQuestionMark, RotateCcwClock, SlidersHorizontal } from 'lucide-react-native';

import { useTema } from '../tema';
import Texto from './Texto';

// Barra de navegação de baixo (o <nav> da extensão + o switchTab do script.js).
export const ABAS = [
  { chave: 'produto', rotulo: 'Produto', Icone: ChartNoAxesCombined },
  { chave: 'historico', rotulo: 'Histórico', Icone: RotateCcwClock },
  { chave: 'alertas', rotulo: 'Alertas', Icone: BellRing },
  { chave: 'ajustes', rotulo: 'Ajustes', Icone: SlidersHorizontal },
  { chave: 'ajuda', rotulo: 'Ajuda', Icone: CircleQuestionMark },
];

export default function BarraNavegacao({ abaAtiva, aoTrocar }) {
  const { cores } = useTema();
  const { bottom } = useSafeAreaInsets();

  return (
    <View
      style={[
        estilos.barra,
        { backgroundColor: cores.navFundo, borderTopColor: cores.secondaryOffWhite, paddingBottom: 6 + bottom },
      ]}
      accessibilityRole="tablist"
    >
      {ABAS.map(({ chave, rotulo, Icone }) => {
        const ativa = chave === abaAtiva;
        const cor = ativa ? cores.destaque : cores.navIcone;
        return (
          <Pressable
            key={chave}
            onPress={() => aoTrocar(chave)}
            style={estilos.item}
            accessibilityRole="tab"
            accessibilityState={{ selected: ativa }}
            accessibilityLabel={rotulo}
          >
            <Icone size={17} color={cor} strokeWidth={2} />
            <Texto tamanho={10} peso={ativa ? 'semibold' : 'normal'} cor={ativa ? cores.destaque : cores.gray}>
              {rotulo}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingTop: 6,
    borderTopWidth: 1,
  },
  item: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 8 },
});
