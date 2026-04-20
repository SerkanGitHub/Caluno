

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/2.Bt4Wksd5.js","_app/immutable/chunks/X0df5b2B.js","_app/immutable/chunks/dcLUnqGf.js"];
export const stylesheets = ["_app/immutable/assets/2.B-gVoUuD.css"];
export const fonts = [];
