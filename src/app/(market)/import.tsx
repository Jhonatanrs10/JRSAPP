import React, { useState, useEffect } from 'react';
import { Pressable, FlatList, StyleSheet } from 'react-native';
import { Text, View, TextInput } from '../../components/Themed';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';

export default function ProductsScreen() {
  const [productName, setProductName] = useState('');
  const [products, setProducts] = useState<string[]>([]);

  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const loadProducts = async () => {
    const saved = await AsyncStorage.getItem('products');
    if (saved) setProducts(JSON.parse(saved));
  };

  const saveProducts = async (newProducts: string[]) => {
    setProducts(newProducts);
    await AsyncStorage.setItem('products', JSON.stringify(newProducts));
  };

  const addProduct = () => {
    if (productName.trim() && !products.includes(productName.trim())) {
      const updated = [...products, productName.trim()];
      saveProducts(updated);
      setProductName('');
    }
  };

  const removeProductAtIndex = (visualIndex: number) => {
    const realIndex = products.length - 1 - visualIndex;
    const updated = [...products];
    updated.splice(realIndex, 1);
    saveProducts(updated);
  };

  useFocusEffect(
    React.useCallback(() => {
      loadProducts();
    }, [])
  );

  const exportProductsToFile = async () => {
    try {
      const saved = await AsyncStorage.getItem('products');
      const products = saved ? JSON.parse(saved) : [];

      if (!products.length) {
        alert('Nenhum produto para exportar.');
        return;
      }

      const content = products.join(';\n') + ';'; // fim com ';'

      const fileUri = FileSystem.documentDirectory + 'products.txt';

      await FileSystem.writeAsStringAsync(fileUri, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await Sharing.shareAsync(fileUri);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      alert('Erro ao exportar os produtos.');
    }
  };

  const importProductsFromFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/plain',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const fileUri = result.assets[0].uri;
      const content = await FileSystem.readAsStringAsync(fileUri);

      // Separar por ; e limpar espaços
      const newItems = content
        .split(';')
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      const saved = await AsyncStorage.getItem('products');
      const current = saved ? JSON.parse(saved) : [];

      // Adiciona sem duplicar
      const updated = [...new Set([...current, ...newItems])];

      await AsyncStorage.setItem('products', JSON.stringify(updated));
      setProducts(updated);

      alert('Produtos importados com sucesso!');
    } catch (error) {
      console.error('Erro ao importar:', error);
      alert('Falha ao importar produtos.');
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={styles.title}>Adicionar Produto</Text>
      <TextInput
        style={[styles.input,{backgroundColor: colors.inputBackground, color: colors.text}]}
        value={productName}
        onChangeText={setProductName}
        placeholder="Nome do produto"
        placeholderTextColor={colors.text}
      />


      <Pressable onPress={addProduct} style={[styles.button, {backgroundColor: '#007bff'}]}>
        <Text style={styles.buttonText}>Salvar</Text>
      </Pressable>

      <FlatList
        data={[...products].reverse()} // visualmente invertido
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item, index }) => (
          <View style={styles.productRow}>
            <Text style={styles.item}>{item}</Text>
            <Pressable onPress={() => removeProductAtIndex(index)}>
              <Text style={styles.remove}>✕</Text>
            </Pressable>
          </View>
        )}
      />
      <Pressable onPress={importProductsFromFile} style={[styles.button, { backgroundColor: colors.info }]}>
        <Text style={styles.buttonText}>Importar de TXT</Text>
      </Pressable>

      <Pressable onPress={exportProductsToFile} style={[styles.button, { backgroundColor: colors.success }]}>
        <Text style={styles.buttonText}>Exportar para TXT</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, textAlign: 'center', marginVertical: 10 },
  input: { borderColor: '#ccc', borderWidth: 0, borderRadius: 8, padding: 10, marginBottom: 10, height: 50 },
  button: { backgroundColor: '#007AFF', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 5 },
  buttonText: { color: 'white', fontWeight: 'bold' },
  item: { fontSize: 18, paddingVertical: 4 },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  remove: {
    fontSize: 18,
    color: 'red',
    paddingHorizontal: 8,
    fontWeight: 'bold',
  },
});
