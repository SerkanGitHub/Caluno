import * as server from '../entries/pages/(app)/groups/_page.server.ts.js';

export const index = 5;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(app)/groups/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/(app)/groups/+page.server.ts";
export const imports = ["_app/immutable/nodes/5.B1OrzvUL.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/DOMc5UJB.js","_app/immutable/chunks/CZ5TP99Q.js","_app/immutable/chunks/BFVfXAuL.js","_app/immutable/chunks/DYBES7nT.js","_app/immutable/chunks/CzBrKa3R.js","_app/immutable/chunks/D5EpjGQt.js","_app/immutable/chunks/vOItGLpa.js"];
export const stylesheets = [];
export const fonts = [];
