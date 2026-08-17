# Aviso de visualização — o que fazer para ligar

Reaproveita o Worker do formulário de contato (mesma conta Resend, mesma chave —
nada novo para criar). Só precisa republicar o código do Worker com a versão nova.

## Passo a passo

1. Abrir [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** →
   `sweet-king-5b44` (o Worker que já está no ar)
2. **Edit code** → `Ctrl+A` → `Delete` → colar o conteúdo de
   [`worker-contato.js`](worker-contato.js) (a versão desta PR — tem duas rotas agora,
   `/` continua sendo o formulário)
3. Conferir no rodapé do editor: **"⊗ 0 ⚠ 0"** (zero erros)
4. **Deploy** (canto superior direito)

Não precisa mexer em **Settings → Variables and secrets** — a `RESEND_API_KEY` continua
a mesma, só o código do Worker muda.

## Como funciona

Toda vez que a página carrega, o site dispara um aviso para
`https://sweet-king-5b44.ccpesente.workers.dev/visita`, que manda um e-mail:

> 👀 Alguém visualizou seu portfólio
>
> 17/08/2026, 17:50
>
> Página: /
> Origem: https://linkedin.com/
> Local aproximado: Florianópolis, SC, BR

Sem filtro de repetição — **toda visita gera um e-mail**, foi a opção que você escolheu.
Isso inclui recarregar a página, e provavelmente inclui bots de preview do LinkedIn/
WhatsApp quando alguém compartilha o link (eles às vezes executam o JavaScript da
página para gerar a prévia).

## Testar sem se avisar

```
https://cristinapesente.github.io/?eu=1
```

Com `?eu=1` na URL, o aviso não dispara. Sem esse parâmetro, dispara sempre — inclusive
se você mesma abrir o link normal para conferir algo.

## Sobre o que é coletado

Mais do que o módulo de analytics original propunha (aquele evitava de propósito
qualquer dado de localização). Esta função:

- **Não grava IP** nem usa fingerprint
- Usa `city`/`region`/`country` que o próprio Cloudflare já calcula para rotear a
  requisição — a mesma granularidade de "de onde vêm as visitas" que qualquer analytics
  básico mostra, não o endereço exato
- Não junta duas visitas da mesma pessoa entre si — cada aviso é isolado, não existe
  perfil de visitante sendo montado em lugar nenhum

Se quiser reduzir o volume mais pra frente (ex.: um aviso por visitante a cada 6h, ou
resumo diário em vez de tempo real), é uma mudança pequena no Worker — avise quando
quiser.
