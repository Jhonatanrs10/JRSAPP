// app/index.js
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import ButtonTTAPP from '../components/Jhonatanrs/ButtonTTAPP';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../constants/Colors';
import { useColorScheme } from '../components/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // Importe useSafeAreaInsets

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets(); // Hook para obter as insets da área segura

  return (
    // O View principal ocupa toda a tela
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.grade1, colors.grade2]} // Suas cores
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject} // Isso faz o gradiente preencher o pai (container)
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollViewContent,
          // Ajuste o padding superior para respeitar a Status Bar e o notch
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }
        ]}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <ButtonTTAPP imageSource={require('../assets/images/BTTAPP01.jpg')} title="Animes" onPress={() => router.push('/(animes)')} />
        <View style={styles.spacer} />
        <ButtonTTAPP imageSource={require('../assets/images/BTTAPP02.jpg')} title="Finanças" onPress={() => router.push('/(finance)')} />
        <View style={styles.spacer} />
        <ButtonTTAPP imageSource={require('../assets/images/BTTAPP03.jpg')} title="Mercado" onPress={() => router.push('/(market)')} />
        <View style={styles.spacer} />

        <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', marginTop: 50 }}>
          <Text style={{ color: "white", fontSize: 10, fontWeight: 'bold' }}>Copyright © 2025 JRSAPP. Todos os direitos reservados.</Text>
          <Text style={{ color: "white", fontSize: 8, fontWeight: 'bold' }}>By Jhonatanrs</Text>
        </View>

      </ScrollView>

      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, // Faz com que o container ocupe 100% da altura e largura da tela
    backgroundColor: 'transparent', // Para que o gradiente abaixo seja visível
  },
  scrollView: {
    flex: 1, // Faz o ScrollView ocupar todo o espaço disponível
  },
  scrollViewContent: {
    flexGrow: 1, // Permite que o conteúdo do ScrollView se expanda para preencher o espaço
    justifyContent: 'center', // Centraliza o conteúdo verticalmente
    alignItems: 'center',     // Centraliza o conteúdo horizontalmente
    paddingHorizontal: 20, // Opcional: Adiciona padding lateral
  },
  spacer: {
    height: 20,
  },
});