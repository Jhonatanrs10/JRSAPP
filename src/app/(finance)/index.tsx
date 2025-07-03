import { useState, useEffect, useCallback } from 'react';
import { Button, Alert, ScrollView, StyleSheet, TextInput, FlatList } from 'react-native'; // Importe FlatList
import { Text, View } from '../../components/Themed';
import { buscarTransacoes, deletarTransacao } from '../../database/db';
import { formatarMoeda } from '../../utils/formatacao';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';
import ButtonTT from '../../components/Jhonatanrs/ButtonTT'; // Ajuste o caminho se necessário

type TipoTransacao = 'PIX' | 'Dinheiro' | 'Boleto' | 'Débito' | 'Crédito' | 'TED' | 'DOC' | 'Distinto' ;
type Acao = 'entrada' | 'saida';

interface Transacao {
  id: number;
  descricao: string;
  caixa: string;
  categoria: string;
  quantidade: number;
  valor: number;
  tipo_transacao: TipoTransacao;
  acao: Acao;
  data: string; // Esperamos 'DD/MM/AAAA'
}

export default function Finance() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [busca, setBusca] = useState('');
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  async function carregarTransacoes() {
    try {
      const resultado = await buscarTransacoes();
      let transacoesCarregadas = resultado as Transacao[];

      // --- PONTO DE MUDANÇA: ORDENAR TRANSAÇÕES ---
      transacoesCarregadas.sort((a, b) => {
        // Converte a string 'DD/MM/AAAA' para 'AAAA-MM-DD' para comparação
        const dataA = a.data.split('/').reverse().join('-');
        const dataB = b.data.split('/').reverse().join('-');
        
        // Compara as datas (mais recente primeiro)
        if (dataA < dataB) return 1; // A é mais antiga que B, então B vem antes de A
        if (dataA > dataB) return -1; // A é mais recente que B, então A vem antes de B

        // Se as datas forem iguais, ordena por ID (opcional, mas bom para consistência)
        return b.id - a.id; // ID maior (mais recente) primeiro
      });
      // --- FIM DO PONTO DE MUDANÇA ---

      setTransacoes(transacoesCarregadas);
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
      Alert.alert('Erro', 'Não foi possível carregar as transações');
    }
  }

  useFocusEffect(
    useCallback(() => {
      carregarTransacoes();
    }, [])
  );

  async function confirmarExclusao(id: number) {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir esta transação?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletarTransacao(id);
              await carregarTransacoes(); // Recarrega e reordena após exclusão
            } catch (error) {
              console.error('Erro ao excluir:', error);
              Alert.alert('Erro', 'Não foi possível excluir a transação');
            }
          }
        }
      ]
    );
  }

  function editarTransacao(transacao: Transacao) {
    router.push({
      pathname: '/input',
      params: {
        id: transacao.id,
        descricao: transacao.descricao,
        caixa: transacao.caixa,
        categoria: transacao.categoria,
        quantidade: transacao.quantidade,
        valor: transacao.valor,
        tipo_transacao: transacao.tipo_transacao,
        acao: transacao.acao,
        data: transacao.data
      }
    });
  }

  // --- RECOMENDADO: Mudar para FlatList para melhor performance ---
  // Seus estilos de `transacaoContainer`, `transacaoHeader`, etc. seriam aplicados aqui.
  const renderItem = ({ item: transacao }: { item: Transacao }) => (
    <View 
      key={transacao.id} // FlatList já gerencia chaves, mas é bom ter no item renderizado
      style={[
        styles.transacaoContainer,
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
      <View style={[styles.transacaoHeader,{backgroundColor:colors.inputBackground}]}>
        <View style={[styles.transacaoInfoPrincipal,{backgroundColor:colors.inputBackground}]}>
          <Text style={[styles.transacaoDescricao, { color: colors.text }]}>
            {transacao.descricao}
          </Text>
          <Text style={[styles.transacaoCategoria, { color: colors.text }]}>
            {transacao.caixa}
          </Text>
          <Text style={[styles.transacaoCategoria, { color: colors.text }]}>
            {transacao.categoria}
          </Text>
        </View>
        <Text style={[
          styles.transacaoValor,
          { 
            color: transacao.acao === 'entrada' ? colors.success : colors.error,
            backgroundColor: transacao.acao === 'entrada' 
              ? `${colors.success}20` 
              : `${colors.error}20`,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 8,
            overflow: 'hidden'
          }
        ]}>
          {transacao.acao === 'entrada' ? '+' : '-'} {formatarMoeda(transacao.quantidade*transacao.valor)}
        </Text>
      </View>

      <View style={[styles.transacaoDetalhes, { borderTopColor: colors.borderColor, backgroundColor: colors.inputBackground }]}>
        <View style={[styles.detalheItem,{backgroundColor:colors.inputBackground}]}>
          <Text style={[styles.detalheLabel, { color: colors.text }]}>Quantidade:</Text>
          <Text style={[styles.detalheValor, { color: colors.text }]}>{transacao.quantidade}</Text>
        </View>
        <View style={[styles.detalheItem,{backgroundColor:colors.inputBackground}]}>
          <Text style={[styles.detalheLabel, { color: colors.text }]}>Tipo:</Text>
          <Text style={[styles.detalheValor, { color: colors.text }]}>{transacao.tipo_transacao}</Text>
        </View>
        <View style={[styles.detalheItem,{backgroundColor:colors.inputBackground}]}>
          <Text style={[styles.detalheLabel, { color: colors.text }]}>Data:</Text>
          <Text style={[styles.detalheValor, { color: colors.text }]}>{transacao.data}</Text>
        </View>
      </View>

      <View style={[styles.transacaoAcoes, { borderTopColor: colors.borderColor, backgroundColor: colors.inputBackground}]}>
        <ButtonTT 
          title="Editar" 
          onPress={() => editarTransacao(transacao)}
          color="info" // Use colorName com o nome da cor do seu Colors.ts
        />
        <ButtonTT 
          title="X" 
          onLongPress={() => confirmarExclusao(transacao.id)}
          color="error" // Use colorName com o nome da cor do seu Colors.ts
        />
      </View>
    </View>
  );

  const transacoesFiltradas = transacoes.filter(transacao => {
    const termoBusca = busca.toLowerCase();
    return (
      transacao.descricao.toLowerCase().includes(termoBusca) ||
      transacao.caixa.toLowerCase().includes(termoBusca) ||
      transacao.categoria.toLowerCase().includes(termoBusca) ||
      formatarMoeda(transacao.valor).includes(termoBusca)
    );
  });

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
          placeholder="Buscar transações..."
          placeholderTextColor={"gray"}
          value={busca}
          onChangeText={setBusca}
        />
      </View>

      <FlatList
        data={transacoesFiltradas}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.flatList} // Estilo para a FlatList
        contentContainerStyle={styles.flatListContent} // Estilo para o conteúdo dentro da FlatList
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
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
  // Novos estilos para FlatList
  flatList: {
    flex: 1,
    paddingHorizontal: 20, // Padding horizontal como no seu ScrollView
  },
  flatListContent: {
    paddingTop: 15, // Padding superior como no seu ScrollView
    paddingBottom: 20, // Adicione padding inferior para o último item não ficar colado
  },
  transacaoContainer: {
    borderRadius: 12,
    marginBottom: 25,
    overflow: 'hidden',
  },
  transacaoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  transacaoInfoPrincipal: {
    flex: 1,
    marginRight: 10,
  },
  transacaoDescricao: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  transacaoCategoria: {
    fontSize: 14,
    opacity: 0.8,
  },
  transacaoValor: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  transacaoDetalhes: {
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
    fontWeight: 'bold',
  },
  transacaoAcoes: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 15,
    borderTopWidth: 1,
  },
  spacer: {
    width: 10,
  },
});