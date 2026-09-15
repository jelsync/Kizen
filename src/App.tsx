import './App.css'

function App() {
  return (
    <main className="app-shell">
      <header className="brand">
        <span aria-hidden="true" className="brand-mark">K</span>
        <span>Kizen</span>
      </header>

      <section className="intro" aria-labelledby="kizen-title">
        <p className="eyebrow">HÁBITOS CON INTENCIÓN</p>
        <h1 id="kizen-title">Una práctica a la vez.</h1>
        <p>
          La base técnica está lista. El siguiente paso es conectar Supabase para
          que tus hábitos, registros y constancia sean realmente tuyos.
        </p>
      </section>

      <section className="foundation" aria-label="Estado de la base del proyecto">
        <article>
          <span aria-hidden="true">01</span>
          <h2>React + TypeScript</h2>
          <p>Interfaz web moderna y preparada para crecer de forma ordenada.</p>
        </article>
        <article>
          <span aria-hidden="true">02</span>
          <h2>Supabase preparado</h2>
          <p>Cliente público configurado sin exponer credenciales sensibles.</p>
        </article>
        <article>
          <span aria-hidden="true">03</span>
          <h2>Datos primero</h2>
          <p>El modelo, RLS y las decisiones técnicas ya están documentados.</p>
        </article>
      </section>
    </main>
  )
}

export default App
