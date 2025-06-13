import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
  TextStyle,
  TouchableOpacity, // Importar TouchableOpacity para o botão de remover/adicionar
} from 'react-native';

import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';

// --- Interface para um item de temporada no estado local ---
interface SeasonItem {
  id: number; // ID único para o React key
  value: string; // Valor do input (string, pois o TextInput retorna string)
}

// --- Ref type para o componente pai ---
export interface DynamicSeasonInputRef {
  getFilledSeasons: () => number[]; // Retorna apenas os números válidos
  clearAllSeasons: () => void;
  setInitialSeasons: (values: number[]) => void;
}

// --- Props do componente ---
interface DynamicSeasonInputProps {
  onChange: (seasons: number[]) => void;
  initialValues?: number[];
  style?: ViewStyle;
  textInputStyle?: TextStyle;
  labelStyle?: TextStyle;
  seasonContainerStyle?: ViewStyle;
  addButtonStyle?: ViewStyle; // Novo estilo para o botão de adicionar
  addButtonTextStyle?: TextStyle; // Novo estilo para o texto do botão de adicionar
}

const DynamicSeasonInput = forwardRef<DynamicSeasonInputRef, DynamicSeasonInputProps>(
  (
    { onChange, initialValues = [], style, textInputStyle, labelStyle, seasonContainerStyle,
      addButtonStyle, addButtonTextStyle },
    ref
  ) => {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];

    // --- Estado local para as temporadas ---
    const [seasons, setSeasons] = useState<SeasonItem[]>(() => {
      // Inicializa o estado uma única vez na montagem inicial
      if (initialValues.length > 0) {
        // Mapeia initialValues para SeasonItem, garantindo IDs únicos
        const initialSeasonItems = initialValues.map((val, index) => ({
          id: index + 1, // IDs simples para começar
          value: String(val),
        }));
        // Adiciona um campo vazio extra se o último valor inicial for válido (convenção de UI)
        const lastInitialValue = initialSeasonItems[initialSeasonItems.length - 1];
        if (lastInitialValue && parseInt(lastInitialValue.value) > 0) {
          initialSeasonItems.push({ id: initialSeasonItems.length + 1, value: '' });
        }
        return initialSeasonItems;
      }
      return [{ id: 1, value: '' }]; // Estado inicial padrão
    });

    const scrollViewRef = useRef<ScrollView | null>(null);

    // --- Funções auxiliares para manipulação do estado ---
    const getNextId = useCallback(() => {
      return seasons.length > 0 ? Math.max(...seasons.map(s => s.id)) + 1 : 1;
    }, [seasons]);

    const getParsedValues = useCallback((items: SeasonItem[]): number[] => {
      return items
        .filter(s => s.value !== '') // Remove campos vazios
        .map(s => parseInt(s.value))
        .filter(value => !isNaN(value) && value > 0); // Remove NaN e valores <= 0
    }, []);

    // --- Efeito para notificar o componente pai sobre mudanças no estado interno ---
    // Este useEffect é crucial para sincronizar o estado local com o pai
    useEffect(() => {
      const currentParsedValues = getParsedValues(seasons);
      onChange(currentParsedValues);
    }, [seasons, onChange, getParsedValues]); // Depende de `seasons` para disparar sempre que o estado interno mudar

    // --- Funções de manipulação de temporada ---
    const handleSeasonChange = useCallback((id: number, text: string) => {
      const cleanedText = text.replace(/[^0-9]/g, ''); // Apenas números

      setSeasons(prevSeasons => {
        let updatedSeasons = prevSeasons.map(season =>
          season.id === id ? { ...season, value: cleanedText } : season
        );

        // Lógica para adicionar um novo campo vazio se o último campo preenchido tiver valor > 0
        const lastFilledIndex = updatedSeasons.reduce((acc, season, index) => {
          if (parseInt(season.value) > 0) return index;
          return acc;
        }, -1);

        // Se o último campo preenchido não for o último campo na lista, remove os campos vazios após ele
        if (lastFilledIndex !== updatedSeasons.length - 1 && lastFilledIndex !== -1) {
          updatedSeasons = updatedSeasons.slice(0, lastFilledIndex + 1);
        }

        // Sempre garante pelo menos um campo vazio no final se o último preenchido for válido
        const lastSeasonItem = updatedSeasons[updatedSeasons.length - 1];
        if (lastSeasonItem && parseInt(lastSeasonItem.value) > 0) {
          updatedSeasons.push({ id: getNextId(), value: '' });
        } else if (updatedSeasons.length === 0) {
          // Se todos os campos forem removidos ou o array ficar vazio, adiciona um campo vazio
          updatedSeasons.push({ id: getNextId(), value: '' });
        }

        return updatedSeasons;
      });
    }, [getNextId]);

    const addSeasonInput = useCallback(() => {
      setSeasons(prevSeasons => {
        const lastSeason = prevSeasons[prevSeasons.length - 1];
        // Adiciona um novo campo vazio APENAS se o último campo existente não estiver vazio E for válido
        if (lastSeason && parseInt(lastSeason.value) > 0) {
          return [...prevSeasons, { id: getNextId(), value: '' }];
        }
        // Se o último campo estiver vazio ou inválido, não adiciona um novo
        return prevSeasons;
      });
    }, [getNextId]);

    const removeSeasonInput = useCallback((id: number) => {
      setSeasons(prevSeasons => {
        const updatedSeasons = prevSeasons.filter(season => season.id !== id);
        // Se remover todos os campos, garante que pelo menos um campo vazio exista
        if (updatedSeasons.length === 0) {
          return [{ id: getNextId(), value: '' }];
        }
        return updatedSeasons;
      });
    }, [getNextId]);

    // --- Expondo métodos para o componente pai via ref ---
    useImperativeHandle(ref, () => ({
      getFilledSeasons: () => getParsedValues(seasons), // Retorna apenas os valores numéricos válidos
      clearAllSeasons: () => {
        const defaultState = [{ id: getNextId(), value: '' }];
        setSeasons(defaultState);
      },
      setInitialSeasons: (newInitialValues = []) => {
        if (newInitialValues && newInitialValues.length > 0) {
          const initialSeasonItems = newInitialValues.map((val, index) => ({ id: getNextId() + index, value: String(val) })); // Garante IDs únicos
          const lastInitialValue = initialSeasonItems[initialSeasonItems.length - 1];
          if (lastInitialValue && parseInt(lastInitialValue.value) > 0) {
            initialSeasonItems.push({ id: getNextId() + initialSeasonItems.length, value: '' });
          }
          setSeasons(initialSeasonItems);
        } else {
          setSeasons([{ id: getNextId(), value: '' }]);
        }
      },
    }));

    // Scrolla para o final quando um novo campo é adicionado
    useEffect(() => {
      // Pequeno atraso para garantir que o layout foi atualizado
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return () => clearTimeout(timer);
    }, [seasons.length]); // Dispara quando a quantidade de temporadas muda

    return (
      <KeyboardAvoidingView
        style={[styles.container, style]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled" // Permite tocar em outros elementos quando o teclado está aberto
        >
          {seasons.map((season, index) => (
            <View key={season.id} >
              <Text style={[styles.label, labelStyle, { color: colors.text }]}>Temporada {index + 1}:</Text>
              <View style={[styles.seasonGroup, seasonContainerStyle, { backgroundColor: colors.inputBackground }]}>
                <TextInput
                  style={[
                    styles.input,
                    textInputStyle,
                    {
                      borderColor: colors.borderColor,
                      color: colors.text,
                      backgroundColor: colors.inputBackground,
                    },
                  ]}
                  onChangeText={text => handleSeasonChange(season.id, text)}
                  value={season.value}
                  keyboardType="numeric"
                  placeholder={`Número de Episódios`}
                  placeholderTextColor={colors.text}
                  onBlur={() => { /* A adição automática não é mais aqui, mas em handleSeasonChange ou botão */ }}
                />
                {seasons.length > 1 && ( // Permite remover se houver mais de uma temporada
                  <TouchableOpacity
                    onPress={() => removeSeasonInput(season.id)}
                    style={[styles.removeButton, { backgroundColor: colors.error }]}
                  >
                    <Text style={styles.removeButtonText}>X</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}

        </ScrollView>
      </KeyboardAvoidingView>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollViewContent: {
    paddingBottom: 20, // Espaço para o botão de adicionar no final
  },
  seasonGroup: {
    flexDirection: 'row', // Botão e input na mesma linha
    alignItems: 'center',
    marginBottom: 15,
    padding: 0,
    borderRadius: 0,
    borderWidth: 0,
    borderColor: '#ccc' // Padrão
    // Removidos backgrounds hardcoded, use 'seasonContainerStyle'
  },
  label: {
    marginRight: 10,
    minWidth: 80, // Espaço para "Temporada X:"
    fontSize: 16,
    fontWeight: '500',
    marginBottom:10
    // Removidos backgrounds hardcoded, use 'labelStyle'
  },
  input: {
    flex: 1, // Ocupa o restante do espaço
    height: 50,
    paddingHorizontal: 15,
    borderRadius: 0,
    borderWidth: 0,
    fontSize: 16,
    // Removidos backgrounds hardcoded, use 'textInputStyle'
  },
  removeButton: {
    backgroundColor:'red',
    margin: 5,
    width: 25,
    height: 25,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  addButton: {
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10, // Espaço entre o último campo e o botão
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default DynamicSeasonInput;