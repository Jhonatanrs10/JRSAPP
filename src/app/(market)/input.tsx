import React, { useState, useRef, useEffect } from 'react';
import { ScrollView, Pressable, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, View } from '../../components/Themed';
import CalculatorButtons from '../../components/Jhonatanrs/CalculatorButtons';
import QuantitySelector from '../../components/Jhonatanrs/QuantitySelector'; // Keep this import
import QuantidadeControl from '@/src/components/Jhonatanrs/QuantidadeControl'; // Assuming this is still needed, though not used in the provided snippet
import ProductSelector from '../../components/Jhonatanrs/ProductSelector';
import { useFocusEffect } from '@react-navigation/native';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function App() {
  const [input1, setInput1] = useState('');
  const [input2, setInput2] = useState('1'); // This will now be controlled by QuantitySelector
  const [selectedProduct, setSelectedProduct] = useState<string>('Produto');
  const [products, setProducts] = useState<string[]>([]);
  const [history, setHistory] = useState<{ unitValue: number; quantity: number; product: string }[]>([]);
  const [accumulatedTotal, setAccumulatedTotal] = useState('R$ 0,00');

  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearInput1 = () => setInput1('');
  // const clearInput2 = () => setInput2('0'); // This function is no longer directly used for QuantitySelector

  useEffect(() => {
    const loadHistory = async () => {
      const stored = await AsyncStorage.getItem('history');
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    };
    loadHistory();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      const saved = await AsyncStorage.getItem('products');
      if (saved) setProducts(JSON.parse(saved));
    };
    loadProducts();
  }, []);

  useEffect(() => {
    const total = history.reduce(
      (acc, item) => acc + item.unitValue * item.quantity,
      0
    );
    setAccumulatedTotal(
      total.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })
    );
  }, [history]);

  useFocusEffect(
    React.useCallback(() => {
      const loadData = async () => {
        const storedHistory = await AsyncStorage.getItem('history');
        if (storedHistory) {
          setHistory(JSON.parse(storedHistory));
        } else {
          setHistory([]);
        }

        const savedProducts = await AsyncStorage.getItem('products');
        if (savedProducts) {
          setProducts(JSON.parse(savedProducts));
        } else {
          setProducts([]);
        }
      };

      loadData();

      return () => {
      };
    }, [])
  );

  const formatToCurrency = (value: string): string => {
    const numeric = value.replace(/\D/g, '');
    const number = parseFloat(numeric || '0') / 100;
    return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const addToHistory = async () => {
    const unitValue = parseFloat(input1.replace(/\D/g, '') || '0') / 100;
    // input2 is now a string representation of the number from QuantitySelector
    let quantityToAdd = parseInt(input2, 10);

    if (unitValue <= 0) {
      Alert.alert('Valor inválido', 'Por favor, insira um valor unitário maior que zero.');
      return;
    }

    // Altera '0' para '1' e alerta o usuário
    if (quantityToAdd === 0) {
      quantityToAdd = 1;
    }


    const newItem = { product: selectedProduct, unitValue, quantity: quantityToAdd };
    const updatedHistory = [...history, newItem];
    setHistory(updatedHistory);

    try {
      await AsyncStorage.setItem('history', JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Erro ao salvar o histórico:', error);
    }

    setInput1('');
    setInput2('1'); // Reset input2 after adding to history
    setSelectedProduct('Produto');
  };

  const handleNumberPressInput1 = (num: string) =>
    setInput1((prev) => {
      if (prev.length < 10) return prev + num;
      return prev;
    });

  const handleBackspaceInput1 = () => setInput1((prev) => prev.slice(0, -1));

  // This handler is no longer needed if QuantitySelector manages its own state
  // const handleNumberPressInput2 = (num: string) => {
  //   setInput2((prev) => {
  //     if (prev === '0') {
  //       if (num === '0') {
  //         return '0';
  //       }
  //       return num;
  //     }
  //     return prev + num;
  //   });
  // };

  // This handler is no longer needed if QuantitySelector manages its own state
  // const handleBackspaceInput2 = () => {
  //   setInput2((prev) => {
  //     const newValue = prev.slice(0, -1);
  //     return newValue === '' ? '0' : newValue;
  //   });
  // };

  // New handler for QuantitySelector to update input2
  const handleQuantityChange = (newQuantity: number) => {
    setInput2(newQuantity.toString()); // Update input2 state with the new quantity as a string
  };

  return (
    <View style={{ flex: 1, paddingTop: 10, paddingHorizontal: 15, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, height: 'auto' }}>
        <Text style={styles.value}>Total </Text>
        <Text
          style={[styles.value, { color: '#007700' }]}
          numberOfLines={1}
          ellipsizeMode="tail"
          adjustsFontSizeToFit={false}
        >
          {accumulatedTotal}
        </Text>
      </View>
      <ProductSelector
        selectedProduct={selectedProduct}
        onSelect={setSelectedProduct}
      />

      <Text style={styles.value}>{input2}x {formatToCurrency(input1)}</Text>

      <QuantitySelector onQuantityChange={handleQuantityChange} initialQuantity={parseInt(input2, 10)} />


      <CalculatorButtons
        onPressNumber={handleNumberPressInput1}
        onBackspace={handleBackspaceInput1}
        onStartBackspaceHold={clearInput1}
        onStopBackspaceHold={() => { }}
      />


      <Pressable style={[styles.addButton, { backgroundColor: colors.info, alignSelf: 'center' }]} onPress={addToHistory}>
        <Text style={[styles.addButtonText]}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 18, textAlign: 'center', marginTop: 5 },
  value: { fontSize: 35, textAlign: 'center', marginBottom: 5 },
  addButton: {
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    borderRadius: 16,
    marginTop: 0,
    height: 80,
    width: '90%',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 25,
    fontWeight: 'bold',
  },
  historyItem: {
    fontSize: 16,
    marginVertical: 2,
    textAlign: 'center',
  },
  productButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderColor: '#ccc',
    borderWidth: 1,
    marginRight: 10,
  },
  selectedProductButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
  },
});