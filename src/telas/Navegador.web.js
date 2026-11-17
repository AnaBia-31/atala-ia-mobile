// Versão web do navegador das lojas (usada só em "npx expo start --web").
// O navegador do computador não deixa ler páginas de outros sites, então
// aqui só explicamos e abrimos a loja numa aba nova. Para testar a análise
// no computador, use os parâmetros da URL (veja o README do app).
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import Texto from '../componentes/Texto';
import { useTema } from '../tema';

export default function Navegador({ url, aoFechar }) {
  const { cores } = useTema();
  return (
    <Modal visible={!!url} transparent animationType="fade" onRequestClose={aoFechar}>
      <View style={estilos.fundo}>
        <View style={[estilos.caixa, { backgroundColor: cores.offWhite, borderColor: cores.lightGray }]}>
          <Texto tamanho={15} peso="semibold">Disponível no celular</Texto>
          <Texto tamanho={12} cor={cores.gray}>
            O navegador das lojas com leitura automática do produto só funciona no app (Android ou iOS).
            No computador, teste com ?titulo=Fone&preco=199.90 no endereço desta página.
          </Texto>
          <View style={estilos.botoes}>
            <Pressable onPress={() => { window.open(url, '_blank', 'noopener'); aoFechar(); }} style={[estilos.botao, { backgroundColor: cores.orange }]}>
              <Texto tamanho={12} peso="semibold" cor={cores.white}>Abrir a loja</Texto>
            </Pressable>
            <Pressable onPress={aoFechar} style={[estilos.botao, { borderColor: cores.lightGray, borderWidth: 1 }]}>
              <Texto tamanho={12} peso="semibold">Fechar</Texto>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  caixa: { maxWidth: 360, borderWidth: 1, borderRadius: 12, padding: 16, gap: 10 },
  botoes: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  botao: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
});
