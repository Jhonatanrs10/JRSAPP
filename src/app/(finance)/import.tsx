import { useState, useEffect, useCallback } from 'react';
import { Button, Alert, StyleSheet, ScrollView, Platform } from 'react-native';
import { Text, View } from '../../components/Themed';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system'; // Corrected import
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import ButtonTT from '../../components/Jhonatanrs/ButtonTT';
import { buscarTransacoes, salvarTransacao, recriarTabela } from '../../database/db';
import { formatarData } from '../../utils/formatacao';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';
import DateTimePicker from '@react-native-community/datetimepicker'; // Import for date picker
import { useFocusEffect } from '@react-navigation/native';

type TipoTransacao = 'PIX' | 'Dinheiro' | 'Boleto' | 'Débito' | 'Crédito' | 'TED' | 'DOC' | 'Distinto';
type Acao = 'entrada' | 'saida';

type Transacao = {
  id: number;
  descricao: string;
  caixa: string;
  categoria: string;
  quantidade: number;
  valor: number; // Valor unitário em centavos
  tipo_transacao: TipoTransacao;
  acao: Acao;
  data: string;
};

// Interface para o resumo por Categoria dentro de um Mês (e Caixa)
interface CategoriaResumoDetalhe {
  totalEntradasCategoria: number;
  totalSaidasCategoria: number;
}

// Interface para o resumo por Mês dentro de uma Caixa
interface MesResumoDetalhe {
  totalEntradasMes: number; // Total geral de entradas para este mês nesta caixa
  totalSaidasMes: number;   // Total geral de saídas para este mês nesta caixa
  categorias: Record<string, CategoriaResumoDetalhe>; // Detalhes por categoria dentro deste mês
}

// Interface atualizada para o resumo por Caixa, incluindo o detalhe por Mês
interface CaixaResumo {
  totalEntradasCaixa: number; // Total acumulado de entradas no Caixa (geral)
  totalSaidasCaixa: number;   // Total acumulado de saídas no Caixa (geral)
  meses: Record<string, MesResumoDetalhe>; // Detalhes por mês dentro desta caixa
}

export default function Import() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [importando, setImportando] = useState(false);
  const [exportando, setExportando] = useState(false);
  // Estado para armazenar o resumo por Caixa, que agora contém detalhes por mês e categoria
  const [resumoPorCaixa, setResumoPorCaixa] = useState<Record<string, CaixaResumo>>({});
  const [carregandoResumo, setCarregandoResumo] = useState(false);
  const [valorAtual, setValorAtual] = useState(0); // Saldo geral em reais (após divisão por 100)

  // New state variables for date filtering
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [showDatePickerStart, setShowDatePickerStart] = useState(false);
  const [showDatePickerEnd, setShowDatePickerEnd] = useState(false);

  // State to control if filters are applied, showing more details in the summary section
  const [filtersApplied, setFiltersApplied] = useState(false);

  // Sleep
  const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  async function limparFiltro() {
    setFiltersApplied(true);
    setStartDate(undefined);
    setEndDate(undefined);
    //calcularResumoDados();
  }


  // --- Função para calcular o valor atual total (sempre com todas as transações) ---
  const calcularValorAtualTotal = useCallback(async () => {
    try {
      const allTransacoes = await buscarTransacoes() as Transacao[];
      let totalEntradasGeral = 0;
      let totalSaidasGeral = 0;

      allTransacoes.forEach(t => {
        const valorTotalTransacao = t.valor * t.quantidade;
        if (t.acao === 'saida') {
          totalSaidasGeral += valorTotalTransacao;
        } else if (t.acao === 'entrada') {
          totalEntradasGeral += valorTotalTransacao;
        }
      });
      setValorAtual((totalEntradasGeral - totalSaidasGeral) / 100);
    } catch (error) {
      console.error('Erro ao calcular valor atual total:', error);
      Alert.alert('Erro', 'Não foi possível calcular o valor atual.');
    }
  }, []);

  // Effect to calculate total value on initial load and whenever data changes (implicit via calcularResumoDados if it's called)
  useFocusEffect(
    useCallback(() => {
      calcularValorAtualTotal();
    }, [])
  );

  // --- Função para calcular o resumo por Caixa, Mês e Categoria (com filtro) ---
  const calcularResumoDados = useCallback(async () => {
    setCarregandoResumo(true);
    try {
      const allTransacoes = await buscarTransacoes() as Transacao[];
      let transacoes = allTransacoes;

      // Determine if any date filter is applied for the *detailed summary*
      const isDateFilterActive = startDate !== undefined || endDate !== undefined;
      setFiltersApplied(isDateFilterActive); // Update the filter status for rendering

      // Apply date filtering to the 'transacoes' array for the detailed summary
      if (startDate && endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);

        transacoes = allTransacoes.filter(t => {
          const [day, month, year] = t.data.split('/').map(Number);
          const transactionDate = new Date(year, month - 1, day);

          return transactionDate >= startDate && transactionDate <= endOfDay;
        });
      } else if (startDate) {
        transacoes = allTransacoes.filter(t => {
          const [day, month, year] = t.data.split('/').map(Number);
          const transactionDate = new Date(year, month - 1, day);
          return transactionDate >= startDate;
        });
      } else if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        transacoes = allTransacoes.filter(t => {
          const [day, month, year] = t.data.split('/').map(Number);
          const transactionDate = new Date(year, month - 1, day);
          return transactionDate <= endOfDay;
        });
      }

      const resumoCaixas: Record<string, CaixaResumo> = {};

      transacoes.forEach(t => {
        const valorTotalTransacao = t.valor * t.quantidade;

        const dataPartes = t.data.split('/');
        const mesAnoChave = `${dataPartes[1]}/${dataPartes[2]}`; // MM/AAAA

        if (!resumoCaixas[t.caixa]) {
          resumoCaixas[t.caixa] = {
            totalEntradasCaixa: 0,
            totalSaidasCaixa: 0,
            meses: {} // Initialize months, even if not rendered initially
          };
        }

        // Always accumulate totals for the specific box (general box total)
        if (t.acao === 'saida') {
          resumoCaixas[t.caixa].totalSaidasCaixa += valorTotalTransacao;
        } else if (t.acao === 'entrada') {
          resumoCaixas[t.caixa].totalEntradasCaixa += valorTotalTransacao;
        }

        // Populate detailed 'meses' and 'categorias' only if a filter is active
        // This ensures the underlying data structure is ready if filtersApplied becomes true
        // but it will only process this if it's relevant for rendering.
        // The previous logic was correct, no need for the `if (filtersApplied)` here,
        // because `filtersApplied` controls the rendering, not the data aggregation itself.
        // The data aggregation should produce the full structure so `filtersApplied` can
        // later decide what to show from that structure.

        // 2. Inicializa o mês dentro do Caixa se ele não existir
        if (!resumoCaixas[t.caixa].meses[mesAnoChave]) {
          resumoCaixas[t.caixa].meses[mesAnoChave] = {
            totalEntradasMes: 0,
            totalSaidasMes: 0,
            categorias: {}
          };
        }

        // Acumula os totais para o mês específico dentro do Caixa
        if (t.acao === 'saida') {
          resumoCaixas[t.caixa].meses[mesAnoChave].totalSaidasMes += valorTotalTransacao;
        } else if (t.acao === 'entrada') {
          resumoCaixas[t.caixa].meses[mesAnoChave].totalEntradasMes += valorTotalTransacao;
        }

        // 3. Inicializa a categoria dentro do mês e do Caixa se ela não existir
        if (!resumoCaixas[t.caixa].meses[mesAnoChave].categorias[t.categoria]) {
          resumoCaixas[t.caixa].meses[mesAnoChave].categorias[t.categoria] = {
            totalEntradasCategoria: 0,
            totalSaidasCategoria: 0
          };
        }

        // Acumula os totais para a categoria específica dentro do mês e do Caixa
        if (t.acao === 'saida') {
          resumoCaixas[t.caixa].meses[mesAnoChave].categorias[t.categoria].totalSaidasCategoria += valorTotalTransacao;
        } else if (t.acao === 'entrada') {
          resumoCaixas[t.caixa].meses[mesAnoChave].categorias[t.categoria].totalEntradasCategoria += valorTotalTransacao;
        }
      });
      setResumoPorCaixa(resumoCaixas);
    } catch (error) {
      console.error('Erro ao calcular resumo:', error);
      Alert.alert('Erro', 'Não foi possível calcular o resumo dos dados.');
    } finally {
      setCarregandoResumo(false);
    }
  }, [startDate, endDate]); // Recalculate when dates change

  // This effect ensures that the summary data (which can be filtered) is calculated
  useFocusEffect(
    useCallback(() => {
      calcularResumoDados();
    }, [])
  );

  // --- Exportar Transações (CSV) ---
  async function exportarTransacoes() {
    try {
      setExportando(true);
      const transacoes = await buscarTransacoes() as Transacao[];

      const cabecalho = 'Descrição;Caixa;Categoria;Quantidade;Valor;Tipo;Ação;Data\n';

      const linhas = transacoes.map(t => {
        const escapeAndQuote = (text: string | number | null) => {
          if (text === null || text === undefined) return '';
          const str = String(text);
          const displayValue = (typeof text === 'number' && ['valor'].includes('valor')) ? text : str;

          if (String(displayValue).includes(';') || String(displayValue).includes('"') || String(displayValue).includes('\n')) {
            return `"${String(displayValue).replace(/"/g, '""')}"`;
          }
          return String(displayValue);
        };

        return `${escapeAndQuote(t.descricao)};${escapeAndQuote(t.caixa)};${escapeAndQuote(t.categoria)};${escapeAndQuote(t.quantidade)};${escapeAndQuote(t.valor)};${escapeAndQuote(t.tipo_transacao)};${escapeAndQuote(t.acao)};${escapeAndQuote(t.data)}`;
      });

      const conteudo = cabecalho + linhas.join('\n');
      const dataAtual = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      const nomeArquivo = `transacoes_${dataAtual}.txt`;

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
        dialogTitle: 'Salvar Transações',
      });

      Alert.alert('Sucesso', 'Arquivo de transações gerado e pronto para ser salvo!');

    } catch (error: unknown) {
      console.error('Erro ao exportar transações:', error);
      let errorMessage = 'Não foi possível exportar as transações.';
      if (error instanceof Error) {
        errorMessage = `Não foi possível exportar as transações: ${error.message}`;
      }
      Alert.alert('Erro', errorMessage);
    } finally {
      setExportando(false);
    }
  }

  // --- Importar Transações (CSV) ---
  async function importarTransacoes() {
    try {
      setImportando(true);

      const resultado = await DocumentPicker.getDocumentAsync({
        type: '*/*',
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

      const camposEssenciais = ['Descrição', 'Caixa', 'Categoria', 'Quantidade', 'Valor', 'Tipo', 'Ação', 'Data'];
      const camposMinimosValidos = camposEssenciais.every(campo => cabecalho.includes(campo));

      if (!camposMinimosValidos) {
        Alert.alert('Erro', 'Formato de arquivo inválido. Verifique se o arquivo tem os campos essenciais: Descrição, Caixa, Categoria, Quantidade, Valor, Tipo, Ação, Data.');
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

        const indices = camposEssenciais.map(campo => cabecalho.indexOf(campo));
        const todosIndicesValidos = indices.every(index => index !== -1 && index < valores.length);

        if (!todosIndicesValidos) {
          console.log('Linha ignorada - campos essenciais faltando ou número incorreto de colunas:', linhas[i]);
          linhasComErro.push(`Linha ${i + 1}: "${linhas[i].substring(0, Math.min(linhas[i].length, 50))}..." - Campos essenciais faltando ou número incorreto de colunas.`);
          erros++;
          continue;
        }

        try {
          const rawTipoTransacao = valores[cabecalho.indexOf('Tipo')];
          const tipoTransacaoValues: TipoTransacao[] = ['PIX', 'Dinheiro', 'Boleto', 'Débito', 'Crédito', 'TED', 'DOC', 'Distinto'];
          if (!tipoTransacaoValues.includes(rawTipoTransacao as TipoTransacao)) {
            throw new Error(`Tipo de transação inválido: "${rawTipoTransacao}"`);
          }
          const tipo_transacao: TipoTransacao = rawTipoTransacao as TipoTransacao;

          const rawAcao = valores[cabecalho.indexOf('Ação')].toLowerCase();
          let acao: Acao;
          if (rawAcao === 'entrada' || rawAcao === 'ganho') {
            acao = 'entrada';
          } else if (rawAcao === 'saida' || rawAcao === 'gasto') {
            acao = 'saida';
          } else {
            throw new Error(`Ação inválida: "${rawAcao}"`);
          }

          let dataBruta = valores[cabecalho.indexOf('Data')];
          if (dataBruta.includes('-')) {
            dataBruta = dataBruta.replace(/-/g, '/');
          }
          const data = formatarData(dataBruta);

          const valorParsed = parseFloat(valores[cabecalho.indexOf('Valor')]);

          const transacao: Omit<Transacao, 'id'> = {
            descricao: valores[cabecalho.indexOf('Descrição')],
            caixa: valores[cabecalho.indexOf('Caixa')],
            categoria: valores[cabecalho.indexOf('Categoria')],
            quantidade: parseInt(valores[cabecalho.indexOf('Quantidade')]),
            valor: valorParsed,
            tipo_transacao: tipo_transacao,
            acao: acao,
            data: data
          };

          if (isNaN(transacao.quantidade) || isNaN(transacao.valor)) {
            throw new Error('Quantidade ou Valor não são números válidos.');
          }

          await salvarTransacao(transacao);
          importadas++;
        } catch (error: unknown) {
          console.error('Erro ao importar transação:', error, 'Linha:', linhas[i]);
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

      Alert.alert(
        'Importação Concluída',
        `Importadas: ${importadas}\nErros: ${erros}`
      );
      calcularResumoDados(); // Recalculate filtered summary
      calcularValorAtualTotal(); // Recalculate total value
    } catch (error: unknown) {
      console.error('Erro geral ao importar:', error);
      let errorMessage = 'Não foi possível importar as transações. Verifique se o arquivo está no formato correto.';
      if (error instanceof Error) {
        errorMessage += `\nDetalhes: ${error.message}`;
      }
      Alert.alert('Erro', errorMessage);
    } finally {
      setImportando(false);
    }
  }

  // --- Importar Dados de Teste ---
  async function importarDadosTeste() {
    try {
      setImportando(true);
      let importadas = 0;
      let erros = 0;

      const dadosTeste = [
        { descricao: "Produto 1", caixa: "Pai", categoria: "Contas", quantidade: 2, valor: 15000, tipo_transacao: "PIX", acao: "saida", data: formatarData(new Date()) },
        { descricao: "Salário", caixa: "Pai", categoria: "Renda", quantidade: 1, valor: 500000, tipo_transacao: "PIX", acao: "entrada", data: formatarData(new Date()) },
        { descricao: "Aluguel", caixa: "Pai", categoria: "Moradia", quantidade: 1, valor: 120000, tipo_transacao: "Boleto", acao: "saida", data: formatarData(new Date()) },
        { descricao: "Lanche", caixa: "Filho", categoria: "Alimentação", quantidade: 1, valor: 2500, tipo_transacao: "Dinheiro", acao: "saida", data: formatarData(new Date()) },
        { descricao: "Venda Extra", caixa: "Filho", categoria: "Renda Extra", quantidade: 1, valor: 7500, tipo_transacao: "Débito", acao: "entrada", data: formatarData(new Date()) },
        { descricao: "Supermercado", caixa: "Mãe", categoria: "Alimentação", quantidade: 1, valor: 30000, tipo_transacao: "Crédito", acao: "saida", data: formatarData(new Date()) },
        { descricao: "Presente", caixa: "Mãe", categoria: "Lazer", quantidade: 1, valor: 5000, tipo_transacao: "Dinheiro", acao: "entrada", data: formatarData(new Date()) },
        { descricao: "Conta de Luz", caixa: "Pai", categoria: "Contas", quantidade: 1, valor: 8000, tipo_transacao: "Boleto", acao: "saida", data: formatarData(new Date('2025-05-15')) }, // Mês anterior
        { descricao: "Receita Antiga", caixa: "Filho", categoria: "Renda", quantidade: 1, valor: 10000, tipo_transacao: "PIX", acao: "entrada", data: formatarData(new Date('2025-05-20')) }, // Mês anterior
      ];

      for (const transacao of dadosTeste) {
        try {
          await salvarTransacao(transacao as Omit<Transacao, 'id'>);
          importadas++;
        } catch (error: unknown) {
          console.error('Erro ao importar transação de teste:', error);
          let errorMessage = 'Erro ao importar transação de teste.';
          if (error instanceof Error) {
            errorMessage += `\nDetalhes: ${error.message}`;
          } else if (typeof error === 'string') {
            errorMessage += `\nDetalhes: ${error}`;
          }
          erros++;
        }
      }

      Alert.alert(
        'Importação de Teste Concluída',
        `Importadas: ${importadas}\nErros: ${erros}`
      );
      calcularResumoDados(); // Recalculate filtered summary
      calcularValorAtualTotal(); // Recalculate total value
    } catch (error: unknown) {
      console.error('Erro geral ao importar dados de teste:', error);
      let errorMessage = 'Não foi possível importar os dados de teste.';
      if (error instanceof Error) {
        errorMessage += `\nDetalhes: ${error.message}`;
      }
      Alert.alert('Erro', errorMessage);
    } finally {
      setImportando(false);
    }
  }

  // --- Limpar Banco de Dados ---
  async function limparBancoDados() {
    Alert.alert(
      'Limpar Banco de Dados',
      'Tem certeza que deseja limpar todo o banco de dados? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            try {
              setImportando(true);
              const sucesso = await recriarTabela();
              if (sucesso) {
                Alert.alert('Sucesso', 'Banco de dados limpo com sucesso');
              } else {
                Alert.alert('Erro', 'Não foi possível limpar o banco de dados');
              }
              calcularResumoDados(); // Recalculate filtered summary
              calcularValorAtualTotal(); // Recalculate total value
            } catch (error: unknown) {
              console.error('Erro ao limpar banco de dados:', error);
              let errorMessage = 'Ocorreu um erro ao limpar o banco de dados.';
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

  // --- Função para gerar dados para o relatório (agrupamento por mês, caixa, categoria) ---
  const gerarDadosParaRelatorio = useCallback(async () => {
    const allTransacoes = await buscarTransacoes() as Transacao[];
    let transacoes = allTransacoes;

    // Apply date filtering for the report as well
    if (startDate && endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999); // Include the entire end date
      transacoes = allTransacoes.filter(t => {
        const [day, month, year] = t.data.split('/').map(Number);
        const transactionDate = new Date(year, month - 1, day);
        return transactionDate >= startDate && transactionDate <= endOfDay;
      });
    } else if (startDate) { // If only start date is provided
      transacoes = allTransacoes.filter(t => {
        const [day, month, year] = t.data.split('/').map(Number);
        const transactionDate = new Date(year, month - 1, day);
        return transactionDate >= startDate;
      });
    } else if (endDate) { // If only end date is provided
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      transacoes = allTransacoes.filter(t => {
        const [day, month, year] = t.data.split('/').map(Number);
        const transactionDate = new Date(year, month - 1, day);
        return transactionDate <= endOfDay;
      });
    }


    const resumoMensal: Record<string, Record<string, {
      combinacoes: Record<string, { caixa: string; categoria: string; totalEntradas: number; totalSaidas: number; }>; // Alterado para caixa e categoria
      totalEntradasMes: number;
      totalSaidasMes: number;
    }>> = {};

    transacoes.forEach(t => {
      const valorTotalTransacao = t.valor * t.quantidade;

      const [_, mes, ano] = t.data.split('/');
      const chaveMesAno = `${ano}-${mes}`; // Changed to YYYY-MM for consistent sorting

      // Nova chave de combinação: Caixa e Categoria
      const chaveCombinacao = `${t.caixa}:::${t.categoria}`;

      if (!resumoMensal[ano]) {
        resumoMensal[ano] = {};
      }
      if (!resumoMensal[ano][chaveMesAno]) {
        resumoMensal[ano][chaveMesAno] = {
          combinacoes: {},
          totalEntradasMes: 0,
          totalSaidasMes: 0
        };
      }

      if (t.acao === 'entrada') {
        resumoMensal[ano][chaveMesAno].totalEntradasMes += valorTotalTransacao;
      } else {
        resumoMensal[ano][chaveMesAno].totalSaidasMes += valorTotalTransacao;
      }

      if (!resumoMensal[ano][chaveMesAno].combinacoes[chaveCombinacao]) {
        resumoMensal[ano][chaveMesAno].combinacoes[chaveCombinacao] = {
          caixa: t.caixa, // Armazena a caixa
          categoria: t.categoria, // Armazena a categoria
          totalEntradas: 0,
          totalSaidas: 0
        };
      }
      if (t.acao === 'entrada') {
        resumoMensal[ano][chaveMesAno].combinacoes[chaveCombinacao].totalEntradas += valorTotalTransacao;
      } else {
        resumoMensal[ano][chaveMesAno].combinacoes[chaveCombinacao].totalSaidas += valorTotalTransacao;
      }
    });

    return { resumoMensal };
  }, [startDate, endDate]); // Add startDate and endDate to dependency array

  // --- Função para gerar conteúdo HTML do relatório PDF ---
  const gerarConteudoHtmlRelatorio = useCallback(async () => {
    const { resumoMensal } = await gerarDadosParaRelatorio();
    // Removed timeStyle from toLocaleDateString as it's not supported by this method.
    // If time is needed, use toLocaleString or toLocaleTimeString separately.
    const dataGeracao = new Date().toLocaleDateString('pt-BR', { dateStyle: 'short' });

    let htmlContent = `
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <title>Relatório</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1, h2, h3 { color: #333; text-align: center; margin-bottom: 10px; }
          .section { margin-bottom: 30px; border: 1px solid #eee; padding: 15px; border-radius: 8px; }
          /* Adiciona quebra de página antes de cada subsection (cada mês) */
          .subsection {
            margin-top: 20px;
            margin-bottom: 15px;
            padding: 10px;
            border: 1px solid #f9f9f9;
            background-color: #fcfcfc;
            border-radius: 5px;
            page-break-before: always; /* Quebra de página aqui */
          }
          /* O primeiro mês não deve ter quebra de página antes */
          .subsection:first-of-type {
            page-break-before: auto;
          }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .total-row td { font-weight: bold; background-color: #e6e6e6; }
          .entry { color: #28a745; font-weight: bold; } /* Verde para entradas */
          .exit { color: #dc3545; font-weight: bold; }  /* Vermelho para saídas */
          .balance { color: #007bff; font-weight: bold; } /* Azul para saldo */
          .footer { text-align: center; margin-top: 50px; font-size: 0.8em; color: #777; }
        </style>
      </head>
      <body>
        <h1>Relatório Detalhado</h1>
        <p style="text-align: center;">Gerado em: ${dataGeracao}</p>
    `;

    // Add filter period to report title if present
    if (startDate || endDate) {
      const startText = startDate ? formatarData(startDate) : 'Início';
      const endText = endDate ? formatarData(endDate) : 'Fim';
      htmlContent += `<p style="text-align: center;">Período: ${startText} a ${endText}</p>`;
    }


    const mesesNomes = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const anosOrdenados = Object.keys(resumoMensal).sort();

    if (anosOrdenados.length === 0) {
      htmlContent += `<p style="text-align: center;">Nenhum dado disponível para o relatório no período selecionado.</p>`;
    } else {
      anosOrdenados.forEach(ano => {
        htmlContent += `
          <div class="section">
            <h2>Ano: ${ano}</h2>
        `;

        const mesesDoAnoOrdenados = Object.keys(resumoMensal[ano]).sort((a, b) => {
          // Sort by YYYY-MM format
          const [anoA, mesA] = a.split('-');
          const [anoB, mesB] = b.split('-');
          if (anoA !== anoB) return parseInt(anoA) - parseInt(anoB);
          return parseInt(mesA) - parseInt(mesB);
        });

        mesesDoAnoOrdenados.forEach(chaveMesAno => {
          const [anoStrMes, mesNumeroStr] = chaveMesAno.split('-'); // Changed to YYYY-MM
          const mesIndex = parseInt(mesNumeroStr, 10) - 1;
          const nomeMes = mesesNomes[mesIndex];

          const dadosMes = resumoMensal[ano][chaveMesAno];
          const entradasMesReais = (dadosMes.totalEntradasMes / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          const saidasMesReais = (dadosMes.totalSaidasMes / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          const saldoMesReais = ((dadosMes.totalEntradasMes - dadosMes.totalSaidasMes) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

          htmlContent += `
            <div class="subsection">
              <h3>Mês: ${nomeMes}/${anoStrMes}</h3>
              <p style="font-weight: bold;">Total Entradas do Mês: <span class="entry">${entradasMesReais}</span></p>
              <p style="font-weight: bold;">Total Saídas do Mês: <span class="exit">${saidasMesReais}</span></p>
              <p style="font-weight: bold;">Saldo do Mês: <span class="balance">${saldoMesReais}</span></p>

              <h4>Detalhes por Caixa e Categoria</h4>
              <table>
                <thead>
                  <tr>
                    <th>Caixa</th>
                    <th>Categoria</th>
                    <th>Entradas</th>
                    <th>Saídas</th>
                    <th>Saldo</th>
                  </tr>
                </thead>
                <tbody>
          `;

          // Novo tipo para os itens da tabela do PDF (Caixa e Categoria)
          type CaixaCategoriaItem = {
            caixa: string;
            categoria: string;
            totalEntradas: number;
            totalSaidas: number;
          };

          const caixaCategoriaItens: CaixaCategoriaItem[] = Object.values(dadosMes.combinacoes);

          // Ordenar por Caixa e depois por Categoria
          caixaCategoriaItens.sort((a, b) => {
            const caixaCompare = a.caixa.localeCompare(b.caixa);
            if (caixaCompare !== 0) {
              return caixaCompare;
            }
            return a.categoria.localeCompare(b.categoria);
          });

          if (caixaCategoriaItens.length === 0) {
            htmlContent += `<tr><td colspan="5">Nenhum detalhe disponível para este mês.</td></tr>`;
          } else {
            caixaCategoriaItens.forEach(item => {
              const entradasReais = (item.totalEntradas / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
              const saidasReais = (item.totalSaidas / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
              const saldoReais = ((item.totalEntradas - item.totalSaidas) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

              htmlContent += `
                <tr>
                  <td>${item.caixa}</td>
                  <td>${item.categoria}</td>
                  <td class="entry">${entradasReais}</td>
                  <td class="exit">${saidasReais}</td>
                  <td class="balance">${saldoReais}</td>
                </tr>
              `;
            });
          }

          htmlContent += `
                </tbody>
              </table>
            </div> `;
        });
        htmlContent += `</div> `;
      });
    }

    htmlContent += `
        <div class="footer">
          <p>Relatório gerado pelo aplicativo JRSAPP.</p>
          <p>By Jhonatanrs</p>
        </div>
      </body>
      </html>
    `;

    return htmlContent;
  }, [gerarDadosParaRelatorio]); // Dependency on the data generation function

  // --- Função para gerar o relatório PDF ---
  async function gerarRelatorioPdf() {
    try {
      setExportando(true);

      const html = await gerarConteudoHtmlRelatorio();
      const { uri } = await Print.printToFileAsync({ html });

      if (Platform.OS === 'ios') {
        await Sharing.shareAsync(uri);
      } else {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }

      Alert.alert('Sucesso', 'Relatório PDF gerado e pronto para ser compartilhado!');

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      Alert.alert('Erro', 'Não foi possível gerar o relatório PDF. Verifique se você tem permissão para arquivos ou se o conteúdo não é muito grande.');
    } finally {
      setExportando(false);
    }
  }

  const mesesNomes = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Ferramentas</Text>
      <View style={[styles.separator, { backgroundColor: colors.borderColor }]} />

      <ButtonTT
        buttonStyle={{ marginVertical: 5 }}
        title="Importar CSV"
        onPress={importarTransacoes}
        disabled={importando}
        color={colors.info}
      />
      <ButtonTT
        buttonStyle={{ marginVertical: 5 }}
        title="Exportar CSV"
        onPress={exportarTransacoes}
        disabled={importando}
        color={colors.success}
      />





      <View style={[styles.separator, { backgroundColor: colors.borderColor }]} />
      <Text style={[styles.subtitle, { color: colors.text }]}>Filtro por Período</Text>
      <View style={[styles.separator, { backgroundColor: colors.borderColor }]} />

      <View style={styles.dateFilterContainer}>
        <View style={styles.datePickerRow}>
          <Text style={[styles.dateLabel, { color: colors.text }]}>De:</Text>
          <ButtonTT
            title={startDate ? formatarData(startDate) : "Selecionar Data Inicial"}
            onPress={() => setShowDatePickerStart(true)}
            color={colors.primary}
            buttonStyle={styles.datePickerButton}
          />
        </View>
        {showDatePickerStart && (
          <DateTimePicker
            value={startDate || new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePickerStart(Platform.OS === 'ios');
              setStartDate(selectedDate || undefined); // Set to undefined if null/undefined
            }}
          />
        )}

        <View style={styles.datePickerRow}>
          <Text style={[styles.dateLabel, { color: colors.text }]}>Até:</Text>
          <ButtonTT
            title={endDate ? formatarData(endDate) : "Selecionar Data Final"}
            onPress={() => setShowDatePickerEnd(true)}
            color={colors.primary}
            buttonStyle={styles.datePickerButton}
          />
        </View>
        {showDatePickerEnd && (
          <DateTimePicker
            value={endDate || new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePickerEnd(Platform.OS === 'ios');
              setEndDate(selectedDate || undefined); // Set to undefined if null/undefined
            }}
          />
        )}
        <ButtonTT
          buttonStyle={{ marginVertical: 10 }}
          title="Aplicar Filtro"
          onPress={calcularResumoDados} // Recalculate summary with new dates
          disabled={carregandoResumo}
          color={colors.info}
        />
        <ButtonTT
          buttonStyle={{ marginVertical: 5 }}
          title="Limpar Filtro"
          onPress={limparFiltro}
          color={colors.warning}
        />

        <ButtonTT
          buttonStyle={{ marginVertical: 5 }}
          title="Gerar Relatório PDF"
          onPress={gerarRelatorioPdf}
          disabled={exportando}
          color={'#007bff'}
        />
      </View>

      <View style={styles.resumoGeralContainer}>
        <Text style={[styles.resumoGeralLabel, { color: colors.text }]}>
          Valor Atual (Total):
        </Text>
        <Text
          style={[
            styles.resumoGeralValor,
            { color: valorAtual >= 0 ? colors.success : colors.error }
          ]}
        >
          {valorAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </Text>
      </View>

      {carregandoResumo ? (
        <Text style={{ color: colors.text }}>Calculando resumo...</Text>
      ) : (
        <>
          {Object.keys(resumoPorCaixa).length > 0 ? (
            Object.entries(resumoPorCaixa)
              .sort(([caixaA], [caixaB]) => caixaA.localeCompare(caixaB))
              .map(([caixa, dadosCaixa]) => (
                <View key={caixa} style={styles.resumoCaixaContainer}>
                  <Text style={[styles.resumoCaixaTitulo, { color: colors.text }]}>
                    Caixa: {caixa}
                  </Text>
                  <Text style={[styles.resumoValorGeral, { color: colors.text }]}>
                    Total Geral Entradas no Caixa: {(dadosCaixa.totalEntradasCaixa / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </Text>
                  <Text style={[styles.resumoValorGeral, { color: colors.text }]}>
                    Total Geral Saídas no Caixa: {(dadosCaixa.totalSaidasCaixa / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </Text>
                  <Text style={[styles.resumoValorGeral, { color: colors.text }]}>
                    Saldo Geral do Caixa: {((dadosCaixa.totalEntradasCaixa - dadosCaixa.totalSaidasCaixa) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </Text>


                  {filtersApplied && (
                    <>
                      {Object.entries(dadosCaixa.meses)
                        .sort(([mesAnoA], [mesAnoB]) => {
                          // Ordena os meses (MM/AAAA) cronologicamente
                          const [mesA, anoA] = mesAnoA.split('/');
                          const [mesB, anoB] = mesAnoB.split('/');
                          if (anoA !== anoB) return parseInt(anoA) - parseInt(anoB);
                          return parseInt(mesA) - parseInt(mesB);
                        })
                        .map(([mesAnoChave, dadosMes]) => {
                          const [mesNumeroStr, anoStr] = mesAnoChave.split('/');
                          const nomeMes = mesesNomes[parseInt(mesNumeroStr, 10) - 1]; // Converte o número do mês para nome

                          return (
                            <View key={`${caixa}-${mesAnoChave}`} style={styles.resumoMesContainer}>
                              <Text style={[styles.resumoMesTitulo, { color: colors.text }]}>
                                Mês: {nomeMes}/{anoStr}
                              </Text>
                              <Text style={[styles.resumoValorMes, { color: colors.text }]}>
                                Total Entradas no Mês: {(dadosMes.totalEntradasMes / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </Text>
                              <Text style={[styles.resumoValorMes, { color: colors.text }]}>
                                Total Saídas no Mês: {(dadosMes.totalSaidasMes / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </Text>
                              <Text style={[styles.resumoValorMes, { color: colors.text }]}>
                                Saldo no Mês: {((dadosMes.totalEntradasMes - dadosMes.totalSaidasMes) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </Text>

                              <View style={[styles.linhaDivisoriaInterna, { backgroundColor: colors.borderColor }]} />


                              {Object.entries(dadosMes.categorias)
                                .sort(([catA], [catB]) => catA.localeCompare(catB))
                                .map(([categoria, dadosCategoria]) => (
                                  <View key={`${caixa}-${mesAnoChave}-${categoria}`} style={styles.resumoCategoriaItem}>
                                    <Text style={[styles.resumoCategoriaNome, { color: colors.text }]}>
                                      - {categoria}:
                                    </Text>
                                    <Text style={[styles.resumoValor, { color: colors.text }]}>
                                      Total Entradas: {(dadosCategoria.totalEntradasCategoria / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </Text>
                                    <Text style={[styles.resumoValor, { color: colors.text }]}>
                                      Total Saídas: {(dadosCategoria.totalSaidasCategoria / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </Text>
                                    <Text style={[styles.resumoValor, { color: colors.text }]}>
                                      Saldo: {((dadosCategoria.totalEntradasCategoria - dadosCategoria.totalSaidasCategoria) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </Text>
                                  </View>
                                ))}
                            </View>
                          );
                        })}
                    </>
                  )}
                  <View style={[styles.linhaDivisoria, { backgroundColor: colors.borderColor }]} />
                </View>
              ))
          ) : (
            <Text style={{ color: colors.text }}>Nenhum dado para resumir por caixa no período selecionado.</Text>
          )}
        </>
      )}

      <View style={styles.bottomSpacer} />
      <ButtonTT
        buttonStyle={{ marginVertical: 5 }}
        displayButton={false} // You might want to enable this for testing
        title="Importar Dados de Teste"
        onPress={importarDadosTeste}
        disabled={importando}
        color={colors.info}
      />
      <ButtonTT
        buttonStyle={{ marginVertical: 5, marginBottom: 30 }}
        title="Limpar Banco de Dados"
        onLongPress={limparBancoDados}
        disabled={importando}
        color={colors.error}
      />
    </ScrollView>
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  spacer: {
    width: 10,
  },
  // New styles for date filter
  dateFilterContainer: {
    marginBottom: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateLabel: {
    fontSize: 16,
    marginRight: 10,
    minWidth: 40, // Adjust as needed
  },
  datePickerButton: {
    flex: 1, // Make button take available space
  },
  // End new styles
  resumoGeralContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 15,
  },
  resumoGeralLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  resumoGeralValor: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  // Estilos para o resumo por Caixa
  resumoCaixaContainer: {
    marginBottom: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  resumoCaixaTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  resumoValorGeral: {
    fontSize: 15,
    marginLeft: 10,
    fontWeight: 'bold',
  },
  // Estilos para o resumo por Mês dentro do Caixa
  resumoMesContainer: {
    marginTop: 10,
    marginBottom: 10,
    paddingLeft: 10,
    borderLeftWidth: 2, // Uma pequena borda para indicar o aninhamento
    borderLeftColor: '#eee',
  },
  resumoMesTitulo: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  resumoValorMes: {
    fontSize: 15,
    marginLeft: 10,
  },
  linhaDivisoriaInterna: {
    height: 0.5,
    marginVertical: 10,
    width: '100%',
    alignSelf: 'center',
  },
  // Estilos para o resumo de Categoria dentro do Mês
  resumoCategoriaItem: {
    marginBottom: 5,
    marginLeft: 20, // Indenta as categorias ainda mais
  },
  resumoCategoriaNome: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  resumoValor: {
    fontSize: 14,
    marginLeft: 10,
  },
  linhaDivisoria: {
    height: 1,
    marginTop: 15,
    marginBottom: 5,
  },
  bottomSpacer: {
    height: 50,
  },
});