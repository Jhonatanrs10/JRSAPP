import React, { useState, useEffect, useCallback } from 'react';
import ButtonTT from '../../components/Jhonatanrs/ButtonTT';
import AntDesign from '@expo/vector-icons/AntDesign';
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
  Modal, // Importar Modal
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { QuantityInput } from '@/src/components/QuantityInput';

type TipoTransacao = 'PIX' | 'Dinheiro' | 'Boleto' | 'Débito' | 'Crédito' | 'TED' | 'DOC' | 'Distinto';
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
  data: string;
}

export default function Input() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [descricao, setDescricao] = useState('');
  const [caixa, setCaixa] = useState('');
  const [categoria, setCategoria] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [valor, setValor] = useState('');
  const [tipoTransacao, setTipoTransacao] = useState<TipoTransacao>('PIX');
  const [acao, setAcao] = useState<Acao>('saida');
  const [data, setData] = useState('');
  const [caixas, setCaixas] = useState<string[]>([]);
  const [caixasFiltradas, setCaixasFiltradas] = useState<string[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [categoriasFiltradas, setCategoriasFiltradas] = useState<string[]>([]);
  const [mostrarCategoriaSugestao, setMostrarCategoriaSugestao] = useState(false); // Renomeado para clareza
  const [mostrarCaixaSugestao, setMostrarCaixaSugestao] = useState(false); // Renomeado para clareza
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDateObject, setSelectedDateObject] = useState<Date>(new Date());

  // NOVOS ESTADOS PARA MODAIS
  const [showCaixaModal, setShowCaixaModal] = useState(false);
  const [showCategoriaModal, setShowCategoriaModal] = useState(false);

  // Funções de incremento e decremento
  const handleIncrement = () => {
    const numericValue = parseInt(quantidade || '0', 10);
    setQuantidade(String(numericValue + 1));
  };

  const handleDecrement = () => {
    const numericValue = parseInt(quantidade || '0', 10);
    if (numericValue > 1) { // Evita valores negativos ou zero
      setQuantidade(String(numericValue - 1));
    }
  };

  // Funções de incremento e decremento2
  const handleIncrement2 = () => {
    const numericValue = parseInt(quantidade || '0', 10);
    setQuantidade(String(numericValue + 10));
  };

  const handleDecrement2 = () => {
    const numericValue = parseInt(quantidade || '0', 10);
    const calculatedValue = numericValue - 10;
    const newValue = Math.max(1, calculatedValue);
    setQuantidade(String(newValue));
};

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
    setCaixa('');
    setCategoria('');
    setQuantidade('1');
    setValor('');
    setTipoTransacao('PIX');
    setAcao('saida');
    const today = new Date();
    setData(getTodayDate());
    setSelectedDateObject(today);
    router.setParams({});
  }, [router, getTodayDate]);

  // Efeito para limpar campos quando a tab recebe foco
  useFocusEffect(
    useCallback(() => {
      if (!params.id) {
        limparCampos();
      }
    }, [params.id, limparCampos])
  );

  // Efeito para carregar dados quando houver params.id
  useEffect(() => {
    if (params.id) {
      console.log('Carregando valores iniciais:', params);

      setDescricao(params.descricao as string);
      setCaixa(params.caixa as string);
      setCategoria(params.categoria as string);
      setQuantidade(params.quantidade?.toString() ?? '');

      const valorNumerico = Number(params.valor);
      console.log('Valor numérico:', valorNumerico);
      setValor(formatarMoeda(valorNumerico));

      setTipoTransacao(params.tipo_transacao as TipoTransacao);
      setAcao(params.acao as Acao);
      setData(params.data as string);

      const [day, month, year] = (params.data as string).split('/').map(Number);
      setSelectedDateObject(new Date(year, month - 1, day));
    } else {
      const today = new Date();
      setData(getTodayDate());
      setSelectedDateObject(today);
    }
  }, [params.id, getTodayDate]);


  async function carregarCategorias() {
    try {
      const resultado = await buscarTransacoes();
      const categoriasUnicas = [...new Set((resultado as Transacao[]).map(t => t.categoria))];
      setCategorias(categoriasUnicas);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  }
  async function carregarCaixas() {
    try {
      const resultado = await buscarTransacoes();
      const caixasUnicas = [...new Set((resultado as Transacao[]).map(t => t.caixa))];
      setCaixas(caixasUnicas);
    } catch (error) {
      console.error('Erro ao carregar caixas:', error);
    }
  }

  useEffect(() => {
    carregarCategorias();
    carregarCaixas();
  }, []);

  function filtrarCategorias(texto: string) {
    const filtradas = categorias.filter(cat =>
      cat.toLowerCase().includes(texto.toLowerCase())
    );
    setCategoriasFiltradas(filtradas);
    setMostrarCategoriaSugestao(true);
  }

  function filtrarCaixas(texto: string) {
    const filtradas = caixas.filter(cat =>
      cat.toLowerCase().includes(texto.toLowerCase())
    );
    setCaixasFiltradas(filtradas);
    setMostrarCaixaSugestao(true);
  }


  const handleValorChange = (text: string) => {
    const valorFormatado = formatarInput(text);
    console.log('Valor formatado:', valorFormatado);
    setValor(valorFormatado);
  };

  const handleQuantidadeChange = (text: string) => {
    const numeros = text.replace(/\D/g, '');
    setQuantidade(numeros);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || selectedDateObject;
    setShowDatePicker(Platform.OS === 'ios');
    setSelectedDateObject(currentDate);
    setData(formatarData(currentDate));
  };

  async function salvar() {
    try {
      if (!descricao || !caixa || !categoria || !quantidade || !valor || !data) {
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
        caixa,
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
      router.replace('/input');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      Alert.alert('Erro', 'Não foi possível salvar a transação');
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 10}
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
      // Removendo nestedScrollEnabled aqui, pois o modal terá sua própria FlatList
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

        {/* Campo Caixa com Botão de Modal */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Caixa</Text>
          <View style={[
            styles.inputWithButtonContainer,
            {
              borderColor: colors.borderColor,
              backgroundColor: colors.inputBackground,
            }
          ]}>
            <ThemedInput
              value={caixa}
              editable={false}
              onChangeText={(text) => {
                setCaixa(text);
                // Você pode manter a filtragem de sugestões se quiser,
                // mas as sugestões que aparecem abaixo do input serão menos úteis
                // com o modal. Decidi remover o `onFocus` e `onBlur` aqui.
                filtrarCaixas(text);
              }}
              placeholder="Crie ou selecione um Caixa"
              placeholderTextColor={colors.text}
              style={styles.inputInsideButtonContainer}
            />
            <TouchableOpacity
              onPress={() => setShowCaixaModal(true)} // Abre o modal
              style={[styles.buttonOnRight, { width: 40, backgroundColor: colors.primary }]}
            >
              <AntDesign name="select1" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Campo Categoria com Botão de Modal */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Categoria</Text>
          <View style={[
            styles.inputWithButtonContainer,
            {
              borderColor: colors.borderColor,
              backgroundColor: colors.inputBackground,
            }
          ]}>
            <ThemedInput
              value={categoria}
              editable={false}
              onChangeText={(text) => {
                setCategoria(text);
                filtrarCategorias(text);
              }}
              placeholder="Crie ou selecione uma Categoria"
              placeholderTextColor={colors.text}
              style={styles.inputInsideButtonContainer}
            />
            <TouchableOpacity
              onPress={() => setShowCategoriaModal(true)} // Abre o modal
              style={[styles.buttonOnRight, { width: 40, backgroundColor: colors.primary }]}
            >
              <AntDesign name="select1" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Quantidade</Text>
          <QuantityInput
            value={quantidade}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            onIncrement2={handleIncrement2}
            onDecrement2={handleDecrement2}
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
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[styles.dateInputButton, { borderColor: colors.borderColor, backgroundColor: colors.inputBackground }]}>
            <Text style={[styles.dateInputText, { color: data ? colors.text : colors.text, backgroundColor: colors.inputBackground }]}>
              {data || "Selecionar Data"}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              style={{ backgroundColor: colors.inputBackground }}
              value={selectedDateObject}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}

          <ButtonTT
            buttonStyle={{ marginTop: 10 }}
            title="Hoje"
            onPress={() => {
              const today = new Date();
              setData(getTodayDate());
              setSelectedDateObject(today);
            }}
            color={colors.info}
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
          onPress={salvar}
          color={colors.success}
        />
      </View>

      {/* Modal para Caixa */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showCaixaModal}
        onRequestClose={() => setShowCaixaModal(false)}
      >
        <View style={styles.centeredView}>
          <View style={[styles.modalView, { backgroundColor: colors.background, borderColor: colors.borderColor }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Crie ou selecione um Caixa</Text>
            <ThemedInput
              placeholder="Buscar/Criar caixa..."
              value={caixa} // Usa o mesmo estado para a busca
              onChangeText={(text) => {
                setCaixa(text);
                filtrarCaixas(text);
              }}
              style={styles.modalSearchInput}
              placeholderTextColor={colors.text}
            />
            <FlatList
              data={caixasFiltradas.length > 0 ? caixasFiltradas : caixas} // Mostra filtradas se houver, senão todas
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    {
                      borderBottomColor: colors.borderColor,
                      backgroundColor: item === caixa ? `${colors.info}20` : 'transparent'
                    }
                  ]}
                  onPress={() => {
                    setCaixa(item);
                    setShowCaixaModal(false);
                  }}
                >
                  <Text style={{ color: colors.text }}>{item}</Text>
                </TouchableOpacity>
              )}
              style={styles.modalList}
            />
            <View style={{ flexDirection: 'row' }}>
              <ButtonTT title="Limpar" onPress={() => setCaixa('')} color={colors.info} />
              <ButtonTT title="Criar" onPress={() => setShowCaixaModal(false)} color={colors.success} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para Categoria */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showCategoriaModal}
        onRequestClose={() => setShowCategoriaModal(false)}
      >
        <View style={styles.centeredView}>
          <View style={[styles.modalView, { backgroundColor: colors.background, borderColor: colors.borderColor }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Crie ou selecione uma Categoria</Text>
            <ThemedInput
              placeholder="Buscar/Criar categoria..."
              value={categoria} // Usa o mesmo estado para a busca
              onChangeText={(text) => {
                setCategoria(text);
                filtrarCategorias(text);
              }}
              style={styles.modalSearchInput}
              placeholderTextColor={colors.text}
            />
            <FlatList
              data={categoriasFiltradas.length > 0 ? categoriasFiltradas : categorias} // Mostra filtradas se houver, senão todas
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    {
                      borderBottomColor: colors.borderColor,
                      backgroundColor: item === categoria ? `${colors.info}20` : 'transparent'
                    }
                  ]}
                  onPress={() => {
                    setCategoria(item);
                    setShowCategoriaModal(false);
                  }}
                >
                  <Text style={{ color: colors.text }}>{item}</Text>
                </TouchableOpacity>
              )}
              style={styles.modalList}
            />
            <View style={{ flexDirection: 'row' }}>
              <ButtonTT title="Limpar" onPress={() => setCategoria('')} color={colors.info} />
              <ButtonTT title="Criar" onPress={() => setShowCategoriaModal(false)} color={colors.success} />
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  formContainer: {
    flex: 1,
    marginBottom: 10,
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
    marginBottom: 10,
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
  // Novos estilos para o input com botão lateral
  inputWithButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
    borderRadius: 0,
    overflow: 'hidden',
    height: 60,
    minHeight: 60,
  },
  inputInsideButtonContainer: {
    flex: 1,
    borderWidth: 0, // Remove a borda do ThemedInput interno
    minHeight: 60,
  },
  buttonOnRight: {
    paddingHorizontal: 10,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 0,
    borderColor: '#ccc', // Uma borda sutil entre input e botão
  },
  dateInputButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    minHeight: 60,
    justifyContent: 'center',
  },
  dateInputText: {
    fontSize: 16,
  },
  // Estilos para o Modal
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', // Fundo escurecido
  },
  modalView: {
    margin: 20,
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%', // Largura do modal
    maxHeight: '80%', // Altura máxima para caber na tela
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalSearchInput: {
    width: '100%',
    marginBottom: 15,
    minHeight: 50,
  },
  modalList: {
    width: '100%',
    maxHeight: 300, // Altura máxima da lista no modal
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  modalItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});