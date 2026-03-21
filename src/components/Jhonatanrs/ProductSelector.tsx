import React, { useState, useEffect, useRef } from 'react';
import { Text, View } from '../../components/Themed';
import {
  Modal,
  FlatList,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useColorScheme } from '../../components/useColorScheme';

// 1. Atualizando a Interface para aceitar as novas props
interface ProductSelectorProps {
  selectedProduct: string;
  onSelect: (product: string) => void;
  // Novas props de texto
  titleText?: string;
  placeholderText?: string;
  closeText?: string;
  addText?: string;
}

export default function ProductSelector({
  selectedProduct,
  onSelect,
  titleText = "Buscar ou Adicionar", // Valores padrão (fallback)
  placeholderText = "Nome do produto...",
  closeText = "Fechar",
  addText = "+ Adicionar"
}: ProductSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [products, setProducts] = useState<string[]>([]);
  const [isRendered, setIsRendered] = useState(false);

  const inputRef = useRef<RNTextInput>(null);

  const colorScheme = useColorScheme() ?? 'light';
  
  const colors = {
    background: colorScheme === 'dark' ? '#000' : '#fff',
    inputBg: colorScheme === 'dark' ? '#1c1c1e' : '#f2f2f7',
    text: colorScheme === 'dark' ? '#fff' : '#000',
    itemBorder: colorScheme === 'dark' ? '#333' : '#eee',
  };

  useFocusEffect(
    React.useCallback(() => {
      const loadProducts = async () => {
        const saved = await AsyncStorage.getItem('products');
        if (saved) setProducts(JSON.parse(saved));
      };
      loadProducts();
    }, [])
  );

  useEffect(() => {
    if (isRendered) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isRendered]);

  const filteredProducts = products.filter((p) =>
    p.toLowerCase().includes(searchText.toLowerCase())
  );

  const productExists = products.some(
    (p) => p.toLowerCase() === searchText.trim().toLowerCase()
  );

  const addNewProduct = async () => {
    const newName = searchText.trim();
    if (!newName) return;
    try {
      const updatedProducts = [...products, newName];
      await AsyncStorage.setItem('products', JSON.stringify(updatedProducts));
      setProducts(updatedProducts);
      onSelect(newName);
      closeModalAndClearSearch();
    } catch (error) {
      Alert.alert('Error', 'The product could not be saved.');
    }
  };

  const closeModalAndClearSearch = () => {
    setIsRendered(false);
    setModalVisible(false);
    setSearchText('');
  };

  return (
    <View style={{ backgroundColor: 'transparent' }}>
      <Pressable
        style={[styles.selectorButton, { backgroundColor: colors.inputBg }]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={[styles.selectorText, { color: colors.text }]}>
          {selectedProduct || placeholderText}
        </Text>
      </Pressable>

      <Modal
        visible={modalVisible}
        animationType="slide"
        onShow={() => setIsRendered(true)}
      >
        {/* O KeyboardAvoidingView deve ser o primeiro filho do Modal */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: colors.background }} // Fundo aplicado aqui
        >
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{titleText}</Text>

            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="always"
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    onSelect(item);
                    closeModalAndClearSearch();
                  }}
                  style={[styles.productItem, { borderBottomColor: colors.itemBorder }]}
                >
                  <Text style={[styles.productText, { color: colors.text }]}>{item}</Text>
                </TouchableOpacity>
              )}
            />

            <Pressable onPress={closeModalAndClearSearch} style={styles.cancelButton}>
              <Text style={styles.cancelText}>{closeText}</Text>
            </Pressable>

            {searchText.length > 0 && !productExists && (
              <TouchableOpacity onPress={addNewProduct} style={styles.addNewButton}>
                <Text style={styles.addNewText}>{addText}</Text>
              </TouchableOpacity>
            )}

            {isRendered && (
              <RNTextInput
                ref={inputRef}
                // 5. Usando a prop placeholderText
                placeholder={placeholderText}
                placeholderTextColor="#888"
                value={searchText}
                onChangeText={setSearchText}
                style={[styles.searchInput, { backgroundColor: colors.inputBg, color: colors.text }]}
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (searchText.length > 0 && !productExists) addNewProduct();
                }}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  selectorButton: { borderRadius: 12, padding: 10, marginBottom: 10, height: 80, justifyContent: 'center', alignItems: 'center' },
  selectorText: { fontSize: 22, fontWeight: '500' },
  modalContainer: { flex: 1, padding: 10, paddingTop: 25 },
  modalTitle: { fontSize: 24, marginBottom: 20, textAlign: 'center', fontWeight: 'bold' },
  searchInput: { padding: 15, borderRadius: 10, fontSize: 22, height: 70, marginTop: 5 },
  addNewButton: { backgroundColor: '#28a745', padding: 15, borderRadius: 10, marginVertical: 5, alignItems: 'center' },
  addNewText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  productItem: { paddingVertical: 18, borderBottomWidth: 1 },
  productText: { fontSize: 22 },
  cancelButton: { backgroundColor: '#FF3B30', padding: 15, borderRadius: 10, marginVertical: 5 },
  cancelText: { color: 'white', textAlign: 'center', fontSize: 20, fontWeight: 'bold' },
});