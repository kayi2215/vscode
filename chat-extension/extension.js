const vscode = require('vscode');
const WebSocket = require('ws');

let chatPanel = undefined;

function activate(context) {
    console.log('Chat Plugin is now active!');
    
    // Register the command
    let disposable = vscode.commands.registerCommand('vscode-chat-plugin.startChat', () => {
        console.log('Start Chat command executed');
        vscode.window.showInformationMessage('Starting chat...');
        
        try {
            if (chatPanel) {
                chatPanel.reveal(vscode.ViewColumn.Two);
                return;
            }

            // Créer un nouveau panel
            chatPanel = vscode.window.createWebviewPanel(
                'chatView',
                'Chat',
                vscode.ViewColumn.Two,
                {
                    enableScripts: true
                }
            );

            // Contenu HTML du chat
            chatPanel.webview.html = getWebviewContent();
            vscode.window.showInformationMessage('Chat panel created successfully!');

        } catch (error) {
            console.error('Error creating chat panel:', error);
            vscode.window.showErrorMessage('Failed to create chat panel: ' + error.message);
        }

        // Connexion WebSocket
        const ws = new WebSocket('ws://localhost:3000');

        ws.on('open', () => {
            console.log('Connected to chat server');
            chatPanel.webview.postMessage({
                type: 'status',
                message: 'Connecté au serveur de chat'
            });
        });

        ws.on('message', (data) => {
            console.log('Received from server:', data.toString());
            // Envoyer le message reçu au webview
            chatPanel.webview.postMessage({
                type: 'receiveMessage',
                message: data.toString()
            });
        });

        // Gérer les messages du webview
        chatPanel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'sendMessage':
                        console.log('Sending to server:', message.text);
                        ws.send(message.text);
                        return;
                }
            },
            undefined,
            context.subscriptions
        );

        chatPanel.onDidDispose(
            () => {
                chatPanel = undefined;
                ws.close();
            },
            null,
            context.subscriptions
        );
    });

    context.subscriptions.push(disposable);
    vscode.window.showInformationMessage('Chat Plugin is ready! Use Command+Shift+C to open chat.');
}

function getWebviewContent() {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Chat</title>
        <style>
            body {
                margin: 0;
                padding: 15px;
                background: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
            }
            #chat-container {
                display: flex;
                flex-direction: column;
                height: calc(100vh - 30px);
            }
            #messages {
                flex-grow: 1;
                overflow-y: auto;
                margin-bottom: 15px;
                padding: 10px;
                border: 1px solid var(--vscode-input-border);
                border-radius: 4px;
            }
            .message {
                margin: 5px 0;
                padding: 8px;
                border-radius: 4px;
                background: var(--vscode-input-background);
                word-wrap: break-word;
            }
            .message.sent {
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                margin-left: 20%;
            }
            .message.received {
                background: var(--vscode-input-background);
                margin-right: 20%;
            }
            #input-container {
                display: flex;
                gap: 10px;
            }
            #message-input {
                flex-grow: 1;
                padding: 8px;
                border: 1px solid var(--vscode-input-border);
                background: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border-radius: 4px;
            }
            button {
                padding: 8px 15px;
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }
            button:hover {
                background: var(--vscode-button-hoverBackground);
            }
            .status {
                text-align: center;
                color: var(--vscode-descriptionForeground);
                margin: 5px 0;
                font-style: italic;
            }
        </style>
    </head>
    <body>
        <div id="chat-container">
            <div id="messages"></div>
            <div id="input-container">
                <input type="text" id="message-input" placeholder="Tapez votre message...">
                <button id="send-button">Envoyer</button>
            </div>
        </div>
        <script>
            const vscode = acquireVsCodeApi();
            const messagesContainer = document.getElementById('messages');
            const messageInput = document.getElementById('message-input');
            const sendButton = document.getElementById('send-button');

            function addMessage(content, type = 'received') {
                const messageElement = document.createElement('div');
                messageElement.className = 'message ' + type;
                messageElement.textContent = content;
                messagesContainer.appendChild(messageElement);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }

            function addStatus(content) {
                const statusElement = document.createElement('div');
                statusElement.className = 'status';
                statusElement.textContent = content;
                messagesContainer.appendChild(statusElement);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }

            function sendMessage() {
                const message = messageInput.value.trim();
                if (message) {
                    addMessage(message, 'sent');
                    vscode.postMessage({
                        command: 'sendMessage',
                        text: JSON.stringify({
                            type: 'user-message',
                            content: message
                        })
                    });
                    messageInput.value = '';
                }
            }

            sendButton.addEventListener('click', sendMessage);
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            });

            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.type) {
                    case 'receiveMessage':
                        try {
                            const parsedMessage = JSON.parse(message.message);
                            if (parsedMessage.type === 'ai-message') {
                                addMessage(parsedMessage.content, 'received');
                            } else if (parsedMessage.type === 'error') {
                                addStatus(parsedMessage.content);
                            }
                        } catch (e) {
                            addMessage(message.message, 'received');
                        }
                        break;
                    case 'status':
                        addStatus(message.message);
                        break;
                }
            });

            // Ajouter un message initial
            addStatus('Connexion au serveur de chat...');
        </script>
    </body>
    </html>`;
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
