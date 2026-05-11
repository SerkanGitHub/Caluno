import * as server from '../entries/pages/(app)/groups/_page.server.ts.js';

export const index = 6;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(app)/groups/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/(app)/groups/+page.server.ts";
export const imports = ["_app/immutable/nodes/6.BKXhBF4H.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BIyNKtvS.js","_app/immutable/chunks/bY-7bDrD.js","_app/immutable/chunks/BWcPjAJn.js","_app/immutable/chunks/C-ffgH8v.js","_app/immutable/chunks/Cnou3hnx.js","_app/immutable/chunks/Bgn2yaYW.js","_app/immutable/chunks/XccW2AWw.js"];
export const stylesheets = [];
export const fonts = [];
