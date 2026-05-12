import * as universal from '../entries/pages/_layout.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.Bee2VGvh.js","_app/immutable/chunks/C3jaeQPD.js","_app/immutable/chunks/ChEMe8CD.js","_app/immutable/chunks/DtJzszPE.js","_app/immutable/chunks/PPVm8Dsz.js","_app/immutable/chunks/CnLv0cUZ.js","_app/immutable/chunks/BdGWbA3M.js","_app/immutable/chunks/BolUem1_.js","_app/immutable/chunks/Cdb3Jq3d.js"];
export const stylesheets = ["_app/immutable/assets/0.F8d5DQbR.css"];
export const fonts = [];
