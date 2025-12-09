# PapoReto - Plataforma Digital para Superação de Vícios

<div align="center">

[![React Native](https://img.shields.io/badge/React%20Native-0.81-blue.svg)](https://reactnative.dev/)
[![Expo SDK](https://img.shields.io/badge/Expo%20SDK-54-black.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green.svg)](https://supabase.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini%202.5%20Flash-AI-orange.svg)](https://ai.google.dev/)

</div>

> **Projeto Interdisciplinar - ETEC de Taboão da Serra (2025)**

**PapoReto** é uma solução tecnológica inovadora e cientificamente fundamentada para apoio na superação de vícios. Desenvolvida como Trabalho InterDisciplinar na ETEC para o curso de Desenvolvimento de Sistemas, a plataforma combina inteligência artificial avançada, gamificação e suporte comunitário para oferecer uma experiência personalizada e eficaz.

---

## 🏆 Diferenciais Competitivos

- **IA Conversacional Avançada**: Chatbot "Blob" integrado com **Gemini 2.5 Flash** para suporte emocional 24/7 com capacidade de raciocínio avançado.
- **Arquitetura Escalável**: Backend serverless com Supabase e Row Level Security.
- **Comunidade Ativa**: Fórum integrado com sistema de likes e comentários em tempo real.
- **Gamificação Inteligente**: Sistema de pontuação e badges baseado em marcos científicos.
- **Segurança Enterprise**: Criptografia end-to-end e políticas de privacidade rigorosas.

## 🎯 Funcionalidades Principais

### Core Features (Implementadas)
- ✅ **Autenticação Segura** - JWT + OAuth2 com Supabase Auth
- ✅ **Onboarding Inteligente** - Fluxo adaptativo baseado em perfil psicológico
- ✅ **Metas SMART Avançadas** - Algoritmo de recomendação personalizada
- ✅ **Diário Multimídia** - Texto e foto com análise de sentimento
- ✅ **Chatbot Terapêutico** - IA Gemini 2.5 Flash com contexto conversacional e "thinking process"
- ✅ **Gamificação Científica** - Sistema de recompensas baseado em neurociência
- ✅ **Fórum Comunitário** - Sistema completo de posts, likes e comentários
- ✅ **Dashboard Analytics** - Métricas de progresso em tempo real
- ✅ **Notificações Push** - Lembretes inteligentes e motivacionais

### Versão Premium (Planejada)
- 🔄 **Sinais Vitais** - Integração com HealthKit/Google Fit
- 🔄 **Relatórios Avançados** - Análises detalhadas em PDF
- 🔄 **Conteúdo Exclusivo** - Webinars e cursos especializados
- 🔄 **Coaching Individual** - Sessões com especialistas

## 🛠 Tecnologias Utilizadas

### Frontend
- **React Native** via Expo SDK 54
- **Expo Router v6** para navegação baseada em arquivos
- **TypeScript** para tipagem estática rigorosa
- **React Native Reanimated** para animações fluidas (com Worklets)
- **Expo Google Fonts** (Roboto)

### Backend
- **Supabase** - Banco de dados PostgreSQL, Autenticação e Storage
- **Supabase Functions** - Serverless functions para lógica de negócios
- **Row Level Security (RLS)** - Segurança de dados granular

### IA e Integrações
- **Google Gemini 2.5 Flash** - Modelo de linguagem de última geração para geração de conteúdo e chatbot
- **Expo Camera** - Captura de fotos para diário
- **Expo Notifications** - Sistema de engajamento via push

## 🎨 Design System

### Paleta de Cores
- **Azul Claro**: `#68B0D8` - Fundos principais
- **Azul Escuro**: `#1B3347` - Headers e navegação
- **Laranja**: `#F4883F` - Botões de ação e destaques
- **Neutros**: Branco `#FFFFFF`, Cinzas para texto secundário

### Tipografia
- **Fonte**: Roboto (Regular, Medium, Bold)
- **Tamanhos**: 12px (small), 16px (body), 18px (subtitle), 24px (title)

## 📱 Estrutura de Navegação

### Bottom Tabs (Principal)
1. **Início** - Dashboard com progresso e estatísticas
2. **Diário** - Registro diário multimídia
3. **Metas** - Criação e acompanhamento de objetivos
4. **Comunidade** - Fórum e grupos de apoio
5. **Apoio IA** - Chat com assistente virtual Blob
6. **Perfil** - Configurações e dados do usuário

### Stack Navigation
- **Auth Stack** - Welcome, Login, Register, Onboarding
- **Main Stack** - Tabs + modais e telas secundárias

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+
- Expo CLI
- Conta no Supabase
- API Key do Google Gemini

### Instalação e Configuração
```bash
# Clone o repositório
git clone https://github.com/henriquercz/paporeto.git
cd paporeto

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais:
# EXPO_PUBLIC_SUPABASE_URL=sua_url_supabase
# EXPO_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
# EXPO_PUBLIC_GEMINI_API_KEY=sua_chave_gemini

# Execute em desenvolvimento
npx expo start
```

## 👨‍💻 Equipe de Desenvolvimento

<div align="center">

### 🎓 **Desenvolvido com 💚 na Etec Taboão da Serra**

</div>

<table align="center">
<tr>
<td align="center">
<img src="https://github.com/henriquercz.png" width="100px;" alt="Henrique Rezende"/><br />
<sub><b>Henrique Rezende</b></sub><br />
<sub>Desenvolvedor Full-Stack</sub><br />
<a href="https://github.com/henriquercz">🐙 GitHub</a> •
<a href="mailto:henriquechagas06@gmail.com">📧 Email</a>
</td>

<td align="center">
<img src="https://github.com/guiguizy11.png" width="100px;" alt="Guilherme Ferreira"/><br />
<sub><b>Guilherme Ferreira</b></sub><br />
<sub>Documentação</sub><br />
<a href="https://github.com/guiguizy11">🐙 GitHub</a> •
<a href="mailto:henriquechagas06@gmail.com">📧 Email</a>
</td>

<td align="center">
<img src="https://github.com/liuzinho777.png" width="100px;" alt="Artur Liu"/><br />
<sub><b>Artur Liu</b></sub><br />
<sub>Documentação</sub><br />
<a href="https://github.com/liuzinho777">🐙 GitHub</a> •
<a href="mailto:henriquechagas06@gmail.com">📧 Email</a>
</td>

<td align="center">
<img src="https://github.com/FelipeFreitas91.png" width="100px;" alt="Felipe Freitas"/><br />
<sub><b>Felipe Freitas</b></sub><br />
<sub>Documentação</sub><br />
<a href="https://github.com/FelipeFreita91">🐙 GitHub</a> •
<a href="mailto:henriquechagas06@gmail.com">📧 Email</a>
</td>

<td align="center">
<img src="https://github.com/gabriel-moreira10.png" width="100px;" alt="Gabriel Moreira"/><br />
<sub><b>Gabriel Moreira</b></sub><br />
<sub>Documentação</sub><br />
<a href="https://github.com/gabriel-moreira10">🐙 GitHub</a> •
<a href="mailto:henriquechagas06@gmail.com">📧 Email</a>
</td>

</tr>
</table>

---

<div align="center">

**PapoReto** - Tecnologia a serviço da transformação humana 🚀

[![Made with React Native](https://img.shields.io/badge/Made%20with-React%20Native-blue.svg)](https://reactnative.dev/)
[![Powered by Supabase](https://img.shields.io/badge/Powered%20by-Supabase-green.svg)](https://supabase.com/)

</div>
