import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';

type Props = {
  onPressNumber: (num: string) => void;
  onBackspace: () => void;
  onStartBackspaceHold: () => void;
  onStopBackspaceHold: () => void;
};

const CalculatorButtons = ({
  onPressNumber,
  onBackspace,
  onStartBackspaceHold,
  onStopBackspaceHold,
}: Props) => {
  // Botões numéricos 1-9
  const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <View style={styles.container}>
      {Array.from({ length: 3 }).map((_, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {numbers
            .slice(rowIndex * 3, rowIndex * 3 + 3)
            .map((num) => (
              <Pressable
                key={num}
                style={styles.button}
                onPress={() => onPressNumber(num)}
              >
                <Text style={styles.text}>{num}</Text>
              </Pressable>
            ))}
        </View>
      ))}

      <View style={styles.row}>
        <Pressable
          style={[styles.button, { flex: 1 }]}
          onPress={() => onPressNumber('0')}
        >
          <Text style={styles.text}>0</Text>
        </Pressable>
        <Pressable
  style={[styles.button, styles.backspace, { flex: 1 }]}
  onPress={onBackspace} // apaga 1 caractere
  onLongPress={onStartBackspaceHold} // apaga tudo se segurar
  delayLongPress={400} // tempo de espera para considerar "segurar"
>
  <Text style={styles.text}>⌫</Text>
</Pressable>

      </View>
    </View>
  );
};

export default CalculatorButtons;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    width: '80%',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  button: {
    flex: 1,
    height: 50,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
  },
  backspace: {
    backgroundColor: '#f88',
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
