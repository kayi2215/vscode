// Initialize vscode API
const vscode = acquireVsCodeApi();

function formatToolOutput(content) {
    console.log('Formatting content:', content);
    console.log('Content type:', typeof content);
    console.log('Content starts with "Contenu du fichier"?', content.startsWith('Contenu du fichier'));
    console.log('Content includes [FILE]?', content.includes('[FILE]'));
    console.log('Content includes [DIR]?', content.includes('[DIR]'));
    console.log('Content includes read_file?', content.includes('{"tool": "read_file"'));
    
    // Format file listing if the content matches the pattern
    if (content.includes('[FILE]') || content.includes('[DIR]')) {
        console.log('Detected file/dir pattern');
        const lines = content.split('\n');
        const formattedItems = [];
        
        for (const line of lines) {
            const items = line.split(' ').filter(item => item.trim());
            
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const nextItem = items[i + 1];
                
                if (item === '[FILE]' && nextItem) {
                    formattedItems.push(`<div class="file-item">📄 ${nextItem}</div>`);
                    i++; // Skip the next item as we've already processed it
                } else if (item === '[DIR]' && nextItem) {
                    formattedItems.push(`<div class="dir-item">📁 ${nextItem}</div>`);
                    i++; // Skip the next item as we've already processed it
                }
            }
        }
        
        // Encapsuler la liste des fichiers dans une carte d'outil
        return `
            <div class="tool-output-card">
                <div class="tool-output-header">
                    <span class="tool-output-title">Output</span>
                    <div class="tool-output-actions">
                        <button class="tool-output-button" onclick="copyToClipboard(this)">
                            <span class="button-icon">📋</span>
                            <span>Copy</span>
                        </button>
                        <button class="tool-output-button" onclick="insertToEditor(this)">
                            <span class="button-icon">📝</span>
                            <span>Insert</span>
                        </button>
                    </div>
                </div>
                <div class="tool-output">${formattedItems.join('')}</div>
            </div>
        `;
    } else if (content.startsWith('Contenu du fichier')) {
        console.log('Detected file content');
        // Extraire le nom du fichier et le contenu
        const fileNameMatch = content.match(/Contenu du fichier (.*?):/);
        console.log('File name match:', fileNameMatch);
        const fileName = fileNameMatch ? fileNameMatch[1] : 'fichier';
        console.log('File name:', fileName);
        const fileContent = content.substring(content.indexOf('\n') + 1);
        console.log('File content:', fileContent);
        
        // Retourner directement la carte de fichier sans l'encapsuler
        return `
            <div class="file-content-card">
                <div class="file-content-header">
                    <span class="file-name">📄 ${fileName}</span>
                    <div class="file-actions">
                        <button class="file-action-button" onclick="copyToClipboard(this.parentElement.parentElement.nextElementSibling)">
                            <span class="button-icon">📋</span>
                            <span>Copier</span>
                        </button>
                        <button class="file-action-button" onclick="insertToEditor(this.parentElement.parentElement.nextElementSibling)">
                            <span class="button-icon">📝</span>
                            <span>Insérer</span>
                        </button>
                    </div>
                </div>
                <pre class="file-content">${fileContent}</pre>
            </div>
        `;
    } else if (content.includes('{"tool": "read_file"')) {
        console.log('Detected read_file command');
        // Ne pas formater la commande JSON, attendre le contenu réel
        return '<div class="loading">Chargement du contenu du fichier...</div>';
    }

    // Pour tout autre contenu, utiliser la carte d'outil standard
    return `
        <div class="tool-output-card">
            <div class="tool-output-header">
                <span class="tool-output-title">Output</span>
                <div class="tool-output-actions">
                    <button class="tool-output-button" onclick="copyToClipboard(this)">
                        <span class="button-icon">📋</span>
                        <span>Copy</span>
                    </button>
                    <button class="tool-output-button" onclick="insertToEditor(this)">
                        <span class="button-icon">📝</span>
                        <span>Insert</span>
                    </button>
                </div>
            </div>
            <div class="tool-output">${content}</div>
        </div>
    `;
}

function addMessage(text, type, isToolOutput = false) {
    console.log('Adding message:', { text, type, isToolOutput });
    
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', type);
    
    if (isToolOutput) {
        console.log('Processing tool output');
        const temp = document.createElement('div');
        temp.innerHTML = formatToolOutput(text);
        const toolOutput = temp.firstElementChild;
        console.log('Tool output element:', toolOutput);
        if (toolOutput) {
            messageDiv.appendChild(toolOutput);
        } else {
            console.error('No tool output element found');
        }
    } else {
        messageDiv.textContent = text;
    }

    const messagesDiv = document.getElementById('messages');
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function copyToClipboard(button) {
    const card = button.closest('.tool-output-card');
    const content = card.querySelector('.tool-output').textContent;
    navigator.clipboard.writeText(content).then(() => {
        const span = button.querySelector('span:last-child');
        const originalText = span.textContent;
        span.textContent = 'Copied!';
        setTimeout(() => {
            span.textContent = originalText;
        }, 2000);
    });
}

function insertToEditor(button) {
    const card = button.closest('.tool-output-card');
    const content = card.querySelector('.tool-output').textContent;
    window.vscode.postMessage({
        command: 'insertToEditor',
        text: content
    });
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');

    function sendMessage() {
        const text = messageInput.value.trim();
        if (text) {
            // Afficher d'abord le message localement
            addMessage(text, 'sent');
            
            // Puis l'envoyer au serveur
            vscode.postMessage({
                command: 'sendMessage',
                text: text
            });
            messageInput.value = '';
        }
    }

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    sendButton.addEventListener('click', sendMessage);

    // Handle messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;
        console.log('Received message from extension:', message);
        switch (message.type) {
            case 'addMessage':
                // Ne pas ajouter le message si c'est un message utilisateur (déjà affiché)
                if (message.messageType !== 'user') {
                    addMessage(message.text, message.messageType === 'user' ? 'sent' : 'received');
                }
                break;
            case 'addToolResponse':
                addMessage(message.text, 'received', true);
                break;
            case 'error':
                addMessage(message.text, 'error');
                break;
        }
    });
});
