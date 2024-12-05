import asyncio
import json
import websockets
from ai_handler import AIHandler
from decouple import config
import logging

# Configuration des logs
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger('websockets')
logger.setLevel(logging.DEBUG)

class ChatServer:
    def __init__(self):
        self.ai_handler = AIHandler()
        self.clients = set()

    async def handle_message(self, websocket, message):
        try:
            print(f"Message reçu: {message}")
            data = json.loads(message)
            if data['type'] == 'user-message':
                print(f"Traitement du message: {data['content']}")
                response = await self.ai_handler.process_message(data['content'])
                print(f"Réponse: {response}")
                await websocket.send(json.dumps({
                    'type': 'ai-message',
                    'content': response
                }))
        except json.JSONDecodeError as e:
            print(f"Erreur JSON: {e}")
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
        print(f"Nouvelle connexion: {websocket.remote_address}")
        self.clients.add(websocket)
        try:
            await websocket.send(json.dumps({
                'type': 'ai-message',
                'content': 'Bonjour ! Je suis votre assistant IA Python. Comment puis-je vous aider ?'
            }))

            async for message in websocket:
                await self.handle_message(websocket, message)
        except websockets.exceptions.ConnectionClosed:
            print("Client déconnecté")
        finally:
            self.clients.remove(websocket)

async def main():
    server = ChatServer()
    port = 3001
    print(f"Démarrage du serveur sur le port {port}...")
    async with websockets.serve(server.handle_connection, "localhost", port):
        print(f"Server running on ws://localhost:{port}")
        try:
            await asyncio.Future()
        except KeyboardInterrupt:
            print("\nShutting down server...")
        finally:
            await server.ai_handler.client.http_client.aclose()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nServer stopped by user")
    except Exception as e:
        print(f"Erreur fatale: {str(e)}")
