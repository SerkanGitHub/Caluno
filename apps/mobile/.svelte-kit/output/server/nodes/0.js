import * as universal from '../entries/pages/_layout.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.D4sdzFjz.js","_app/immutable/chunks/DE548gnw.js","_app/immutable/chunks/ChEMe8CD.js","_app/immutable/chunks/BcuYAzog.js","_app/immutable/chunks/PPVm8Dsz.js","_app/immutable/chunks/D4pQFLut.js","_app/immutable/chunks/BdGWbA3M.js","_app/immutable/chunks/BolUem1_.js","_app/immutable/chunks/V0TgoSpC.js"];
export const stylesheets = ["_app/immutable/assets/0.F8d5DQbR.css"];
export const fonts = [];
