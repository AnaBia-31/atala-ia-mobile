import { Image, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTema } from '../tema';

// <header> da extensão: faixa azul com a logo no centro.
export default function Cabecalho() {
  const { cores } = useTema();
  const { top } = useSafeAreaInsets();
  return (
    <View style={[estilos.cabecalho, { backgroundColor: cores.navbar, paddingTop: top + 5 }]}>
      <Image
        source={require('../../assets/logo-header.png')}
        style={estilos.logo}
        resizeMode="contain"
        accessibilityLabel="Atala.IA"
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  cabecalho: { width: '100%', alignItems: 'center', justifyContent: 'center', paddingBottom: 5 },
  logo: { width: 129, height: 50 },
});
