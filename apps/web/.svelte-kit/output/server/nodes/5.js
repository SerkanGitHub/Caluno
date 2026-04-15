import * as server from '../entries/pages/(app)/groups/_page.server.ts.js';

export const index = 5;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(app)/groups/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/(app)/groups/+page.server.ts";
export const imports = ["_app/immutable/nodes/5._2UtJd4U.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/CcxCXhwB.js","_app/immutable/chunks/DyFfV0ck.js","_app/immutable/chunks/hOISEb1Q.js","_app/immutable/chunks/BblT0OrB.js","_app/immutable/chunks/DywPX1lr.js","_app/immutable/chunks/Dqd_7uUk.js","_app/immutable/chunks/C3MEtIhj.js"];
export const stylesheets = [];
export const fonts = [];
