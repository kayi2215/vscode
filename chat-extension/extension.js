const vscode = require('vscode');
const WebSocket = require('ws');

function activate(context) {
    console.log('Extension activating');

    let insertToEditorCommand = vscode.commands.registerCommand('chat-extension.insertToEditor', (text) => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            editor.edit(editBuilder => {
                const position = editor.selection.active;
                editBuilder.insert(position, text);
            });
        }
    });

    let disposable = vscode.commands.registerCommand('chat-extension.startChat', () => {
        const panel = vscode.window.createWebviewPanel(
            'chatView',
            'Chat',
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'media')
                ]
            }
        );

        // Get CSS URI
        const styleUri = panel.webview.asWebviewUri(
            vscode.Uri.joinPath(context.extensionUri, 'media', 'styles.css')
        );

        // Get script URI
        const scriptUri = panel.webview.asWebviewUri(
            vscode.Uri.joinPath(context.extensionUri, 'media', 'chat.js')
        );

        const ws = new WebSocket('ws://localhost:3001');

        ws.on('error', error => console.error('WebSocket error:', error));
        ws.on('open', () => console.log('WebSocket connected'));
        ws.on('close', () => console.log('WebSocket closed'));
        
        ws.on('message', data => {
            try {
                console.log('Received message:', data.toString());
                const message = JSON.parse(data);
                let content = message.content;
                
                // Si le contenu est un tableau, le convertir en chaîne
                if (Array.isArray(content)) {
                    content = content.join(' ');
                }
                
                // Si le contenu contient [FILE] ou [DIR], traiter comme tool_output
                if (content && (content.includes('[FILE]') || content.includes('[DIR]'))) {
                    console.log('Detected file listing, treating as tool output');
                    panel.webview.postMessage({
                        type: 'addToolResponse',
                        text: content
                    });
                } else if (message.type === 'tool_output') {
                    console.log('Processing tool output:', message);
                    panel.webview.postMessage({
                        type: 'addToolResponse',
                        text: content
                    });
                } else {
                    panel.webview.postMessage({
                        type: 'addMessage',
                        text: content,
                        messageType: message.type
                    });
                }
            } catch (error) {
                console.error('Error processing message:', error);
                panel.webview.postMessage({
                    type: 'error',
                    text: 'Error processing message: ' + error.message
                });
            }
        });

        panel.webview.html = getWebviewContent(styleUri, scriptUri);

        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'sendMessage':
                        console.log('Sending message to server:', message.text);
                        ws.send(JSON.stringify({
                            type: 'user-message',
                            content: message.text
                        }));
                        break;
                    case 'insertToEditor':
                        const editor = vscode.window.activeTextEditor;
                        if (editor) {
                            editor.edit(editBuilder => {
                                editBuilder.insert(editor.selection.active, message.text);
                            });
                        }
                        break;
                }
            },
            undefined,
            context.subscriptions
        );

        panel.onDidDispose(() => {
            ws.close();
        });
    });

    context.subscriptions.push(insertToEditorCommand);
    context.subscriptions.push(disposable);
}

function getWebviewContent(styleUri, scriptUri) {
    return `<!DOCTYPE html>
    <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="stylesheet" href="${styleUri}">
            <script src="${scriptUri}"></script>
        </head>
        <body>
            <div class="chat-container">
                <div id="messages"></div>
                <div class="input-container">
                    <input type="text" id="messageInput" placeholder="Type your message...">
                    <button id="sendButton">Send</button>
                </div>
            </div>
        </body>
    </html>`;
}

exports.activate = activate;