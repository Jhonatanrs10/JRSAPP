import React, { useState, useEffect, useCallback } from 'react';
import ButtonTT from '../../components/Jhonatanrs/ButtonTT';
import {
  Button,
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Text, View } from '../../components/Themed';
import { ThemedInput } from '../../components/ThemedInput';
import { ThemedPicker } from '../../components/ThemedPicker';
import { buscarTransacoes, salvarTransacao, atualizarTransacao } from '../../database/db';
import { formatarMoeda, formatarInput, formatarData, validarData, converterParaCentavos } from '../../utils/formatacao';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';
import { useFocusEffect } from '@react-navigation/native';
// import { FontAwesome } from '@expo/vector-icons'; // Não está sendo usado neste arquivo

type TipoTransacao = 'PIX' | 'Dinheiro' | 'Boleto' | 'Débito' | 'Crédito' | 'TED' | 'DOC' | 'Distinto';
type Acao = 'entrada' | 'saida';

interface Transacao {
  id: number;
  descricao: string;
  categoria: string;
  quantidade: number;
  valor: number;
  tipo_transacao: TipoTransacao;
  acao: Acao;
  data: string;
}

export default function Input() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [valor, setValor] = useState('');
  const [tipoTransacao, setTipoTransacao] = useState<TipoTransacao>('PIX');
  const [acao, setAcao] = useState<Acao>('saida');
  const [data, setData] = useState('');
  const [categorias, setCategorias] = useState<string[]>([]);
  const [categoriasFiltradas, setCategoriasFiltradas] = useState<string[]>([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);

  // Função para obter a data atual formatada
  const getTodayDate = useCallback(() => {
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }, []);

  // Função para limpar os campos e voltar ao modo Nova Transação
  const limparCampos = useCallback(() => {
    setDescricao('');
    setCategoria('');
    setQuantidade('1');
    setValor('');
    setTipoTransacao('PIX');
    setAcao('saida');
    setData(getTodayDate()); // Define a data para hoje ao limpar
    // Limpa os parâmetros da rota
    router.setParams({});
  }, [router, getTodayDate]); // Adicionar getTodayDate às dependências

  // Efeito para limpar campos quando a tab recebe foco
  useFocusEffect(
    useCallback(() => {
      // Se não houver params.id, limpa os campos e os parâmetros
      if (!params.id) {
        limparCampos();
      }
    }, [params.id, limparCampos]) // Adicionar limparCampos às dependências
  );

  // Efeito para carregar dados quando houver params.id
  useEffect(() => {
    if (params.id) {
      console.log('Carregando valores iniciais:', params);

      // Carregar valores iniciais
      setDescricao(params.descricao as string);
      setCategoria(params.categoria as string);
      setQuantidade(params.quantidade?.toString() ?? '');

      // Formatar o valor inicial
      const valorNumerico = Number(params.valor);
      console.log('Valor numérico:', valorNumerico);
      setValor(formatarMoeda(valorNumerico));

      setTipoTransacao(params.tipo_transacao as TipoTransacao);
      setAcao(params.acao as Acao);
      setData(params.data as string);
    } else {
        // Se não houver params.id (nova transação), garanta que a data seja a de hoje
        setData(getTodayDate());
    }
  }, [params.id, getTodayDate]); // Adicionar getTodayDate às dependências


  async function carregarCategorias() {
    try {
      const resultado = await buscarTransacoes();
      const categoriasUnicas = [...new Set((resultado as Transacao[]).map(t => t.categoria))];
      setCategorias(categoriasUnicas);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  }

  useEffect(() => {
    carregarCategorias();
  }, []);

  function filtrarCategorias(texto: string) {
    const filtradas = categorias.filter(cat =>
      cat.toLowerCase().includes(texto.toLowerCase())
    );
    setCategoriasFiltradas(filtradas);
    setMostrarSugestoes(true);
  }

  // Função para formatar o valor ao digitar
  const handleValorChange = (text: string) => {
    const valorFormatado = formatarInput(text);
    console.log('Valor formatado:', valorFormatado);
    setValor(valorFormatado);
  };

  // Função para formatar a quantidade ao digitar
  const handleQuantidadeChange = (text: string) => {
    const numeros = text.replace(/\D/g, '');
    setQuantidade(numeros);
  };

  async function salvar() {
    try {
      if (!descricao || !categoria || !quantidade || !valor || !data) {
        Alert.alert('Erro', 'Preencha todos os campos');
        return;
      }

      if (!validarData(data)) {
        Alert.alert('Erro', 'Data inválida! Use o formato DD/MM/AAAA');
        return;
      }

      const valorNumerico = Number(valor.replace(/\D/g, ''));
      console.log('Valor a ser salvo:', valorNumerico);

      const transacao = {
        descricao,
        categoria,
        quantidade: Number(quantidade),
        valor: valorNumerico,
        tipo_transacao: tipoTransacao,
        acao,
        data
      };

      if (params.id) {
        console.log('Atualizando transação:', { id: params.id, ...transacao });
        await atualizarTransacao({
          id: Number(params.id),
          ...transacao
        });
      } else {
        console.log('Salvando nova transação:', transacao);
        await salvarTransacao(transacao);
      }

      Alert.alert('Sucesso', 'Transação salva com sucesso!');
      limparCampos();
      router.push('/');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      Alert.alert('Erro', 'Não foi possível salvar a transação');
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <Text style={[styles.title, { color: colors.text }]}>
        {params.id ? `Editar Transação (${params.id})` : 'Nova Transação'}
      </Text>
      <View style={[styles.separator, { backgroundColor: colors.borderColor }]} />

      <ScrollView
        style={styles.formContainer}
        showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Descrição da Transação</Text>
          <ThemedInput
            value={descricao}
            onChangeText={setDescricao}
            placeholder="Digite a descrição da transação"
            placeholderTextColor={colors.text}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Categoria</Text>
          <View style={{ position: 'relative' }}>
            <View style={[
              styles.categoriaInputContainer,
              {
                backgroundColor: colors.background,
                borderColor: colors.borderColor,
              }
            ]}>
              <ThemedInput
                value={categoria}
                onChangeText={(text) => {
                  setCategoria(text);
                  filtrarCategorias(text);
                }}
                onFocus={() => {
                  setCategoriasFiltradas(categorias);
                  setMostrarSugestoes(true);
                }}
                onBlur={() => {
                  setTimeout(() => setMostrarSugestoes(false), 200);
                }}
                placeholder="Digite ou selecione uma categoria"
                placeholderTextColor={colors.text}
                style={styles.categoriaInput}
              />
              {categoria ? (
                <TouchableOpacity
                  onPress={() => {
                    setCategoria('');
                    setCategoriasFiltradas(categorias);
                  }}
                  style={[styles.buttonInInput, { height: 60, backgroundColor: colors.inputBackground }]}
                >
                  <Text style={{ color: colors.text }}>✕</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.sugestaoIcon, { height: 60, backgroundColor: colors.inputBackground }]}></View>
              )}
            </View>
            {mostrarSugestoes && categoriasFiltradas.length > 0 && (
              <View style={[
                styles.sugestoesContainer,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.borderColor,
                  shadowColor: colors.text
                }
              ]}>
                <FlatList
                  data={categoriasFiltradas}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.sugestaoItem,
                        {
                          borderBottomColor: colors.borderColor,
                          backgroundColor: item === categoria ? `${colors.info}20` : 'transparent'
                        }
                      ]}
                      onPress={() => {
                        setCategoria(item);
                        setMostrarSugestoes(false);
                      }}
                    >
                      <Text style={{ color: colors.text }}>{item}</Text>
                    </TouchableOpacity>
                  )}
                  style={styles.sugestoesList}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                  scrollEnabled={false}
                />
              </View>
            )}
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Quantidade</Text>
          <ThemedInput
            value={quantidade}
            onChangeText={handleQuantidadeChange}
            keyboardType="numeric"
            placeholder="Digite a quantidade"
            placeholderTextColor={colors.text}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Valor</Text>
          <ThemedInput
            value={valor}
            onChangeText={handleValorChange}
            keyboardType="numeric"
            placeholder="R$ 0,00"
            placeholderTextColor={colors.text}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Tipo de Transação</Text>
          <ThemedPicker
            selectedValue={tipoTransacao}
            onValueChange={(value) => setTipoTransacao(value as TipoTransacao)}
          >
            <ThemedPicker.Item label="PIX" value="PIX" />
            <ThemedPicker.Item label="Dinheiro" value="Dinheiro" />
            <ThemedPicker.Item label="Boleto" value="Boleto" />
            <ThemedPicker.Item label="Débito" value="Débito" />
            <ThemedPicker.Item label="Crédito" value="Crédito" />
            <ThemedPicker.Item label="TED" value="TED" />
            <ThemedPicker.Item label="DOC" value="DOC" />
            <ThemedPicker.Item label="Distinto" value="Distinto" />
          </ThemedPicker>
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Ação</Text>
          <ThemedPicker
            selectedValue={acao}
            onValueChange={(value) => setAcao(value as Acao)}
          >
            <ThemedPicker.Item label="Entrada" value="entrada" />
            <ThemedPicker.Item label="Saída" value="saida" />
          </ThemedPicker>
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Data</Text>
          <ThemedInput
            value={data}
            onChangeText={(text) => {
              const dataFormatada = formatarData(text);
              setData(dataFormatada);
            }}
            placeholder="DD/MM/AAAA"
            placeholderTextColor={colors.text}
            keyboardType="numeric"
            maxLength={10}
          />
          <ButtonTT
          buttonStyle={{marginTop: 10}}
          title="Hoje"
          onPress={() => setData(getTodayDate())} // Define a data para hoje
          color={colors.info} // Use uma cor diferente, talvez 'info' ou 'primary'
        />
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        {params.id && (
          <ButtonTT
            title="Cancelar Edição"
            onPress={() => {
              limparCampos();
              router.push('/');
            }}
            color={colors.error}
          />
        )}
        <View style={styles.spacer} />
      
        <ButtonTT
          title={params.id ? "Salvar Alterações" : "Salvar"}
          onPress={salvar}
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
  formContainer: {
    flex: 1,
    marginBottom: 30,
  },
  formContent: {
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  separator: {
    height: 1,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 0,
  },
  spacer: {
    width: 10,
  },
  categoriaInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
    borderRadius: 0,
    overflow: 'hidden'
  },
  categoriaInput: {
    flex: 1,
    borderWidth: 0,
  },
  buttonInInput: {
    padding: 10,
    fontSize: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  sugestaoIcon: {
    padding: 16,
    fontSize: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  sugestoesContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 0,
    zIndex: 1000,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sugestoesList: {
    maxHeight: 200,
  },
  sugestaoItem: {
    padding: 12,
    height: 60,
    borderBottomWidth: 1,
  },
});