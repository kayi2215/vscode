import asyncio
import json
import websockets
from ai_handler import AIHandler
from file_manager import FileManager
import logging
import os

# Configuration des logs
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger('websockets')
logger.setLevel(logging.DEBUG)

class ChatServer:
    def __init__(self):
        self.ai_handler = AIHandler()
        self.clients = set()
        self.file_manager = FileManager([os.path.abspath('.')])  # Autorise le répertoire courant


    async def handle_message(self, websocket, message):
        try:
            print(f"Message reçu: {message}")
            data = json.loads(message)
            
            if data['type'] == 'user-message':
                content = data.get('content', '')
                
                # Si le contenu est une chaîne JSON, essayer de l'analyser comme une commande d'outil
                if isinstance(content, str):
                    try:
                        content_json = json.loads(content)
                        if isinstance(content_json, dict) and content_json.get('tool'):
                            response = await self.handle_tool_command(content_json)
                            if response:
                                print(f"Envoi de la réponse: {response}")
                                await websocket.send(json.dumps(response))
                                return
                    except json.JSONDecodeError:
                        pass
                
                # Pour les autres messages, traitement normal
                response = await self.ai_handler.process_message(data['content'])
                print(f"Réponse: {response}")
                await websocket.send(json.dumps({
                    'type': 'ai-message',
                    'content': response
                }))
            
        except Exception as e:
            logging.error(f"Erreur dans handle_message: {str(e)}")
            await websocket.send(json.dumps({
                'type': 'error',
                'content': f'Une erreur est survenue: {str(e)}'
            }))

    async def handle_tool_command(self, command):
        """Handle tool commands and return the appropriate response"""
        try:
            if command.get('tool') == 'read_file':
                file_path = command['params']['path']
                try:
                    content = await self.file_manager.read_file(file_path)
                    return {
                        'type': 'tool_output',
                        'content': f"Contenu du fichier {file_path}:\n{content}"
                    }
                except Exception as e:
                    return {
                        'type': 'error',
                        'content': f"Erreur lors de la lecture du fichier {file_path}: {str(e)}"
                    }
        except Exception as e:
            return {
                'type': 'error',
                'content': f"Erreur lors du traitement de la commande: {str(e)}"
            }

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
