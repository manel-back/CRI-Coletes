# CRI Coletes

Site (instalável como app) para consultar a cor do uniforme dos times do campeonato do CRI.
Foi criado para substituir a antiga tabela escrita à mão. Funciona em **Android e iPhone**, abre
**sem internet** (mostra a última versão salva) e é atualizado **online**: quando um administrador
muda algo, todos veem na hora, sem precisar gerar ou instalar APK.

## Como funciona

- **Qualquer pessoa** abre o site e consulta, sem login. Dá para buscar por nome do time ou por cor
  ("preto", "fazenda marta", "lider"...), em todas as divisões de uma vez.
- **Permissões** (quem entra com a conta Google):

  | Papel | Consulta | Edita times, cores, divisões e título | Promove / rebaixa pessoas |
  |---|:-:|:-:|:-:|
  | Usuário | ✅ | | |
  | Administrador | ✅ | ✅ | |
  | Criador | ✅ | ✅ | ✅ |

  Toda pessoa que entra pela primeira vez vira **Usuário**. O criador promove quem ele quiser a
  **Administrador** (e rebaixa de volta) pela tela *Conta → Equipe e permissões*.
  Essas regras são garantidas pelo servidor (`firestore.rules`), não só pela tela.

- **Instalar no celular:** no iPhone, abra no Safari → *Compartilhar* → *Adicionar à Tela de Início*.
  No Android, o próprio site mostra o botão **Instalar**.

## Configuração (uma única vez)

Você precisa de [Node.js](https://nodejs.org) 20 ou mais novo e de uma conta Google.

1. **Criar o projeto no Firebase:** acesse <https://console.firebase.google.com>, clique em
   *Adicionar projeto* e siga os passos (o Google Analytics pode ficar desativado). O plano
   gratuito (Spark) é suficiente.
2. **Banco de dados:** no menu *Build → Firestore Database*, clique em *Criar banco de dados*,
   escolha a região `southamerica-east1 (São Paulo)` e o modo **produção**.
3. **Login:** em *Build → Authentication → Começar*, ative o provedor **Google**.
4. **App Web:** em *Configurações do projeto* (engrenagem) → *Seus apps* → ícone `</>`, registre
   um app (pode chamar de "CRI Coletes"). Copie o objeto `firebaseConfig` que aparece e cole em
   `src/firebase-config.js`, no lugar de `null`:

   ```js
   export const firebaseConfig = {
     apiKey: '...',
     authDomain: 'seu-projeto.firebaseapp.com',
     projectId: 'seu-projeto',
     storageBucket: '...',
     messagingSenderId: '...',
     appId: '...',
   };
   ```

5. **Publicar** (no terminal, dentro da pasta do projeto):

   ```bash
   npm install
   npx firebase login
   npx firebase use --add        # escolha o projeto criado no passo 1
   npm run deploy                # publica o site e as regras de segurança
   ```

   O endereço do site aparece no final (ex.: `https://seu-projeto.web.app`). É esse link que você
   manda para os gandulas.

6. **Virar o Criador:** abra o site, toque no ícone de conta e **entre com o Google**. Depois, no
   Console do Firebase, vá em *Firestore Database → usuarios →* (o documento com o seu e-mail) e
   mude o campo `papel` de `usuario` para `criador`. Isso só pode ser feito pelo Console, de
   propósito: ninguém consegue se tornar criador pelo site.
7. **Importar a tabela:** de volta ao site, a tela inicial mostra o botão
   **Importar tabela inicial**, com as 8 divisões e os 94 times do app antigo. Pronto!

Depois disso, para publicar uma nova versão do **código** basta `npm run deploy`. Mudanças na
**tabela** (times, cores, divisões) são feitas pelo próprio site e não precisam de deploy.

## Desenvolvimento

```bash
npm run dev          # servidor local com recarregamento automático
npm test             # testes da lógica (busca, cores, tabela inicial)
npm run test:regras  # testes das regras de segurança no emulador (precisa de Java 11+)
npm run build        # gera a versão de produção em dist/
```

Sem o `firebaseConfig` preenchido, o site abre em **modo demonstração**: mostra a tabela inicial,
mas sem login nem edição.

### Estrutura

| Arquivo | Função |
|---|---|
| `index.html`, `src/estilo.css` | Estrutura e visual (tema claro/escuro automático) |
| `src/main.js` | Telas, navegação, formulários |
| `src/dados.js` | Conexão com o Firebase (leitura em tempo real, cache offline, login, gravações) |
| `src/cores.js` | Paleta de cores dos uniformes e contraste de texto |
| `src/busca.js` | Busca sem acentos e ordenação alfabética |
| `src/dados-iniciais.js` | Tabela do app Android antigo, usada na importação e no modo demonstração |
| `src/firebase-config.js` | Configuração do seu projeto Firebase |
| `firestore.rules` | Regras de segurança (quem pode ler/editar o quê) |
| `public/sw.js`, `public/manifest.webmanifest` | Funcionamento offline e instalação como app |
| `tests/` | Testes automatizados |
