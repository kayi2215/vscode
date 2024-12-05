from openai import AsyncOpenAI
from decouple import config
import httpx

class AIHandler:
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=config('OPENAI_API_KEY'),
            http_client=httpx.AsyncClient()
        )

    async def process_message(self, message: str, context: dict = None) -> str:
        try:
            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "Vous êtes un assistant IA utile intégré dans VS Code. Vous pouvez aider avec la programmation, le débogage et répondre aux questions techniques."
                    },
                    {
                        "role": "user",
                        "content": message
                    }
                ],
                temperature=0.7,
                max_tokens=500
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Erreur AI: {str(e)}")
            return f"Désolé, je n'ai pas pu traiter votre demande. {str(e)}"
