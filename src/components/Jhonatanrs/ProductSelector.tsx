import React, { useState, useEffect } from 'react';
import { Text, View, TextInput } from '../../components/Themed';
import {
  Modal,
  FlatList,
  Pressable,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';


interface ProductSelectorProps {
  selectedProduct: string;
  onSelect: (product: string) => void;
}

export default function ProductSelector({
  selectedProduct,
  onSelect,
}: ProductSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState(''); // Estado para o campo de busca
  const [products, setProducts] = useState<string[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      const loadProducts = async () => {
        const saved = await AsyncStorage.getItem('products');
        if (saved) setProducts(JSON.parse(saved));
      };
      loadProducts();
    }, [])
  );

  const filteredProducts = products.filter((p) =>
    p.toLowerCase().includes(searchText.toLowerCase())
  );

  // Função para fechar o modal e limpar o campo de busca
  const closeModalAndClearSearch = () => {
    setModalVisible(false);
    setSearchText(''); // Limpa o campo de busca
  };

  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View style={{backgroundColor: colors.background}}>
      <Pressable
        style={[styles.selectorButton, { backgroundColor: colors.inputBackground }]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={[styles.selectorText, {flex: 1, backgroundColor: colors.inputBackground, color: colors.text }]}>
          {selectedProduct || 'Selecione um produto...'}
        </Text>
      </Pressable>

      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Selecione um produto</Text>

          <TextInput
            placeholder="Buscar produto..."
            placeholderTextColor="#888"
            value={searchText}
            onChangeText={setSearchText}
            style={styles.searchInput}
          />

          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  onSelect(item);
                  closeModalAndClearSearch(); // Chama a nova função ao selecionar
                }}
                style={styles.productItem}
              >
                <Text style={styles.productText}>{item}</Text>
              </TouchableOpacity>
            )}
          />

          <Pressable
            onPress={closeModalAndClearSearch} // Chama a nova função ao cancelar
            style={styles.cancelButton}
          >
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 18, textAlign: 'center', marginTop: 10, color: 'white' },
  selectorButton: {
    borderWidth: 0,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    height: 80
  },
  selectorText: { fontSize: 20, textAlign: 'center', textAlignVertical: 'center' },
  modalContainer: {
    flex: 1,
    padding: 20
  },
  modalTitle: {
    fontSize: 22,
    marginBottom: 10,
    textAlign: 'center',
  },
  searchInput: {
    padding: 10,
    borderRadius: 8,
    fontSize: 25,
    height:90,
    marginBottom: 15
  },
  productItem: {
    justifyContent: 'center',
    paddingVertical: 10,
    height: 80,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
   
  },
  productText: { fontSize: 25,  textAlignVertical: 'center'},
  cancelButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  cancelText: { color: 'white', textAlign: 'center', fontSize: 16 },
});