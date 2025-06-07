import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors';

// Definição da interface para o corpo da requisição
interface OnboardingData {
  tipoVicio: string;
  nivelDependencia: string;
}

// Configuração da API Gemini (usando variáveis de ambiente da Edge Function)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

// Função para chamar a API Gemini
async function gerarConteudoMetaComGemini(tipoVicio: string, nivelDependencia: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    console.warn('[EdgeFunction:finalizar-onboarding] GEMINI_API_KEY não configurada. Usando fallback.');
    return 'Defina seus primeiros passos para a recuperação e explore dicas personalizadas mais tarde.';
  }

  const prompt = `
Como especialista em dependências químicas e comportamentais, gere um texto motivacional e informativo (máximo 150 palavras) sobre como superar o vício em ${tipoVicio}.
O nível de dependência informado é: ${nivelDependencia}.
O texto deve ser encorajador, prático e focado no primeiro passo e na jornada.
Inclua:
1. Reconhecimento da dificuldade.
2. Uma frase de encorajamento.
3. Um lembrete de que a jornada é um passo de cada vez.
4. Uma breve dica prática inicial.
Seja conciso, empático e motivador.
`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 1,
          topP: 1,
          maxOutputTokens: 250,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[EdgeFunction:finalizar-onboarding] Erro da API Gemini:', errorData);
      throw new Error(`API Gemini falhou com status ${response.status}`);
    }

    const data = await response.json();
    // @ts-ignore: Ignorando checagem de tipo para a estrutura complexa da resposta da Gemini
    return data.candidates[0]?.content?.parts[0]?.text || 'Conteúdo inspirador para sua jornada será gerado em breve.';
  } catch (error) {
    console.error('[EdgeFunction:finalizar-onboarding] Erro ao chamar Gemini:', error);
    return 'Houve um imprevisto ao gerar sua mensagem personalizada. Comece com foco e determinação!';
  }
}


serve(async (req: Request) => {
  // Tratar requisição OPTIONS para CORS (preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { tipoVicio, nivelDependencia } = (await req.json()) as OnboardingData;

    if (!tipoVicio || !nivelDependencia) {
      return new Response(JSON.stringify({ error: 'tipoVicio e nivelDependencia são obrigatórios' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Criar cliente Supabase com o token de autenticação do usuário
    const supabaseClient: SupabaseClient = createClient(
      process.env.SUPABASE_URL ?? '',
      process.env.SUPABASE_ANON_KEY ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Obter o usuário autenticado
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('[EdgeFunction:finalizar-onboarding] Erro ao obter usuário:', userError);
      return new Response(JSON.stringify({ error: 'Usuário não autenticado ou erro ao buscar usuário.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const userId = user.id;

    // 1. Atualizar perfil do usuário na tabela 'users'
    const { error: updateUserError } = await supabaseClient
      .from('users')
      .update({
        tipo_vicio: tipoVicio,
        nivel_dependencia: nivelDependencia,
        onboarding_concluido: true,
      })
      .eq('id', userId); // Supondo que a tabela 'users' tem 'id' como PK e é o mesmo que auth.users.id

    if (updateUserError) {
      console.error('[EdgeFunction:finalizar-onboarding] Erro ao atualizar perfil do usuário:', updateUserError);
      throw updateUserError;
    }
    console.log(`[EdgeFunction:finalizar-onboarding] Perfil do usuário ${userId} atualizado.`);

    // 2. Gerar conteúdo para a meta inicial com Gemini
    const geminiContent = await gerarConteudoMetaComGemini(tipoVicio, nivelDependencia);
    console.log(`[EdgeFunction:finalizar-onboarding] Conteúdo da Gemini para ${userId}: ${geminiContent.substring(0,50)}...`);


    // 3. Criar primeira meta sugerida
    const metaDescricao = `Superar o vício em ${tipoVicio}`;
    const { error: metaError } = await supabaseClient
      .from('metas')
      .insert({
        user_id: userId,
        titulo: 'Minha Primeira Meta Rumo à Recuperação!',
        descricao: metaDescricao,
        status: 'pendente',
        data_inicio: new Date().toISOString(),
        gemini_content: geminiContent,
        tipo_vicio: tipoVicio,
      });

    if (metaError) {
      console.error('[EdgeFunction:finalizar-onboarding] Erro ao criar meta inicial:', metaError);
      throw metaError;
    }
    console.log(`[EdgeFunction:finalizar-onboarding] Meta inicial criada para usuário ${userId}.`);

    return new Response(JSON.stringify({ message: 'Onboarding finalizado com sucesso!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[EdgeFunction:finalizar-onboarding] Erro geral na função:', error);
    return new Response(JSON.stringify({ error: error.message || 'Erro interno do servidor.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});