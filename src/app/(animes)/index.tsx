import React, { useState, useEffect, useCallback } from 'react';
import ButtonTT from '../../components/Jhonatanrs/ButtonTT';
import {
  Button,
  Alert,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Linking,
  Platform,
  FlatList, // Importando FlatList
} from 'react-native';
import { Text, View } from '../../components/Themed';
import { ThemedInput } from '../../components/ThemedInput'; // Se não estiver em uso, pode remover
import { ThemedPicker } from '../../components/ThemedPicker'; // Se não estiver em uso, pode remover
import { buscarAnimes, deletarAnime } from '../../database/db';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';
import { FontAwesome } from '@expo/vector-icons';

type StatusAnime = 'assistindo' | 'já assistido';
type ReleaseDay = 'segunda' | 'terça' | 'quarta' | 'quinta' | 'sexta' | 'sábado' | 'domingo';

interface Anime {
  id: number;
  nome: string;
  status: StatusAnime;
  release_day: ReleaseDay | null;
  observacao: string | null;
  link: string | null;
  seasons: string | null;
}

// --- Componente separado para renderizar cada item de Anime ---
interface AnimeItemProps {
  anime: Anime;
  colors: typeof Colors['light']; // Tipagem para as cores do tema
  abrirLink: (url: string | null) => void;
  editarAnime: (anime: Anime) => void;
  confirmarExclusao: (id: number) => void;
}

const AnimeItem: React.FC<AnimeItemProps> = ({ anime, colors, abrirLink, editarAnime, confirmarExclusao }) => {
  return (
    <View
      style={[
        styles.animeContainer,
        {
          backgroundColor: colors.inputBackground,
          borderColor: colors.borderColor,
          borderWidth: 1,
          shadowColor: colors.text,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3
        }
      ]}
    >
      <View style={[styles.animeHeader,{backgroundColor: colors.inputBackground}]}>
        <View style={[styles.animeInfoPrincipal,{backgroundColor: colors.inputBackground}]}>
          <Text style={[styles.animeNome, { color: colors.text }]}>
            {anime.nome}
          </Text>
          <Text style={[
            styles.animeStatus,
            {
              color: anime.status === 'assistindo' ? colors.info : colors.success,
              backgroundColor: anime.status === 'assistindo'
                ? `${colors.info}20`
                : `${colors.success}20`,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 8,
              overflow: 'hidden'
            }
          ]}>
            {anime.status === 'assistindo' ? 'Assistindo' : 'Já Assistido'}
          </Text>
        </View>
      </View>

      <View style={[styles.animeDetalhes, { borderTopColor: colors.borderColor, backgroundColor: colors.inputBackground }]}>
        {anime.release_day && (
          <View style={[styles.detalheItem,{backgroundColor: colors.inputBackground}]}>
            <Text style={[styles.detalheLabel, { color: colors.text }]}>Dia de Lançamento:</Text>
            <Text style={[styles.detalheValor, { color: colors.text }]}>
              {anime.release_day.charAt(0).toUpperCase() + anime.release_day.slice(1)}
            </Text>
          </View>
        )}
        {anime.seasons && (
          <View style={[styles.detalheItem,{backgroundColor: colors.inputBackground,flexDirection: 'row', justifyContent: 'space-between',flexShrink: 1}]}>
            <Text style={[styles.detalheLabel, { color: colors.text }]}>Episódios:</Text>
            <Text style={[styles.detalheValor, { color: colors.text, flexShrink: 1, marginStart: 10}]}>
              {(() => {
                if (!anime.seasons || anime.seasons.trim() === '') {
                  return 'N/A';
                }

                try {
                  const parsedSeasons = JSON.parse(anime.seasons);

                  if (Array.isArray(parsedSeasons) && parsedSeasons.length > 0) {
                    return parsedSeasons.join(', ');
                  } else if (Array.isArray(parsedSeasons) && parsedSeasons.length === 0) {
                    return 'Nenhum';
                  } else {
                    return 'Formato inválido';
                  }
                } catch (e) {
                  console.error("Erro ao processar seasons:", e, anime.seasons);
                  return 'Erro';
                }
              })()}
            </Text>
          </View>
        )}
        {anime.observacao && (
          <View style={[styles.detalheItem,{backgroundColor: colors.inputBackground}]}>
            <Text style={[styles.detalheLabel, { color: colors.text }]}>Obs: </Text>
            <Text style={[styles.detalheValor, { color: colors.text, flex: 1, flexWrap: 'wrap' }]}>{anime.observacao}</Text>
          </View>
        )}
      </View>

      <View style={[styles.animeAcoes, { borderTopColor: colors.borderColor, backgroundColor: colors.inputBackground }]}>
        <ButtonTT
          title="Assistir"
          onPress={() => abrirLink(anime.link)}
          color={colors.info}
        />
        <ButtonTT
          title="Sobre"
          onPress={() => abrirLink("https://myanimelist.net/search/all?q=" + anime.nome)}
          color={colors.info}
        />
        <ButtonTT
          title="Editar"
          onPress={() => editarAnime(anime)}
          color={colors.info}
        />

        <ButtonTT
          title="X"
          onLongPress={() => confirmarExclusao(anime.id)}
          color="error"
        />
      </View>
    </View>
  );
};
// --- Fim do componente AnimeItem ---


export default function MeusAnimes() {
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [busca, setBusca] = useState('');
  const [selectedDayFilter, setSelectedDayFilter] = useState<ReleaseDay | 'todos' | null>(null);

  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  const dayOrder: { [key: string]: number } = {
    'domingo': 0,
    'segunda': 1,
    'terça': 2,
    'quarta': 3,
    'quinta': 4,
    'sexta': 5,
    'sábado': 6,
  };

  const daysOfWeek: { label: string; value: ReleaseDay | 'todos' }[] = [
    { label: 'Todos', value: 'todos' },
    { label: 'Dom', value: 'domingo' },
    { label: 'Seg', value: 'segunda' },
    { label: 'Ter', value: 'terça' },
    { label: 'Qua', value: 'quarta' },
    { label: 'Qui', value: 'quinta' },
    { label: 'Sex', value: 'sexta' },
    { label: 'Sáb', value: 'sábado' },
  ];

  async function carregarAnimes() {
    try {
      const resultado = await buscarAnimes() as Anime[];
      setAnimes(resultado);
    } catch (error) {
      console.error('Erro ao carregar animes:', error);
      Alert.alert('Erro', 'Não foi possível carregar os animes');
    }
  }

  useFocusEffect(
    useCallback(() => {
      carregarAnimes();
    }, [])
  );

  const confirmarExclusao = useCallback(async (id: number) => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir este anime?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletarAnime(id);
              await carregarAnimes();
              Alert.alert('Sucesso', 'Anime excluído com sucesso!');
            } catch (error) {
              console.error('Erro ao excluir anime:', error);
              Alert.alert('Erro', 'Não foi possível excluir o anime');
            }
          }
        }
      ]
    );
  }, []); // Adicionado useCallback para estabilizar a função

  const editarAnime = useCallback((anime: Anime) => {
    router.push({
      pathname: '/input',
      params: {
        id: anime.id,
        nome: anime.nome,
        status: anime.status,
        release_day: anime.release_day,
        observacao: anime.observacao,
        link: anime.link,
        seasons: anime.seasons,
      }
    });
  }, [router]); // Adicionado useCallback para estabilizar a função

  const abrirLink = useCallback((url: string | null) => {
    if (url) {
      const prefixedUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
      Linking.openURL(prefixedUrl).catch((err) =>
        Alert.alert('Erro', `Não foi possível abrir o link: ${err.message}`)
      );
    } else {
      Alert.alert('Erro', 'Nenhum link fornecido para este anime.');
    }
  }, []); // Adicionado useCallback para estabilizar a função

  const animesFiltrados = React.useMemo(() => {
    let listaFiltrada = [...animes];

    if (busca) {
      const termoBuscaLower = busca.toLowerCase();
      listaFiltrada = listaFiltrada.filter(anime => {
        return (
          anime.nome.toLowerCase().includes(termoBuscaLower) ||
          anime.status.toLowerCase().includes(termoBuscaLower) ||
          (anime.observacao && anime.observacao.toLowerCase().includes(termoBuscaLower)) ||
          (anime.seasons && anime.seasons.toLowerCase().includes(termoBuscaLower)) ||
          (anime.link && anime.link.toLowerCase().includes(termoBuscaLower)) ||
          (anime.release_day && anime.release_day.toLowerCase().includes(termoBuscaLower))
        );
      });
      listaFiltrada.sort((a, b) => a.id - b.id);
    } else {
      if (selectedDayFilter === 'todos') {
        listaFiltrada.sort((a, b) => b.id - a.id);
      } else if (selectedDayFilter) {
        listaFiltrada = listaFiltrada.filter(
          (anime) => anime.status === 'assistindo' && anime.release_day === selectedDayFilter
        );
        listaFiltrada.sort((a, b) => b.id - a.id);
      } else {
        listaFiltrada = listaFiltrada.filter((anime) => anime.status === 'assistindo');
        listaFiltrada.sort((a, b) => {
          if (a.release_day === null && b.release_day !== null) return 1;
          if (a.release_day !== null && b.release_day === null) return -1;
          if (a.release_day === null && b.release_day === null) return b.id - a.id;
          
          const orderA = dayOrder[a.release_day as ReleaseDay];
          const orderB = dayOrder[b.release_day as ReleaseDay];

          if (orderA !== orderB) {
            return orderA - orderB;
          } else {
            return b.id - a.id;
          }
        });
      }
    }
    return listaFiltrada;
  }, [animes, busca, selectedDayFilter, dayOrder]);


  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.buscaContainer, { borderColor: colors.tabIconDefault, backgroundColor: colors.inputBackground }]}>
        <TextInput
          style={[
            styles.buscaInput,
            {
              color: colors.text,
              backgroundColor: colors.background,
              borderColor: colors.borderColor
            }
          ]}
          placeholder="Buscar animes..."
          placeholderTextColor={"gray"}
          value={busca}
          onChangeText={(text) => {
            setBusca(text);
            if (text) setSelectedDayFilter(null);
          }}
        />
      </View>

      {!busca && (
        <View style={[styles.dayFilterContainer,{backgroundColor: colors.background}]}>
          <FlatList // Usando FlatList para os botões de filtro de dia horizontalmente
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayFilterScrollViewContent}
            data={daysOfWeek}
            keyExtractor={(item) => item.value}
            renderItem={({ item: day }) => (
              <TouchableOpacity
                key={day.value}
                style={[
                  styles.dayFilterButton,
                  {
                    backgroundColor: selectedDayFilter === day.value ? colors.tint : colors.inputBackground,
                    borderColor: selectedDayFilter === day.value ? colors.tint : colors.borderColor,
                  },
                ]}
                onPress={() => setSelectedDayFilter(day.value === selectedDayFilter ? null : day.value)}
              >
                <Text style={[
                  styles.dayFilterButtonText,
                  { color: selectedDayFilter === day.value ? colors.background : colors.text },
                ]}>
                  {day.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <FlatList // <--- SUBSTITUINDO SCROLLVIEW POR FLATLIST AQUI ---
        style={styles.flatList} // Use um estilo adequado para a FlatList
        contentContainerStyle={styles.flatListContentContainer} // Para padding e margin do conteúdo
        data={animesFiltrados}
        keyExtractor={(item) => String(item.id)} // Garante uma chave única e estável para a virtualização
        renderItem={({ item }) => (
          <AnimeItem
            anime={item}
            colors={colors}
            abrirLink={abrirLink}
            editarAnime={editarAnime}
            confirmarExclusao={confirmarExclusao}
          />
        )}
        ListEmptyComponent={() => ( // Componente exibido quando a lista está vazia
          <Text style={[styles.noAnimesText, { color: colors.text }]}>Nenhum anime encontrado.</Text>
        )}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        // Opcional: Adicionar props de performance se necessário (descomente para testar)
        // initialNumToRender={10}
        // maxToRenderPerBatch={5}
        // windowSize={21}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
  },
  buscaContainer: {
    marginTop: 10,
    borderRadius: 12,
    borderTopWidth: 0,
    borderBottomWidth: 0,
    padding: 10,
    margin: 10,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buscaInput: {
    height: 50,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  dayFilterContainer: {
    marginHorizontal: 0,
    marginTop: 10,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayFilterScrollViewContent: { // Renomeado para flatListContentContainerDayFilter para ser mais específico
    paddingHorizontal: 5,
  },
  dayFilterButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 4,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayFilterButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  flatList: { // Estilo para a FlatList principal
    flex: 1,
  },
  flatListContentContainer: { // Estilo para o conteúdo dentro da FlatList
    padding: 20,
    paddingTop: 15,
  },
  animeContainer: {
    borderRadius: 12,
    marginBottom: 25,
    overflow: 'hidden',
  },
  animeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  animeInfoPrincipal: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  animeNome: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
    flexShrink: 1,
  },
  animeStatus: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  animeDetalhes: {
    padding: 15,
    borderTopWidth: 1,
  },
  detalheItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detalheLabel: {
    fontSize: 14,
    opacity: 0.8,
  },
  detalheValor: {
    fontSize: 14,
    fontWeight: '500',
  },
  linkButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    flexShrink: 1,
  },
  linkText: {
    textDecorationLine: 'underline',
  },
  animeAcoes: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 15,
    borderTopWidth: 1,
  },
  spacer: {
    width: 10,
  },
  noAnimesText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
});