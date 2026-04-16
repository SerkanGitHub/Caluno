import * as server from '../entries/pages/_layout.server.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/+layout.server.ts";
export const imports = ["_app/immutable/nodes/0.CvKCksHc.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/CEVaURT-.js","_app/immutable/chunks/DOMc5UJB.js","_app/immutable/chunks/CZ5TP99Q.js","_app/immutable/chunks/C0IRkBfy.js","_app/immutable/chunks/DYBES7nT.js","_app/immutable/chunks/vOItGLpa.js"];
export const stylesheets = ["_app/immutable/assets/0.BhkzxgrJ.css"];
export const fonts = [];
