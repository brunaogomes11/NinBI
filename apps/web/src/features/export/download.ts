function clickLink(href: string, name: string) {
  const link = document.createElement('a')
  link.href = href
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
}

/** Baixa o conteúdo como arquivo e libera a URL temporária. */
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  clickLink(url, name)
  URL.revokeObjectURL(url)
}

/** Baixa uma imagem já pronta como data URL. */
export function downloadDataUrl(url: string, name: string) {
  clickLink(url, name)
}
