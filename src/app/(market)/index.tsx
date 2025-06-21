import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Pressable } from 'react-native';
import { Text, View } from '../../components/Themed';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';

type HistoryItem = {
  product: string;
  unitValue: number;
  quantity: number;
};

export default function TwoScreen() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const loadHistory = async () => {
    const stored = await AsyncStorage.getItem('history');
    if (stored) {
      setHistory(JSON.parse(stored));
    }
  };

  const clearHistory = async () => {
    await AsyncStorage.removeItem('history');
    setHistory([]);
  };

  const deleteItem = async (visualIndex: number) => {
    const realIndex = history.length - 1 - visualIndex;
    const newHistory = [...history];
    newHistory.splice(realIndex, 1);
    setHistory(newHistory);
    await AsyncStorage.setItem('history', JSON.stringify(newHistory));
  };

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const exportHistory = async () => {
    if (history.length === 0) return;

    const content = history
      .map((item) => {
        const total = item.unitValue * item.quantity;
        const formatted = `${item.product} ${item.quantity}x ${item.unitValue.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })} (${total.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })})`;
        return formatted;
      })
      .join('\n');

    const fileUri = FileSystem.documentDirectory + 'history.txt';

    try {
      await FileSystem.writeAsStringAsync(fileUri, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await Sharing.shareAsync(fileUri);
    } catch (error) {
      console.error('Erro ao exportar:', error);
    }
  };



  return (
    <View style={styles.container}>
      <Text style={styles.title}>Histórico</Text>

      <FlatList
        data={[...history].reverse()} // <- apenas inverte visualmente
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item, index }) => (
          <View style={[styles.itemContainer, { backgroundColor: colors.inputBackground}]}>
            <Text style={styles.item}>
              {item.product} - {item.quantity} x{' '}
              {item.unitValue.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}{' '}
              (
              {(item.unitValue * item.quantity).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
              )
            </Text>

            <Pressable onPress={() => deleteItem(index)} style={styles.deleteButton}>
              <Text style={styles.deleteButtonText}>Excluir</Text>
            </Pressable>
          </View>
        )}
      />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Pressable onLongPress={clearHistory} style={[styles.clearButton, { flex: 1, marginRight: 5 ,backgroundColor: colors.error}]}>
          <Text style={styles.clearButtonText}>Limpar Histórico</Text>
        </Pressable>

        <Pressable onPress={exportHistory} style={[styles.exportButton, { flex: 1, marginLeft: 5 ,backgroundColor: colors.success}]}>
          <Text style={styles.clearButtonText}>Exportar TXT</Text>
        </Pressable>
      </View>

    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    paddingTop: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  itemContainer: {
    marginVertical: 6,
    padding: 10,
    borderRadius: 8,
    borderColor: '#1c1c1e',
    borderWidth: 0,
  },
  item: {
    fontSize: 18,
    marginBottom: 6,
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  clearButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#FF9500',
    padding: 6,
    borderRadius: 6,
    alignSelf: 'flex-end',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 14,
  },
  exportButton: {
    backgroundColor: '#34C759',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20
  },

});
