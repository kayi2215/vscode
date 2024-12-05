import asyncio
import json
import websockets
from ai_handler import AIHandler
from decouple import config

class ChatServer:
    def __init__(self):
        self.ai_handler = AIHandler()
        self.clients = set()

    async def handle_message(self, websocket, message):
        try:
            data = json.loads(message)
            if data['type'] == 'user-message':
                # Traiter le message avec l'IA
                response = await self.ai_handler.process_message(data['content'])
                
                # Envoyer la réponse
                await websocket.send(json.dumps({
                    'type': 'ai-message',
                    'content': response
                }))
        except json.JSONDecodeError:
            await websocket.send(json.dumps({
                'type': 'error',
                'content': 'Format de message invalide'
            }))
        except Exception as e:
            print(f"Erreur: {str(e)}")
            await websocket.send(json.dumps({
                'type': 'error',
                'content': f'Une erreur est survenue: {str(e)}'
            }))

    async def handle_connection(self, websocket):
        self.clients.add(websocket)
        try:
            # Message de bienvenue
            await websocket.send(json.dumps({
                'type': 'ai-message',
                'content': 'Bonjour ! Je suis votre assistant IA Python. Comment puis-je vous aider aujourd\'hui ?'
            }))

            # Boucle de gestion des messages
            async for message in websocket:
                await self.handle_message(websocket, message)
        except websockets.exceptions.ConnectionClosed:
            print("Client disconnected")
        finally:
            self.clients.remove(websocket)

async def main():
    server = ChatServer()
    port = 3001
    async with websockets.serve(server.handle_connection, "localhost", port):
        print(f"Server running on ws://localhost:{port}")
        try:
            await asyncio.Future()  # run forever
        except KeyboardInterrupt:
            print("\nShutting down server...")
        finally:
            # Fermer proprement le client HTTP
            await server.ai_handler.client.http_client.aclose()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nServer stopped by user")
