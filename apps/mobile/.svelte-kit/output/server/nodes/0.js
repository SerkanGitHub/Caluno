import * as universal from '../entries/pages/_layout.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.BKziIbAu.js","_app/immutable/chunks/CWeFt6jb.js","_app/immutable/chunks/BK0hN3qJ.js","_app/immutable/chunks/BpmJnM1U.js","_app/immutable/chunks/PPVm8Dsz.js","_app/immutable/chunks/D3eZkQRQ.js","_app/immutable/chunks/BBcdCx3g.js","_app/immutable/chunks/BfevdSCe.js"];
export const stylesheets = ["_app/immutable/assets/0.F8d5DQbR.css"];
export const fonts = [];
