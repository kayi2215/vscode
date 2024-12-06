from openai import AsyncOpenAI
from decouple import config
import httpx
import json
from file_manager import FileManager
import os

class AIHandler:
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=config('OPENAI_API_KEY'),
            http_client=httpx.AsyncClient()
        )
        self.file_manager = FileManager([config('ALLOWED_DIRECTORY', default='.')])
        self.conversation_history = []
        
    def _create_system_prompt(self):
        base_dir = config('ALLOWED_DIRECTORY', default='.')
        return f"""Assistant de programmation expert pour VS Code avec accès au système de fichiers dans {base_dir}.

        En tant qu'expert en programmation, j'analyse le code, suggère des améliorations et aide à l'implémentation en utilisant les outils filesystem suivants :

        Outils filesystem :
        - read_file(path): Lire et analyser le code source
        - write_file(path, content): Écrire/générer du code
        - list_directory(path): Explorer la structure du projet
        - create_directory(path): Créer une nouvelle structure de dossiers
        - delete_file(path): Supprimer fichiers/dossiers

        Format de réponse pour les commandes :
        {{"tool": "nom_outil", "params": {{...}}}}

        Mon workflow typique :
        1. Explorer le projet (list_directory)
        2. Lire le code existant (read_file) 
        3. Analyser et suggérer des améliorations
        4. Implémenter les changements (write_file)
        5. Vérifier les résultats

        Je base mes recommandations sur les meilleures pratiques de programmation et patterns de conception."""
    async def process_message(self, message: str) -> str:
        try:
            # Détecter si c'est une demande de lecture de fichier
            if any(keyword in message.lower() for keyword in ['lis', 'lire', 'montre', 'affiche', 'contenu']):
                if '.txt' in message or '.json' in message or '.py' in message:
                    # Extraire le nom du fichier
                    words = message.split()
                    for word in words:
                        if any(ext in word for ext in ['.txt', '.json', '.py']):
                            return json.dumps({
                                "tool": "read_file",
                                "params": {"path": word}
                            })

            self.conversation_history.append({"role": "user", "content": message})
            
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini-2024-07-18",
                messages=[
                    {"role": "system", "content": self._create_system_prompt()},
                    *self.conversation_history
                ]
            )

            assistant_message = response.choices[0].message.content
            self.conversation_history.append({"role": "assistant", "content": assistant_message})

            try:
                tool_call = json.loads(assistant_message)
                if tool_call.get("tool") == "create_directory":
                    result = await self.file_manager.create_directory(tool_call["params"]["path"])
                    return result
                elif tool_call.get("tool") == "write_file":
                    result = await self.file_manager.write_file(
                        tool_call["params"]["path"],
                        tool_call["params"]["content"]
                    )
                    return result
                elif tool_call.get("tool") == "list_directory":
                    result = await self.file_manager.list_directory(tool_call["params"]["path"])
                    return result
                return assistant_message

            except json.JSONDecodeError:
                return assistant_message

        except Exception as e:
            print(f"Erreur: {str(e)}")
            return f"Erreur: {str(e)}"