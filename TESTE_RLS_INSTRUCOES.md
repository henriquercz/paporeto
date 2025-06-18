# 🔧 Instruções para Testar as Correções RLS

## 📋 Resumo das Correções Implementadas

As políticas RLS (Row Level Security) foram corrigidas para as tabelas `likes_forum` e `comentarios_forum`. O problema estava no mapeamento incorreto entre o `auth.uid()` do Supabase e o `user_id` interno da aplicação.

### ✅ Políticas RLS Aplicadas

**Tabela `likes_forum`:**
- **SELECT**: Todos podem visualizar likes
- **INSERT**: Usuários podem inserir apenas seus próprios likes
- **DELETE**: Usuários podem deletar apenas seus próprios likes

**Tabela `comentarios_forum`:**
- **SELECT**: Todos podem visualizar comentários
- **INSERT**: Usuários podem inserir apenas seus próprios comentários
- **UPDATE**: Usuários podem atualizar apenas seus próprios comentários
- **DELETE**: Usuários podem deletar apenas seus próprios comentários

## 🧪 Como Testar

### 1. Verificar Políticas no Banco

As políticas foram aplicadas via SQL. Você pode verificar se estão ativas executando:

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename IN ('likes_forum', 'comentarios_forum')
ORDER BY tablename, cmd;
```

### 2. Testar no App

1. **Abra o app** e navegue até a tela de Comunidade
2. **Faça login** com um usuário válido
3. **Clique no botão vermelho "DEBUG RLS"** (canto inferior direito)
4. **Verifique os logs** no console do Metro/Expo

### 3. Interpretar os Resultados do Debug

**✅ Sucesso esperado:**
```
🔍 === INICIANDO DEBUG RLS ===
✅ Usuário logado: { auth_user_id: "...", email: "...", role: "..." }
✅ ID interno do usuário: "..."
✅ Dados do usuário: { id: "...", auth_user_id: "...", nome: "..." }
✅ SELECT em likes_forum funcionou. Likes encontrados: X
✅ INSERT em likes_forum funcionou: [{ id: "...", ... }]
✅ DELETE em likes_forum funcionou
✅ INSERT em comentarios_forum funcionou: [{ id: "...", ... }]
✅ DELETE em comentarios_forum funcionou
🎉 === DEBUG RLS CONCLUÍDO ===
```

**❌ Problemas possíveis:**
- Se aparecer erro de RLS: As políticas não foram aplicadas corretamente
- Se aparecer "Usuário não está logado": Problema de autenticação
- Se aparecer "ID interno não encontrado": Problema no mapeamento user_id

### 4. Testar Funcionalidades Normais

Após o debug, teste as funcionalidades normais:

1. **Curtir/Descurtir posts** - Deve funcionar sem erros
2. **Adicionar comentários** - Deve funcionar sem erros
3. **Verificar contadores** - Likes e comentários devem atualizar corretamente

## 🔍 Logs de Debug Detalhados

O script de debug verifica:

1. **Autenticação**: Sessão ativa e dados do usuário
2. **Mapeamento**: Relação entre `auth.uid()` e `user_id` interno
3. **Políticas SELECT**: Capacidade de ler dados das tabelas
4. **Políticas INSERT**: Capacidade de inserir dados próprios
5. **Políticas DELETE**: Capacidade de deletar dados próprios

## 🚨 Problemas Conhecidos e Soluções

### Erro: "new row violates row-level security policy"
**Causa**: Política RLS bloqueando inserção
**Solução**: Verificar se as políticas foram aplicadas corretamente

### Erro: "User ID não encontrado"
**Causa**: Usuário não existe na tabela `users`
**Solução**: Verificar se o usuário foi criado corretamente no registro

### Erro: "Sessão não encontrada"
**Causa**: Usuário não está autenticado
**Solução**: Fazer login novamente

## 📝 Arquivos Modificados

1. **`fix_rls_policies.sql`** - Script SQL com as correções
2. **`debug_rls.js`** - Script de debug para testar RLS
3. **`comunidade.tsx`** - Limpeza de logs e adição do botão debug
4. **`TESTE_RLS_INSTRUCOES.md`** - Este arquivo de instruções

## 🔄 Próximos Passos

1. Execute o teste de debug
2. Verifique se todas as operações funcionam
3. **REMOVA o botão de debug** após confirmar que tudo funciona
4. Monitore logs de produção para garantir estabilidade

## 🎯 Critérios de Sucesso

- ✅ Debug RLS executa sem erros
- ✅ Likes funcionam normalmente
- ✅ Comentários funcionam normalmente
- ✅ Contadores atualizam corretamente
- ✅ Não há mais erros de RLS nos logs

---

**Nota**: Após confirmar que tudo funciona, remova o botão "DEBUG RLS" e o import do `debug_rls.js` do arquivo `comunidade.tsx`.