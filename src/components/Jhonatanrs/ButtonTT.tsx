import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  GestureResponderEvent,
  Platform,
  ViewStyle, // Para tipar os estilos do container
  TextStyle, // Para tipar os estilos do texto
} from 'react-native';

import { Text, View } from '../../components/Themed'; // Assumindo que Themed.tsx existe
import Colors from '../../constants/Colors'; // Assumindo que Colors.ts existe
import { useColorScheme } from '../../components/useColorScheme'; // Assumindo que useColorScheme.ts existe

// Definição das props que o seu componente ButtonTT pode receber
interface ButtonTTProps {
  title: string; // O texto que aparecerá no botão
  onPress?: (event: GestureResponderEvent) => void; // Função para toque curto
  onLongPress?: (event: GestureResponderEvent) => void; // Função para toque longo
  delayLongPress?: number; // Atraso para o toque longo (em ms)
  buttonStyle?: ViewStyle; // Estilos personalizados para o container do botão
  textStyle?: TextStyle; // Estilos personalizados para o texto do botão
  disabled?: boolean; // Se o botão deve estar desabilitado
  color?: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' | string; // Nome da cor predefinida
  
  // --- NOVA PROPRIEDADE PARA CONTROLE DE VISIBILIDADE ---
  displayButton?: boolean; // Controla se o botão será exibido (true por padrão)
}

const ButtonTT: React.FC<ButtonTTProps> = ({
  title,
  onPress,
  onLongPress,
  delayLongPress = 500, // Padrão de 500ms para o toque longo
  buttonStyle,
  textStyle,
  disabled = false, // Botão habilitado por padrão
  color = 'primary', // Cor primária por padrão
  displayButton = true, // --- NOVO: Botão visível por padrão ---
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme || 'light']; // Use 'light' como fallback

  // Lógica para determinar a cor de fundo do botão
  const getBackgroundColor = () => {
    // Se for um nome de cor predefinido, use-o
    if (colors[color as keyof typeof colors]) {
      return colors[color as keyof typeof colors];
    }
    // Se for uma string de cor CSS (ex: '#FF0000'), use-a diretamente
    if (typeof color === 'string' && color.startsWith('#')) {
      return color;
    }
    // Fallback para uma cor padrão se a cor não for encontrada ou inválida
    return colors.info; // Ou outra cor padrão que você preferir
  };

  const buttonBackgroundColor = getBackgroundColor();

  // --- MUDANÇA PRINCIPAL: Renderização Condicional OU Propriedade `display` ---
  // Opção 1: Usar `display: 'none'` no estilo. O componente ainda é renderizado, mas ocupa 0 espaço.
  // Esta é geralmente a melhor opção quando você quer que o layout se ajuste.
  const displayStyle: ViewStyle = displayButton ? { display: 'flex' } : { display: 'none' };

  // Opção 2 (Alternativa): Renderização condicional fora do return.
  // Se você preferir que o componente não seja renderizado na árvore,
  // você faria `if (!displayButton) return null;` no início do componente.
  // Mas para flexibilidade de estilos, `display: 'none'` é muitas vezes mais conveniente.

  return (
    <TouchableOpacity
      style={[
        styles.buttonBase,
        { backgroundColor: buttonBackgroundColor }, // Cor de fundo dinâmica
        disabled && styles.buttonDisabled, // Estilo para quando desabilitado
        displayStyle, // --- NOVO: Aplica o estilo de display ---
        buttonStyle, // Sobrescreve com estilos passados via prop
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
      activeOpacity={0.7} // Feedback visual ao tocar
      disabled={disabled || !displayButton} // Desabilita também se não for para exibir
    >
      <Text
        style={[
          styles.buttonTextBase,
          { color: 'white' }, // Cor do texto do botão (pode ser definida no Colors)
          disabled && styles.textDisabled, // Estilo do texto quando desabilitado
          textStyle, // Sobrescreve com estilos passados via prop
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonBase: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginHorizontal:5,
    borderRadius: 8, // Ajustado para ser um pouco mais arredondado
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
    // Sombras / Elevação (simulando botão padrão)
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  buttonTextBase: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.5, // Botão mais claro quando desabilitado
  },
  textDisabled: {
    color: '#A0A0A0', // Cor do texto mais escura quando desabilitado
  },
});

export default ButtonTT;