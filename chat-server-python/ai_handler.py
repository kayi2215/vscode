from openai import AsyncOpenAI
from decouple import config
import httpx
import json
from file_tools import FileTools
import os

class AIHandler:
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=config('OPENAI_API_KEY'),
            http_client=httpx.AsyncClient()
        )
        self.file_tools = FileTools([config('ALLOWED_DIRECTORY', default='.')])
        self.conversation_history = []
        
    def _create_system_prompt(self):
        base_dir = config('ALLOWED_DIRECTORY', default='.')
        return f"""Assistant VS Code avec accès au système de fichiers dans {base_dir}.
        
        Outils disponibles :
        - create_directory(path): Créer un dossier
        - write_file(path, content): Écrire dans un fichier
        - read_file(path): Lire un fichier
        - list_directory(path): Lister le contenu
        
        Pour créer un fichier dans un nouveau dossier :
        1. Utiliser create_directory
        2. Utiliser write_file
        
        Répondre avec : {{"tool": "nom_outil", "params": {{...}}}}"""

    async def process_message(self, message: str) -> str:
        try:
            self.conversation_history.append({"role": "user", "content": message})
            
            response = await self.client.chat.completions.create(
                model="gpt-4",
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
                    result = await self.file_tools.create_directory(tool_call["params"]["path"])
                    return result
                elif tool_call.get("tool") == "write_file":
                    result = await self.file_tools.write_file(
                        tool_call["params"]["path"],
                        tool_call["params"]["content"]
                    )
                    return result
                elif tool_call.get("tool") == "list_directory":
                    result = await self.file_tools.list_directory(tool_call["params"]["path"])
                    return result
                return assistant_message

            except json.JSONDecodeError:
                return assistant_message

        except Exception as e:
            print(f"Erreur: {str(e)}")
            return f"Erreur: {str(e)}"