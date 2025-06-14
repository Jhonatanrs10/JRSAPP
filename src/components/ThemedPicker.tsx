import { Picker as DefaultPicker } from '@react-native-picker/picker';
import Colors from '../constants/Colors';
import { useColorScheme } from '../components/useColorScheme';

export type ThemedPickerProps = DefaultPicker<string>['props'];

export function ThemedPicker(props: ThemedPickerProps) {
  const { style, ...otherProps } = props;
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];

  return (
    <DefaultPicker
      style={[
        style,
        {
          color: colors.text,
          backgroundColor: colors.inputBackground,
          borderColor: colors.borderColor,
          borderWidth: 0,
          borderRadius: 0,
          padding: 0,
          margin: 0,
          fontSize: 16,
          height: 60,
        },
      ]}
      {...otherProps}
    />
  );
}

// Adicionar o Item do Picker
ThemedPicker.Item = DefaultPicker.Item; 