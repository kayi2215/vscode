// Initialize vscode API
const vscode = acquireVsCodeApi();

function formatToolOutput(content) {
    console.log('Formatting content:', content);
    
    // Format file listing if the content matches the pattern
    if (content.includes('[FILE]') || content.includes('[DIR]')) {
        console.log('Detected file/dir pattern');
        // Séparer d'abord par les retours à la ligne, puis par les espaces
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
        
        console.log('Formatted items:', formattedItems);
        content = formattedItems.join(''); // Pas besoin d'espaces car chaque élément est dans un div
    }

    const output = `
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
    console.log('Final output:', output);
    return output;
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
