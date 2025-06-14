#!/bin/bash

# LINUX: Para auto-formatar o código no VS Code, use CTRL+SHIFT+I.
# No terminal, para formatar um arquivo bash, você pode usar shfmt.
# Exemplo de instalação no Arch Linux: sudo pacman -S shfmt
# Exemplo de uso: shfmt -w seu_script.sh

clear_screen() {
  printf "\033[2J\033[H" # Limpa a tela e move o cursor para o topo
}

show_menu() {
  clear_screen
  echo "-------------------------------------"
  echo "  Gerenciador de Projeto Expo Go"
  echo "-------------------------------------"
  echo "1. Instalar Dependências (npx expo install)"
  echo "2. Rodar o Projeto (npx expo start)"
  echo "3. Buildar APK (EAS Build)"
  echo "4. Abrir Pasta no VS Code (code .) e Fechar Terminal"
  echo "0. Sair"
  echo "-------------------------------------"
  echo -n "Escolha uma opção: "
}

install_dependencies() {
  echo ""
  echo "Instalando dependências do Expo..."
  # Certifique-se de estar na pasta raiz do seu projeto Expo
  npx expo install expo-sqlite@latest \
    react-native-paper@latest \
    react-native-async-storage/async-storage@latest \
    expo-sharing@latest \
    expo-file-system@latest \
    expo-document-picker@latest \
    expo-notifications@latest \
    @react-native-picker/picker@latest \
    expo-router@latest \
    @react-navigation/native@latest \
    zustand@latest \
    expo-clipboard@latest \
    expo-print@latest \
    expo-linear-gradient@latest \
    expo-camera@latest \
    expo-doctor@latest
  echo "Dependências instaladas."
  echo -n "Pressione ENTER para continuar..."
  read -r
}

run_project() {
  echo ""
  echo "Rodando o projeto Expo (npx expo start)..."
  npx expo start
  # O comando npx expo start vai abrir o Metro Bundler no terminal e no navegador.
  # Para voltar ao menu depois de parar o servidor (CTRL+C), o script precisa continuar.
  # Dependendo de como você parar o servidor, pode ser necessário rodar o script novamente.
}

build_apk() {
  echo ""
  echo "Iniciando o processo de build do APK com EAS Build..."
  echo "Certifique-se de estar logado na sua conta Expo."
  npx expo login

  echo ""
  echo "Configurando EAS Update (se ainda não estiver configurado)..."
  npx eas-cli@latest update:configure

  echo ""
  echo "Iniciando o build do APK (profile preview)..."
  echo "Isso pode levar um tempo. Você receberá um link para baixar o APK ao final."
  npx eas-cli@latest build -p android --profile preview

  echo ""
  echo "Lembrete: O arquivo eas.json deve estar na pasta raiz do seu projeto Expo."
  echo -n "Pressione ENTER para continuar..."
  read -r
}

open_vscode() {
  echo ""
  echo "Abrindo o projeto no VS Code (code .)..."
  # O comando 'code .' requer que o VS Code esteja instalado e que seu executável
  # esteja no PATH do sistema.
  code . & # O '&' executa o comando em segundo plano, liberando o terminal.
  sleep 1  # Pequena pausa para garantir que o VS Code comece a abrir
  exit 0   # Encerra o script e, por consequência, o terminal que o executou
}

# Loop principal do menu
while true; do
  show_menu
  read -r choice
  case "$choice" in
    1) install_dependencies ;;
    2) run_project ;;
    3) build_apk ;;
    4) open_vscode ;; # Opção para abrir VS Code e fechar terminal
    0)
      echo ""
      echo "Saindo. Até mais!"
      exit 0
      ;;
    *)
      echo ""
      echo "Opção inválida. Por favor, escolha um número válido."
      echo -n "Pressione ENTER para continuar..."
      read -r
      ;;
  esac
done