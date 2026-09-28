import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { firebaseConfig } from './firebase-config.js';
import { DIVISOES_INICIAIS, montarTimesIniciais } from './dados-iniciais.js';

export const PAPEIS = {
  usuario: 'Usuário',
  admin: 'Administrador',
  criador: 'Criador',
};

const CONFIG_PADRAO = { subtitulo: 'Campeonato', titulo: 'Society 2026' };

/** Estado compartilhado com a interface. Nunca é substituído, só alterado. */
export const estado = {
  modoDemo: !firebaseConfig,
  carregando: !!firebaseConfig,
  divisoes: [],
  times: [],
  config: { ...CONFIG_PADRAO },
  usuario: null, // { uid, nome, email, foto, papel }
};

export const podeEditar = () => ['admin', 'criador'].includes(estado.usuario?.papel);
export const ehCriador = () => estado.usuario?.papel === 'criador';

let auth;
let db;
let avisar = () => {};

export function iniciar(aoMudar) {
  avisar = aoMudar;
  if (estado.modoDemo) {
    estado.divisoes = DIVISOES_INICIAIS.map((d) => ({ ...d }));
    estado.times = montarTimesIniciais().map((t, i) => ({ id: `t${i}`, ...t }));
    return;
  }

  const app = initializeApp(firebaseConfig);
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  auth = getAuth(app);

  let pendentes = 2; // divisões e times
  const recebido = () => {
    if (pendentes > 0 && --pendentes === 0) estado.carregando = false;
  };
  onSnapshot(collection(db, 'divisoes'), (snap) => {
    estado.divisoes = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => a.ordem - b.ordem);
    recebido();
    avisar();
  }, falhaLeitura);

  onSnapshot(collection(db, 'times'), (snap) => {
    estado.times = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    recebido();
    avisar();
  }, falhaLeitura);

  onSnapshot(doc(db, 'config', 'geral'), (snap) => {
    estado.config = { ...CONFIG_PADRAO, ...snap.data() };
    avisar();
  }, falhaLeitura);

  let pararPerfil = null;
  onAuthStateChanged(auth, (user) => {
    pararPerfil?.();
    pararPerfil = null;
    estado.usuario = null;
    avisar();
    if (user) pararPerfil = acompanharPerfil(user);
  });

  getRedirectResult(auth).catch((e) => avisar({ erro: mensagemDeErro(e) }));
}

function falhaLeitura(e) {
  estado.carregando = false;
  avisar({ erro: mensagemDeErro(e) });
}

/** Mantém estado.usuario em dia com usuarios/{uid}, criando o perfil no primeiro login. */
function acompanharPerfil(user) {
  const ref = doc(db, 'usuarios', user.uid);
  const perfil = {
    nome: user.displayName || user.email || 'Sem nome',
    email: user.email || '',
    foto: user.photoURL || '',
  };
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      if (!snap.metadata.fromCache) {
        setDoc(ref, { ...perfil, papel: 'usuario', criadoEm: serverTimestamp() })
          .catch((e) => avisar({ erro: mensagemDeErro(e) }));
      }
      return;
    }
    const dados = snap.data();
    estado.usuario = { uid: user.uid, ...dados };
    avisar();
    // Atualiza nome/foto se mudaram na conta Google.
    if (dados.nome !== perfil.nome || dados.foto !== perfil.foto || dados.email !== perfil.email) {
      updateDoc(ref, perfil).catch(() => {});
    }
  }, falhaLeitura);
}

export async function entrar() {
  const provedor = new GoogleAuthProvider();
  provedor.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWithPopup(auth, provedor);
  } catch (e) {
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(e.code)) {
      await signInWithRedirect(auth, provedor);
    } else if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
      throw e;
    }
  }
}

export const sair = () => signOut(auth);

// ---------- Escrita (somente admin/criador; as regras do Firestore garantem isso) ----------

const assinatura = () => ({
  atualizadoEm: serverTimestamp(),
  atualizadoPor: estado.usuario?.nome ?? '',
});

export function salvarTime(id, { nome, divisaoId, cores }) {
  const dados = { nome, divisaoId, cores, ...assinatura() };
  return id ? setDoc(doc(db, 'times', id), dados) : addDoc(collection(db, 'times'), dados);
}

export const excluirTime = (id) => deleteDoc(doc(db, 'times', id));

export function salvarDivisao(id, { nome, cor, ordem }) {
  const dados = { nome, cor, ordem };
  return id ? setDoc(doc(db, 'divisoes', id), dados) : addDoc(collection(db, 'divisoes'), dados);
}

export const excluirDivisao = (id) => deleteDoc(doc(db, 'divisoes', id));

/** Troca a posição de duas divisões na lista. */
export function trocarOrdem(a, b) {
  const lote = writeBatch(db);
  lote.update(doc(db, 'divisoes', a.id), { ordem: b.ordem });
  lote.update(doc(db, 'divisoes', b.id), { ordem: a.ordem });
  return lote.commit();
}

export const salvarConfig = ({ titulo, subtitulo }) =>
  setDoc(doc(db, 'config', 'geral'), { titulo, subtitulo });

/** Grava a tabela da versão Android no banco (usado uma única vez, com o banco vazio). */
export function importarTabelaInicial() {
  const lote = writeBatch(db);
  for (const { id, ...d } of DIVISOES_INICIAIS) lote.set(doc(db, 'divisoes', id), d);
  for (const t of montarTimesIniciais()) lote.set(doc(collection(db, 'times')), { ...t, ...assinatura() });
  lote.set(doc(db, 'config', 'geral'), CONFIG_PADRAO);
  return lote.commit();
}

// ---------- Equipe (somente criador) ----------

export function ouvirUsuarios(callback) {
  return onSnapshot(
    collection(db, 'usuarios'),
    (snap) => callback(snap.docs.map((d) => ({ uid: d.id, ...d.data() }))),
    falhaLeitura,
  );
}

export const definirPapel = (uid, papel) => updateDoc(doc(db, 'usuarios', uid), { papel });

export function mensagemDeErro(e) {
  switch (e?.code) {
    case 'permission-denied':
      return 'Você não tem permissão para fazer isso.';
    case 'unavailable':
      return 'Sem conexão com o servidor. Tente de novo em instantes.';
    case 'auth/network-request-failed':
      return 'Sem internet para fazer login.';
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
      return 'O login com Google não está ativado no Firebase (Authentication → Método de login → Google).';
    case 'auth/unauthorized-domain':
      return 'Este endereço não está autorizado no Firebase (Authentication → Settings → Authorized domains).';
    default:
      // O código ajuda a descobrir a causa quando alguém relata o problema.
      return `Algo deu errado. Tente novamente.${e?.code ? ` (${e.code})` : ''}`;
  }
}
