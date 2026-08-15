# Roteiro do vídeo — Vorlo

**Duração alvo:** ~2min40s · **Formato:** 1920×1080 · **Tom:** direto, sem jargão, primeira pessoa

Tudo é gravado no tenant de demonstração (`demo-plasticos`) — dados 100% fictícios,
nenhum cliente real aparece. Regravável a qualquer momento com
`node scripts/seed-demo-tenant.js`.

O texto de **NARRAÇÃO** é o que se fala por cima da cena. Cada cena tem um alvo
de tempo; a automação (`record-demo.js`) respeita esses tempos.

---

## Cena 1 — Abertura (0:00–0:12)

**Tela:** landing page, rolagem suave até a seção de recursos.

**NARRAÇÃO:**
> Todo dia chega lead novo no WhatsApp. E todo dia alguns esfriam — não porque
> o produto é ruim, mas porque ninguém respondeu a tempo. O Vorlo resolve isso.

---

## Cena 2 — Dashboard (0:12–0:32)

**Tela:** login (rápido) e o Dashboard do CRM com números e gráfico.

**NARRAÇÃO:**
> Esse é o painel. Quanto entrou, quantos negócios estão abertos, quanto tempo
> a equipe leva pra responder. Tudo que você precisa saber pra abrir o dia,
> numa tela só.

---

## Cena 3 — Pipeline (0:32–0:52)

**Tela:** o funil em colunas; arrastar um card de "Proposta" para "Fechamento".

**NARRAÇÃO:**
> O funil é visual. Cada card é um negócio, e mover é arrastar. Quando um lead
> avança de etapa, as automações disparam sozinhas — a mensagem de follow-up,
> a tarefa pro vendedor, o aviso de proposta parada.

---

## Cena 4 — SDR de IA, o coração (0:52–1:25)

**Tela:** aba Leads; abrir a conversa da Camila Rocha e rolar a thread devagar,
deixando ler as mensagens.

**NARRAÇÃO:**
> Aqui está a diferença. Esse lead chegou às duas da tarde, e ninguém da equipe
> precisou estar online. A IA atendeu, entendeu que ele queria caixa
> organizadora, perguntou o volume, coletou nome e CNPJ, e passou pro vendedor
> já qualificado.
>
> Ela ouve áudio, lê imagem e lê PDF. Se o cliente mandar o orçamento do
> concorrente em PDF, ela abre e comenta. Se ele mandar um áudio, ela responde
> por áudio também.

---

## Cena 5 — O contato que virou cadastro (1:25–1:42)

**Tela:** abrir o contato e mostrar os dados que a IA preencheu.

**NARRAÇÃO:**
> E não fica só na conversa: o que ela coletou já virou cadastro completo —
> nome, documento, endereço. Sem ninguém digitar nada.

---

## Cena 6 — Agentes de IA (1:42–1:58)

**Tela:** Configurações → Agentes de IA; abrir o agente e mostrar o prompt.

**NARRAÇÃO:**
> E a IA é sua. Você escreve como ela fala, o que pode e o que não pode
> prometer, quais ferramentas ela usa. Não é um robô genérico: é o seu
> vendedor, do seu jeito.

---

## Cena 7 — ERP (1:58–2:14)

**Tela:** Dashboard do ERP e Cadastros → Produtos.

**NARRAÇÃO:**
> Quando a venda acontece, ela não morre num print. O ERP vem junto: produtos,
> estoque, clientes, propostas — tudo no mesmo lugar, sem exportar planilha
> pra lugar nenhum.

---

## Cena 8 — Importar produtos com IA (2:14–2:32)

**Tela:** abrir "Importar com IA" e mostrar o modal de upload.

**NARRAÇÃO:**
> E cadastrar produto não precisa ser digitação. Joga a tabela do fornecedor —
> planilha, PDF, até foto — que a IA lê e monta o catálogo. Você só confere e
> confirma.

---

## Cena 9 — Proposta (2:32–2:50)

**Tela:** Nova proposta; digitar no campo de cliente pra mostrar a busca.

**NARRAÇÃO:**
> Montar a proposta leva segundos. Acha o cliente pelo nome, pelo CNPJ ou pelo
> telefone, escolhe os produtos, e envia.

---

## Cena 10 — Fecho (2:50–3:00)

**Tela:** volta ao Dashboard, respira, fade.

**NARRAÇÃO:**
> Vorlo. Seu comercial inteiro num lugar só — com uma IA que trabalha
> enquanto você dorme.

---

## Notas de produção

- **Cursor:** a automação move o mouse de verdade e marca os cliques com um
  halo, pra quem assiste acompanhar o que está sendo clicado.
- **Ritmo:** o script pausa entre ações. Se achar corrido na hora de narrar,
  ajuste `PACE` no topo de `record-demo.js` (1.0 = normal, 1.3 = 30% mais lento).
- **Cena 4 é a mais importante.** É o que diferencia o produto — se for cortar
  tempo, corte das outras.
- O vídeo sai **sem áudio** (Playwright grava só imagem). A narração entra na
  edição: grave sua voz ou gere por IA e alinhe pelos tempos deste roteiro.
