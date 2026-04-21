import * as universal from '../entries/pages/_layout.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.CAlOlIP6.js","_app/immutable/chunks/CWeFt6jb.js","_app/immutable/chunks/CuWyG364.js","_app/immutable/chunks/BrFZ6NHt.js","_app/immutable/chunks/PPVm8Dsz.js","_app/immutable/chunks/DgHnrCHr.js","_app/immutable/chunks/rpg3dlon.js","_app/immutable/chunks/C-QreVHk.js"];
export const stylesheets = ["_app/immutable/assets/0.F8d5DQbR.css"];
export const fonts = [];
