// Testa firestore.rules no emulador do Firebase (precisa de Java instalado).
// Rode com: npm run test:regras
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, test } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { DIVISOES_INICIAIS, montarTimesIniciais } from '../src/dados-iniciais.js';

let ambiente;

// Nos testes, o nome de cada perfil é igual ao uid (ver beforeEach).
const time = (autor, extra = {}) => ({
  nome: 'Time Teste',
  divisaoId: 'div1',
  cores: [{ nome: 'Preto', hex: '#111111' }],
  atualizadoEm: serverTimestamp(),
  atualizadoPor: autor,
  ...extra,
});

const FOTO_GOOGLE = 'https://lh3.googleusercontent.com/a/foto';

/** Banco visto por alguém logado com Google (padrão), outro provedor ou sem login (uid null). */
function bancoDe(uid, { provedor = 'google.com', verificado = true, email = `${uid}@x.com` } = {}) {
  if (!uid) return ambiente.unauthenticatedContext().firestore();
  return ambiente
    .authenticatedContext(uid, { email, email_verified: verificado, firebase: { sign_in_provider: provedor } })
    .firestore();
}

before(async () => {
  ambiente = await initializeTestEnvironment({
    projectId: 'demo-cri-coletes',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

after(() => ambiente.cleanup());

beforeEach(async () => {
  await ambiente.clearFirestore();
  await ambiente.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'divisoes/div1'), { nome: '1ª Divisão', cor: '#004AAD', ordem: 1 });
    await setDoc(doc(db, 'times/t1'), { ...time('admin'), atualizadoEm: new Date() });
    for (const [uid, papel] of [['criador', 'criador'], ['admin', 'admin'], ['usuario', 'usuario']]) {
      await setDoc(doc(db, `usuarios/${uid}`), { nome: uid, email: `${uid}@x.com`, foto: '', papel, criadoEm: new Date() });
    }
  });
});

test('qualquer pessoa, mesmo sem login, lê a tabela', async () => {
  const db = bancoDe(null);
  await assertSucceeds(getDocs(collection(db, 'divisoes')));
  await assertSucceeds(getDocs(collection(db, 'times')));
  await assertSucceeds(getDoc(doc(db, 'config/geral')));
});

test('visitante e usuário não editam nada', async () => {
  for (const uid of [null, 'usuario', 'desconhecido']) {
    const db = bancoDe(uid);
    await assertFails(setDoc(doc(db, 'times/novo'), time(uid ?? '')));
    await assertFails(updateDoc(doc(db, 'times/t1'), { nome: 'Hackeado' }));
    await assertFails(deleteDoc(doc(db, 'times/t1')));
    await assertFails(setDoc(doc(db, 'divisoes/x'), { nome: 'X', cor: '#000000', ordem: 9 }));
    await assertFails(setDoc(doc(db, 'config/geral'), { titulo: 'X', subtitulo: '' }));
  }
});

test('admin e criador editam times, divisões e título', async () => {
  for (const uid of ['admin', 'criador']) {
    const db = bancoDe(uid);
    await assertSucceeds(setDoc(doc(db, `times/novo-${uid}`), time(uid)));
    await assertSucceeds(setDoc(doc(db, 'times/t1'), time(uid, { nome: `Editado por ${uid}` })));
    await assertSucceeds(setDoc(doc(db, `divisoes/d-${uid}`), { nome: 'Nova', cor: '#123456', ordem: 9 }));
    await assertSucceeds(deleteDoc(doc(db, `divisoes/d-${uid}`)));
    await assertSucceeds(setDoc(doc(db, 'config/geral'), { titulo: 'Society 2027', subtitulo: 'Campeonato' }));
  }
  await assertSucceeds(deleteDoc(doc(bancoDe('admin'), 'times/t1')));
});

test('dados de time inválidos são recusados', async () => {
  const db = bancoDe('admin');
  await assertFails(setDoc(doc(db, 'times/a'), time('admin', { nome: '' })));
  await assertFails(setDoc(doc(db, 'times/b'), time('admin', { divisaoId: 'nao-existe' })));
  await assertFails(setDoc(doc(db, 'times/c'), time('admin', { cores: [] })));
  await assertFails(setDoc(doc(db, 'times/d'), time('admin', { cores: [{ nome: 'X', hex: 'red' }] })));
  await assertFails(setDoc(doc(db, 'times/e'), time('admin', { cores: Array(4).fill({ nome: 'Preto', hex: '#111111' }) })));
  await assertFails(setDoc(doc(db, 'times/f'), time('admin', { extra: true })));
});

test('importação da tabela inicial passa em um único lote', async () => {
  await ambiente.withSecurityRulesDisabled((ctx) => deleteDoc(doc(ctx.firestore(), 'divisoes/div1')));
  const db = bancoDe('admin');
  const lote = writeBatch(db);
  for (const { id, ...d } of DIVISOES_INICIAIS) lote.set(doc(db, 'divisoes', id), d);
  for (const t of montarTimesIniciais()) {
    lote.set(doc(collection(db, 'times')), { ...t, atualizadoEm: serverTimestamp(), atualizadoPor: 'admin' });
  }
  lote.set(doc(db, 'config/geral'), { subtitulo: 'Campeonato', titulo: 'Society 2026' });
  await assertSucceeds(lote.commit());
  const times = await getDocs(collection(db, 'times'));
  assert.equal(times.size, 95); // 94 importados + t1
});

test('primeiro login cria perfil apenas como usuário', async () => {
  const perfil = { nome: 'Novo', email: 'novo@x.com', foto: FOTO_GOOGLE, criadoEm: serverTimestamp() };
  const db = bancoDe('novo');
  await assertFails(setDoc(doc(db, 'usuarios/novo'), { ...perfil, papel: 'admin' }));
  await assertFails(setDoc(doc(db, 'usuarios/novo'), { ...perfil, papel: 'criador' }));
  await assertFails(setDoc(doc(db, 'usuarios/outro'), { ...perfil, papel: 'usuario' }));
  await assertSucceeds(setDoc(doc(db, 'usuarios/novo'), { ...perfil, papel: 'usuario' }));
});

test('ninguém muda o próprio papel', async () => {
  const tentativas = { usuario: 'admin', admin: 'criador', criador: 'usuario' };
  for (const [uid, papel] of Object.entries(tentativas)) {
    await assertFails(updateDoc(doc(bancoDe(uid), `usuarios/${uid}`), { papel }));
    await assertSucceeds(updateDoc(doc(bancoDe(uid), `usuarios/${uid}`), { nome: 'Nome Novo', foto: FOTO_GOOGLE }));
  }
});

test('só o criador promove e rebaixa, e nunca cria outro criador', async () => {
  await assertFails(updateDoc(doc(bancoDe('admin'), 'usuarios/usuario'), { papel: 'admin' }));

  const db = bancoDe('criador');
  await assertSucceeds(updateDoc(doc(db, 'usuarios/usuario'), { papel: 'admin' }));
  await assertSucceeds(updateDoc(doc(db, 'usuarios/admin'), { papel: 'usuario' }));
  await assertFails(updateDoc(doc(db, 'usuarios/usuario'), { papel: 'criador' }));
  await assertFails(updateDoc(doc(db, 'usuarios/usuario'), { papel: 'usuario', nome: 'Trocado' }));
  await assertFails(deleteDoc(doc(db, 'usuarios/usuario')));
});

test('lista de usuários é visível só para o criador', async () => {
  await assertSucceeds(getDocs(collection(bancoDe('criador'), 'usuarios')));
  await assertFails(getDocs(collection(bancoDe('admin'), 'usuarios')));
  await assertFails(getDocs(collection(bancoDe('usuario'), 'usuarios')));
  await assertSucceeds(getDoc(doc(bancoDe('usuario'), 'usuarios/usuario')));
  await assertFails(getDoc(doc(bancoDe('usuario'), 'usuarios/admin')));
});

// ---------- Ataques encontrados na auditoria de segurança ----------

test('conta de e-mail/senha ou anônima não vale nada, mesmo com perfil de admin', async () => {
  await ambiente.withSecurityRulesDisabled((ctx) =>
    setDoc(doc(ctx.firestore(), 'usuarios/invasor'), { nome: 'invasor', email: 'invasor@x.com', foto: '', papel: 'admin', criadoEm: new Date() }),
  );
  for (const opcoes of [{ provedor: 'password' }, { provedor: 'anonymous' }, { verificado: false }]) {
    const db = bancoDe('invasor', opcoes);
    await assertFails(setDoc(doc(db, 'times/x'), time('invasor')));
    await assertFails(deleteDoc(doc(db, 'times/t1')));
    await assertFails(getDoc(doc(db, 'usuarios/invasor')));
  }
  const perfil = { nome: 'João', email: 'joao@gmail.com', foto: '', papel: 'usuario', criadoEm: serverTimestamp() };
  await assertFails(setDoc(doc(bancoDe('falso', { provedor: 'password', email: 'joao@gmail.com' }), 'usuarios/falso'), perfil));
});

test('ninguém se passa por outra pessoa na tela Equipe', async () => {
  const db = bancoDe('novo'); // conta Google novo@x.com
  const perfil = { nome: 'Novo', foto: '', papel: 'usuario', criadoEm: serverTimestamp() };
  await assertFails(setDoc(doc(db, 'usuarios/novo'), { ...perfil, email: 'otavio@gmail.com' }));
  await assertSucceeds(setDoc(doc(db, 'usuarios/novo'), { ...perfil, email: 'novo@x.com' }));
  await assertFails(updateDoc(doc(db, 'usuarios/novo'), { email: 'otavio@gmail.com' }));
});

test('foto de perfil só pode vir do Google (sem rastreador)', async () => {
  const db = bancoDe('usuario');
  for (const foto of ['https://invasor.com/rastreio.png', 'http://lh3.googleusercontent.com/a', 'https://googleusercontent.com.invasor.com/a']) {
    await assertFails(updateDoc(doc(db, 'usuarios/usuario'), { foto }));
  }
  await assertSucceeds(updateDoc(doc(db, 'usuarios/usuario'), { foto: FOTO_GOOGLE }));
  await assertSucceeds(updateDoc(doc(db, 'usuarios/usuario'), { foto: '' }));
});

test('admin não assina alteração com o nome de outra pessoa', async () => {
  const db = bancoDe('admin');
  await assertFails(setDoc(doc(db, 'times/t1'), time('criador')));
  await assertSucceeds(setDoc(doc(db, 'times/t1'), time('admin')));
});
