import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Text, View } from '../../components/Themed';
import { ThemedInput } from '../../components/ThemedInput';
import { ThemedPicker } from '../../components/ThemedPicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';
import { salvarAnime, buscarAnimes, atualizarAnime } from '../../database/db';
import { FontAwesome } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import ButtonTT from '../../components/Jhonatanrs/ButtonTT';

import DynamicSeasonInput from '../../components/Jhonatanrs/DynamicSeasonInput';
import type { DynamicSeasonInputRef } from '../../components/Jhonatanrs/DynamicSeasonInput';

type StatusAnime = 'assistindo' | 'já assistido';
type ReleaseDay = 'segunda' | 'terça' | 'quarta' | 'quinta' | 'sexta' | 'sábado' | 'domingo';

interface Anime {
  id: number;
  nome: string;
  status: StatusAnime;
  release_day: ReleaseDay;
  observacao: string | null;
  link: string | null;
  seasons: string | null;
}

export default function AnimesInput() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [nomeAnime, setNomeAnime] = useState('');
  const [status, setStatus] = useState<StatusAnime>('assistindo');
  const [releaseDay, setReleaseDay] = useState<ReleaseDay>('segunda');
  const [observacao, setObservacao] = useState('');
  const [link, setLink] = useState('');

  const [dynamicSeasonsData, setDynamicSeasonsData] = useState<number[]>([]);
  const dynamicInputRef = useRef<DynamicSeasonInputRef | null>(null);

  const [animeSendoEditado, setAnimeSendoEditado] = useState<Anime | null>(null);

  const limparCampos = useCallback(() => {
    setNomeAnime('');
    setStatus('assistindo');
    setReleaseDay('segunda');
    setObservacao('');
    setLink('');
    if (dynamicInputRef.current) {
      dynamicInputRef.current.clearAllSeasons();
    }
    setDynamicSeasonsData([]);
    setAnimeSendoEditado(null);
    router.setParams({});
  }, [router]);

  useEffect(() => {
    if (params.id) {
      const loadAnimeForEdit = async () => {
        try {
          const allAnimes = await buscarAnimes() as Anime[];
          const foundAnime = allAnimes.find(a => a.id === Number(params.id));
          if (foundAnime) {
            setAnimeSendoEditado(foundAnime);
            setNomeAnime(foundAnime.nome);
            setStatus(foundAnime.status);
            setReleaseDay(foundAnime.release_day);
            setObservacao(foundAnime.observacao || '');
            setLink(foundAnime.link || '');
            if (foundAnime.seasons) {
              try {
                const parsedSeasons = JSON.parse(foundAnime.seasons);
                if (dynamicInputRef.current && parsedSeasons instanceof Array) {
                  dynamicInputRef.current.setInitialSeasons(parsedSeasons);
                } else {
                  setDynamicSeasonsData([]);
                }
              } catch (e) {
                console.error("Erro ao fazer parse de seasons:", e);
                setDynamicSeasonsData([]);
              }
            } else {
              setDynamicSeasonsData([]);
            }
          } else {
            Alert.alert('Erro', 'Anime não encontrado para edição.');
            limparCampos();
          }
        } catch (error) {
          console.error('Erro ao carregar anime para edição:', error);
          Alert.alert('Erro', 'Não foi possível carregar o anime para edição.');
          limparCampos();
        }
      };
      loadAnimeForEdit();
    } else {
      limparCampos();
    }
  }, [params.id, limparCampos]);

  async function salvarOuAtualizarAnime() {
    if (!nomeAnime || !status) {
      Alert.alert('Erro', 'Nome do anime e status são obrigatórios.');
      return;
    }

    const seasonsToSave = dynamicInputRef.current?.getFilledSeasons();
    const seasonsArray = seasonsToSave || [];
    const seasonsJsonString = JSON.stringify(seasonsArray);

    try {
      const dadosAnime: Omit<Anime, 'id'> = {
        nome: nomeAnime,
        status: status,
        release_day: releaseDay,
        observacao: observacao,
        link: link,
        seasons: seasonsJsonString,
      };

      if (animeSendoEditado) {
        await atualizarAnime({ ...dadosAnime, id: animeSendoEditado.id } as Anime);
        Alert.alert('Sucesso', 'Anime atualizado com sucesso!');
      } else {
        await salvarAnime(dadosAnime);
        Alert.alert('Sucesso', 'Anime salvo com sucesso!');
      }

      limparCampos();
      router.replace('/input');
    } catch (error) {
      console.error('Erro ao salvar/atualizar anime:', error);
      Alert.alert('Erro', 'Não foi possível salvar/atualizar o anime');
    }
  }

  const handlePasteLink = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      if (clipboardContent) {
        setLink(clipboardContent);
        Alert.alert('Sucesso', 'Link colado da área de transferência!');
      } else {
        Alert.alert('Aviso', 'A área de transferência está vazia.');
      }
    } catch (error) {
      console.error('Erro ao colar do clipboard:', error);
      Alert.alert('Erro', 'Não foi possível colar o link.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      //keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 1} // Este pode ser ajustado para um valor, ex: Header height
    >
      <Text style={[styles.title, { color: colors.text }]}>
        {animeSendoEditado ? `Editar Anime (${animeSendoEditado.id})` : 'Novo Anime'}
      </Text>
      <View style={[styles.separator, { backgroundColor: colors.borderColor }]} />

      <ScrollView
        style={styles.formContainer}
        contentContainerStyle={styles.formContent}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Nome do Anime</Text>
          <ThemedInput
            value={nomeAnime}
            onChangeText={setNomeAnime}
            placeholder="Ex: One Piece"
            placeholderTextColor={colors.text}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Status</Text>
          <ThemedPicker
            selectedValue={status}
            onValueChange={(itemValue) => setStatus(itemValue as StatusAnime)}
          >
            <ThemedPicker.Item label="Assistindo" value="assistindo" />
            <ThemedPicker.Item label="Já Assistido" value="já assistido" />
          </ThemedPicker>
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Dia de Lançamento</Text>
          <ThemedPicker
            style={{ color: colors.text }} // Use colors.text para consistência
            selectedValue={releaseDay}
            onValueChange={(itemValue) => setReleaseDay(itemValue as ReleaseDay)}
          >
            <ThemedPicker.Item label="Segunda" value="segunda" />
            <ThemedPicker.Item label="Terça" value="terça" />
            <ThemedPicker.Item label="Quarta" value="quarta" />
            <ThemedPicker.Item label="Quinta" value="quinta" />
            <ThemedPicker.Item label="Sexta" value="sexta" />
            <ThemedPicker.Item label="Sábado" value="sábado" />
            <ThemedPicker.Item label="Domingo" value="domingo" />
          </ThemedPicker>
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Observação</Text>
          <ThemedInput
            value={observacao}
            onChangeText={setObservacao}
            placeholder="Notas sobre o anime..."
            placeholderTextColor={colors.text}
            multiline
            numberOfLines={1}
            style={styles.multilineInput}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Link</Text>
          <View style={styles.linkInputContainer}>
            <ThemedInput
              value={link}
              onChangeText={setLink}
              placeholder="Cole o link aqui (ex: crunchyroll.com/anime)"
              placeholderTextColor={colors.text}
              style={styles.linkTextInput}
            />
            <TouchableOpacity
              onPress={handlePasteLink}
              onLongPress={() => setLink('')}
              style={[styles.buttonInInput, { height: 60, backgroundColor: colors.inputBackground }]}
            >
              <FontAwesome name="paste" size={20} color={colors.info} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <DynamicSeasonInput
            ref={dynamicInputRef}
            onChange={setDynamicSeasonsData}
            style={{
              backgroundColor: colors.background,
            }}
            seasonContainerStyle={{
              backgroundColor: colors.background,
              borderColor: colors.borderColor,
            }}
            labelStyle={{
              backgroundColor: colors.background,
              color: colors.text
            }}
            textInputStyle={{
              backgroundColor: colors.inputBackground,
              color: colors.text,
              borderColor: colors.borderColor,
            }}
          />
        </View>

      </ScrollView>

      <View style={[styles.separator, { backgroundColor: colors.borderColor }]} />
      <View style={styles.buttonContainer}>
        {params.id && (
          <ButtonTT
            title="Cancelar Edição"
            onPress={() => {
              limparCampos();
              router.replace('/input');
            }}
            color={colors.error}
          />
        )}

        <ButtonTT
          title={"Limpar"}
          onPress={() => limparCampos()}
          color={colors.info}
        />
        <ButtonTT
          title={params.id ? "Salvar Alterações" : "Salvar"}
          onPress={salvarOuAtualizarAnime}
          color={colors.success}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  separator: {
    height: 1,
    marginVertical: 10,
  },
  formContainer: {
    flex: 1,
    // Remover marginBottom aqui para que o ScrollView ocupe todo o espaço disponível
    // e o KeyboardAvoidingView lide com o ajuste inferior.
  },
  formContent: {
    paddingBottom: 20,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  multilineInput: {
    minHeight: 60,
    paddingHorizontal: 15,
    textAlignVertical: 'auto',
  },
  linkInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
    borderRadius: 0,
    overflow: 'hidden',
    height: 60
  },
  linkTextInput: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
  },
  linkButton: { // Este estilo não está sendo usado no seu código atual
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  buttonInInput: {
    padding: 10,
    fontSize: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  buttonContainer: {
    //backgroundColor: 'red',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 0,
  },
  spacer: {
    width: 10,
  },
  // Estes estilos parecem ser de outro componente e não são usados aqui
  buscaContainer: {
    marginBottom: 15,
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buscaInput: {
    height: 60,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  scrollView: { // Este estilo não está sendo usado no seu ScrollView principal, mas em outro lugar?
    flex: 1,
  },
  animeItem: { borderRadius: 12, marginBottom: 15, overflow: 'hidden', borderWidth: 1, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, },
  animeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, },
  animeInfoPrincipal: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', },
  animeName: { fontSize: 18, fontWeight: 'bold', flexShrink: 1, marginRight: 10, },
  animeStatus: { fontSize: 14, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, overflow: 'hidden', },
  animeDetails: { padding: 15, borderTopWidth: 1, },
  detailItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, },
  detailLabel: { fontSize: 14, opacity: 0.8, },
  detailValue: { fontSize: 14, fontWeight: '500', },
  linkButtonContainer: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, },
  linkText: { textDecorationLine: 'underline', marginRight: 8, },
  linkOpenButton: { padding: 6, borderRadius: 5, justifyContent: 'center', alignItems: 'center', },
  animeActions: { flexDirection: 'row', justifyContent: 'flex-end', padding: 15, borderTopWidth: 1, },
  noAnimesText: { textAlign: 'center', marginTop: 20, fontSize: 16, },
});