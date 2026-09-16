import { useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export function PwaUpdatePrompt() {
  const [isUpdating, setIsUpdating] = useState(false)
  const { needRefresh, updateServiceWorker } = useRegisterSW()

  async function handleUpdate() {
    setIsUpdating(true)

    try {
      await updateServiceWorker()
    } finally {
      setIsUpdating(false)
    }
  }

  if (!needRefresh[0]) return null

  return (
    <section className="pwa-update-prompt" aria-label="ActualizaciÃ³n disponible" role="status">
      <span>Hay una actualizaciÃ³n disponible.</span>
      <button disabled={isUpdating} type="button" onClick={handleUpdate}>
        {isUpdating ? 'Actualizandoâ€¦' : 'Actualizar'}
      </button>
    </section>
  )
}
