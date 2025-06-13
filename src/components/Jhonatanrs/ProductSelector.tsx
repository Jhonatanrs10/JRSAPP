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


interface ProductSelectorProps {
  selectedProduct: string;
  onSelect: (product: string) => void;
}

export default function ProductSelector({
  selectedProduct,
  onSelect,
}: ProductSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
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

  return (
    <View>
      <Pressable
        style={styles.selectorButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.selectorText}>
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
                  setModalVisible(false);
                }}
                style={styles.productItem}
              >
                <Text style={styles.productText}>{item}</Text>
              </TouchableOpacity>
            )}
          />

          <Pressable
            onPress={() => setModalVisible(false)}
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
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  selectorText: { fontSize: 16, textAlign: 'center' },
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
    marginBottom: 15,
  },
  productItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  productText: { fontSize: 18 },
  cancelButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  cancelText: { color: 'white', textAlign: 'center', fontSize: 16 },
});
