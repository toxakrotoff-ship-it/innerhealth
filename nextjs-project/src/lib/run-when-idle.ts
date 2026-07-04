export function runWhenIdle(task: () => void | Promise<void>, timeoutMs = 800): Promise<void> {
  return new Promise((resolve, reject) => {
    const run = () => {
      Promise.resolve(task()).then(resolve).catch(reject)
    }

    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => run(), { timeout: timeoutMs })
      return
    }

    setTimeout(run, 0)
  })
}
