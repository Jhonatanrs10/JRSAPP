import { TextInput as DefaultTextInput, useColorScheme } from 'react-native';
import Colors from '../constants/Colors';

export type ThemedInputProps = DefaultTextInput['props'];

export function ThemedInput(props: ThemedInputProps) {
  const { style, ...otherProps } = props;
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];

  return (
    <DefaultTextInput
      style={[
        {
          color: colors.text,
          backgroundColor: colors.inputBackground,
          borderColor: colors.borderColor,
          borderWidth: 0,
          borderRadius: 0,
          padding: 10,
          fontSize: 16,
          height: 50,
          paddingHorizontal: 15
        },
        style,
      ]}
      placeholderTextColor={colors.text + '80'}
      {...otherProps}
    />
  );
} 