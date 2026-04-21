import * as universal from '../entries/pages/_layout.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.ClM9KbRK.js","_app/immutable/chunks/CWeFt6jb.js","_app/immutable/chunks/DFpi0t-l.js","_app/immutable/chunks/Bc9djO5S.js","_app/immutable/chunks/PPVm8Dsz.js","_app/immutable/chunks/BlfASW5h.js","_app/immutable/chunks/DY0yhLPR.js","_app/immutable/chunks/BtLcqQG7.js"];
export const stylesheets = ["_app/immutable/assets/0.ci6y-9Wa.css"];
export const fonts = [];
