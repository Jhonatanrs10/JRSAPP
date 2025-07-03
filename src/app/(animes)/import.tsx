import { useState, useEffect, useCallback } from 'react'; // Importar useEffect e useCallback
import ButtonTT from '../../components/Jhonatanrs/ButtonTT';
import { Button, Alert, StyleSheet, Share, Platform, ActivityIndicator } from 'react-native'; // Adicionado ActivityIndicator
import { Text, View } from '../../components/Themed';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { salvarAnime, buscarAnimes, recriarTabelaAnimes } from '../../database/db';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';
import { useFocusEffect } from '@react-navigation/native'; // Para recarregar dados ao focar na tela

type StatusAnime = 'assistindo' | 'já assistido';
type ReleaseDay = 'segunda' | 'terça' | 'quarta' | 'quinta' | 'sexta' | 'sábado' | 'domingo';

interface Anime {
  id: number;
  nome: string;
  status: StatusAnime;
  release_day: ReleaseDay;
  observacao: string | null;
  link: string | null;
  seasons: string | null; // Guardado como string ex: "[25,12,10]"
}

export default function Import() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [importando, setImportando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [animesCarregados, setAnimesCarregados] = useState<Anime[]>([]); // Estado para armazenar todos os animes
  const [carregandoDados, setCarregandoDados] = useState(true); // Estado para o spinner de carregamento

  // --- Cálculos das Estatísticas ---
  const totalAnimes = animesCarregados.length;
  const animesAssistindo = animesCarregados.filter(anime => anime.status === 'assistindo').length;
  const animesJaAssistidos = animesCarregados.filter(anime => anime.status === 'já assistido').length;

  const calcularTotalHoras = useCallback(() => {
    let totalEpisodios = 0;
    animesCarregados.forEach(anime => {
      if (anime.seasons) {
        try {
          const seasonsArray: number[] = JSON.parse(anime.seasons);
          totalEpisodios += seasonsArray.reduce((sum, num) => sum + num, 0);
        } catch (e) {
          console.warn(`Erro ao parsear seasons para ${anime.nome}:`, anime.seasons, e);
        }
      }
    });

    const minutosPorEpisodio = 20; // 20 minutos por episódio
    const totalMinutos = totalEpisodios * minutosPorEpisodio;
    const totalHoras = Math.floor(totalMinutos / 60);
    const minutosRestantes = totalMinutos % 60;

    return `${totalHoras}h ${minutosRestantes}min`;
  }, [animesCarregados]); // Recalcula quando animesCarregados muda

  // --- Carregar Animes ao Focar na Tela ---
  const carregarDadosAnimes = useCallback(async () => {
    setCarregandoDados(true);
    try {
      const animes = await buscarAnimes() as Anime[];
      setAnimesCarregados(animes);
    } catch (error) {
      console.error('Erro ao carregar animes para estatísticas:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados dos animes para estatísticas.');
    } finally {
      setCarregandoDados(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregarDadosAnimes();
    }, [carregarDadosAnimes])
  );


  // --- Exportar Animes ---
  async function exportarAnimes() {
    try {
      setExportando(true);
      // Usar animesCarregados para evitar nova busca no DB
      const animes = animesCarregados;

      animes.sort((a, b) => a.id - b.id);

      const cabecalho = 'Nome;Status;Lançamento;Observação;Link;Temporadas\n';

      const linhas = animes.map(a => {
        const escapeAndQuote = (value: string | number | null): string => {
          if (value === null || value === undefined) return '';
          const str = String(value);
          if (str.includes(';') || str.includes('"') || str.includes('\n') || str.startsWith(' ') || str.endsWith(' ')) {
            const escapedStr = str.replace(/"/g, '""');
            return `"${escapedStr}"`;
          }
          return str;
        };

        return `${escapeAndQuote(a.nome)};${escapeAndQuote(a.status)};${escapeAndQuote(a.release_day)};${escapeAndQuote(a.observacao)};${escapeAndQuote(a.link)};${escapeAndQuote(a.seasons)}`;
      });

      const conteudo = cabecalho + linhas.join('\n');
      const dataAtual = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      const nomeArquivo = `animes_${dataAtual}.txt`;

      const fileUri = FileSystem.cacheDirectory + nomeArquivo;

      await FileSystem.writeAsStringAsync(fileUri, conteudo, { encoding: FileSystem.EncodingType.UTF8 });

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Erro', 'O compartilhamento de arquivos não está disponível nesta plataforma.');
        return;
      }

      await Sharing.shareAsync(fileUri, {
        UTI: 'public.plain-text',
        mimeType: 'text/plain',
        dialogTitle: 'Salvar Animes',
      });

      Alert.alert('Sucesso', 'Arquivo de animes gerado e pronto para ser salvo!');

    } catch (error: unknown) {
      console.error('Erro ao exportar animes:', error);
      let errorMessage = 'Não foi possível exportar os animes.';
      if (error instanceof Error) {
        errorMessage = `Não foi possível exportar os animes: ${error.message}`;
      }
      Alert.alert('Erro', errorMessage);
    } finally {
      setExportando(false);
    }
  }

  // --- Importar Animes ---
  async function importarAnimes() {
    try {
      setImportando(true);

      const resultado = await DocumentPicker.getDocumentAsync({
        type: 'text/plain',
        copyToCacheDirectory: true
      });

      if (resultado.canceled) {
        return;
      }

      const arquivo = resultado.assets[0];
      const conteudo = await FileSystem.readAsStringAsync(arquivo.uri);
      const linhas = conteudo.split('\n');

      if (linhas.length === 0) {
        Alert.alert('Erro', 'O arquivo está vazio.');
        return;
      }

      const cabecalhoLinha = linhas[0].trim();
      const cabecalho = cabecalhoLinha.split(';').map(h => h.trim());

      const camposEsperados = ['Nome', 'Status', 'Lançamento', 'Observação', 'Link', 'Temporadas'];
      const camposValidos = camposEsperados.every(campo => cabecalho.includes(campo));

      if (!camposValidos) {
        Alert.alert('Erro', 'Formato de arquivo inválido. Verifique se o arquivo tem o cabeçalho correto com os campos essenciais: Nome, Status, Lançamento, Observação, Link, Temporadas (separado por ponto e vírgula).');
        return;
      }

      let importadas = 0;
      let erros = 0;
      const linhasComErro: string[] = [];

      function parseCsvLine(line: string): string[] {
        const result: string[] = [];
        let inQuote = false;
        let currentField = '';

        for (let i = 0; i < line.length; i++) {
          const char = line[i];

          if (char === '"') {
            if (!inQuote) {
              inQuote = true;
            } else {
              if (i + 1 < line.length && line[i + 1] === '"') {
                currentField += '"';
                i++;
              } else {
                inQuote = false;
              }
            }
          } else if (char === ';' && !inQuote) {
            result.push(currentField);
            currentField = '';
          } else {
            currentField += char;
          }
        }
        result.push(currentField);
        return result.map(field => field.trim());
      }

      for (let i = 1; i < linhas.length; i++) {
        if (!linhas[i].trim()) continue;

        const valores = parseCsvLine(linhas[i]);

        const indices = camposEsperados.map(campo => cabecalho.indexOf(campo));
        const todosIndicesValidos = indices.every(index => index !== -1 && index < valores.length);

        if (!todosIndicesValidos) {
          console.log('Linha ignorada - campos essenciais faltando ou número incorreto de colunas:', linhas[i]);
          let detail = 'Campos essenciais faltando ou número incorreto de colunas.';
          linhasComErro.push(`Linha ${i + 1}: "${linhas[i].substring(0, Math.min(linhas[i].length, 50))}..." - ${detail}`);
          erros++;
          continue;
        }

        try {
          const rawStatus = valores[cabecalho.indexOf('Status')];
          const statusValues: StatusAnime[] = ['assistindo', 'já assistido'];
          if (!statusValues.includes(rawStatus as StatusAnime)) {
            throw new Error(`Status inválido: "${rawStatus}"`);
          }
          const status: StatusAnime = rawStatus as StatusAnime;

          const rawReleaseDay = valores[cabecalho.indexOf('Lançamento')];
          const releaseDayValues: ReleaseDay[] = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
          if (!releaseDayValues.includes(rawReleaseDay as ReleaseDay)) {
            throw new Error(`Dia de lançamento inválido: "${rawReleaseDay}"`);
          }
          const release_day: ReleaseDay = rawReleaseDay as ReleaseDay;

          const nome = valores[cabecalho.indexOf('Nome')];
          if (!nome) throw new Error('Nome do anime não pode ser vazio.');

          const observacao = valores[cabecalho.indexOf('Observação')] || null;
          const link = valores[cabecalho.indexOf('Link')] || null;
          const seasons = valores[cabecalho.indexOf('Temporadas')] || null;

          const dadosAnime: Omit<Anime, 'id'> = {
            nome: nome,
            status: status,
            release_day: release_day,
            observacao: observacao,
            link: link,
            seasons: seasons,
          };

          await salvarAnime(dadosAnime);
          importadas++;
        } catch (error: unknown) {
          console.error('Erro ao importar anime:', error, 'Linha:', linhas[i]);
          let detail = '';
          if (error instanceof Error) {
            detail = `: ${error.message}`;
          } else if (typeof error === 'string') {
            detail = `: ${error}`;
          }
          linhasComErro.push(`Linha ${i + 1}: "${linhas[i].substring(0, Math.min(linhas[i].length, 50))}..." - Erro${detail}`);
          erros++;
        }
      }

      let mensagemFinal = `Importação de Animes Concluída.\nImportadas: ${importadas}\nErros: ${erros}`;
      if (erros > 0) {
        mensagemFinal += '\n\nDetalhes dos erros (primeiros 5):';
        linhasComErro.slice(0, 5).forEach(msg => mensagemFinal += `\n- ${msg}`);
        if (erros > 5) {
          mensagemFinal += '\n... e mais erros. Verifique o console para detalhes completos.';
        }
      }

      Alert.alert(
        'Importação de Animes Concluída',
        mensagemFinal,
        // Ao fechar o alerta, recarregar os dados para atualizar as estatísticas
        [{ text: 'OK', onPress: carregarDadosAnimes }]
      );

    } catch (error: unknown) {
      console.error('Erro geral ao importar animes:', error);
      let errorMessage = 'Não foi possível importar os animes. Verifique se o arquivo está no formato correto (separado por ponto e vírgula).';
      if (error instanceof Error) {
        errorMessage += `\nDetalhes: ${error.message}`;
      }
      Alert.alert('Erro', errorMessage);
    } finally {
      setImportando(false);
    }
  }

  async function importarDadosTesteAnimes() {
    try {
      setImportando(true);
      let importadas = 0;
      let erros = 0;

      const dadosTeste: Omit<Anime, 'id'>[] = [
        {
          nome: "Attack on Titan",
          status: "já assistido",
          release_day: "domingo",
          observacao: "Anime incrível, reviravoltas chocantes.",
          link: "https://myanimelist.net/anime/16498/Shingeki_no_Kyojin",
          seasons: "[25,12,10,16,12]"
        },
        {
          nome: "Jujutsu Kaisen",
          status: "assistindo",
          release_day: "quinta",
          observacao: "Animação fantástica e lutas intensas.",
          link: "https://myanimelist.net/anime/40748/Jujutsu_Kaisen",
          seasons: "[24,23]"
        },
        {
          nome: "Spy x Family",
          status: "assistindo",
          release_day: "sábado",
          observacao: "Muito divertido e com personagens carismáticos.",
          link: "https://myanimelist.net/anime/50265/Spy_x_Family",
          seasons: "[25,13]"
        },
        {
          nome: "Frieren: Beyond Journey's End",
          status: "assistindo",
          release_day: "sexta",
          observacao: "Uma jornada emocionante e reflexiva. Linda animação.",
          link: "https://myanimelist.net/anime/52991/Sousou_no_Frieren",
          seasons: "[28]"
        },
        {
          nome: "Solo Leveling",
          status: "assistindo",
          release_day: "sábado",
          observacao: "Adaptação do webtoon, muito hype!",
          link: "https://myanimelist.net/anime/55026/Solo_Leveling",
          seasons: "[12]"
        },
        {
          nome: "Chainsaw Man",
          status: "já assistido",
          release_day: "terça",
          observacao: "Violento e único, estilo de arte marcante.",
          link: "https://myanimelist.net/anime/49378/Chainsaw_Man",
          seasons: "[12]"
        }
      ];

      for (const anime of dadosTeste) {
        try {
          await salvarAnime(anime);
          importadas++;
        } catch (error: unknown) {
          console.error('Erro ao importar anime de teste:', error);
          let errorMessage = 'Erro ao importar anime de teste.';
          if (error instanceof Error) {
            errorMessage += `\nDetalhes: ${error.message}`;
          }
          erros++;
        }
      }

      Alert.alert(
        'Importação de Dados de Teste de Animes Concluída',
        `Importadas: ${importadas}\nErros: ${erros}`,
        // Ao fechar o alerta, recarregar os dados para atualizar as estatísticas
        [{ text: 'OK', onPress: carregarDadosAnimes }]
      );
    } catch (error: unknown) {
      console.error('Erro ao importar dados de teste de animes:', error);
      let errorMessage = 'Não foi possível importar os dados de teste de animes.';
      if (error instanceof Error) {
        errorMessage += `\nDetalhes: ${error.message}`;
      }
      Alert.alert('Erro', errorMessage);
    } finally {
      setImportando(false);
    }
  }

  async function limparBancoDadosAnimes() {
    Alert.alert(
      'Limpar Banco de Dados',
      'Tem certeza que deseja limpar todo o banco de dados de animes? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            try {
              setImportando(true);
              const sucesso = await recriarTabelaAnimes();
              if (sucesso) {
                Alert.alert(
                  'Sucesso',
                  'Banco de dados de animes limpo com sucesso',
                  // Recarregar dados após limpar o DB
                  [{ text: 'OK', onPress: carregarDadosAnimes }]
                );
              } else {
                Alert.alert('Erro', 'Não foi possível limpar o banco de dados de animes');
              }
            } catch (error: unknown) {
              console.error('Erro ao limpar banco de dados de animes:', error);
              let errorMessage = 'Ocorreu um erro ao limpar o banco de dados de animes.';
              if (error instanceof Error) {
                errorMessage += `\nDetalhes: ${error.message}`;
              }
              Alert.alert('Erro', errorMessage);
            } finally {
              setImportando(false);
            }
          }
        }
      ]
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Ferramentas</Text>
      <View style={[styles.separator, { backgroundColor: colors.borderColor }]} />

      <ButtonTT
        buttonStyle={{ marginVertical: 5 }}
        title="Importar CSV"
        onPress={importarAnimes}
        disabled={importando}
        color={colors.info}
      />
      <View style={styles.spacer} />
      <ButtonTT
        buttonStyle={{ marginVertical: 5 }}
        title="Exportar CSV"
        onPress={exportarAnimes}
        disabled={exportando}
        color={colors.success}
      />

      <Text style={[styles.subtitle, { color: colors.text }]}>Estatísticas dos Animes</Text>
      <View style={[styles.statsContainer, { backgroundColor: colors.inputBackground, borderColor: colors.borderColor }]}>
        {carregandoDados ? (
          <ActivityIndicator size="large" color={colors.tint} />
        ) : (
          <>
            <View style={[styles.statItem, { backgroundColor: colors.inputBackground }]}>
              <Text style={[styles.statLabel, { color: colors.text }]}>Total de Animes:</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{totalAnimes}</Text>
            </View>
            <View style={[styles.statItem, { backgroundColor: colors.inputBackground }]}>
              <Text style={[styles.statLabel, { color: colors.text }]}>Assistindo:</Text>
              <Text style={[styles.statValue, { color: colors.warning }]}>{animesAssistindo}</Text>
            </View>
            <View style={[styles.statItem, { backgroundColor: colors.inputBackground }]}>
              <Text style={[styles.statLabel, { color: colors.text }]}>Já Assistidos:</Text>
              <Text style={[styles.statValue, { color: colors.success }]}>{animesJaAssistidos}</Text>
            </View>
            <View style={[styles.statItem, { backgroundColor: colors.inputBackground }]}>
              <Text style={[styles.statLabel, { color: colors.text }]}>Total de Horas Vistas (aprox.):</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{calcularTotalHoras()}</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.bottomSpacer} />
      <ButtonTT
        title="Importar Dados Teste"
        displayButton={false}
        buttonStyle={{ marginVertical: 5 }}
        onLongPress={importarDadosTesteAnimes}
        disabled={importando}
        color={colors.info}
      />
      <View style={styles.spacer} />
      <ButtonTT
        buttonStyle={{ marginVertical: 5, marginBottom: 30 }}
        title="Limpar Banco de Dados"
        onLongPress={limparBancoDadosAnimes}
        disabled={importando}
        color={colors.error}
      />
    </View>
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
    marginVertical: 20,
  },
  // --- Novos estilos para as estatísticas ---
  statsContainer: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  // --- Fim dos novos estilos ---
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 20,
  },
  spacer: {
    width: 10,
  },
  bottomSpacer: {
    height: 50,
  },
});
