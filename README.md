# Vorlo — CRM de vendas com IA

CRM multi-empresa com um agente de IA que atende o lead no WhatsApp sozinho:
entende o que ele quer, qualifica, cadastra e passa pro vendedor. ERP integrado
junto — produtos, estoque, clientes e propostas no mesmo lugar.

Next.js 16 (App Router), React 19, PostgreSQL e a API da OpenAI.

> **Este repositório é uma vitrine.** É o código do produto, sem dados, sem
> chaves e sem configuração de ambiente. Para rodar, veja
> [Rodando local](#rodando-local).

---

## O que ele faz

### SDR de IA no WhatsApp
Lead novo manda mensagem e o agente atende na hora, sem ninguém online. Coleta
nome, CPF/CNPJ e endereço durante a conversa, move o lead no funil e entrega
qualificado pro vendedor.

Além de texto, ele **ouve áudio, enxerga imagem e lê PDF**: se o cliente mandar
o orçamento de um concorrente, o agente abre e comenta; se mandar um áudio,
responde por áudio.

### Agentes configuráveis
Cada empresa escreve como o próprio agente fala, o que ele pode prometer e
quais ferramentas usa — buscar contato, registrar orçamento, marcar proposta
enviada, montar proposta no ERP. Não é um assistente genérico.

### CRM
Funil visual arrastável, automações por etapa ("trajetórias"), contatos,
empresas, e-mail, disparos e relatórios.

### ERP
Cadastros (empresas/CNPJ com regime tributário, clientes, produtos,
fornecedores) e propostas comerciais. A importação de catálogo aceita a tabela
do fornecedor em planilha, PDF ou foto: a IA monta os produtos e você revisa
numa prévia editável antes de salvar.

---

## Arquitetura, em resumo

| Camada | Escolha |
|---|---|
| App | Next.js 16 (App Router), React 19, Server Actions |
| Dados | PostgreSQL via `pg`, com um shim que imita a API do supabase-js |
| Auth | Auth.js (credenciais + Google), MFA TOTP |
| IA | OpenAI (`gpt-5.6-terra`) — function calling, visão e leitura de PDF |
| Voz | Whisper (transcrição) + TTS, usando a mesma chave do tenant |
| WhatsApp | Baileys (número pessoal, via QR) |
| Multi-tenant | Isolamento por `tenant_id` em todas as consultas |

Se você veio ler o código, três lugares que valem a visita:

- **`src/lib/db/queryClient.ts`** — o shim que trocou o supabase-js por SQL puro
  sem reescrever 673 consultas espalhadas pelo app.
- **`src/lib/ai-agents/runSdrLeadTurn.ts`** — o laço do SDR: monta o histórico
  com mídia (imagem como visão, áudio transcrito, PDF nativo), executa as
  ferramentas e responde.
- **`supabase/migrations/`** — 88 migrations, cada uma comentada com o *porquê*
  da decisão, não só o *o quê*.

---

## Rodando local

Precisa de Node 20+ e um PostgreSQL.

```bash
npm install
cp .env.local.example .env.local     # preencha DIRECT_URL e DATABASE_URL
npm run dev
```

Aplique as migrations de `supabase/migrations/` na ordem numérica.

O app sobe **sem nenhuma chave de IA** — o CRM funciona normalmente; os
recursos de IA ficam inativos até você conectar uma chave da OpenAI em
**Configurações → Inteligência Artificial**.

### Dados de demonstração (opcional)

```bash
DEMO_PASSWORD='umaSenhaForte' node scripts/seed-demo-tenant.js
```

Cria uma empresa fictícia com leads espalhados pelo funil, produtos e uma
conversa de SDR — útil pra ver as telas cheias em vez de vazias.

---

## Gravando um vídeo do produto

O repositório traz a automação que gera o vídeo de demonstração: ela navega no
app de verdade com Playwright, grava em 1080p, gera a narração por TTS e monta
os dois com o áudio sincronizado cena a cena.

```bash
OPENAI_API_KEY=sk-... node scripts/video/narrate.js   # gera a narração
node scripts/video/record-demo.js                     # grava a imagem
node scripts/video/assemble.js                        # junta os dois
```

O roteiro está em [`scripts/video/ROTEIRO.md`](scripts/video/ROTEIRO.md) e o
texto de cada cena em `scripts/video/scenes.js`.

---

## Licença

Código de demonstração, publicado como portfólio. Todos os direitos reservados.
