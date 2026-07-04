;(function () {
  const dataEl = document.getElementById('hash-redirect-data')
  if (!dataEl) return

  let redirectMap
  try {
    redirectMap = JSON.parse(dataEl.textContent || '{}')
  } catch {
    return
  }

  const normalizedMap = new Map(Object.entries(redirectMap))

  function toSourcePath(hash) {
    const cleanHash = (hash || '').trim()
    if (!cleanHash || cleanHash === '#') return null
    return cleanHash.startsWith('/') ? cleanHash : '/' + cleanHash
  }

  function toTargetUrl(destination) {
    return destination.startsWith('http')
      ? destination
      : window.location.origin + (destination.startsWith('/') ? '' : '/') + destination
  }

  function applyHashRedirect() {
    const sourcePath = toSourcePath(window.location.hash)
    if (!sourcePath) return
    const destination = normalizedMap.get(sourcePath)
    if (!destination) return
    const targetUrl = toTargetUrl(destination)
    if (targetUrl === window.location.href) return
    window.location.replace(targetUrl)
  }

  applyHashRedirect()
  window.addEventListener('hashchange', applyHashRedirect)
})()
