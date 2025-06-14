import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import {
  StyleSheet,
  View, // Changed from ScrollView
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  Alert, // Make sure Alert is imported for any validation messages
} from 'react-native';

import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';

interface SeasonItem {
  id: number;
  value: string;
}

export interface DynamicSeasonInputRef {
  getFilledSeasons: () => number[];
  clearAllSeasons: () => void;
  setInitialSeasons: (values: number[]) => void;
}

interface DynamicSeasonInputProps {
  onChange: (seasons: number[]) => void;
  initialValues?: number[];
  style?: ViewStyle;
  textInputStyle?: TextStyle;
  labelStyle?: TextStyle;
  seasonContainerStyle?: ViewStyle;
  addButtonStyle?: ViewStyle;
  addButtonTextStyle?: TextStyle;
}

const DynamicSeasonInput = forwardRef<DynamicSeasonInputRef, DynamicSeasonInputProps>(
  (
    { onChange, initialValues = [], style, textInputStyle, labelStyle, seasonContainerStyle,
      addButtonStyle, addButtonTextStyle },
    ref
  ) => {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];

    const [seasons, setSeasons] = useState<SeasonItem[]>(() => {
      if (initialValues.length > 0) {
        const initialSeasonItems = initialValues.map((val, index) => ({
          id: index + 1,
          value: String(val),
        }));
        const lastInitialValue = initialSeasonItems[initialSeasonItems.length - 1];
        if (lastInitialValue && parseInt(lastInitialValue.value) > 0) {
          initialSeasonItems.push({ id: initialSeasonItems.length + 1, value: '' });
        }
        return initialSeasonItems;
      }
      return [{ id: 1, value: '' }];
    });

    // Removed scrollViewRef as ScrollView is no longer used.

    const getNextId = useCallback(() => {
      return seasons.length > 0 ? Math.max(...seasons.map(s => s.id)) + 1 : 1;
    }, [seasons]);

    const getParsedValues = useCallback((items: SeasonItem[]): number[] => {
      return items
        .filter(s => s.value !== '')
        .map(s => parseInt(s.value))
        .filter(value => !isNaN(value) && value > 0);
    }, []);

    useEffect(() => {
      const currentParsedValues = getParsedValues(seasons);
      onChange(currentParsedValues);
    }, [seasons, onChange, getParsedValues]);

    const handleSeasonChange = useCallback((id: number, text: string) => {
      const cleanedText = text.replace(/[^0-9]/g, '');

      setSeasons(prevSeasons => {
        let updatedSeasons = prevSeasons.map(season =>
          season.id === id ? { ...season, value: cleanedText } : season
        );

        const lastFilledIndex = updatedSeasons.reduce((acc, season, index) => {
          if (parseInt(season.value) > 0) return index;
          return acc;
        }, -1);

        if (lastFilledIndex !== updatedSeasons.length - 1 && lastFilledIndex !== -1) {
          updatedSeasons = updatedSeasons.slice(0, lastFilledIndex + 1);
        }

        const lastSeasonItem = updatedSeasons[updatedSeasons.length - 1];
        if (lastSeasonItem && parseInt(lastSeasonItem.value) > 0) {
          updatedSeasons.push({ id: getNextId(), value: '' });
        } else if (updatedSeasons.length === 0) {
          updatedSeasons.push({ id: getNextId(), value: '' });
        }

        return updatedSeasons;
      });
    }, [getNextId]);

    const addSeasonInput = useCallback(() => {
      setSeasons(prevSeasons => {
        const lastSeason = prevSeasons[prevSeasons.length - 1];
        if (lastSeason && parseInt(lastSeason.value) > 0) {
          return [...prevSeasons, { id: getNextId(), value: '' }];
        }
        return prevSeasons;
      });
    }, [getNextId]);

    const removeSeasonInput = useCallback((id: number) => {
      setSeasons(prevSeasons => {
        const updatedSeasons = prevSeasons.filter(season => season.id !== id);
        if (updatedSeasons.length === 0) {
          return [{ id: getNextId(), value: '' }];
        }
        return updatedSeasons;
      });
    }, [getNextId]);

    useImperativeHandle(ref, () => ({
      getFilledSeasons: () => getParsedValues(seasons),
      clearAllSeasons: () => {
        const defaultState = [{ id: getNextId(), value: '' }];
        setSeasons(defaultState);
      },
      setInitialSeasons: (newInitialValues = []) => {
        if (newInitialValues && newInitialValues.length > 0) {
          const initialSeasonItems = newInitialValues.map((val, index) => ({ id: getNextId() + index, value: String(val) }));
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

    // Removed useEffect for scrolling as ScrollView is no longer used.

    return (
      <KeyboardAvoidingView
        style={[styles.container, style]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View // Changed from ScrollView
          style={styles.contentContainer} // Using a simpler name, matching scrollViewContent
          // Removed keyboardShouldPersistTaps
        >
          {seasons.map((season, index) => (
            <View key={season.id}>
              <Text style={[styles.label, labelStyle, { color: colors.text }]}>Temporada {index + 1}:</Text>
              <View style={[styles.seasonGroup, seasonContainerStyle, { backgroundColor: colors.inputBackground}]}>
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
                  onBlur={() => {}}
                />
                {seasons.length > 1 && (
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
          {/* If you still want an explicit 'Add' button after changing to View, you'll need to uncomment/re-add it here */}
          {/*
          <TouchableOpacity
            onPress={addSeasonInput}
            style={[styles.addButton, addButtonStyle, { backgroundColor: colors.tint }]}
          >
            <Text style={[styles.addButtonText, addButtonTextStyle]}>Adicionar Temporada</Text>
          </TouchableOpacity>
          */}
        </View>
      </KeyboardAvoidingView>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  contentContainer: { // Renamed from scrollViewContent, removed scrollView
    flexGrow: 0, // To allow content to expand within KeyboardAvoidingView
    paddingBottom: 20,
  },
  seasonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    padding: 0,
    height: 60,
    borderRadius: 0,
    borderWidth: 0,
    borderColor: '#ccc'
  },
  label: {
    marginRight: 10,
    minWidth: 80,
    fontSize: 16,
    fontWeight: '500',
    marginBottom:10
  },
  input: {
    flex: 1,
    paddingHorizontal: 15,
    borderRadius: 0,
    borderWidth: 0,
    fontSize: 16,
  },
  removeButton: {
    margin: 20,
    width: 30,
    height: 30,
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
    marginTop: 10,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default DynamicSeasonInput;