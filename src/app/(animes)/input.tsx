import { useTranslation } from 'react-i18next';
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
  Keyboard,
} from 'react-native';
import { Text, View } from '../../components/Themed';
import { ThemedInput } from '../../components/ThemedInput';
import { ThemedPicker } from '../../components/ThemedPicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';
import { salvarAnime, buscarAnimes, atualizarAnime } from '../../database/db';
import { FontAwesome } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Clipboard from 'expo-clipboard';
import ButtonTT from '../../components/Jhonatanrs/ButtonTT';
import { ThemedToggle, ToggleOption } from '../../components/ThemedToggle';
import DynamicSeasonInput from '../../components/Jhonatanrs/DynamicSeasonInput';
import type { DynamicSeasonInputRef } from '../../components/Jhonatanrs/DynamicSeasonInput';

type StatusAnime = 'watching' | 'completed' | 'plan_to_watch';
type ReleaseDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

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
  const { t } = useTranslation();

  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [nomeAnime, setNomeAnime] = useState('');
  const [status, setStatus] = useState<StatusAnime>('plan_to_watch');
  const [releaseDay, setReleaseDay] = useState<ReleaseDay>('monday');
  const [observacao, setObservacao] = useState('');
  const [link, setLink] = useState('');

  const [dynamicSeasonsData, setDynamicSeasonsData] = useState<number[]>([]);
  const dynamicInputRef = useRef<DynamicSeasonInputRef | null>(null);

  const [animeSendoEditado, setAnimeSendoEditado] = useState<Anime | null>(null);

  const statusOptions: ToggleOption<StatusAnime>[] = [
    { label: t('status.watching'), value: "watching" },
    { label: t('status.completed'), value: "completed" },
    { label: t('status.plan_to_watch'), value: "plan_to_watch" },
  ];

  const releaseOptions: ToggleOption<ReleaseDay>[] = [
    { label: t('release.sunday_ab'), value: 'sunday' },
    { label: t('release.monday_ab'), value: 'monday' },
    { label: t('release.tuesday_ab'), value: 'tuesday' },
    { label: t('release.wednesday_ab'), value: 'wednesday' },
    { label: t('release.thursday_ab'), value: 'thursday' },
    { label: t('release.friday_ab'), value: 'friday' },
    { label: t('release.saturday_ab'), value: 'saturday' }
  ];

  const limparCampos = useCallback(() => {
    setNomeAnime('');
    setStatus('plan_to_watch');
    setReleaseDay('monday');
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
                console.error("Error when analyzing seasons:", e);
                setDynamicSeasonsData([]);
              }
            } else {
              setDynamicSeasonsData([]);
            }
          } else {
            Alert.alert(t('return.error'), t('return.error_edit_anime'));
            limparCampos();
          }
        } catch (error) {
          console.error('Error loading anime for editing:', error);
          Alert.alert(t('return.error'), t('return.error_load_anime'));
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
      Alert.alert(t('return.warning'), t('return.warning_name_status_anime'));
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
        Alert.alert(t('return.success'), t('return.anime_update'));
      } else {
        await salvarAnime(dadosAnime);
        Alert.alert(t('return.success'), t('return.anime_save'));
      }

      limparCampos();
      router.replace('/input');
    } catch (error) {
      console.error('Error saving/updating anime:', error);
      Alert.alert(t('return.error'), t('return.error_save_edit'));
    }
  }

  const handlePasteLink = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      if (clipboardContent) {
        setLink(clipboardContent);
        Alert.alert(t('return.success'), t('return.paste_from_cb'));
      } else {
        Alert.alert(t('return.warning'), t('return.cb_empty'));
      }
    } catch (error) {
      console.error('Error pasting from clipboard:', error);
      Alert.alert(t('return.error'), t('return.error_paste_link'));
    }
  };

  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true); // Teclado está visível
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false); // Teclado está oculto
      }
    );

    // Limpeza dos listeners ao desmontar o componente
    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 10} // Este pode ser ajustado para um valor, ex: Header height
    >

      <ScrollView
        style={styles.formContainer}
        contentContainerStyle={styles.formContent}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!isKeyboardVisible}
      >
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>{t('input_anime.name')}</Text>
          <ThemedInput
            value={nomeAnime}
            onChangeText={setNomeAnime}
            placeholder={t('placeholder.name')}
            placeholderTextColor={colors.text}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>{t('input_anime.status')}</Text>
          <ThemedToggle<StatusAnime>
            options={statusOptions}
            selectedValue={status}
            onValueChange={setStatus}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>{t('input_anime.release_day')}</Text>
          <ThemedToggle<ReleaseDay>
            options={releaseOptions}
            selectedValue={releaseDay}
            onValueChange={setReleaseDay}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>{t('input_anime.obs')}</Text>
          <ThemedInput
            value={observacao}
            onChangeText={setObservacao}
            placeholder={t('placeholder.about')}
            placeholderTextColor={colors.text}
            multiline
            numberOfLines={1}
            style={styles.multilineInput}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>{t('input_anime.link')}</Text>
          <View style={styles.linkInputContainer}>
            <ThemedInput
              value={link}
              onChangeText={setLink}
              placeholder={t('placeholder.link')}
              placeholderTextColor={colors.text}
              style={styles.linkTextInput}
            />
            <TouchableOpacity
              onPress={handlePasteLink}
              onLongPress={() => setLink('')}
              style={[styles.buttonInInput, { width: 40, height: 60, backgroundColor: colors.info }]}
            >
              <MaterialIcons name="content-paste" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <DynamicSeasonInput
            ref={dynamicInputRef}
            labelPrefix={t('input_anime.season')}
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
          />
        </View>

      </ScrollView>

      <View style={[styles.separator, { backgroundColor: colors.borderColor }]} />
      <View style={styles.buttonContainer}>
        {params.id && (
          <ButtonTT
            title={t('button.cancel_edit')}
            onPress={() => {
              limparCampos();
              router.replace('/input');
            }}
            color={colors.error}
          />
        )}

        <ButtonTT
          title={t('button.clean')}
          onPress={() => limparCampos()}
          color={colors.info}
        />
        <ButtonTT
          title={params.id ? t('button.save_edit') : t('button.save')}
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
    fontSize: 24,
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
    fontWeight: 'bold',
    marginBottom: 5,
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
  detailValue: { fontSize: 14, fontWeight: 'bold', },
  linkButtonContainer: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, },
  linkText: { textDecorationLine: 'underline', marginRight: 8, },
  linkOpenButton: { padding: 6, borderRadius: 5, justifyContent: 'center', alignItems: 'center', },
  animeActions: { flexDirection: 'row', justifyContent: 'flex-end', padding: 15, borderTopWidth: 1, },
  noAnimesText: { textAlign: 'center', marginTop: 20, fontSize: 16, },
});