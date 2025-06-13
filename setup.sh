#!/usr/bin/env bash
#https://docs.expo.dev/more/create-expo/#--template
#LINUX CTRL+SHIFT+i AUTO FORMAT CODE

#CRIAR APK EXPO GO
#npx expo login
#npx eas-cli@latest update:configure
#npx eas-cli@latest build -p android --profile preview
#mova eas.json para a pasta root do app expo

#RECRIAR DO ZERO ATUALIZADO
#cd ..
#npx create-expo-app@latest JRSAPP --template tabs
#cd JRSAPP
#rm -r app
#rm -r assets
#rm -r components
#rm -r constants

npx expo install expo-sqlite@latest
npx expo install react-native-paper@latest
npx expo install react-native-async-storage/async-storage@latest
npx expo install expo-sharing@latest
npx expo install expo-file-system@latest
npx expo install expo-document-picker@latest
npx expo install expo-notifications@latest
npx expo install react-native-picker/picker@latest
npx expo install expo-router@latest
npx expo install react-navigation/native@latest
npx expo install zustand@latest
npx expo install expo-clipboard@latest
npx expo install expo-print@latest
npx expo install expo-linear-gradient@latest
npx expo install expo-camera@latest

#npx expo start
