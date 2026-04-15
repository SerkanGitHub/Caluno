import * as server from '../entries/pages/_layout.server.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/+layout.server.ts";
export const imports = ["_app/immutable/nodes/0.BvDkFNZI.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/C_Up9R7W.js","_app/immutable/chunks/CcxCXhwB.js","_app/immutable/chunks/DyFfV0ck.js","_app/immutable/chunks/BHp_YHS0.js","_app/immutable/chunks/BblT0OrB.js","_app/immutable/chunks/C3MEtIhj.js"];
export const stylesheets = ["_app/immutable/assets/0.BhkzxgrJ.css"];
export const fonts = [];
