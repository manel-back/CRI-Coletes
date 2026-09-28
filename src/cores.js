// Paleta de cores de uniforme oferecida no editor. Admins também podem criar
// cores personalizadas (nome + hex), então esta lista é só um atalho.
export const PALETA = [
  { nome: 'Branco', hex: '#FFFFFF' },
  { nome: 'Preto', hex: '#111111' },
  { nome: 'Cinza', hex: '#8A8F98' },
  { nome: 'Vermelho', hex: '#E53935' },
  { nome: 'Vinho', hex: '#7B1E2B' },
  { nome: 'Laranja', hex: '#F57C00' },
  { nome: 'Amarelo', hex: '#FDD835' },
  { nome: 'Verde claro', hex: '#7CDB3A' },
  { nome: 'Verde', hex: '#2E9E4F' },
  { nome: 'Verde escuro', hex: '#0B5D2A' },
  { nome: 'Azul claro', hex: '#29B6F6' },
  { nome: 'Azul', hex: '#1E5BD8' },
  { nome: 'Azul escuro', hex: '#0D1F6B' },
  { nome: 'Roxo', hex: '#7B2FBE' },
  { nome: 'Rosa', hex: '#F06292' },
  { nome: 'Marrom', hex: '#795548' },
];

export const MAX_CORES = 3;

const HEX = /^#[0-9A-Fa-f]{6}$/;

export function hexValido(hex) {
  return typeof hex === 'string' && HEX.test(hex);
}

/** Procura uma cor da paleta pelo nome, sem diferenciar maiúsculas. */
export function corDaPaleta(nome) {
  const alvo = nome.trim().toLowerCase();
  return PALETA.find((c) => c.nome.toLowerCase() === alvo) ?? null;
}

function luminancia(hex) {
  const canal = (i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
}

/** Cor de texto (preto ou branco) mais legível sobre o fundo informado. */
export function corDeTexto(hexFundo) {
  return luminancia(hexFundo) > 0.179 ? '#111111' : '#FFFFFF';
}
