import { useEffect, useState } from 'react'

export function OfflineNotice() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const markOnline = () => setIsOnline(true)
    const markOffline = () => setIsOnline(false)

    window.addEventListener('online', markOnline)
    window.addEventListener('offline', markOffline)

    return () => {
      window.removeEventListener('online', markOnline)
      window.removeEventListener('offline', markOffline)
    }
  }, [])

  if (isOnline) return null

  return (
    <p className="connection-notice" role="status">
      Sin conexiÃ³n. Kizen necesita internet para cargar y guardar tus datos.
    </p>
  )
}
