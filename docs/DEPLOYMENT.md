# Despliegue

## Estado

No hay aplicación ni Worker configurados todavía. El flujo previsto es desarrollo local → Git → GitHub → Cloudflare → Kizen.

## Configuración prevista

- Repositorio: `jelsync/Kizen`.
- Worker: `kizen` si el nombre está disponible.
- URL prevista: `https://kizen.jelsync.workers.dev/`.
- Build command: pendiente de crear la aplicación Vite; se espera `npm run build`.
- Output: pendiente de la configuración de Vite/Cloudflare; normalmente `dist`.

## Variables de frontend

Definir en Cloudflare y localmente, sin versionar valores reales:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

No definir ni exponer `SUPABASE_SERVICE_ROLE_KEY` en el frontend ni en el build público.

## Operación futura

Documentar aquí la configuración exacta de Workers, rama de despliegue, comandos, variables, configuración de SPA y errores confirmados una vez que se implemente la base del proyecto.
