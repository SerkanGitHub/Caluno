import * as server from '../entries/pages/_layout.server.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/+layout.server.ts";
export const imports = ["_app/immutable/nodes/0.wwDtjeDr.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/D58iBqSA.js","_app/immutable/chunks/BIyNKtvS.js","_app/immutable/chunks/bY-7bDrD.js","_app/immutable/chunks/BNQEOYEk.js","_app/immutable/chunks/C-ffgH8v.js","_app/immutable/chunks/XccW2AWw.js"];
export const stylesheets = ["_app/immutable/assets/0.DC0RInou.css"];
export const fonts = [];
