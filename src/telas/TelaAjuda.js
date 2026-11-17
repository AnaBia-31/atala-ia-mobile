// AJUDA (na extensão esta seção ainda estava vazia). Explica o uso no celular.
import { ScrollView, StyleSheet, View } from 'react-native';
import { CircleQuestionMark } from 'lucide-react-native';

import Texto from '../componentes/Texto';
import { useTema } from '../tema';

const PASSOS = [
  {
    titulo: 'Encontre o produto',
    texto: 'Na tela Produto, cole o link de um produto (por exemplo, copiado do app da loja em "Compartilhar") ou abra uma das lojas pelo Atala.IA.',
  },
  {
    titulo: 'Analise o preço',
    texto: 'Na página do produto, toque em "Analisar preço". O Atala.IA lê o título, o preço e o preço riscado da página.',
  },
  {
    titulo: 'Veja o veredito',
    texto: 'Mostramos se é hora de comprar ou de esperar, com o gráfico dos últimos 30 dias. Arraste o dedo no gráfico para ver o preço de cada dia e use dois dedos para dar zoom.',
  },
  {
    titulo: 'Crie alertas',
    texto: 'Diga quanto quer pagar e acompanhe tudo nas telas Alertas e Histórico.',
  },
];

export default function TelaAjuda() {
  const { cores } = useTema();
  return (
    <ScrollView contentContainerStyle={estilos.conteudo}>
      <View style={estilos.titulo}>
        <CircleQuestionMark size={25} color={cores.orange} strokeWidth={2} />
        <Texto fonte="jost" peso="semibold" tamanho={25}>Como funciona</Texto>
      </View>

      <View style={[estilos.caixa, { borderColor: cores.lightGray }]}>
        {PASSOS.map((passo, i) => (
          <View key={passo.titulo} style={estilos.passo}>
            <View style={[estilos.numero, { backgroundColor: cores.orange }]}>
              <Texto tamanho={12} peso="semibold" cor={cores.white} semAjuste>{i + 1}</Texto>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Texto tamanho={13} peso="semibold">{passo.titulo}</Texto>
              <Texto tamanho={11} cor={cores.gray}>{passo.texto}</Texto>
            </View>
          </View>
        ))}
      </View>

      <Texto tamanho={10} cor={cores.gray} peso="italico" centro style={{ paddingHorizontal: 24 }}>
        Lojas compatíveis: Mercado Livre, Amazon, KaBuM!, Magazine Luiza e outras que mostram os dados do produto na página.
      </Texto>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  conteudo: { paddingTop: 20, paddingBottom: 24, gap: 15 },
  titulo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 10 },
  caixa: { borderWidth: 1, borderRadius: 8, marginHorizontal: 10, padding: 12, gap: 14 },
  passo: { flexDirection: 'row', gap: 10 },
  numero: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
