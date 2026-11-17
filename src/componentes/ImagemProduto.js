import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { ShoppingBag } from 'lucide-react-native';

import { useTema } from '../tema';

// Foto do produto. Sem foto (ou se ela não carregar), mostra uma sacola.
export default function ImagemProduto({ url, largura, altura, raio = 8, borda = false }) {
  const { cores } = useTema();
  const [falhou, setFalhou] = useState(false);
  useEffect(() => setFalhou(false), [url]);

  const estilo = {
    width: largura,
    height: altura,
    borderRadius: raio,
    backgroundColor: cores.white,
    flexShrink: 0,
    overflow: 'hidden',
    ...(borda ? { borderWidth: 1, borderColor: cores.lightGray } : null),
  };

  if (!url || falhou) {
    return (
      <View style={[estilo, { alignItems: 'center', justifyContent: 'center' }]}>
        <ShoppingBag size={Math.min(largura, altura) * 0.45} color={cores.orange} strokeWidth={1.5} />
      </View>
    );
  }
  return <Image source={{ uri: url }} style={estilo} resizeMode="cover" onError={() => setFalhou(true)} />;
}
