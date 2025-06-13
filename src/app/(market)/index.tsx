import React, { useState, useRef, useEffect } from 'react';
import { ScrollView, Pressable, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, View } from '../../components/Themed';
import CalculatorButtons from '../../components/Jhonatanrs/CalculatorButtons';
import ProductSelector from '../../components/Jhonatanrs/ProductSelector';
import { useFocusEffect } from '@react-navigation/native';

export default function App() {
  const [input1, setInput1] = useState('');
  const [input2, setInput2] = useState('1');
  const [selectedProduct, setSelectedProduct] = useState<string>('Produto');
  const [products, setProducts] = useState<string[]>([]);
  const [history, setHistory] = useState<{ unitValue: number; quantity: number; product: string }[]>([]);
  const [accumulatedTotal, setAccumulatedTotal] = useState('R$ 0,00');

  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearInput1 = () => setInput1('');
const clearInput2 = () => setInput2('');


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
    // Função que carrega histórico e produtos
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

    // Opcional: cleanup
    return () => {
      // Se precisar cancelar algum timer ou cleanup
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

  // 👇 Aqui definimos que se input2 for vazio ou zero, usa 1
  const rawQuantity = parseInt(input2 || '0', 10);
  const quantity = rawQuantity > 0 ? rawQuantity : 1;

  if (unitValue > 0 && selectedProduct) {
    const newItem = { product: selectedProduct, unitValue, quantity };
    const updatedHistory = [...history, newItem];
    setHistory(updatedHistory);

    try {
      await AsyncStorage.setItem('history', JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Erro ao salvar o histórico:', error);
    }

    setInput1('');
    setInput2('');
    setSelectedProduct('Produto');  // <-- aqui reseta o produto para o padrão
  }
};

const handleNumberPressInput1 = (num: string) =>
  setInput1((prev) => {
    if (prev.length < 10) return prev + num;
    return prev;
  });
  const handleBackspaceInput1 = () => setInput1((prev) => prev.slice(0, -1));
  const handleNumberPressInput2 = (num: string) => {
  setInput2((prev) => {
    if (prev === '' || prev === '1') {
      return num;
    }
    return prev + num;
  });
};

  const handleBackspaceInput2 = () => setInput2((prev) => prev.slice(0, -1));

  return (
    <View style={{ flex: 1, paddingTop: 10, paddingHorizontal: 15 }}>
    
      <Text style={[styles.label, { marginTop: 0 }]}>Total acumulado:</Text>
      <Text
  style={[styles.value, { color: '#007700' }]}
  numberOfLines={1}
  ellipsizeMode="tail"
  adjustsFontSizeToFit={false}
>
  {accumulatedTotal}
</Text>


 
<ProductSelector
  selectedProduct={selectedProduct}
  onSelect={setSelectedProduct}
/>



      <Text style={styles.value}>Unidade: {formatToCurrency(input1)}</Text>
      <CalculatorButtons
  onPressNumber={handleNumberPressInput1}
  onBackspace={handleBackspaceInput1}
  onStartBackspaceHold={clearInput1}
  onStopBackspaceHold={() => {}} // não faz mais nada
/>


      
      <Text style={styles.value}>Quantidade: {input2 || '0'}</Text>
      <CalculatorButtons
  onPressNumber={handleNumberPressInput2}
  onBackspace={handleBackspaceInput2}
  onStartBackspaceHold={clearInput2}
  onStopBackspaceHold={() => {}}
/>


      <Pressable style={styles.addButton} onPress={addToHistory}>
        <Text style={styles.addButtonText}>Adicionar ao total</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 18, textAlign: 'center', marginTop: 5 },
  value: { fontSize: 32, textAlign: 'center', marginBottom: 5 },
  addButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 0,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
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
