const vscode = require('vscode');
const WebSocket = require('ws');

let chatPanel;

function activate(context) {
    let disposable = vscode.commands.registerCommand('vscode-chat-plugin.startChat', () => {
        chatPanel = vscode.window.createWebviewPanel(
            'chatView',
            'Chat',
            vscode.ViewColumn.Two,
            { enableScripts: true }
        );

        chatPanel.webview.html = getWebviewContent();

        const ws = new WebSocket('ws://localhost:3001');

        ws.on('open', () => {
            chatPanel.webview.postMessage({
                type: 'status',
                message: 'Connecté'
            });
        });

        ws.on('message', (data) => {
            chatPanel.webview.postMessage({
                type: 'receiveMessage',
                message: data.toString()
            });
        });

        chatPanel.webview.onDidReceiveMessage(
            message => {
                if (message.command === 'sendMessage') {
                    ws.send(message.text);
                }
            },
            undefined,
            context.subscriptions
        );

        chatPanel.onDidDispose(() => {
            chatPanel = undefined;
            ws.close();
        });
    });

    context.subscriptions.push(disposable);
}

function getWebviewContent() {
    return `<!DOCTYPE html>
    <html>
    <head>
        <style>
            .message { margin: 10px; padding: 10px; }
            .sent { background: #dcf8c6; }
            .received { background: #e8e8e8; }
        </style>
    </head>
    <body>
        <div id="messages"></div>
        <input id="messageInput" type="text"/>
        <button onclick="sendMessage()">Envoyer</button>
        <script>
            const vscode = acquireVsCodeApi();
            const messageInput = document.getElementById('messageInput');
            
            function sendMessage() {
                const text = messageInput.value;
                if (text) {
                    vscode.postMessage({
                        command: 'sendMessage',
                        text: JSON.stringify({
                            type: 'user-message',
                            content: text
                        })
                    });
                    addMessage(text, 'sent');
                    messageInput.value = '';
                }
            }

            function addMessage(content, type) {
                const div = document.createElement('div');
                div.className = 'message ' + type;
                div.textContent = content;
                document.getElementById('messages').appendChild(div);
            }

            window.addEventListener('message', event => {
                const message = event.data;
                if (message.type === 'receiveMessage') {
                    try {
                        const parsed = JSON.parse(message.message);
                        addMessage(parsed.content, 'received');
                    } catch {
                        addMessage(message.message, 'received');
                    }
                }
            });

            messageInput.addEventListener('keypress', e => {
                if (e.key === 'Enter') sendMessage();
            });
        </script>
    </body>
    </html>`;
}

function deactivate() {}

module.exports = { activate, deactivate };