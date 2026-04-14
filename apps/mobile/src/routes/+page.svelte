<main>
  <section class="shell">
    <p class="eyebrow">Caluno Mobile</p>
    <h1>SvelteKit + Capacitor starter.</h1>
    <p class="copy">
      This mobile app stays intentionally small. Add native plugins and platform folders only when
      you actually need them.
    </p>
    <ul>
      <li>Run `pnpm dev` for the browser shell.</li>
      <li>Run `pnpm cap:add:ios` or `pnpm cap:add:android` when you are ready for native targets.</li>
    </ul>
  </section>
</main>

<style>
  main {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 2rem 1.25rem;
  }

  .shell {
    width: min(32rem, 100%);
    display: grid;
    gap: 1rem;
    padding: 2rem;
    border-radius: 1.5rem;
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(12px);
    box-shadow: 0 18px 50px rgba(33, 28, 23, 0.08);
  }

  .eyebrow {
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 0.78rem;
    font-weight: 700;
    color: #266b67;
  }

  h1 {
    margin: 0;
    font-size: clamp(2.2rem, 8vw, 4rem);
    line-height: 0.95;
  }

  .copy,
  li {
    color: #4c443b;
    line-height: 1.6;
  }

  ul {
    margin: 0;
    padding-left: 1.2rem;
    display: grid;
    gap: 0.45rem;
  }
</style>
