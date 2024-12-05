const vscode = require('vscode');
const WebSocket = require('ws');

function activate(context) {
    console.log('Extension activating');

    let disposable = vscode.commands.registerCommand('vscode-chat-plugin.startChat', () => {
        const panel = vscode.window.createWebviewPanel(
            'chatView',
            'Chat',
            vscode.ViewColumn.Two,
            { enableScripts: true }
        );

        const ws = new WebSocket('ws://localhost:3001');

        ws.on('error', error => console.error('WebSocket error:', error));
        ws.on('open', () => console.log('WebSocket connected'));
        ws.on('close', () => console.log('WebSocket closed'));
        
        // Gérer les messages reçus du serveur
        ws.on('message', data => {
            console.log('Message reçu du serveur:', data.toString());
            try {
                const parsedData = JSON.parse(data.toString());
                panel.webview.postMessage({
                    type: parsedData.type === 'user-message' ? 'sent' : 'received',
                    text: parsedData.content
                });
            } catch (error) {
                console.error('Erreur parsing message:', error);
            }
        });

        panel.webview.html = `<!DOCTYPE html>
        <html>
            <head>
                <style>
                    body { margin: 0; padding: 15px; }
                    .chat-container { 
                        height: 100vh; 
                        display: flex; 
                        flex-direction: column; 
                    }
                    #messages { 
                        flex-grow: 1; 
                        overflow-y: auto; 
                        margin-bottom: 15px;
                        display: flex;
                        flex-direction: column;
                    }
                    .message { 
                        margin: 5px 0; 
                        padding: 8px; 
                        border-radius: 4px;
                        max-width: 80%;
                    }
                    .sent { 
                        background: var(--vscode-button-background); 
                        color: var(--vscode-button-foreground);
                        align-self: flex-end;
                    }
                    .received { 
                        background: var(--vscode-input-background);
                        align-self: flex-start;
                    }
                    #messageInput {
                        padding: 8px;
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 4px;
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                    }
                </style>
            </head>
            <body>
                <div class="chat-container">
                    <div id="messages"></div>
                    <input type="text" id="messageInput" placeholder="Tapez votre message..." />
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    const messageInput = document.getElementById('messageInput');
                    const messagesDiv = document.getElementById('messages');

                    function addMessage(text, type) {
                        const messageDiv = document.createElement('div');
                        messageDiv.textContent = text;
                        messageDiv.className = 'message ' + type;
                        messagesDiv.appendChild(messageDiv);
                        messagesDiv.scrollTop = messagesDiv.scrollHeight;
                    }

                    messageInput.addEventListener('keypress', e => {
                        if (e.key === 'Enter' && messageInput.value.trim()) {
                            const text = messageInput.value.trim();
                            addMessage(text, 'sent');
                            vscode.postMessage({
                                command: 'sendMessage',
                                text: JSON.stringify({
                                    type: 'user-message',
                                    content: text
                                })
                            });
                            messageInput.value = '';
                        }
                    });

                    window.addEventListener('message', event => {
                        const message = event.data;
                        addMessage(message.text, message.type);
                    });
                </script>
            </body>
        </html>`;

        panel.webview.onDidReceiveMessage(
            message => {
                if (message.command === 'sendMessage') {
                    console.log('Envoi au serveur:', message.text);
                    ws.send(message.text);
                }
            },
            undefined,
            context.subscriptions
        );

        // Nettoyer la connexion WebSocket à la fermeture
        panel.onDidDispose(() => {
            ws.close();
        });
    });

    context.subscriptions.push(disposable);
}

exports.activate = activate;