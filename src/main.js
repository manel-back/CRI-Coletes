import {
  PAPEIS,
  definirPapel,
  ehCriador,
  entrar,
  estado,
  excluirDivisao,
  excluirTime,
  importarTabelaInicial,
  iniciar,
  mensagemDeErro,
  ouvirUsuarios,
  podeEditar,
  sair,
  salvarConfig,
  salvarDivisao,
  salvarTime,
  trocarOrdem,
} from './dados.js';
import { MAX_CORES, PALETA, corDeTexto, hexValido } from './cores.js';
import { buscarTimes, normalizar, ordenarPorNome } from './busca.js';

const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
const conteudo = $('#conteudo');
const folha = $('#folha');
const campoBusca = $('#busca');

let termoBusca = '';
let usuarios = null; // lista da tela Equipe (só carregada para o criador)
let pararUsuarios = null;
let pedidoInstalacao = null; // evento beforeinstallprompt (Android/Chrome)

// ---------- Utilidades ----------

const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const hex = (h) => (hexValido(h) ? h : '#8A8F98');

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

const ICONES = {
  voltar: '<path d="M15 18l-6-6 6-6" />',
  editar: '<path d="M4 20h4L19 9l-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" />',
  mais: '<path d="M12 5v14M5 12h14" />',
  lixeira: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />',
  cima: '<path d="M6 15l6-6 6 6" />',
  baixo: '<path d="M6 9l6 6 6-6" />',
  fechar: '<path d="M6 6l12 12M18 6 6 18" />',
  conta: '<circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" />',
  equipe: '<circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2.2.6 3.5 2.4 3.5 5.2" />',
  ajustes: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" />',
  sair: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />',
  instalar: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14" />',
  seta: '<path d="M9 6l6 6-6 6" />',
};
const icone = (nome) => `<svg class="icone" viewBox="0 0 24 24" aria-hidden="true">${ICONES[nome]}</svg>`;

const CAMISA =
  'M17 5 9.5 8 3 15l5.5 6 3.5-3v25h24V18l3.5 3L45 15l-6.5-7L31 5c-1 3.5-3.7 5.5-7 5.5S18 8.5 17 5z';
let seqGradiente = 0;

/** Camisa desenhada com as cores do time em faixas verticais. */
function camisa(cores) {
  const id = `g${seqGradiente++}`;
  const n = cores.length || 1;
  const faixas = cores
    .map((c, i) => `<stop offset="${i / n}" stop-color="${hex(c.hex)}"/><stop offset="${(i + 1) / n}" stop-color="${hex(c.hex)}"/>`)
    .join('');
  return `<svg class="camisa" viewBox="0 0 48 48" aria-hidden="true">
    <defs><linearGradient id="${id}">${faixas}</linearGradient></defs>
    <path d="${CAMISA}" fill="url(#${id})" /></svg>`;
}

const bolinha = (c) => `<span class="cor"><i style="background:${hex(c.hex)}"></i>${esc(c.nome)}</span>`;

const estiloCor = (cor) => `--cor:${hex(cor)};--texto:${corDeTexto(hex(cor))}`;

const divisaoPorId = (id) => estado.divisoes.find((d) => d.id === id);
const timesDaDivisao = (id) => estado.times.filter((t) => t.divisaoId === id);

function rota() {
  const [pagina, id] = location.hash.replace(/^#\/?/, '').split('/');
  return { pagina: pagina || 'inicio', id: id && decodeURIComponent(id) };
}

// ---------- Avisos rápidos ----------

function toast(mensagem, tipo = 'ok') {
  const el = document.createElement('div');
  el.className = `toast toast-${tipo}`;
  el.textContent = mensagem;
  const pilha = $('#toasts');
  pilha.append(el);
  while (pilha.children.length > 2) pilha.firstElementChild.remove();
  setTimeout(() => el.classList.add('saindo'), 3200);
  setTimeout(() => el.remove(), 3600);
}

/** Dispara uma gravação sem travar a tela: o Firestore aplica na hora e sincroniza depois. */
function executar(promessa, mensagemOk) {
  const offline = !navigator.onLine;
  if (offline) toast(`${mensagemOk} Será enviado quando a internet voltar.`);
  promessa.then(() => offline || toast(mensagemOk)).catch((e) => toast(mensagemDeErro(e), 'erro'));
}

// ---------- Renderização ----------

function render() {
  seqGradiente = 0;
  const { subtitulo, titulo } = estado.config;
  $('#subtitulo').textContent = subtitulo;
  $('#titulo').textContent = titulo;
  document.title = `CRI Coletes · ${titulo}`;

  const u = estado.usuario;
  $('#botao-conta').innerHTML = u?.foto
    ? `<img src="${esc(u.foto)}" alt="" referrerpolicy="no-referrer" />`
    : icone('conta');

  const aviso = $('#aviso');
  const textoAviso = estado.modoDemo
    ? 'Modo demonstração: Firebase ainda não configurado. Edição desativada.'
    : !navigator.onLine
      ? 'Sem internet: mostrando a última versão salva.'
      : '';
  aviso.textContent = textoAviso;
  aviso.hidden = !textoAviso;

  const r = rota();
  const telaEquipe = r.pagina === 'equipe' && ehCriador();
  if (telaEquipe && !pararUsuarios) {
    pararUsuarios = ouvirUsuarios((lista) => {
      usuarios = lista;
      render();
    });
  } else if (!telaEquipe && pararUsuarios) {
    pararUsuarios();
    pararUsuarios = null;
    usuarios = null;
  }

  if (termoBusca) conteudo.innerHTML = paginaBusca();
  else if (estado.carregando) conteudo.innerHTML = paginaCarregando();
  else if (r.pagina === 'divisao') conteudo.innerHTML = paginaDivisao(r.id);
  else if (r.pagina === 'gerenciar' && podeEditar()) conteudo.innerHTML = paginaGerenciar();
  else if (telaEquipe) conteudo.innerHTML = paginaEquipe();
  else conteudo.innerHTML = paginaInicio();
}

function paginaCarregando() {
  return `<div class="grade-divisoes">${'<div class="divisao esqueleto"></div>'.repeat(8)}</div>`;
}

function paginaInicio() {
  if (estado.divisoes.length === 0) {
    return podeEditar()
      ? `<section class="vazio">
          <h2>Banco de dados vazio</h2>
          <p>Importe a tabela que existia no app antigo (8 divisões e 94 times). Depois é só editar por aqui.</p>
          <button class="botao botao-primario" data-acao="importar">Importar tabela inicial</button>
        </section>`
      : `<section class="vazio"><h2>Nenhuma divisão cadastrada</h2>
          <p>Assim que um administrador cadastrar a tabela, ela aparece aqui.</p></section>`;
  }

  const cards = estado.divisoes
    .map((d) => {
      const n = timesDaDivisao(d.id).length;
      return `<a class="divisao" href="#/divisao/${encodeURIComponent(d.id)}" style="${estiloCor(d.cor)}">
        <strong>${esc(d.nome)}</strong><span>${plural(n, 'time', 'times')}</span></a>`;
    })
    .join('');

  return `${cartaoInstalar()}
    <h1 class="titulo-secao">Divisões</h1>
    <nav class="grade-divisoes">${cards}</nav>
    <p class="rodape">${plural(estado.times.length, 'time', 'times')} em ${plural(estado.divisoes.length, 'divisão', 'divisões')}</p>`;
}

function listaTimes(times, mostrarDivisao) {
  const editavel = podeEditar();
  const itens = ordenarPorNome(times).map((t) => {
    const d = mostrarDivisao && divisaoPorId(t.divisaoId);
    const tag = editavel ? 'button' : 'div';
    const atributos = editavel ? ` type="button" data-acao="editar-time" data-id="${esc(t.id)}"` : '';
    return `<li><${tag} class="time"${atributos}>
        ${camisa(t.cores)}
        <span class="time-info">
          <strong>${esc(t.nome)}</strong>
          <span class="time-cores">${t.cores.map(bolinha).join('')}</span>
        </span>
        ${d ? `<span class="etiqueta" style="${estiloCor(d.cor)}">${esc(d.nome)}</span>` : ''}
        ${editavel ? icone('editar') : ''}
      </${tag}></li>`;
  });
  return `<ul class="lista-times">${itens.join('')}</ul>`;
}

function paginaDivisao(id) {
  const d = divisaoPorId(id);
  if (!d) {
    return `<section class="vazio"><h2>Divisão não encontrada</h2>
      <p>Ela pode ter sido removida.</p><a class="botao" href="#/">Voltar ao início</a></section>`;
  }
  const times = timesDaDivisao(id);
  const editavel = podeEditar();
  return `<header class="cabecalho-divisao" style="${estiloCor(d.cor)}">
      <a class="botao-icone" href="#/" aria-label="Voltar">${icone('voltar')}</a>
      <div><h1>${esc(d.nome)}</h1><span>${plural(times.length, 'time', 'times')}</span></div>
      ${editavel ? `<button class="botao-icone" data-acao="editar-divisao" data-id="${esc(d.id)}" aria-label="Editar divisão">${icone('editar')}</button>` : ''}
    </header>
    ${editavel ? `<button class="botao botao-primario largo" data-acao="novo-time">${icone('mais')} Adicionar time</button>` : ''}
    ${times.length ? listaTimes(times, false) : '<p class="vazio-lista">Nenhum time nesta divisão ainda.</p>'}`;
}

function paginaBusca() {
  const achados = buscarTimes(estado.times, termoBusca);
  if (!achados.length) {
    return `<section class="vazio"><h2>Nada encontrado</h2>
      <p>Nenhum time ou cor corresponde a “${esc(termoBusca)}”.</p></section>`;
  }
  return `<p class="resumo-busca">${plural(achados.length, 'resultado', 'resultados')}</p>${listaTimes(achados, true)}`;
}

function paginaGerenciar() {
  const { subtitulo, titulo } = estado.config;
  const linhas = estado.divisoes
    .map((d, i, lista) => {
      const n = timesDaDivisao(d.id).length;
      return `<li class="linha-divisao">
        <i class="ponto" style="background:${hex(d.cor)}"></i>
        <a href="#/divisao/${encodeURIComponent(d.id)}"><strong>${esc(d.nome)}</strong><small>${plural(n, 'time', 'times')}</small></a>
        <button class="botao-icone" data-acao="subir" data-indice="${i}" aria-label="Subir" ${i === 0 ? 'disabled' : ''}>${icone('cima')}</button>
        <button class="botao-icone" data-acao="descer" data-indice="${i}" aria-label="Descer" ${i === lista.length - 1 ? 'disabled' : ''}>${icone('baixo')}</button>
        <button class="botao-icone" data-acao="editar-divisao" data-id="${esc(d.id)}" aria-label="Editar">${icone('editar')}</button>
      </li>`;
    })
    .join('');

  return `<header class="cabecalho-pagina">
      <a class="botao-icone" href="#/" aria-label="Voltar">${icone('voltar')}</a><h1>Gerenciar</h1>
    </header>
    <section class="painel">
      <div class="painel-topo"><h2>Campeonato</h2>
        <button class="botao botao-leve" data-acao="editar-config">${icone('editar')} Editar</button></div>
      <p class="config-atual"><small>${esc(subtitulo)}</small><strong>${esc(titulo)}</strong></p>
    </section>
    <section class="painel">
      <div class="painel-topo"><h2>Divisões</h2>
        <button class="botao botao-leve" data-acao="nova-divisao">${icone('mais')} Nova</button></div>
      <ul class="lista-divisoes">${linhas}</ul>
      <p class="nota">Os times são adicionados e editados dentro de cada divisão.</p>
    </section>`;
}

function avatar(u) {
  return u.foto
    ? `<img class="avatar" src="${esc(u.foto)}" alt="" referrerpolicy="no-referrer" />`
    : `<span class="avatar">${esc((u.nome || '?').charAt(0).toUpperCase())}</span>`;
}

function paginaEquipe() {
  const topo = `<header class="cabecalho-pagina">
      <a class="botao-icone" href="#/" aria-label="Voltar">${icone('voltar')}</a><h1>Equipe</h1>
    </header>
    <p class="explicacao"><strong>Usuário</strong> só consulta. <strong>Administrador</strong> edita times, cores e divisões.
    <strong>Criador</strong> faz tudo isso e promove ou rebaixa pessoas. Para aparecer aqui, a pessoa precisa entrar uma vez com a conta Google.</p>`;
  if (!usuarios) return `${topo}<p class="vazio-lista">Carregando…</p>`;

  const ordemPapel = { criador: 0, admin: 1, usuario: 2 };
  const linhas = [...usuarios]
    .sort((a, b) => ordemPapel[a.papel] - ordemPapel[b.papel] || a.nome.localeCompare(b.nome, 'pt-BR'))
    .map((u) => {
      let acao = '';
      if (u.papel === 'usuario') {
        acao = `<button class="botao botao-leve" data-acao="promover" data-uid="${esc(u.uid)}">Promover</button>`;
      } else if (u.papel === 'admin') {
        acao = `<button class="botao botao-leve perigo" data-acao="rebaixar" data-uid="${esc(u.uid)}">Rebaixar</button>`;
      }
      return `<li class="linha-usuario">${avatar(u)}
        <span class="usuario-info"><strong>${esc(u.nome)}</strong><small>${esc(u.email)}</small></span>
        <span class="usuario-acoes"><span class="papel papel-${esc(u.papel)}">${PAPEIS[u.papel] ?? esc(u.papel)}</span>${acao}</span></li>`;
    })
    .join('');
  return `${topo}<ul class="lista-usuarios">${linhas}</ul>`;
}

// ---------- Instalação na tela inicial ----------

const instalado = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const ehIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function lerPreferencia(chave) {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function cartaoInstalar() {
  if (instalado() || lerPreferencia('instalar-dispensado')) return '';
  let corpo;
  if (pedidoInstalacao) {
    corpo = `<p>Instale no celular para abrir como um app, mesmo sem internet.</p>
      <button class="botao botao-primario" data-acao="instalar">${icone('instalar')} Instalar</button>`;
  } else if (ehIOS()) {
    corpo = '<p>No Safari, toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong> para usar como app.</p>';
  } else {
    return '';
  }
  return `<aside class="cartao-instalar">
      <button class="botao-icone" data-acao="dispensar-instalar" aria-label="Dispensar">${icone('fechar')}</button>
      <h2>Use como aplicativo</h2>${corpo}</aside>`;
}

// ---------- Folhas (diálogos) ----------

function abrirFolha(html) {
  folha.innerHTML = html;
  if (!folha.open) folha.showModal();
  folha.querySelectorAll('[data-fechar]').forEach((b) => b.addEventListener('click', () => folha.close()));
  return folha;
}

const topoFolha = (titulo) =>
  `<header class="folha-topo"><h2>${titulo}</h2>
    <button type="button" class="botao-icone" data-fechar aria-label="Fechar">${icone('fechar')}</button></header>`;

/** Pergunta de confirmação na folha. Resolve true se a pessoa confirmar. */
function confirmar(mensagem, textoBotao) {
  return new Promise((resolver) => {
    abrirFolha(`${topoFolha('Tem certeza?')}<p class="texto-folha">${mensagem}</p>
      <div class="acoes-folha"><button type="button" class="botao" data-fechar>Cancelar</button>
      <button type="button" class="botao botao-perigo" data-confirmar>${textoBotao}</button></div>`);
    folha.addEventListener('close', () => resolver(false), { once: true });
    $('[data-confirmar]', folha).addEventListener('click', () => {
      resolver(true);
      folha.close();
    });
  });
}

function folhaConta() {
  const u = estado.usuario;
  let corpo;
  if (estado.modoDemo) {
    corpo = '<p class="texto-folha">O site está em modo demonstração. Siga o passo a passo do README para conectar o Firebase e liberar login e edição.</p>';
  } else if (!u) {
    corpo = `<p class="texto-folha">Para consultar as cores não precisa entrar. O login serve para quem vai <strong>editar</strong> a tabela: depois de entrar, peça ao criador para te promover.</p>
      <button type="button" class="botao botao-primario largo" data-entrar>Entrar com Google</button>`;
  } else {
    const links = [];
    if (podeEditar()) links.push(`<a class="item-menu" href="#/gerenciar">${icone('ajustes')}<span>Gerenciar divisões e título</span>${icone('seta')}</a>`);
    if (ehCriador()) links.push(`<a class="item-menu" href="#/equipe">${icone('equipe')}<span>Equipe e permissões</span>${icone('seta')}</a>`);
    corpo = `<div class="perfil">${avatar(u)}<span class="usuario-info"><strong>${esc(u.nome)}</strong><small>${esc(u.email)}</small></span>
        <span class="papel papel-${esc(u.papel)}">${PAPEIS[u.papel] ?? ''}</span></div>
      ${u.papel === 'usuario' ? '<p class="texto-folha">Você pode consultar tudo. Para editar, peça ao criador para te promover a administrador.</p>' : ''}
      ${links.length ? `<nav class="menu">${links.join('')}</nav>` : ''}
      <button type="button" class="botao largo" data-sair>${icone('sair')} Sair</button>`;
  }
  abrirFolha(`${topoFolha('Conta')}${corpo}`);
  folha.querySelectorAll('.item-menu').forEach((a) => a.addEventListener('click', () => folha.close()));
  $('[data-entrar]', folha)?.addEventListener('click', () => {
    folha.close();
    entrar().catch((e) => toast(mensagemDeErro(e), 'erro'));
  });
  $('[data-sair]', folha)?.addEventListener('click', () => {
    folha.close();
    sair();
    location.hash = '#/';
  });
}

function seletorDeCor(nome, corAtual) {
  const opcoes = PALETA.map(
    (c) => `<button type="button" class="amostra" data-hex="${c.hex}" data-nome="${esc(c.nome)}" style="--c:${c.hex}"
      aria-pressed="false"><i></i><span>${esc(c.nome)}</span></button>`,
  ).join('');
  return `<div class="paleta" data-paleta="${nome}">${opcoes}</div>
    <details class="cor-personalizada"><summary>Outra cor</summary>
      <div class="linha-personalizada">
        <input type="color" value="${hex(corAtual)}" aria-label="Escolher cor" />
        <input type="text" maxlength="30" placeholder="Nome da cor" aria-label="Nome da cor" />
        <button type="button" class="botao botao-leve" data-adicionar-cor>Usar</button>
      </div>
    </details>`;
}

function folhaTime(time) {
  const divisaoInicial = time?.divisaoId ?? rota().id ?? estado.divisoes[0]?.id;
  let cores = time ? time.cores.map((c) => ({ ...c })) : [];
  const opcoes = estado.divisoes
    .map((d) => `<option value="${esc(d.id)}" ${d.id === divisaoInicial ? 'selected' : ''}>${esc(d.nome)}</option>`)
    .join('');

  abrirFolha(`<form class="formulario" novalidate>
    ${topoFolha(time ? 'Editar time' : 'Novo time')}
    <label class="rotulo">Nome do time<input name="nome" maxlength="60" required autocomplete="off" value="${esc(time?.nome)}" /></label>
    <label class="rotulo">Divisão<select name="divisaoId">${opcoes}</select></label>
    <fieldset class="rotulo"><legend>Cores do uniforme <small>até ${MAX_CORES}, na ordem</small></legend>
      <div class="previa"><span data-camisa></span><div class="escolhidas" data-escolhidas></div></div>
      ${seletorDeCor('time', '#3366CC')}
    </fieldset>
    ${time?.atualizadoPor ? `<p class="nota">Última alteração por ${esc(time.atualizadoPor)}</p>` : ''}
    <div class="acoes-folha">
      ${time ? `<button type="button" class="botao botao-perigo" data-excluir>${icone('lixeira')} Excluir</button>` : ''}
      <button type="submit" class="botao botao-primario">Salvar</button>
    </div></form>`);

  const form = $('form', folha);
  const desenharCores = () => {
    $('[data-camisa]', form).innerHTML = camisa(cores);
    $('[data-escolhidas]', form).innerHTML = cores.length
      ? cores
          .map((c, i) => `<span class="chip">${bolinha(c)}<button type="button" data-remover="${i}" aria-label="Remover ${esc(c.nome)}">${icone('fechar')}</button></span>`)
          .join('')
      : '<span class="nota">Toque nas cores abaixo</span>';
    form.querySelectorAll('.amostra').forEach((b) => {
      b.setAttribute('aria-pressed', String(cores.some((c) => c.nome === b.dataset.nome)));
    });
  };
  const adicionar = (cor) => {
    if (cores.some((c) => normalizar(c.nome) === normalizar(cor.nome))) return;
    if (cores.length >= MAX_CORES) return toast(`Máximo de ${MAX_CORES} cores por time.`, 'erro');
    cores.push(cor);
    desenharCores();
  };

  form.addEventListener('click', (e) => {
    const amostra = e.target.closest('.amostra');
    const remover = e.target.closest('[data-remover]');
    if (amostra) {
      const ja = cores.findIndex((c) => c.nome === amostra.dataset.nome);
      if (ja >= 0) {
        cores.splice(ja, 1);
        desenharCores();
      } else {
        adicionar({ nome: amostra.dataset.nome, hex: amostra.dataset.hex });
      }
    } else if (remover) {
      cores.splice(Number(remover.dataset.remover), 1);
      desenharCores();
    } else if (e.target.closest('[data-adicionar-cor]')) {
      const [corInput, nomeInput] = form.querySelectorAll('.linha-personalizada input');
      const nome = nomeInput.value.trim();
      if (!nome) return nomeInput.focus();
      adicionar({ nome: nome.charAt(0).toUpperCase() + nome.slice(1), hex: corInput.value.toUpperCase() });
      nomeInput.value = '';
    }
  });

  $('[data-excluir]', form)?.addEventListener('click', async () => {
    if (await confirmar(`Excluir <strong>${esc(time.nome)}</strong>? Isso não pode ser desfeito.`, 'Excluir')) {
      executar(excluirTime(time.id), 'Time excluído.');
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = form.nome.value.trim().replace(/\s+/g, ' ');
    const divisaoId = form.divisaoId.value;
    if (!nome) return form.nome.focus();
    if (!cores.length) return toast('Escolha pelo menos uma cor.', 'erro');
    const repetido = estado.times.some(
      (t) => t.id !== time?.id && t.divisaoId === divisaoId && normalizar(t.nome) === normalizar(nome),
    );
    if (repetido) return toast('Já existe um time com esse nome nesta divisão.', 'erro');
    folha.close();
    executar(salvarTime(time?.id, { nome, divisaoId, cores }), time ? 'Time atualizado.' : 'Time adicionado.');
  });

  desenharCores();
  if (!time) form.nome.focus();
}

function folhaDivisao(divisao) {
  let cor = divisao?.cor ?? '#1E9E4A';
  const qtd = divisao ? timesDaDivisao(divisao.id).length : 0;
  abrirFolha(`<form class="formulario" novalidate>
    ${topoFolha(divisao ? 'Editar divisão' : 'Nova divisão')}
    <label class="rotulo">Nome<input name="nome" maxlength="30" required autocomplete="off" value="${esc(divisao?.nome)}" placeholder="Ex.: 8ª Divisão" /></label>
    <fieldset class="rotulo"><legend>Cor da divisão</legend>
      <div class="previa-divisao" data-previa></div>
      ${seletorDeCor('divisao', cor)}
    </fieldset>
    <div class="acoes-folha">
      ${divisao ? `<button type="button" class="botao botao-perigo" data-excluir>${icone('lixeira')} Excluir</button>` : ''}
      <button type="submit" class="botao botao-primario">Salvar</button>
    </div></form>`);

  const form = $('form', folha);
  const desenhar = () => {
    const previa = $('[data-previa]', form);
    previa.setAttribute('style', estiloCor(cor));
    previa.textContent = form.nome.value.trim() || 'Prévia';
    form.querySelectorAll('.amostra').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.hex === cor)));
  };
  form.nome.addEventListener('input', desenhar);
  form.addEventListener('click', (e) => {
    const amostra = e.target.closest('.amostra');
    if (amostra) cor = amostra.dataset.hex;
    else if (e.target.closest('[data-adicionar-cor]')) cor = $('input[type=color]', form).value.toUpperCase();
    else return;
    desenhar();
  });
  // Na divisão o nome da cor não importa: esconde o campo de nome.
  $('.linha-personalizada input[type=text]', form).remove();

  $('[data-excluir]', form)?.addEventListener('click', async () => {
    if (qtd > 0) {
      return toast(`Mova ou exclua os ${plural(qtd, 'time', 'times')} desta divisão antes.`, 'erro');
    }
    if (await confirmar(`Excluir a divisão <strong>${esc(divisao.nome)}</strong>?`, 'Excluir')) {
      executar(excluirDivisao(divisao.id), 'Divisão excluída.');
      location.hash = '#/gerenciar';
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = form.nome.value.trim().replace(/\s+/g, ' ');
    if (!nome) return form.nome.focus();
    const ordem = divisao?.ordem ?? Math.max(0, ...estado.divisoes.map((d) => d.ordem)) + 1;
    folha.close();
    executar(salvarDivisao(divisao?.id, { nome, cor, ordem }), divisao ? 'Divisão atualizada.' : 'Divisão criada.');
  });

  desenhar();
}

function folhaConfig() {
  const { subtitulo, titulo } = estado.config;
  abrirFolha(`<form class="formulario" novalidate>
    ${topoFolha('Campeonato')}
    <label class="rotulo">Linha de cima<input name="subtitulo" maxlength="40" value="${esc(subtitulo)}" placeholder="Campeonato" /></label>
    <label class="rotulo">Título<input name="titulo" maxlength="40" required value="${esc(titulo)}" placeholder="Society 2026" /></label>
    <div class="acoes-folha"><button type="submit" class="botao botao-primario">Salvar</button></div></form>`);
  const form = $('form', folha);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const dados = { subtitulo: form.subtitulo.value.trim(), titulo: form.titulo.value.trim() };
    if (!dados.titulo) return form.titulo.focus();
    folha.close();
    executar(salvarConfig(dados), 'Título atualizado.');
  });
}

// ---------- Ações da página ----------

const acoes = {
  'editar-time': (el) => folhaTime(estado.times.find((t) => t.id === el.dataset.id)),
  'novo-time': () => folhaTime(null),
  'editar-divisao': (el) => folhaDivisao(divisaoPorId(el.dataset.id)),
  'nova-divisao': () => folhaDivisao(null),
  'editar-config': () => folhaConfig(),
  subir: (el) => {
    const i = Number(el.dataset.indice);
    executar(trocarOrdem(estado.divisoes[i], estado.divisoes[i - 1]), 'Ordem atualizada.');
  },
  descer: (el) => {
    const i = Number(el.dataset.indice);
    executar(trocarOrdem(estado.divisoes[i], estado.divisoes[i + 1]), 'Ordem atualizada.');
  },
  importar: (el) => {
    el.disabled = true;
    executar(importarTabelaInicial(), 'Tabela importada.');
  },
  promover: (el) => executar(definirPapel(el.dataset.uid, 'admin'), 'Promovido a administrador.'),
  rebaixar: async (el) => {
    const u = usuarios.find((x) => x.uid === el.dataset.uid);
    if (await confirmar(`Tirar de <strong>${esc(u.nome)}</strong> a permissão de editar?`, 'Rebaixar')) {
      executar(definirPapel(u.uid, 'usuario'), 'Rebaixado a usuário.');
    }
  },
  instalar: async () => {
    pedidoInstalacao.prompt();
    await pedidoInstalacao.userChoice;
    pedidoInstalacao = null;
    render();
  },
  'dispensar-instalar': () => {
    try {
      localStorage.setItem('instalar-dispensado', '1');
    } catch {
      // sem armazenamento: o cartão volta na próxima visita
    }
    render();
  },
};

conteudo.addEventListener('click', (e) => {
  const el = e.target.closest('[data-acao]');
  if (el && acoes[el.dataset.acao]) acoes[el.dataset.acao](el);
});

$('#botao-conta').addEventListener('click', folhaConta);

// Fecha a folha ao tocar fora dela.
folha.addEventListener('click', (e) => {
  if (e.target === folha) folha.close();
});

campoBusca.addEventListener('input', () => {
  termoBusca = campoBusca.value.trim();
  $('#limpar-busca').hidden = !campoBusca.value;
  render();
});

function limparBusca() {
  campoBusca.value = '';
  termoBusca = '';
  $('#limpar-busca').hidden = true;
}

$('#limpar-busca').addEventListener('click', () => {
  limparBusca();
  render();
  campoBusca.focus();
});

window.addEventListener('hashchange', () => {
  limparBusca();
  if (folha.open) folha.close();
  render();
  window.scrollTo(0, 0);
});

window.addEventListener('online', () => render());
window.addEventListener('offline', () => render());

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  pedidoInstalacao = e;
  render();
});

iniciar((evento) => {
  if (evento?.erro) toast(evento.erro, 'erro');
  render();
});
render();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
