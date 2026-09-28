/** Minúsculas e sem acentos, para comparar "Líder" com "lider". */
export function normalizar(texto) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function ordenarPorNome(lista) {
  return [...lista].sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }),
  );
}

/**
 * Filtra times cujo nome ou alguma cor contenha todas as palavras digitadas.
 * Ex.: "fazenda marta" encontra "Fazenda Santa Marta"; "preto" lista os times de preto.
 */
export function buscarTimes(times, termo) {
  const palavras = normalizar(termo).split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return [];
  return ordenarPorNome(
    times.filter((t) => {
      const alvo = normalizar([t.nome, ...t.cores.map((c) => c.nome)].join(' '));
      return palavras.every((p) => alvo.includes(p));
    }),
  );
}
