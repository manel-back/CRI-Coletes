# CRI Coletes

Site/PWA (instalável no Android e iPhone) para os gandulas consultarem a cor do uniforme dos
times do campeonato do CRI. Substituiu um app Android antigo (a tabela original está em
`src/dados-iniciais.js`). Todo o texto do site, comentários e mensagens de commit são em
**português do Brasil**.

## Stack
- JavaScript puro (sem framework) com **Vite**; sem TypeScript.
- **Firebase**: Firestore (dados em tempo real + cache offline) e Authentication (login Google).
- Hospedagem no **Firebase Hosting** (`firebase.json`, publica a pasta `dist/`).
- Service worker próprio em `public/sw.js` (offline); o cache é versionado a cada build pelo `vite.config.js`.

## Comandos
- `npm run dev`: servidor local (http://localhost:5173)
- `npm test`: testes da lógica (`tests/logica.test.js`, `node --test`)
- `npm run test:regras`: testa `firestore.rules` no emulador (precisa de Java 11+)
- `npm run build`: gera `dist/`
- `npm run deploy`: build + publica site e regras (`firebase deploy`)

Antes de commitar: `npm test`, `npm run build` e, se mexer em `firestore.rules`, `npm run test:regras`.

## Arquitetura
- `src/main.js`: telas, navegação por hash (`#/`, `#/divisao/{id}`, `#/gerenciar`, `#/equipe`),
  formulários em `<dialog id="folha">`. A tela é redesenhada inteira por `render()`; os cliques usam
  delegação via `data-acao`. **Todo texto vindo do banco passa por `esc()`** (evita XSS).
- `src/dados.js`: única camada que fala com o Firebase. `estado` é o objeto compartilhado com a tela.
  Sem `firebaseConfig` o site roda em **modo demonstração** (somente leitura, com a tabela inicial).
- `src/cores.js` (paleta e contraste), `src/busca.js` (busca sem acento), `src/dados-iniciais.js`.

## Modelo de dados (Firestore)
- `divisoes/{id}`: `{ nome, cor (#RRGGBB), ordem }`
- `times/{id}`: `{ nome, divisaoId, cores: [{ nome, hex }] (1 a 3), atualizadoEm, atualizadoPor }`
- `config/geral`: `{ titulo, subtitulo }`
- `usuarios/{uid}`: `{ nome, email, foto, papel, criadoEm }`

## Permissões (garantidas em `firestore.rules`, não só na tela)
- Sem login e `usuario`: só leitura.
- `admin`: edita times, divisões e config.
- `criador`: tudo do admin + promove/rebaixa entre `usuario` e `admin` (tela Equipe).
- O papel `criador` **nunca** é concedido pelo site; só manualmente no Console do Firebase.
- Só contam contas **Google com e-mail verificado** (`contaGoogle()`): contas de e-mail/senha ou
  anônimas são tratadas como visitantes. O `email` do perfil tem que ser o da conta, a `foto` só pode
  ser de `*.googleusercontent.com` e `atualizadoPor` tem que ser o nome do perfil de quem edita.
Ao mudar campos de um documento, atualize juntos: `dados.js`, `firestore.rules` e os testes.

## Regras do dono do projeto
- Interface moderna, funcional e intuitiva, pensada primeiro para celular; tema claro/escuro automático.
- Não deixar arquivos, funções ou exports sem uso; apagar o que não faz diferença.
- Perguntar antes de decisões que possam prejudicar o projeto (ex.: apagar dados, trocar de tecnologia).
- Os times não vêm de nenhuma fonte online: são mantidos pelos admins no próprio site.
