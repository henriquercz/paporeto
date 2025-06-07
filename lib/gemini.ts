/**
 * Serviço para integração com Gemini 1.5 Pro API
 * Gerencia geração de conteúdo motivacional e respostas do chatbot
 */

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export class GeminiService {
  private static async makeRequest(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
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
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data: GeminiResponse = await response.json();
      return data.candidates[0]?.content.parts[0]?.text || 'Resposta não disponível no momento.';
    } catch (error) {
      console.error('Erro ao chamar Gemini API:', error);
      return 'Desculpe, não consegui gerar uma resposta no momento. Tente novamente mais tarde.';
    }
  }

  static async gerarConteudoMeta(tipoVicio: string, nivelDependencia?: string): Promise<string> {
    console.log('[GeminiService] gerarConteudoMeta chamado com:', { tipoVicio, nivelDependencia });
    const prompt = `
Como especialista em dependências químicas e comportamentais, gere um texto motivacional e informativo sobre como superar o vício em ${tipoVicio}. 
${nivelDependencia ? `O nível de dependência é: ${nivelDependencia}.` : ''}

Inclua:
1. 3-4 dicas práticas específicas para largar esse vício
2. Efeitos positivos esperados nos primeiros 7, 30 e 90 dias sem o vício
3. Principais riscos e efeitos negativos desse vício na saúde
4. Uma mensagem motivacional final

Mantenha um tom empático, positivo e profissional. Máximo 300 palavras.
`;

    return await this.makeRequest(prompt);
  }

  static async responderChatbot(mensagemUsuario: string, contextoHistorico?: string): Promise<string> {
    const prompt = `
Você é um assistente de apoio emocional especializado em ajudar pessoas a superar vícios. 
Responda de forma empática, motivadora e profissional.

${contextoHistorico ? `Contexto das conversas anteriores: ${contextoHistorico}` : ''}

Mensagem do usuário: "${mensagemUsuario}"

Diretrizes:
- Seja empático e compreensivo
- Ofereça apoio emocional genuíno
- Sugira estratégias práticas quando apropriado
- Se detectar linguagem de crise ou risco, recomende buscar ajuda profissional
- Mantenha o foco na recuperação e bem-estar
- Máximo 150 palavras

Resposta:
`;

    return await this.makeRequest(prompt);
  }

  static async analisarEntradaDiario(textoEntry: string): Promise<string> {
    const prompt = `
Analise esta entrada de diário de uma pessoa em processo de recuperação de vícios:

"${textoEntry}"

Forneça:
1. Um feedback empático sobre o que a pessoa compartilhou
2. Reconhecimento dos progressos ou desafios mencionados
3. Uma sugestão prática para o próximo passo
4. Palavras de encorajamento

Resposta em tom acolhedor e profissional. Máximo 100 palavras.
`;

    return await this.makeRequest(prompt);
  }
}