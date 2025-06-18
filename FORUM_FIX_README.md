# Correção dos Problemas do Fórum - PapoReto

**Autor:** Capitão Henrique  
**Data:** 07/01/2025  
**Versão:** 1.0

## 🚨 Problema Identificado

O sistema estava apresentando erros 406 (Not Acceptable) e 409 (Conflict) ao tentar dar likes e comentar nos posts do fórum. A causa raiz era:

**O frontend estava usando o `auth_user_id` (ID do Supabase Auth) diretamente como `user_id` nas tabelas `likes_forum` e `comentarios_forum`, mas essas tabelas esperam o `id` interno da tabela `users`.**

### Erros Específicos:
- `23503: Key is not present in table "users"`
- Foreign key constraint violations
- Tentativa de usar `f8da550d-de1c-4b48-b53e-927984fdd2a2` (auth_user_id) em vez de `87455bb0-36e4-4c06-b8ca-73fb374fb80a` (user_id interno)

## ✅ Soluções Implementadas

### 1. Utilitário de Usuário (`lib/userUtils.ts`)
Criado utilitário centralizado para:
- Buscar o ID interno do usuário baseado no auth_user_id
- Verificar se o usuário existe na base de dados
- Obter dados completos do usuário

### 2. Hook Personalizado (`hooks/useCurrentUser.ts`)
Criado hooks para gerenciar o estado do usuário:
- `useCurrentUser()`: Dados completos do usuário
- `useUserId()`: Apenas o ID interno do usuário

### 3. Correção do Frontend (`app/(tabs)/comunidade.tsx`)
Atualizações realizadas:
- Substituição do `auth_user_id` pelo `id` interno da tabela users
- Uso do hook `useUserId()` para gerenciar o estado
- Correção da função de pontuação

### 4. Script de Diagnóstico (`sql_fix_forum_issues.sql`)
Script SQL para:
- Verificar registros órfãos
- Limpar dados inconsistentes
- Recriar políticas RLS
- Testar inserções

## 🔧 Como Aplicar as Correções

### Passo 1: Executar o Script SQL
```bash
# No Supabase SQL Editor, execute:
psql -f sql_fix_forum_issues.sql
```

### Passo 2: Verificar Dados
```sql
-- Verificar se o usuário existe
SELECT id, nome, email, auth_user_id 
FROM users 
WHERE auth_user_id = 'f8da550d-de1c-4b48-b53e-927984fdd2a2';

-- Resultado esperado:
-- id: 87455bb0-36e4-4c06-b8ca-73fb374fb80a
-- auth_user_id: f8da550d-de1c-4b48-b53e-927984fdd2a2
```

### Passo 3: Testar Funcionalidades
1. **Likes:**
   - Tentar dar like em um post
   - Verificar se não há erros 406/409
   - Confirmar que o like é registrado corretamente

2. **Comentários:**
   - Tentar adicionar um comentário
   - Verificar se não há erros de foreign key
   - Confirmar que o comentário aparece na lista

## 🛡️ Medidas de Segurança Implementadas

### 1. Validação de Entrada
- Verificação se o usuário existe antes de operações
- Tratamento de erros com mensagens apropriadas
- Logs detalhados para debugging

### 2. Políticas RLS Atualizadas
```sql
-- Likes: usuários podem ver todos, mas só gerenciar os próprios
CREATE POLICY "Usuários podem ver todos os likes" ON likes_forum
    FOR SELECT USING (true);

CREATE POLICY "Usuários podem gerenciar seus próprios likes" ON likes_forum
    FOR ALL USING (auth.uid()::text IN (
        SELECT auth_user_id FROM users WHERE id = likes_forum.user_id
    ));
```

### 3. Tratamento de Erros
- Captura de exceções específicas
- Fallbacks para casos de erro
- Mensagens de erro user-friendly

## 📊 Monitoramento

### Logs a Observar
```typescript
// Sucesso
console.log('Like adicionado com sucesso');
console.log('Comentário adicionado com sucesso');

// Erros
console.error('Erro ao buscar dados do usuário:', error);
console.error('Erro ao adicionar like:', error);
console.error('Erro ao adicionar comentário:', error);
```

### Métricas de Sucesso
- ✅ Likes funcionando sem erros 406/409
- ✅ Comentários sendo salvos corretamente
- ✅ Contadores atualizando em tempo real
- ✅ Políticas RLS funcionando adequadamente

## 🔄 Próximos Passos

1. **Teste Completo:**
   - Testar com múltiplos usuários
   - Verificar performance das consultas
   - Validar em diferentes cenários

2. **Otimizações:**
   - Cache do userId para reduzir consultas
   - Implementar debounce em ações rápidas
   - Otimizar queries de contadores

3. **Monitoramento:**
   - Implementar alertas para erros de foreign key
   - Dashboard de métricas do fórum
   - Logs estruturados para análise

## 🆘 Troubleshooting

### Se ainda houver erros:

1. **Verificar se o usuário existe:**
```sql
SELECT * FROM users WHERE auth_user_id = 'SEU_AUTH_USER_ID';
```

2. **Verificar foreign keys:**
```sql
SELECT * FROM likes_forum WHERE user_id NOT IN (SELECT id FROM users);
SELECT * FROM comentarios_forum WHERE user_id NOT IN (SELECT id FROM users);
```

3. **Recriar usuário se necessário:**
```sql
INSERT INTO users (auth_user_id, nome, email) 
VALUES ('SEU_AUTH_USER_ID', 'Nome', 'email@exemplo.com');
```

## 📞 Suporte

Em caso de dúvidas ou problemas persistentes:
1. Verificar logs do console do navegador
2. Executar queries de diagnóstico do script SQL
3. Verificar políticas RLS no Supabase Dashboard
4. Contactar o desenvolvedor responsável

---

**Status:** ✅ Correções implementadas e testadas  
**Próxima revisão:** Após testes em produção