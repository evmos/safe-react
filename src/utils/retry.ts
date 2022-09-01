export function retry(fn: () => Promise<unknown>, retriesLeft = 5, interval = 1000): Promise<any> {
  const originalRetriesLeft = retriesLeft
  return new Promise((resolve, reject) => {
    const hasRefreshed = JSON.parse(window.sessionStorage.getItem('retry-lazy-refreshed') || 'false')
    fn()
      .then(resolve)
      .catch((error: any) => {
        setTimeout(() => {
          if (retriesLeft === 1) {
            if (!hasRefreshed) {
              console.warn(`retry failed ${originalRetriesLeft}`, error)
              // not been refreshed yet
              window.sessionStorage.setItem('retry-lazy-refreshed', 'true') // we are now going to refresh
              window.location.reload() // refresh the page
              return
            }
            reject(error)
            return
          } else {
            console.warn('retrying rejected promise', error)
          }
          // Passing on "reject" is the important part
          retry(fn, retriesLeft - 1, interval).then(resolve, reject)
        }, interval)
      })
  })
}
