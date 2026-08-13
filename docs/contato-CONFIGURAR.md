# Formulário de contato — o que falta para funcionar

## O que aconteceu

O formulário usava o Web3Forms. Conferi sua caixa de entrada (inclusive lixeira):
**existe um único e-mail do Web3Forms na história da conta inteira**, de um teste seu em
10/08. Todo envio depois disso — inclusive testes automatizados que retornaram sucesso —
nunca chegou, nem na caixa de entrada nem no spam. O serviço aceitava o envio e
respondia como se tivesse dado certo, mas o e-mail se perdia no caminho. Silenciosamente:
sem esse tipo de checagem, não haveria como saber.

**O que mudei:** troquei o Web3Forms pelo Resend, que é o que o `06-analytics-simples.md`
pede. Diferença que importa — quando o Resend falha, ele diz que falhou; não finge
sucesso.

## Por que existe um Worker no meio

O site é HTML estático hospedado no GitHub Pages — não tem servidor. A chave do Resend
é secreta (ao contrário da chave do Web3Forms, que era pública por natureza) e **não
pode** aparecer no código do site. Por isso o envio passa por um Cloudflare Worker: uma
função gratuita, hospedada pelo Cloudflare, que guarda a chave e faz a chamada ao Resend
por você. É o equivalente ao route handler do Next.js que o `.md` original descreve —
adaptado porque não existe backend próprio aqui.

**Enquanto o Worker não estiver publicado, o botão de enviar mensagem fica desabilitado**
e mostra "Escreva por e-mail ou WhatsApp acima" — os dois continuam funcionando
normalmente, visíveis assim que a pessoa clica em "Falar comigo". Preferi isso a deixar
o botão ativo apontando para o nada: um botão que parece funcionar e não funciona foi
exatamente o problema que te trouxe aqui.

---

## Passo a passo (uns 10 minutos, tudo pelo navegador)

### 1. Conta no Resend

1. Criar conta em [resend.com](https://resend.com)
2. **API Keys → Create API Key** → copiar a chave (`re_...`). Ela só aparece uma vez —
   se perder, cria outra.
3. Sem domínio verificado, o remetente do e-mail é `onboarding@resend.dev` — funciona,
   mas só entrega para o e-mail com que você criou a conta (o seu, então tudo certo).
   Se um dia quiser um remetente com seu domínio, é **Domains → Add** lá no painel.

### 2. Publicar o Worker

1. Entrar em [dash.cloudflare.com](https://dash.cloudflare.com) (conta gratuita, se
   ainda não tiver)
2. **Workers & Pages → Create → Create Worker** → dar um nome, por exemplo
   `portfolio-contato` → **Deploy** (ele sobe um "Hello World" primeiro, tudo bem)
3. **Edit code** → apagar o conteúdo de exemplo → colar o conteúdo de
   [worker-contato.js](worker-contato.js) → **Deploy**
4. **Settings → Variables and Secrets → Add** → nome `RESEND_API_KEY`, tipo **Secret**,
   valor a chave copiada no passo 1 → **Save**
5. Copiar a URL do Worker, que aparece no topo (algo como
   `https://portfolio-contato.<seu-usuario>.workers.dev`)

### 3. Ligar o site ao Worker

Em [`files/index.html`](files/index.html), procurar a linha:

```js
const CONTATO_URL="";
```

E colar a URL do Worker entre as aspas:

```js
const CONTATO_URL="https://portfolio-contato.<seu-usuario>.workers.dev";
```

Commit e push (ou peça para eu fazer, já que tenho acesso ao repositório). O botão
volta a funcionar assim que o deploy do GitHub Pages terminar, ~1 minuto.

---

## Como verificar que chegou de verdade

Diferente do Web3Forms, agora dá para conferir em duas camadas:

1. **No painel do Resend** → aba **Emails** — todo envio aparece ali, com o status
   (`delivered`, `bounced` etc.), mesmo que não chegue na caixa de entrada. Se aparecer
   "delivered" e mesmo assim não chegar, é hora de olhar o spam de verdade.
2. **Testando pelo site** — abra o portfólio, clique em "Falar comigo", preencha e envie.
   Deve aparecer "Mensagem enviada" na tela **e** o e-mail chegar em segundos.

## Se travar em algum passo

| Sintoma | Causa provável |
|---|---|
| Botão continua desabilitado depois do commit | `CONTATO_URL` ficou vazio, ou o GitHub Pages ainda não terminou o deploy — espere 1-2 min e recarregue com Ctrl+Shift+R |
| "Não foi possível enviar agora" | `RESEND_API_KEY` não foi salva no Worker, ou foi salva como texto puro em vez de Secret |
| E-mail aparece "delivered" no Resend mas não chega | Confira a pasta de spam pra valer, e se `onboarding@resend.dev` está bloqueado por algum filtro seu |
| Erro de CORS no console do navegador | A URL colada em `CONTATO_URL` está diferente da URL real do Worker — confira se copiou certo, sem espaço no fim |
