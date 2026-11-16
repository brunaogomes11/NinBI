/** `voltar` só vale quando é um caminho do próprio app; qualquer outra coisa vira `/`. */
export function safeRedirectTarget(voltar: string | null | undefined): string {
  if (!voltar) return '/'
  if (!voltar.startsWith('/') || voltar.startsWith('//')) return '/'
  if (voltar.startsWith('/\\')) return '/'
  return voltar
}

export function loginPathFor(pathWithSearch: string): string {
  return pathWithSearch === '/'
    ? '/entrar'
    : `/entrar?voltar=${encodeURIComponent(pathWithSearch)}`
}
