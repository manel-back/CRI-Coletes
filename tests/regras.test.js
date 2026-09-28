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

const time = (extra = {}) => ({
  nome: 'Time Teste',
  divisaoId: 'div1',
  cores: [{ nome: 'Preto', hex: '#111111' }],
  atualizadoEm: serverTimestamp(),
  atualizadoPor: 'Fulano',
  ...extra,
});

const bancoDe = (uid) => (uid ? ambiente.authenticatedContext(uid) : ambiente.unauthenticatedContext()).firestore();

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
    await setDoc(doc(db, 'times/t1'), { ...time(), atualizadoEm: new Date() });
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
    await assertFails(setDoc(doc(db, 'times/novo'), time()));
    await assertFails(updateDoc(doc(db, 'times/t1'), { nome: 'Hackeado' }));
    await assertFails(deleteDoc(doc(db, 'times/t1')));
    await assertFails(setDoc(doc(db, 'divisoes/x'), { nome: 'X', cor: '#000000', ordem: 9 }));
    await assertFails(setDoc(doc(db, 'config/geral'), { titulo: 'X', subtitulo: '' }));
  }
});

test('admin e criador editam times, divisões e título', async () => {
  for (const uid of ['admin', 'criador']) {
    const db = bancoDe(uid);
    await assertSucceeds(setDoc(doc(db, `times/novo-${uid}`), time()));
    await assertSucceeds(setDoc(doc(db, 'times/t1'), time({ nome: `Editado por ${uid}` })));
    await assertSucceeds(setDoc(doc(db, `divisoes/d-${uid}`), { nome: 'Nova', cor: '#123456', ordem: 9 }));
    await assertSucceeds(deleteDoc(doc(db, `divisoes/d-${uid}`)));
    await assertSucceeds(setDoc(doc(db, 'config/geral'), { titulo: 'Society 2027', subtitulo: 'Campeonato' }));
  }
  await assertSucceeds(deleteDoc(doc(bancoDe('admin'), 'times/t1')));
});

test('dados de time inválidos são recusados', async () => {
  const db = bancoDe('admin');
  await assertFails(setDoc(doc(db, 'times/a'), time({ nome: '' })));
  await assertFails(setDoc(doc(db, 'times/b'), time({ divisaoId: 'nao-existe' })));
  await assertFails(setDoc(doc(db, 'times/c'), time({ cores: [] })));
  await assertFails(setDoc(doc(db, 'times/d'), time({ cores: [{ nome: 'X', hex: 'red' }] })));
  await assertFails(setDoc(doc(db, 'times/e'), time({ cores: Array(4).fill({ nome: 'Preto', hex: '#111111' }) })));
  await assertFails(setDoc(doc(db, 'times/f'), time({ extra: true })));
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
  const perfil = { nome: 'Novo', email: 'novo@x.com', foto: '', criadoEm: serverTimestamp() };
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
    await assertSucceeds(updateDoc(doc(bancoDe(uid), `usuarios/${uid}`), { nome: 'Nome Novo', foto: 'https://x/y.png' }));
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
