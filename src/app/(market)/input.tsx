import { useTranslation } from 'react-i18next';
import React, { useState, useRef, useEffect } from 'react';
import { ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, View } from '../../components/Themed';
import CalculatorButtons from '../../components/Jhonatanrs/CalculatorButtons';
import QuantitySelector from '../../components/Jhonatanrs/QuantitySelector';
import ProductSelector from '../../components/Jhonatanrs/ProductSelector';
import { useFocusEffect } from 'expo-router';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';

export default function App() {
  const { t } = useTranslation();
  const [input1, setInput1] = useState('');
  const [input2, setInput2] = useState('1');
  const [selectedProduct, setSelectedProduct] = useState<string>(t('input_market.product'));
  const [products, setProducts] = useState<string[]>([]);
  const [history, setHistory] = useState<{ unitValue: number; quantity: number; product: string }[]>([]);
  const [accumulatedTotal, setAccumulatedTotal] = useState('R$ 0,00');

  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const clearInput1 = () => setInput1('');

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
    }, [])
  );

  const formatToCurrency = (value: string): string => {
    const numeric = value.replace(/\D/g, '');
    const number = parseFloat(numeric || '0') / 100;
    return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleDeleteProduct = (productName: string) => {
    Alert.alert(
      t('return.remove_item'),
      `${t('return.remove_item_msg') || 'Deseja remover este produto?'} (${productName})`,
      [
        { text: t('button.cancel'), style: 'cancel' },
        {
          text: t('button.delete'),
          style: 'destructive',
          onPress: async () => {
            const savedProducts = await AsyncStorage.getItem('products');
            const currentProducts: string[] = savedProducts ? JSON.parse(savedProducts) : [];
            const updatedProducts = currentProducts.filter((item) => item !== productName);

            await AsyncStorage.setItem('products', JSON.stringify(updatedProducts));
            setProducts(updatedProducts);

            if (selectedProduct === productName) {
              setSelectedProduct(t('input_market.product'));
            }
          },
        },
      ]
    );
  };

  const addToHistory = async () => {
    const unitValue = parseFloat(input1.replace(/\D/g, '') || '0') / 100;
    let quantityToAdd = parseInt(input2, 10);

    if (unitValue <= 0) {
      Alert.alert(t('return.invalid_value'), t('return.invalid_value_msg'));
      return;
    }

    if (quantityToAdd === 0) {
      quantityToAdd = 1;
    }

    if (selectedProduct !== t('input_market.product') && selectedProduct.trim() !== '') {
      const savedProducts = await AsyncStorage.getItem('products');
      const currentProducts: string[] = savedProducts ? JSON.parse(savedProducts) : [];

      if (!currentProducts.includes(selectedProduct.trim())) {
        const updatedProducts = [...currentProducts, selectedProduct.trim()];
        await AsyncStorage.setItem('products', JSON.stringify(updatedProducts));
        setProducts(updatedProducts);
      }
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
    setInput2('1');
    setSelectedProduct(t('input_market.product'));
  };

  const handleNumberPressInput1 = (num: string) =>
    setInput1((prev) => {
      if (prev.length < 10) return prev + num;
      return prev;
    });

  const handleBackspaceInput1 = () => setInput1((prev) => prev.slice(0, -1));

  const handleQuantityChange = (newQuantity: number) => {
    setInput2(newQuantity.toString());
  };

  return (
    <View style={{ flex: 1, paddingTop: 10, paddingHorizontal: 15, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, height: 'auto' }}>
        <Text style={styles.value}>{t('input_market.total') + ' '}</Text>
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
        onDeleteProduct={handleDeleteProduct}
        titleText={t('input_market.search_title')}
        placeholderText={t('placeholder.product_name')}
        closeText={t('button.close')}
        addText={t('button.add')}
      />

      <Text style={styles.value}>{input2}x {formatToCurrency(input1)}</Text>

      <QuantitySelector onQuantityChange={handleQuantityChange} initialQuantity={parseInt(input2, 10)} />

      <CalculatorButtons
        onPressNumber={handleNumberPressInput1}
        onBackspace={handleBackspaceInput1}
        onStartBackspaceHold={clearInput1}
        onStopBackspaceHold={() => {}}
      />

      <Pressable style={[styles.addButton, { backgroundColor: colors.info, alignSelf: 'center' }]} onPress={addToHistory}>
        <Text style={styles.addButtonText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
});