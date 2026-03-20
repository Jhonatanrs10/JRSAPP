import React, { useState } from 'react';
import { Pressable, FlatList, StyleSheet, Alert } from 'react-native';
import { Text, View } from '../../components/Themed';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';

export default function ProductsScreen() {
  const [products, setProducts] = useState<string[]>([]);

  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // Carrega a lista sempre que a tela ganha foco
  const loadProducts = async () => {
    const saved = await AsyncStorage.getItem('products');
    if (saved) setProducts(JSON.parse(saved));
  };

  const saveProducts = async (newProducts: string[]) => {
    setProducts(newProducts);
    await AsyncStorage.setItem('products', JSON.stringify(newProducts));
  };

  const removeProductAtIndex = (visualIndex: number) => {
    // Inverte o índice pois a lista é exibida com .reverse()
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
      if (!products.length) {
        Alert.alert('Aviso', 'Nenhum produto para exportar.');
        return;
      }

      const content = products.join(';\n') + ';';
      const fileUri = FileSystem.documentDirectory + 'products.txt';

      await FileSystem.writeAsStringAsync(fileUri, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await Sharing.shareAsync(fileUri);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      Alert.alert('Erro', 'Falha ao exportar os produtos.');
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

      const newItems = content
        .split(';')
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      const saved = await AsyncStorage.getItem('products');
      const current = saved ? JSON.parse(saved) : [];

      // Remove duplicatas usando Set
      const updated = [...new Set([...current, ...newItems])];

      await saveProducts(updated);
      Alert.alert('Sucesso', 'Produtos importados com sucesso!');
    } catch (error) {
      console.error('Erro ao importar:', error);
      Alert.alert('Erro', 'Falha ao importar produtos.');
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={styles.title}>Gerenciar Produtos</Text>
      
      <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
        Lista de produtos cadastrados via Input
      </Text>

      <FlatList
        data={[...products].reverse()} 
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item, index }) => (
          <View style={[styles.productRow, { borderBottomColor: colors.tabIconDefault + '33' }]}>
            <Text style={[styles.item, { color: colors.text }]}>{item}</Text>
            <Pressable onPress={() => removeProductAtIndex(index)}>
              <Text style={styles.remove}>✕</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 20, color: '#888' }}>
            Nenhum produto cadastrado.
          </Text>
        }
      />

      <View style={styles.footer}>
        <Pressable 
          onPress={importProductsFromFile} 
          style={[styles.button, { backgroundColor: colors.info }]}
        >
          <Text style={styles.buttonText}>Importar TXT</Text>
        </Pressable>

        <Pressable 
          onPress={exportProductsToFile} 
          style={[styles.button, { backgroundColor: colors.success }]}
        >
          <Text style={styles.buttonText}>Exportar TXT</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginTop: 10 },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  button: { padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  item: { fontSize: 20, paddingVertical: 10 },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  remove: {
    fontSize: 22,
    color: '#FF3B30',
    paddingHorizontal: 15,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15
  }
});