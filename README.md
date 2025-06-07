# PapoReto - App para Superação de Vícios

Uma plataforma móvel completa desenvolvida em React Native (Expo) que combina metas personalizadas, diário multimídia, chatbot de suporte emocional com IA Gemini 1.5 Pro e comunidade para ajudar usuários a superar vícios.

## 🎯 Funcionalidades Principais

### Versão Gratuita
- ✅ **Sistema de Autenticação** - Cadastro e login seguro com Supabase
- ✅ **Onboarding Personalizado** - Configuração inicial baseada no tipo de vício
- ✅ **Metas SMART** - Criação e acompanhamento de metas personalizadas
- ✅ **Diário Multimídia** - Registro com texto, áudio e foto
- ✅ **Chatbot IA** - Suporte emocional 24/7 com Gemini 1.5 Pro
- ✅ **Sistema de Pontuação** - Gamificação com badges e recompensas
- ✅ **Comunidade** - Fórum de apoio entre usuários
- ✅ **Agenda Integrada** - Lembretes para consultas e atividades

### Versão Premium (Planejada)
- 🔄 **Sinais Vitais** - Integração com HealthKit/Google Fit
- 🔄 **Relatórios Avançados** - Análises detalhadas em PDF
- 🔄 **Conteúdo Exclusivo** - Webinars e cursos especializados
- 🔄 **Coaching Individual** - Sessões com especialistas

## 🛠 Tecnologias Utilizadas

### Frontend
- **React Native** via Expo SDK 53
- **Expo Router** para navegação
- **TypeScript** para tipagem
- **React Native Reanimated** para animações
- **Expo Google Fonts** (Roboto)

### Backend
- **Supabase** - Banco de dados, autenticação e storage
- **Supabase Functions** - Serverless functions
- **Row Level Security (RLS)** - Segurança de dados

### IA e Integrações
- **Gemini 1.5 Pro** - Geração de conteúdo e chatbot
- **Expo Camera** - Captura de fotos
- **Expo AV** - Gravação de áudio
- **Expo Notifications** - Push notifications

## 🎨 Design System

### Paleta de Cores
- **Azul Claro**: `#68B0D8` - Fundos principais
- **Azul Escuro**: `#1B3347` - Headers e navegação
- **Laranja**: `#F4883F` - Botões de ação e destaques
- **Neutros**: Branco `#FFFFFF`, Cinzas para texto secundário

### Tipografia
- **Fonte**: Roboto (Regular, Medium, Bold)
- **Tamanhos**: 12px (small), 16px (body), 18px (subtitle), 24px (title)

### Componentes
- Botões arredondados com sombras suaves
- Cards com bordas arredondadas (12px)
- Sistema de espaçamento baseado em 8px
- Animações fluidas e micro-interações

## 📱 Estrutura de Navegação

### Bottom Tabs (Principal)
1. **Início** - Dashboard com progresso e estatísticas
2. **Diário** - Registro diário multimídia
3. **Metas** - Criação e acompanhamento de objetivos
4. **Comunidade** - Fórum e grupos de apoio
5. **Apoio IA** - Chat com assistente virtual
6. **Perfil** - Configurações e dados do usuário

### Stack Navigation
- **Auth Stack** - Welcome, Login, Register, Onboarding
- **Main Stack** - Tabs + modais e telas secundárias

## 🗄 Estrutura do Banco de Dados

### Tabelas Principais
```sql
-- Usuários
users (id, nome, email, tipo_vicio, nivel_dependencia, data_cadastro)

-- Metas
metas (id, user_id, titulo, descricao, objetivo_numerico, unidade, status, progresso, gemini_content)

-- Diário
diarios (id, user_id, texto, audio_url, foto_url, transcricao, data_registro, tipo)

-- Pontuação
pontos (id, user_id, quantidade, motivo, data)

-- Chatbot
chatbot_conversas (id, user_id, entrada_usuario, resposta_bot, timestamp)
```

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+
- Expo CLI
- Conta no Supabase
- API Key do Google Gemini

### Instalação
```bash
# Clone o repositório
git clone <repository-url>
cd papo-reto

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais

# Execute o projeto
npm run dev
```

### Configuração do Supabase
1. Crie um projeto no [Supabase](https://supabase.com)
2. Execute os scripts SQL para criar as tabelas
3. Configure as políticas RLS
4. Adicione as URLs e chaves no arquivo `.env`

### Configuração do Gemini
1. Obtenha uma API Key no [Google AI Studio](https://makersuite.google.com)
2. Adicione a chave no arquivo `.env`

## 🔐 Segurança e Privacidade

- **Autenticação JWT** via Supabase Auth
- **Row Level Security** para isolamento de dados
- **Criptografia** de dados sensíveis em repouso
- **Validação** de inputs no frontend e backend
- **Consentimento** explícito para uso de câmera/microfone

## 🧪 Funcionalidades de IA

### Geração de Conteúdo (Gemini 1.5 Pro)
- **Dicas Personalizadas** - Baseadas no tipo de vício
- **Conteúdo Motivacional** - Efeitos positivos e negativos
- **Análise de Progresso** - Feedback sobre entradas do diário

### Chatbot de Suporte
- **Contexto Conversacional** - Memória das últimas interações
- **Suporte Emocional** - Respostas empáticas e motivadoras
- **Detecção de Crise** - Recomendações de ajuda profissional

## 📊 Jornada do Usuário

1. **Onboarding** - Configuração inicial (3 telas)
2. **Dashboard** - Visão geral do progresso
3. **Registro Diário** - Entrada de texto/áudio/foto
4. **Acompanhamento** - Metas e estatísticas
5. **Suporte** - Chatbot e comunidade
6. **Gamificação** - Pontos e conquistas

## 🔄 Roadmap

### Fase 1 (Atual) - MVP
- [x] Autenticação e onboarding
- [x] Sistema básico de metas
- [x] Diário com texto
- [x] Chatbot com Gemini
- [x] Interface responsiva

### Fase 2 - Funcionalidades Avançadas
- [ ] Gravação e transcrição de áudio
- [ ] Upload e análise de fotos
- [ ] Sistema de notificações
- [ ] Fórum da comunidade funcional

### Fase 3 - Premium
- [ ] Integração com wearables
- [ ] Relatórios em PDF
- [ ] Coaching profissional
- [ ] Análises avançadas

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para dúvidas ou suporte:
- 📧 Email: suporte@paporeto.com
- 💬 Discord: [PapoReto Community](https://discord.gg/paporeto)
- 📱 WhatsApp: +55 (11) 99999-9999

---

**PapoReto** - Transformando vidas, um dia de cada vez. 💪✨