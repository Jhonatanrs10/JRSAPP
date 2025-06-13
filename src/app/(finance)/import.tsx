import { useState, useEffect, useCallback } from 'react';
import { Button, Alert, StyleSheet, ScrollView, Platform } from 'react-native';
import { Text, View } from '../../components/Themed';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import ButtonTT from '../../components/Jhonatanrs/ButtonTT';
import { buscarTransacoes, salvarTransacao, recriarTabela } from '../../database/db'; // Supondo que salvarTransacao não precisa do ID
import { formatarData } from '../../utils/formatacao';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';

type TipoTransacao = 'PIX' | 'Dinheiro' | 'Boleto' | 'Débito' | 'Crédito' | 'TED' | 'DOC' | 'Distinto';
type Acao = 'entrada' | 'saida';

type Transacao = {
  id: number; // O ID virá do banco de dados ao salvar
  descricao: string;
  categoria: string;
  quantidade: number;
  valor: number; // Valor unitário em centavos
  tipo_transacao: TipoTransacao;
  acao: Acao;
  data: string;
};

// Interface para o resumo por categoria exibido na tela
interface CategoriaResumo {
  maxGasto: number; // Armazenado em centavos (maior transação única de saída)
  maxGanho: number; // Armazenado em centavos (maior transação única de entrada)
  totalEntradasCategoria: number; // Total acumulado de entradas na categoria
  totalSaidasCategoria: number;   // Total acumulado de saídas na categoria
}

export default function Import() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme];
  const [importando, setImportando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [resumoPorCategoria, setResumoPorCategoria] = useState<Record<string, CategoriaResumo>>({});
  const [carregandoResumo, setCarregandoResumo] = useState(false);
  const [valorAtual, setValorAtual] = useState(0); // Saldo geral em reais (após divisão por 100)

  // --- Função para calcular o resumo e o valor atual ---
  const calcularResumoDados = useCallback(async () => {
    setCarregandoResumo(true);
    try {
      const transacoes = await buscarTransacoes() as Transacao[];
      const resumo: Record<string, CategoriaResumo> = {};
      let totalEntradasGeral = 0; // Acumula em centavos
      let totalSaidasGeral = 0;   // Acumula em centavos

      transacoes.forEach(t => {
        // Calcula o valor total da transação (valor unitário * quantidade) em centavos
        const valorTotalTransacao = t.valor * t.quantidade;

        if (!resumo[t.categoria]) {
          // Inicializa os totais e máximos para a nova categoria
          resumo[t.categoria] = {
            maxGasto: 0,
            maxGanho: 0,
            totalEntradasCategoria: 0,
            totalSaidasCategoria: 0
          };
        }

        if (t.acao === 'saida') {
          totalSaidasGeral += valorTotalTransacao;
          resumo[t.categoria].totalSaidasCategoria += valorTotalTransacao; // Acumula total de saídas por categoria
          if (valorTotalTransacao > resumo[t.categoria].maxGasto) {
            resumo[t.categoria].maxGasto = valorTotalTransacao; // Mantém o máximo de uma transação única de saída
          }
        } else if (t.acao === 'entrada') {
          totalEntradasGeral += valorTotalTransacao;
          resumo[t.categoria].totalEntradasCategoria += valorTotalTransacao; // Acumula total de entradas por categoria
          if (valorTotalTransacao > resumo[t.categoria].maxGanho) {
            resumo[t.categoria].maxGanho = valorTotalTransacao; // Mantém o máximo de uma transação única de entrada
          }
        }
      });
      setResumoPorCategoria(resumo);
      // Converte o valor atual de centavos para reais antes de armazenar no estado
      setValorAtual((totalEntradasGeral - totalSaidasGeral) / 100);
    } catch (error) {
      console.error('Erro ao calcular resumo:', error);
      Alert.alert('Erro', 'Não foi possível calcular o resumo dos dados.');
    } finally {
      setCarregandoResumo(false);
    }
  }, []);

  // --- Efeito para carregar o resumo quando o componente é montado ---
  useEffect(() => {
    calcularResumoDados();
  }, [calcularResumoDados]);

  // --- Exportar Transações (CSV) ---
  async function exportarTransacoes() {
    try {
      setExportando(true);
      const transacoes = await buscarTransacoes() as Transacao[];

      // Não precisamos ordenar por ID se ele não será exportado ou usado para ordenação de arquivo
      // transacoes.sort((a, b) => a.id - b.id);

      // NOVIDADE: O cabeçalho agora não inclui o ID
      const cabecalho = 'Descrição;Categoria;Quantidade;Valor;Tipo;Ação;Data\n';

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

        // NOVIDADE: A linha exportada não inclui o ID
        return `${escapeAndQuote(t.descricao)};${escapeAndQuote(t.categoria)};${escapeAndQuote(t.quantidade)};${escapeAndQuote(t.valor)};${escapeAndQuote(t.tipo_transacao)};${escapeAndQuote(t.acao)};${escapeAndQuote(t.data)}`;
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

      // Campos essenciais para importação (ID não é necessário nem na validação)
      const camposEssenciais = ['Descrição', 'Categoria', 'Quantidade', 'Valor', 'Tipo', 'Ação', 'Data'];
      const camposMinimosValidos = camposEssenciais.every(campo => cabecalho.includes(campo));

      if (!camposMinimosValidos) {
        Alert.alert('Erro', 'Formato de arquivo inválido. Verifique se o arquivo tem os campos essenciais: Descrição, Categoria, Quantidade, Valor, Tipo, Ação, Data.');
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

          // Cria a transação sem o ID. O banco de dados irá gerar um novo.
          const transacao: Omit<Transacao, 'id'> = {
            descricao: valores[cabecalho.indexOf('Descrição')],
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

          await salvarTransacao(transacao); // Salva sem especificar o ID
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
      calcularResumoDados(); // Recalcula resumo após importação
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
        { descricao: "Venda de Produto 1", categoria: "Vendas", quantidade: 2, valor: 15000, tipo_transacao: "PIX", acao: "entrada", data: formatarData(new Date()) }, // 150.00
        { descricao: "Compra de Material", categoria: "Materiais", quantidade: 5, valor: 2550, tipo_transacao: "Débito", acao: "saida", data: formatarData(new Date()) },    // 25.50
        { descricao: "Serviço de Consultoria", categoria: "Serviços", quantidade: 1, valor: 50075, tipo_transacao: "Crédito", acao: "entrada", data: formatarData(new Date()) }, // 500.75
        { descricao: "Almoço", categoria: "Alimentação", quantidade: 1, valor: 3500, tipo_transacao: "Dinheiro", acao: "saida", data: formatarData(new Date()) },       // 35.00
        { descricao: "Bônus de Desempenho", categoria: "Salário", quantidade: 1, valor: 100000, tipo_transacao: "PIX", acao: "entrada", data: formatarData(new Date()) }, // 1000.00
        { descricao: "Manutenção do Carro", categoria: "Transporte", quantidade: 1, valor: 45000, tipo_transacao: "Débito", acao: "saida", data: formatarData(new Date()) }, // 450.00
        { descricao: "Devolução de Compra", categoria: "Compras", quantidade: 1, valor: 12000, tipo_transacao: "Crédito", acao: "entrada", data: formatarData(new Date()) }, // 120.00
        { descricao: "Mercado Mensal", categoria: "Alimentação", quantidade: 1, valor: 80000, tipo_transacao: "Débito", acao: "saida", data: formatarData(new Date()) },  // 800.00
        { descricao: "Freelance Design", categoria: "Serviços", quantidade: 1, valor: 70000, tipo_transacao: "PIX", acao: "entrada", data: formatarData(new Date()) },   // 700.00
        // Adicionando mais transações com datas de meses diferentes para teste
        { descricao: "Venda de Livro", categoria: "Vendas", quantidade: 1, valor: 8000, tipo_transacao: "PIX", acao: "entrada", data: formatarData(new Date(2025, 0, 15)) }, // Janeiro 2025
        { descricao: "Conta de Luz", categoria: "Contas Fixas", quantidade: 1, valor: 12000, tipo_transacao: "Débito", acao: "saida", data: formatarData(new Date(2025, 0, 20)) }, // Janeiro 2025
        { descricao: "Academia", categoria: "Saúde", quantidade: 1, valor: 9000, tipo_transacao: "Crédito", acao: "saida", data: formatarData(new Date(2025, 1, 5)) }, // Fevereiro 2025
        { descricao: "Consultoria TI", categoria: "Serviços", quantidade: 1, valor: 150000, tipo_transacao: "PIX", acao: "entrada", data: formatarData(new Date(2025, 1, 10)) }, // Fevereiro 2025
        { descricao: "Aluguel", categoria: "Moradia", quantidade: 1, valor: 200000, tipo_transacao: "PIX", acao: "saida", data: formatarData(new Date(2025, 2, 1)) }, // Março 2025
        { descricao: "Bônus Anual", categoria: "Salário", quantidade: 1, valor: 300000, tipo_transacao: "Crédito", acao: "entrada", data: formatarData(new Date(2025, 2, 25)) }, // Março 2025
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
      calcularResumoDados(); // Recalcula resumo após importação de teste
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
              calcularResumoDados(); // Recalcula resumo após limpar o BD
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

  // --- Função para gerar dados para o relatório (agrupamento por mês, categoria, tipo) ---
  const gerarDadosParaRelatorio = useCallback(async () => {
    const transacoes = await buscarTransacoes() as Transacao[];

    const resumoMensal: Record<string, Record<string, {
      combinacoes: Record<string, { categoria: string; tipoTransacao: TipoTransacao; totalEntradas: number; totalSaidas: number; }>;
      totalEntradasMes: number;
      totalSaidasMes: number;
    }>> = {};

    transacoes.forEach(t => {
      const valorTotalTransacao = t.valor * t.quantidade;

      const [_, mes, ano] = t.data.split('/');
      const chaveMesAno = `${ano}-${mes}`;

      const chaveCombinacao = `${t.categoria}:::${t.tipo_transacao}`;

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
          categoria: t.categoria,
          tipoTransacao: t.tipo_transacao,
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
  }, []);

  // --- Função para gerar conteúdo HTML do relatório PDF ---
  const gerarConteudoHtmlRelatorio = useCallback(async () => {
    const { resumoMensal } = await gerarDadosParaRelatorio();
    const dataGeracao = new Date().toLocaleDateString('pt-BR');

    let htmlContent = `
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <title>Relatório Financeiro</title>
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
        <h1>Relatório Financeiro Detalhado</h1>
        <p style="text-align: center;">Gerado em: ${dataGeracao}</p>
    `;

    const meses = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const anosOrdenados = Object.keys(resumoMensal).sort();

    if (anosOrdenados.length === 0) {
      htmlContent += `<p style="text-align: center;">Nenhum dado disponível para o relatório.</p>`;
    } else {
      anosOrdenados.forEach(ano => {
        htmlContent += `
          <div class="section">
            <h2>Ano: ${ano}</h2>
        `;

        const mesesDoAnoOrdenados = Object.keys(resumoMensal[ano]).sort();

        mesesDoAnoOrdenados.forEach(chaveMesAno => {
          const [_, mesNumeroStr] = chaveMesAno.split('-');
          const mesIndex = parseInt(mesNumeroStr, 10) - 1;
          const nomeMes = meses[mesIndex];

          const dadosMes = resumoMensal[ano][chaveMesAno];
          const entradasMesReais = (dadosMes.totalEntradasMes / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          const saidasMesReais = (dadosMes.totalSaidasMes / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          const saldoMesReais = ((dadosMes.totalEntradasMes - dadosMes.totalSaidasMes) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

          htmlContent += `
            <div class="subsection">
              <h3>Mês: ${nomeMes} - ${ano}</h3>
              <p style="font-weight: bold;">Total Entradas do Mês: <span class="entry">${entradasMesReais}</span></p>
              <p style="font-weight: bold;">Total Saídas do Mês: <span class="exit">${saidasMesReais}</span></p>
              <p style="font-weight: bold;">Saldo do Mês: <span class="balance">${saldoMesReais}</span></p>

              <h4>Detalhes por Categoria e Tipo de Transação</h4>
              <table>
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Tipo de Transação</th>
                    <th>Entradas</th>
                    <th>Saídas</th>
                    <th>Saldo</th>
                  </tr>
                </thead>
                <tbody>
          `;

          type CategoriaTipoItem = {
            categoria: string;
            tipoTransacao: TipoTransacao;
            totalEntradas: number;
            totalSaidas: number;
          };

          const categoriaTipoItens: CategoriaTipoItem[] = Object.values(dadosMes.combinacoes);

          categoriaTipoItens.sort((a, b) => {
            const categoriaCompare = a.categoria.localeCompare(b.categoria);
            if (categoriaCompare !== 0) {
              return categoriaCompare;
            }
            return a.tipoTransacao.localeCompare(b.tipoTransacao);
          });

          if (categoriaTipoItens.length === 0) {
            htmlContent += `<tr><td colspan="5">Nenhum detalhe disponível para este mês.</td></tr>`;
          } else {
            categoriaTipoItens.forEach(item => {
              const entradasReais = (item.totalEntradas / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
              const saidasReais = (item.totalSaidas / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
              const saldoReais = ((item.totalEntradas - item.totalSaidas) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

              htmlContent += `
                <tr>
                  <td>${item.categoria}</td>
                  <td>${item.tipoTransacao}</td>
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
          <p>Relatório gerado pelo seu aplicativo financeiro.</p>
        </div>
      </body>
      </html>
    `;

    return htmlContent;
  }, []);

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



      <ButtonTT
        buttonStyle={{ marginVertical: 5 }}
        title="Gerar Relatório PDF"
        onPress={gerarRelatorioPdf}
        disabled={exportando}
        color={'#007bff'}
      />



      <View style={[styles.separator, { backgroundColor: colors.borderColor }]} />
      <Text style={[styles.subtitle, { color: colors.text }]}>Resumo Financeiro</Text>
      <View style={[styles.separator, { backgroundColor: colors.borderColor }]} />

      <View style={styles.resumoGeralContainer}>
        <Text style={[styles.resumoGeralLabel, { color: colors.text }]}>
          Valor Atual:
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

      <View style={[styles.separator, { backgroundColor: colors.borderColor }]} />
      <ButtonTT
        title="Resumo por Categoria"
        onPress={calcularResumoDados}
        disabled={carregandoResumo}
        color={colors.info}
      />

      <View style={[styles.separator, { backgroundColor: colors.borderColor }]} />

      {carregandoResumo ? (
        <Text style={{ color: colors.text }}>Calculando resumo...</Text>
      ) : (
        <>
          {Object.keys(resumoPorCategoria).length > 0 ? (
            Object.entries(resumoPorCategoria)
              .sort(([catA], [catB]) => catA.localeCompare(catB))
              .map(([categoria, dados]) => (
                <View key={categoria} style={styles.resumoItem}>
                  <Text style={[styles.resumoCategoria, { color: colors.text }]}>
                    {categoria}:
                  </Text>
                  <Text style={[styles.resumoValor, { color: colors.text }]}>
                    Total Entradas: {(dados.totalEntradasCategoria / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </Text>
                  <Text style={[styles.resumoValor, { color: colors.text }]}>
                    Total Saídas: {(dados.totalSaidasCategoria / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </Text>
                  <Text style={[styles.resumoValor, { color: colors.text }]}>
                    Saldo Atual: {((dados.totalEntradasCategoria - dados.totalSaidasCategoria) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </Text>
                  <View style={[styles.linhaDivisoria, { backgroundColor: colors.borderColor }]} />
                </View>
              ))
          ) : (
            <Text style={{ color: colors.text }}>Nenhum dado para resumir.</Text>
          )}
        </>
      )}

      <View style={[styles.separator, { backgroundColor: colors.borderColor }]} />
      <Text style={[styles.subtitle, { color: colors.text, marginTop: 10 }]}>Gerenciamento de Dados</Text>
      <View style={[styles.separator, { backgroundColor: colors.borderColor }]} />

      <View style={styles.bottomSpacer} />
      <ButtonTT
        buttonStyle={{ marginVertical: 5 }}
        displayButton={false}
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
  resumoItem: {
    marginBottom: 10,
  },
  resumoCategoria: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  resumoValor: {
    fontSize: 14,
    marginLeft: 10,
  },
  linhaDivisoria: {
    height: 1,
    marginTop: 5,
    marginBottom: 5,
  },
  bottomSpacer: {
    height: 50,
  },
});