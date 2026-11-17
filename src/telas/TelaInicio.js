// HOME PAGE da extensão. No celular não existe "aba aberta da loja", então
// daqui o usuário cola o link de um produto ou abre uma loja dentro do app.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { ShoppingBag, Store } from 'lucide-react-native';

import Texto from '../componentes/Texto';
import { extrairLink } from '../formatacao';
import { useTema } from '../tema';

export const LOJAS = [
  { nome: 'Mercado Livre', url: 'https://www.mercadolivre.com.br' },
  { nome: 'Amazon', url: 'https://www.amazon.com.br' },
  { nome: 'KaBuM!', url: 'https://www.kabum.com.br' },
  { nome: 'Magazine Luiza', url: 'https://www.magazineluiza.com.br' },
];

export default function TelaInicio({ aoAbrirLink, aoAbrirLoja, aoComoFunciona }) {
  const { cores, ajusteFonte } = useTema();
  const [link, setLink] = useState('');
  const [erro, setErro] = useState('');

  function analisarLink() {
    const url = extrairLink(link);
    if (!url) {
      setErro('Cole o link (endereço) da página do produto.');
      return;
    }
    setErro('');
    setLink('');
    aoAbrirLink(url);
  }

  return (
    <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
      <ShoppingBag size={60} color={cores.orange} strokeWidth={1.5} />

      <View style={estilos.textos}>
        <Texto fonte="jost" peso="medio" tamanho={20} centro style={{ marginTop: 10 }}>
          Sua próxima compra começa aqui.
        </Texto>
        <Texto tamanho={12} cor={cores.gray} centro style={{ marginTop: 10 }}>
          Cole o link de um produto ou abra uma loja compatível pelo Atala.IA para analisar o preço.
        </Texto>
      </View>

      <View style={estilos.linhaLink}>
        <TextInput
          value={link}
          onChangeText={(texto) => {
            setLink(texto);
            if (erro) setErro('');
          }}
          onSubmitEditing={analisarLink}
          placeholder="Cole aqui o link do produto"
          placeholderTextColor={cores.lightGray}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          accessibilityLabel="Link do produto"
          style={[
            estilos.campo,
            { borderColor: erro ? cores.darkOrange : cores.lightGray, color: cores.dark, fontSize: 12 + ajusteFonte },
          ]}
        />
        <Pressable
          onPress={analisarLink}
          accessibilityRole="button"
          style={({ pressed }) => [estilos.botaoAnalisar, { backgroundColor: pressed ? cores.hoverOrange : cores.orange }]}
        >
          <Texto tamanho={12} peso="semibold" cor={cores.white}>Analisar</Texto>
        </Pressable>
      </View>
      {erro ? <Texto tamanho={10} cor={cores.darkOrange} style={estilos.largura}>{erro}</Texto> : null}

      <View style={estilos.largura}>
        <Texto tamanho={10} peso="semibold" cor={cores.gray} style={{ marginTop: 6 }}>OU ABRA UMA LOJA</Texto>
        <View style={estilos.lojas}>
          {LOJAS.map((loja) => (
            <Pressable
              key={loja.nome}
              onPress={() => aoAbrirLoja(loja.url)}
              accessibilityRole="button"
              style={({ pressed }) => [
                estilos.loja,
                { borderColor: cores.lightGray, backgroundColor: pressed ? cores.secondaryOffWhite : 'transparent' },
              ]}
            >
              <Store size={14} color={cores.orange} strokeWidth={2} />
              <Texto tamanho={12} peso="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{loja.nome}</Texto>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable
        onPress={aoComoFunciona}
        accessibilityRole="button"
        style={({ pressed }) => [estilos.botaoComoFunciona, { backgroundColor: pressed ? cores.hoverOrange : cores.orange }]}
      >
        <Texto tamanho={15} peso="semibold" cor={cores.offWhite}>Como funciona?</Texto>
      </Pressable>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  conteudo: { alignItems: 'center', paddingHorizontal: 18, paddingTop: 40, paddingBottom: 24, gap: 12 },
  textos: { width: '100%', gap: 4 },
  largura: { width: '100%' },
  linhaLink: { width: '100%', flexDirection: 'row', gap: 8, marginTop: 8 },
  campo: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  botaoAnalisar: { borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' },
  lojas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  loja: {
    flexGrow: 1,
    flexBasis: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  botaoComoFunciona: {
    width: 200,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
  },
});
