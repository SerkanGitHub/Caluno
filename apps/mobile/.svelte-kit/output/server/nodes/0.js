import * as universal from '../entries/pages/_layout.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.Bg7jVJqq.js","_app/immutable/chunks/CWeFt6jb.js","_app/immutable/chunks/CRgRC35y.js","_app/immutable/chunks/DepkcXZA.js","_app/immutable/chunks/DxTm2xT0.js","_app/immutable/chunks/BPWJeS-9.js","_app/immutable/chunks/BEiRusqB.js"];
export const stylesheets = ["_app/immutable/assets/0.ci6y-9Wa.css"];
export const fonts = [];
