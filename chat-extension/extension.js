const vscode = require('vscode');
const WebSocket = require('ws');

function activate(context) {
    console.log('Extension activating');

    let disposable = vscode.commands.registerCommand('chat-extension.startChat', () => {
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
        
        ws.on('message', data => {
            console.log('Message reçu du serveur:', data.toString());
            try {
                const parsedData = JSON.parse(data.toString());
                panel.webview.postMessage({
                    type: parsedData.type === 'user-message' ? 'sent' : 'received',
                    text: parsedData.content,
                    isToolOutput: parsedData.content.includes('[FILE]') || parsedData.content.includes('[DIR]')
                });
            } catch (error) {
                console.error('Erreur parsing message:', error);
            }
        });

        panel.webview.html = `<!DOCTYPE html>
        <html>
            <head>
                <style>
                    body { 
                        margin: 0; 
                        padding: 15px;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                    }
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
                        padding: 12px; 
                        border-radius: 10px;
                        max-width: 85%;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    }
                    .sent { 
                        background: var(--vscode-button-background); 
                        color: var(--vscode-button-foreground);
                        align-self: flex-end;
                    }
                    .received { 
                        background: var(--vscode-input-background);
                        align-self: flex-start;
                        width: 100%;
                    }
                    .tool-output {
                        font-family: monospace;
                        white-space: pre-wrap;
                        background: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 8px;
                        width: 100%;
                        box-sizing: border-box;
                        margin-top: 8px;
                    }
                    .tool-output-card {
                        background: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 10px;
                        margin-top: 10px;
                        width: 100%;
                        box-sizing: border-box;
                    }
                    .tool-output-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 8px 15px;
                        background: var(--vscode-editor-lineHighlightBackground);
                        border-bottom: 1px solid var(--vscode-input-border);
                        border-radius: 10px 10px 0 0;
                    }
                    .tool-output-title {
                        font-size: 12px;
                        color: var(--vscode-foreground);
                        font-weight: 500;
                    }
                    .tool-output-actions {
                        display: flex;
                        gap: 8px;
                    }
                    .tool-output-button {
                        padding: 4px 8px;
                        font-size: 11px;
                        color: var(--vscode-button-foreground);
                        background: var(--vscode-button-background);
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                    }
                    .tool-output-button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    .tool-output-content {
                        padding: 15px;
                    }
                    .tool-output-item {
                        display: flex;
                        align-items: center;
                        padding: 5px 0;
                        border-bottom: 1px solid var(--vscode-input-border);
                    }
                    .tool-output-item:last-child {
                        border-bottom: none;
                    }
                    .tool-output-icon {
                        margin-right: 10px;
                        color: var(--vscode-symbolIcon-folderForeground);
                    }
                    #messageInput {
                        padding: 12px;
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 8px;
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        font-size: 14px;
                        width: 100%;
                        box-sizing: border-box;
                    }
                    #messageInput:focus {
                        outline: none;
                        border-color: var(--vscode-focusBorder);
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

                    function formatToolOutput(content) {
                        const lines = content.split('\\n');
                        let html = '<div class="tool-output-card">';
                        
                        html += \`
                            <div class="tool-output-header">
                                <span class="tool-output-title">Directory Listing</span>
                                <div class="tool-output-actions">
                                    <button class="tool-output-button" onclick="copyToClipboard(this)">
                                        <span>📋</span> Copy
                                    </button>
                                    <button class="tool-output-button">
                                        <span>📥</span> Insert
                                    </button>
                                </div>
                            </div>
                            <div class="tool-output-content">
                        \`;
                        
                        lines.forEach(line => {
                            const isFile = line.includes('[FILE]');
                            const isDir = line.includes('[DIR]');
                            const name = line.replace('[FILE] ', '').replace('[DIR] ', '');
                            
                            if (isFile || isDir) {
                                html += \`
                                    <div class="tool-output-item">
                                        <span class="tool-output-icon">\${isDir ? '📁' : '📄'}</span>
                                        <span>\${name}</span>
                                    </div>
                                \`;
                            }
                        });
                        
                        html += '</div></div>';
                        return html;
                    }

                    function copyToClipboard(button) {
                        const card = button.closest('.tool-output-card');
                        const content = card.querySelector('.tool-output-content');
                        const text = Array.from(content.querySelectorAll('.tool-output-item'))
                            .map(item => item.textContent.trim())
                            .join('\\n');
                        
                        navigator.clipboard.writeText(text).then(() => {
                            const originalText = button.innerHTML;
                            button.innerHTML = '<span>✓</span> Copied!';
                            setTimeout(() => {
                                button.innerHTML = originalText;
                            }, 2000);
                        });
                    }

                    function addMessage(text, type, isToolOutput = false) {
                        const messageDiv = document.createElement('div');
                        messageDiv.className = 'message ' + type;
                        
                        if (isToolOutput) {
                            messageDiv.innerHTML = formatToolOutput(text);
                        } else {
                            messageDiv.textContent = text;
                        }
                        
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
                        addMessage(message.text, message.type, message.isToolOutput);
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

        panel.onDidDispose(() => {
            ws.close();
        });
    });

    context.subscriptions.push(disposable);
}

exports.activate = activate;