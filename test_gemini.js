require('dotenv').config({ path: '.env' });
const fs = require('fs');

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
// Testando o modelo 2.5
const MODEL = 'gemini-2.5-flash';
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

async function testGemini() {
    console.log('Testando modelo:', MODEL);

    const prompt = "Diga 'Olá, mundo!' e explique quem você é.";

    try {
        const response = await fetch(URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000,
                }
            }),
        });

        console.log('Status:', response.status);
        const data = await response.json();

        fs.writeFileSync('gemini_result.json', JSON.stringify(data, null, 2));
        console.log('Resultado salvo em gemini_result.json');

    } catch (error) {
        console.error('Erro:', error);
        fs.writeFileSync('gemini_result.json', JSON.stringify({ error: error.message }, null, 2));
    }
}

testGemini();
