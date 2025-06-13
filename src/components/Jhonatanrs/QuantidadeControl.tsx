import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

interface QuantidadeControlProps {
  quantidade: number;
  onChange: (novoValor: number) => void;
  min?: number;
  max?: number;
}

export default function QuantidadeControl({ quantidade, onChange, min = 1, max = 999999 }: QuantidadeControlProps) {
  const changeValue = (delta: number) => {
    let novo = quantidade + delta;
    if (novo < min) novo = min;
    if (novo > max) novo = max;
    onChange(novo);
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.button} onPress={() => changeValue(-1)}>
        <Text style={styles.buttonText}>-</Text>
      </Pressable>

      <Text style={styles.quantidadeText}>{quantidade}</Text>

      <Pressable style={styles.button} onPress={() => changeValue(1)}>
        <Text style={styles.buttonText}>+</Text>
      </Pressable>

      <Pressable style={styles.button} onPress={() => changeValue(5)}>
        <Text style={styles.buttonText}>+5</Text>
      </Pressable>

      <Pressable style={styles.button} onPress={() => changeValue(10)}>
        <Text style={styles.buttonText}>+10</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 10 },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  quantidadeText: {
    fontSize: 32,
    width: 50,
    textAlign: 'center',
  },
});
