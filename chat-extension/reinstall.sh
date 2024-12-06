#!/bin/zsh

# Arrêter le script si une commande échoue
set -e

# Activer le mode verbose
set -x

# Fonction pour afficher les messages avec un préfixe
log() {
    echo "[Reinstall] $1"
}

# Définir le nom correct de l'extension
EXTENSION_NAME="younesbami.chat-extension"
VSIX_NAME="chat-extension-0.0.1.vsix"

# Se placer dans le répertoire du script
cd "$(dirname "$0")"

log "Désinstallation de l'ancienne version..."
/Applications/Visual\ Studio\ Code.app/Contents/Resources/app/bin/code --uninstall-extension "$EXTENSION_NAME" || true
/Applications/Visual\ Studio\ Code.app/Contents/Resources/app/bin/code --uninstall-extension "younesbami.vscode-chat-plugin" || true

log "Nettoyage des dépendances..."
rm -rf node_modules package-lock.json
rm -f *.vsix

log "Installation des dépendances..."
npm install

log "Construction du package..."
npm run package

log "Liste des fichiers générés..."
ls -la *.vsix

log "Installation de la nouvelle version..."
/Applications/Visual\ Studio\ Code.app/Contents/Resources/app/bin/code --install-extension "$VSIX_NAME"

log "Vérification de l'installation..."
/Applications/Visual\ Studio\ Code.app/Contents/Resources/app/bin/code --list-extensions --show-versions | grep -i chat

log "Installation terminée avec succès !"

# Désactiver le mode verbose
set +x
