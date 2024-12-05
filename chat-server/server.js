const WebSocket = require('ws');
const AIHandler = require('./ai-handler');
require('dotenv').config();

const wss = new WebSocket.Server({ port: 3000 });
const aiHandler = new AIHandler(process.env.OPENAI_API_KEY);

console.log('WebSocket server is running on ws://localhost:3000');

wss.on('connection', function connection(ws) {
    console.log('New client connected');
    
    // Envoyer un message de bienvenue
    ws.send(JSON.stringify({
        type: 'ai-message',
        content: 'Bonjour ! Je suis votre assistant IA. Comment puis-je vous aider aujourd\'hui ?'
    }));

    ws.on('message', async function incoming(message) {
        try {
            const messageData = JSON.parse(message);
            console.log('Received:', messageData);

            if (messageData.type === 'user-message') {
                // Traiter le message avec l'IA
                const aiResponse = await aiHandler.processMessage(messageData.content);
                
                // Envoyer la réponse de l'IA
                ws.send(JSON.stringify({
                    type: 'ai-message',
                    content: aiResponse
                }));
            }
        } catch (error) {
            console.error('Error processing message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                content: 'Une erreur est survenue lors du traitement de votre message.'
            }));
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});
