import '../../i18n/i18n';
import { useTranslation } from 'react-i18next';
import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';

export default function Layout() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  return (
    <Tabs
      screenOptions={{
        headerShown: true, // Oculta o cabeçalho padrão, se desejar
        tabBarActiveTintColor: colors.info, // Cor do ícone/texto da aba ativa
        tabBarInactiveTintColor: colors.tabIconDefault, // Cor do ícone/texto da aba inativa
        tabBarStyle: {
          paddingTop: 2,
          backgroundColor: colors.background, // Cor de fundo da barra de abas
          borderTopColor: colors.borderColor, // Cor da borda superior da barra de abas
        },
        headerStyle: {
          borderBottomWidth: 1, // Largura da borda inferior (fina)
        },
        // Adicione esta propriedade para ocultar o rótulo de texto
        tabBarShowLabel: false,

        //headerTitle: 'Finanças', // Este é o título padrão, pode ser ajustado para ser mais genérico ou removido.
      }}
    >

      <Tabs.Screen
        name="index"
        options={{
          title: t('finance_tab.index'),
          tabBarIcon: ({ color }) => <FontAwesome name="bars" size={30} color={color} />
        }}
      />
      <Tabs.Screen
        name="input"
        options={{
          title: t('finance_tab.input'),
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="plus-circle" size={30} color={color} />
        }}
      />

      <Tabs.Screen
        name="import"
        options={{
          title: t('finance_tab.import'),
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="cog" size={30} color={color} />
        }}
      />
    </Tabs>
  );
}