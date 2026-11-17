import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';

import { useTema } from '../tema';
import Texto from './Texto';

// Substitui o <select> da extensão: mostra a opção escolhida e, ao tocar,
// abre a lista de opções.
// opcoes = [{ valor: '6h', rotulo: 'A cada 6 horas' }, ...]
export default function Seletor({ valor, opcoes, aoMudar, titulo }) {
  const { cores } = useTema();
  const [aberto, setAberto] = useState(false);
  const atual = opcoes.find((o) => o.valor === valor) || opcoes[0];

  return (
    <>
      <Pressable
        onPress={() => setAberto(true)}
        accessibilityRole="button"
        accessibilityLabel={`${titulo}: ${atual.rotulo}`}
        style={[estilos.campo, { borderColor: cores.lightGray }]}
      >
        <Texto tamanho={11}>{atual.rotulo}</Texto>
        <ChevronDown size={12} color={cores.orange} strokeWidth={2.5} style={estilos.seta} />
      </Pressable>

      <Modal visible={aberto} transparent animationType="fade" onRequestClose={() => setAberto(false)}>
        <Pressable style={estilos.fundo} onPress={() => setAberto(false)}>
          <View style={[estilos.caixa, { backgroundColor: cores.offWhite, borderColor: cores.lightGray }]}>
            {titulo ? (
              <Texto tamanho={13} peso="semibold" cor={cores.orange} style={estilos.titulo}>{titulo}</Texto>
            ) : null}
            {opcoes.map((opcao) => {
              const escolhida = opcao.valor === atual.valor;
              return (
                <Pressable
                  key={opcao.valor}
                  onPress={() => {
                    aoMudar(opcao.valor);
                    setAberto(false);
                  }}
                  style={[estilos.opcao, { borderTopColor: cores.secondaryOffWhite }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: escolhida }}
                >
                  <Texto tamanho={14} peso={escolhida ? 'semibold' : 'normal'} cor={escolhida ? cores.orange : cores.dark}>
                    {opcao.rotulo}
                  </Texto>
                  {escolhida ? <Check size={16} color={cores.orange} strokeWidth={2.5} /> : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const estilos = StyleSheet.create({
  campo: {
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 10,
    paddingRight: 28,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  seta: { position: 'absolute', right: 8 },
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 32 },
  caixa: { borderRadius: 12, borderWidth: 1, paddingVertical: 8 },
  titulo: { paddingHorizontal: 16, paddingVertical: 8 },
  opcao: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
});
