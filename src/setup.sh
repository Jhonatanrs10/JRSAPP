#!/usr/bin/env bash
#https://docs.expo.dev/more/create-expo/#--template
#LINUX CTRL+SHIFT+i AUTO FORMAT CODE

#CRIAR APK EXPO GO
#npx expo login
#npx eas-cli@latest update:configure
#npx eas-cli@latest build -p android --profile preview
#mova eas.json para a pasta root do app expo

cd ..

npx create-expo-app@latest JRSAPP --template tabs

cd JRSAPP

npx expo install expo-sqlite 
npx expo install react-native-paper
npx expo install @react-native-async-storage/async-storage
npx expo install expo-sharing 
npx expo install expo-file-system
npx expo install expo-document-picker
npx expo install expo-notifications
npx expo install @react-native-picker/picker
npx expo install expo-router 
npx expo install @react-navigation/native 
npx expo install zustand
npx expo install expo-clipboard
npx expo install expo-print
npx expo install expo-linear-gradient
npx expo install expo-camera

rm -r app
rm -r assets
rm -r components
rm -r constants


#npx expo start
