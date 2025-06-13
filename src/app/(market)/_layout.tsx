import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';
import { useClientOnlyValue } from '../../components/useClientOnlyValue';

import { HistoryProvider } from '../../contexts/HistoryContext';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <HistoryProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: useClientOnlyValue(false, true),
          headerTitle: 'Mercado',
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Add',
            tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
          }}
        />
        <Tabs.Screen
          name="two"
          options={{
            title: 'History',
            tabBarIcon: ({ color }) => <TabBarIcon name="list" color={color} />,
          }}
        />
        <Tabs.Screen
  name="products"
  options={{
    title: 'Products',
    tabBarIcon: ({ color }) => <TabBarIcon name="list" color={color} />,
  }}
/>

      </Tabs>
    </HistoryProvider>
  );
}
