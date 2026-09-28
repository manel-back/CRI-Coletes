import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buscarTimes, normalizar, ordenarPorNome } from '../src/busca.js';
import { PALETA, corDaPaleta, corDeTexto, hexValido } from '../src/cores.js';
import { DIVISOES_INICIAIS, TIMES_INICIAIS, montarTimesIniciais } from '../src/dados-iniciais.js';

test('tabela inicial tem as 8 divisões e os 94 times do app Android', () => {
  assert.equal(DIVISOES_INICIAIS.length, 8);
  assert.equal(TIMES_INICIAIS.length, 94);
  const ids = new Set(DIVISOES_INICIAIS.map((d) => d.id));
  for (const [divisaoId] of TIMES_INICIAIS) assert.ok(ids.has(divisaoId), divisaoId);
});

test('toda cor da tabela inicial existe na paleta', () => {
  for (const t of montarTimesIniciais()) {
    assert.ok(t.cores.length >= 1 && t.cores.length <= 2, t.nome);
    for (const c of t.cores) assert.ok(c && hexValido(c.hex), `${t.nome}: cor inválida`);
  }
});

test('paleta e divisões usam hex válido', () => {
  for (const c of PALETA) assert.ok(hexValido(c.hex), c.nome);
  for (const d of DIVISOES_INICIAIS) assert.ok(hexValido(d.cor), d.nome);
  assert.equal(hexValido('red'), false);
  assert.equal(hexValido('#FFF'), false);
});

test('corDaPaleta ignora maiúsculas e espaços', () => {
  assert.equal(corDaPaleta(' verde CLARO ').nome, 'Verde claro');
  assert.equal(corDaPaleta('dourado'), null);
});

test('corDeTexto escolhe o contraste certo', () => {
  assert.equal(corDeTexto('#FFDE59'), '#111111'); // amarelo
  assert.equal(corDeTexto('#004AAD'), '#FFFFFF'); // azul
  assert.equal(corDeTexto('#060901'), '#FFFFFF'); // preto
});

test('normalizar remove acentos e maiúsculas', () => {
  assert.equal(normalizar('  Líder GASES '), 'lider gases');
});

test('ordenarPorNome segue a ordem alfabética em português', () => {
  const nomes = ordenarPorNome([{ nome: 'Óculos' }, { nome: 'amigos' }, { nome: 'Bravo' }]).map((t) => t.nome);
  assert.deepEqual(nomes, ['amigos', 'Bravo', 'Óculos']);
});

test('buscarTimes encontra por partes do nome, sem acento, e por cor', () => {
  const times = montarTimesIniciais();
  const nomes = (termo) => buscarTimes(times, termo).map((t) => t.nome);

  assert.deepEqual(nomes('lider'), ['Líder Gases']);
  assert.deepEqual(nomes('fazenda marta'), ['Fazenda Santa Marta', 'Fazenda Santa Marta']);
  assert.ok(nomes('bombeiros').length === 2); // 4ª e 5ª divisão
  assert.ok(nomes('roxo').includes('Bar do Miltim'));
  assert.deepEqual(nomes('   '), []);
  assert.deepEqual(nomes('xyz inexistente'), []);
});
