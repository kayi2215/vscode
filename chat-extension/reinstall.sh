#!/bin/zsh

# Arrêter le script si une commande échoue
set -e

# Fonction pour afficher les messages avec un préfixe
log() {
    echo "[Reinstall] $1"
}

# Définir le nom correct de l'extension
EXTENSION_NAME="younesbami.vscode-chat-plugin"
VSIX_NAME="vscode-chat-plugin-0.0.1.vsix"

# Se placer dans le répertoire du script
cd "$(dirname "$0")"

log "Désinstallation de l'ancienne version..."
/Applications/Visual\ Studio\ Code.app/Contents/Resources/app/bin/code --uninstall-extension "$EXTENSION_NAME" || true

log "Nettoyage des dépendances..."
rm -rf node_modules package-lock.json
rm -f *.vsix

log "Installation des dépendances..."
npm install

log "Construction du package..."
npm run package

log "Installation de la nouvelle version..."
/Applications/Visual\ Studio\ Code.app/Contents/Resources/app/bin/code --install-extension "$VSIX_NAME"

log "Installation terminée avec succès !"
