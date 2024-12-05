const OpenAI = require('openai');

class AIHandler {
    constructor(apiKey) {
        this.openai = new OpenAI({
            apiKey: apiKey // Vous devrez fournir votre clé API OpenAI
        });
    }

    async processMessage(message, context = {}) {
        try {
            const completion = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "Vous êtes un assistant IA utile intégré dans VS Code. Vous pouvez aider avec la programmation, le débogage et répondre aux questions techniques."
                    },
                    {
                        role: "user",
                        content: message
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            });

            return completion.choices[0].message.content;
        } catch (error) {
            console.error('Erreur AI:', error);
            return "Désolé, je n'ai pas pu traiter votre demande. " + error.message;
        }
    }
}

module.exports = AIHandler;
