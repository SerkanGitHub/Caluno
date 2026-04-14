<main>
  <section class="hero">
    <p class="eyebrow">Caluno Web</p>
    <h1>SvelteKit starter for the web experience.</h1>
    <p class="copy">
      This is the slim web baseline for Caluno. Build admin flows, API routes and operations here
      without carrying over CUTTIME feature code.
    </p>
  </section>
</main>

<style>
  .hero {
    display: grid;
    gap: 1rem;
    max-width: 48rem;
    margin: 0 auto;
    padding: 6rem 1.5rem;
  }

  .eyebrow {
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.8rem;
    color: #9b4d24;
    font-weight: 700;
  }

  h1 {
    margin: 0;
    font-size: clamp(2.5rem, 6vw, 5rem);
    line-height: 0.95;
    max-width: 10ch;
  }

  .copy {
    margin: 0;
    max-width: 42rem;
    font-size: 1.05rem;
    line-height: 1.7;
    color: #4d463d;
  }
</style>
