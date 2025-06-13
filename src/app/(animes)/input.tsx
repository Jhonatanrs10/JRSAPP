import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  KeyboardAvoidingView, // Importar KeyboardAvoidingView
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

// --- IMPORTAÇÃO DO NOVO COMPONENTE E SUA INTERFACE DE REF ---
import DynamicSeasonInput from '../../components/Jhonatanrs/DynamicSeasonInput';
import type { DynamicSeasonInputRef } from '../../components/Jhonatanrs/DynamicSeasonInput'; // Importa a interface da ref

// Tipos para os dados do anime
type StatusAnime = 'assistindo' | 'já assistido';
type ReleaseDay = 'segunda' | 'terça' | 'quarta' | 'quinta' | 'sexta' | 'sábado' | 'domingo';

// Interface para a estrutura de um objeto Anime
interface Anime {
  id: number;
  nome: string;
  status: StatusAnime;
  release_day: ReleaseDay;
  observacao: string | null;
  link: string | null;
  seasons: string | null; // Armazenado como string JSON, ex: '[12,24,12]'
}

export default function AnimesInput() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // Estados para o formulário de adição/edição de animes
  const [nomeAnime, setNomeAnime] = useState('');
  const [status, setStatus] = useState<StatusAnime>('assistindo');
  const [releaseDay, setReleaseDay] = useState<ReleaseDay>('segunda');
  const [observacao, setObservacao] = useState('');
  const [link, setLink] = useState('');

  // --- NOVOS ESTADOS E REF PARA O COMPONENTE DynamicSeasonInput ---
  const [dynamicSeasonsData, setDynamicSeasonsData] = useState<number[]>([]); // Para armazenar os valores numéricos das temporadas
  const dynamicInputRef = useRef<DynamicSeasonInputRef | null>(null); // Ref tipada corretamente

  const [animeSendoEditado, setAnimeSendoEditado] = useState<Anime | null>(null);

  // Função para limpar todos os campos do formulário e redefinir o estado de edição
  const limparCampos = useCallback(() => {
    setNomeAnime('');
    setStatus('assistindo');
    setReleaseDay('segunda');
    setObservacao('');
    setLink('');
    if (dynamicInputRef.current) {
        dynamicInputRef.current.clearAllSeasons(); // Chama o método para limpar no componente filho
    }
    setDynamicSeasonsData([]); // Limpa o estado local de temporadas
    setAnimeSendoEditado(null);
    router.setParams({});
  }, [router]);

  // Efeito para carregar dados quando houver params.id (modo de edição)
  useEffect(() => {
    if (params.id) {
      console.log('Carregando valores iniciais para edição:', params);

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
            // --- CARREGA OS VALORES DE SEASONS PARA O COMPONENTE DynamicSeasonInput ---
            if (foundAnime.seasons) {
              try {
                const parsedSeasons = JSON.parse(foundAnime.seasons);
                if (dynamicInputRef.current && parsedSeasons instanceof Array) {
                  dynamicInputRef.current.setInitialSeasons(parsedSeasons);
                  // REMOVIDO: setDynamicSeasonsData(parsedSeasons); // <-- Esta linha era redundante
                } else {
                    setDynamicSeasonsData([]); // Limpa se for inválido ou não um array
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

  // Função assíncrona para salvar um novo anime ou atualizar um existente
  async function salvarOuAtualizarAnime() {
    if (!nomeAnime || !status) {
      Alert.alert('Erro', 'Nome do anime e status são obrigatórios.');
      return;
    }

    // --- OBTER OS DADOS DAS TEMPORADAS DO COMPONENTE FILHO ---
    const seasonsToSave = dynamicInputRef.current?.getFilledSeasons();
    // A função getFilledSeasons já retorna um number[], então não precisa de Object.values
    const seasonsArray = seasonsToSave || [];
    const seasonsJsonString = JSON.stringify(seasonsArray);

    try {
      const dadosAnime: Omit<Anime, 'id'> = {
        nome: nomeAnime,
        status: status,
        release_day: releaseDay,
        observacao: observacao,
        link: link,
        seasons: seasonsJsonString, // Salva o JSON string
      };

      if (animeSendoEditado) {
        await atualizarAnime({ ...dadosAnime, id: animeSendoEditado.id } as Anime);
        Alert.alert('Sucesso', 'Anime atualizado com sucesso!');
      } else {
        await salvarAnime(dadosAnime);
        Alert.alert('Sucesso', 'Anime salvo com sucesso!');
      }

      limparCampos();
      router.push('/input'); // Volta para a tela de input após salvar
    } catch (error) {
      console.error('Erro ao salvar/atualizar anime:', error);
      Alert.alert('Erro', 'Não foi possível salvar/atualizar o anime');
    }
  }

  const abrirLink = (url: string | null) => {
    if (url) {
      const prefixedUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
      Linking.openURL(prefixedUrl).catch((err) =>
        Alert.alert('Erro', `Não foi possível abrir o link: ${err.message || err}`)
      );
    } else {
      Alert.alert('Erro', 'Nenhum link fornecido para este anime.');
    }
  };

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
    // --- KEYBOARDAVOIDINGVIEW ENVOLVENDO O CONTEÚDO PRINCIPAL ---
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0} // Ajuste conforme necessário
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
        keyboardShouldPersistTaps="handled" // Importante para que toques fora dos inputs não fechem o teclado
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
            style={{color: 'red'}}
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
              style={[styles.buttonInInput,{height: 50, backgroundColor: colors.inputBackground}]}
            >
              <FontAwesome name="paste" size={20} color={colors.info} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <DynamicSeasonInput
            ref={dynamicInputRef} // Passa a ref para o componente filho
            onChange={setDynamicSeasonsData} // Recebe as mudanças de estado do componente filho
            // --- APLIQUE SEUS ESTILOS AQUI ---
          style={{
            backgroundColor: colors.background,
          }}
          seasonContainerStyle={{
            backgroundColor: colors.background,
            borderColor: colors.borderColor, // Adicionado para combinar com o tema
          }}
          labelStyle={{
            backgroundColor: colors.background,
            color: colors.text
          }}
          textInputStyle={{
            backgroundColor: colors.inputBackground,
            color: colors.text,
            borderColor: colors.borderColor, // Adicionado para combinar com o tema
          }}
          />
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        {params.id && (
          <ButtonTT
            title="Cancelar Edição"
            onPress={() => {
              limparCampos();
              router.push('/input');
            }}
            color={colors.error}
          />
        )}
        <View style={styles.spacer} />
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
    flex: 1, // Isso é crucial para o ScrollView funcionar bem dentro do KeyboardAvoidingView
    marginBottom: 30, // Remova este ou ajuste cuidadosamente, pois o KAV lida com o espaçamento
  },
  formContent: {
    paddingBottom: 20, // Garante que o último input não fique colado na parte inferior
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
    minHeight: 50,
    paddingHorizontal: 15,
    textAlignVertical: 'auto',
  },
  linkInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
    borderRadius: 0,
    overflow: 'hidden',
    height: 50
  },
  linkTextInput: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
  },
  linkButton: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  buttonContainer: {
     flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10, // Espaço entre o ScrollView e os botões
    marginBottom: 0,

  },
  spacer: {
    width: 10,
  },
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
    height: 40,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
    buttonInInput: {
    padding: 10,
    fontSize: 12,
    justifyContent: 'center',
    alignItems: 'center'
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