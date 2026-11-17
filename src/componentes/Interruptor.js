import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

import { useTema } from '../tema';

// Botão liga/desliga com o mesmo visual dos "toggles" da extensão
// (trilho cinza que fica laranja e bolinha branca que desliza).
export default function Interruptor({ ligado, aoMudar, rotulo }) {
  const { cores } = useTema();
  const posicao = useRef(new Animated.Value(ligado ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(posicao, { toValue: ligado ? 1 : 0, duration: 150, useNativeDriver: true }).start();
  }, [ligado, posicao]);

  return (
    <Pressable
      onPress={() => aoMudar(!ligado)}
      hitSlop={12}
      accessibilityRole="switch"
      accessibilityLabel={rotulo}
      accessibilityState={{ checked: ligado }}
      style={[estilos.trilho, { backgroundColor: ligado ? cores.orange : cores.lightGray }]}
    >
      <Animated.View
        style={[
          estilos.bolinha,
          {
            borderColor: ligado ? '#FFFFFF' : '#D1D5DB',
            transform: [{ translateX: posicao.interpolate({ inputRange: [0, 1], outputRange: [0, 16] }) }],
          },
        ]}
      />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  trilho: { width: 36, height: 20, borderRadius: 10, flexShrink: 0 },
  bolinha: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
});
