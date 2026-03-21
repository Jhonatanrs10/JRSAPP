import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
  Alert.alert(
    t('return.remove_item'), // Título
    t('return.remove_item_msg'), // Mensagem
    [
      {
        text: t('button.cancel'),
        style: "cancel"
      },
      {
        text: t('button.delete'),
        style: "destructive",
        onPress: () => {
          // Sua lógica original de cálculo de índice e salvamento
          const realIndex = products.length - 1 - visualIndex;
          const updated = [...products];
          updated.splice(realIndex, 1);
          saveProducts(updated);
        }
      }
    ]
  );
};

  useFocusEffect(
    React.useCallback(() => {
      loadProducts();
    }, [])
  );

  const clearProducts = async () => {
    Alert.alert(
      t('button.clean'),
      t('return.warning_clean_database'),
      [
        { text: t('button.cancel'), style: "cancel" },
        {
          text: t('button.clean'),
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem('products');
            setProducts([]);
          }
        }
      ]
    );
  };

  const exportProductsToFile = async () => {
    try {
      if (!products.length) {
        Alert.alert(t('return.warning'), t('return.error_export_items'));
        return;
      }

      const content = products.join(';\n') + ';';
      const fileUri = FileSystem.documentDirectory + 'products.txt';

      await FileSystem.writeAsStringAsync(fileUri, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await Sharing.shareAsync(fileUri);
    } catch (error) {
      console.error(t('return.error'), error);
      Alert.alert(t('return.error'), t('return.error_export_market'));
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
      Alert.alert(t('return.success'), t('return.import_completed'));
    } catch (error) {
      console.error('Erro ao importar:', error);
      Alert.alert(t('return.error'), t('return.error_import_format'));
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>

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
            {t('return.none')}
          </Text>
        }
      />

      <View style={styles.footer}>
        <Pressable 
          onPress={importProductsFromFile} 
          style={[styles.button, { backgroundColor: colors.info }]}
        >
          <Text style={styles.buttonText}>{t('button.import')} TXT</Text>
        </Pressable>

        <Pressable 
          onPress={exportProductsToFile} 
          style={[styles.button, { backgroundColor: colors.success }]}
        >
          <Text style={styles.buttonText}>{t('button.export')} TXT</Text>
        </Pressable>

        <Pressable 
          onLongPress={clearProducts} // Opcional: usar onLongPress para segurança extra
          style={[styles.button, { backgroundColor: colors.error || '#FF3B30', marginBottom: 15 }]}
        >
          <Text style={styles.buttonText}>{t('button.clear_database')}</Text>
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
    borderTopWidth: 0,
    borderTopColor: '#eee',
    paddingTop: 15
  }
});