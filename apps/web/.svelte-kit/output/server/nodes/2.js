import * as universal from '../entries/pages/(app)/_layout.ts.js';
import * as server from '../entries/pages/(app)/_layout.server.ts.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/layout.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/(app)/+layout.ts";
export { server };
export const server_id = "src/routes/(app)/+layout.server.ts";
export const imports = ["_app/immutable/nodes/2.B2WI7eqM.js","_app/immutable/chunks/Z3FZk6iU.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/DOMc5UJB.js","_app/immutable/chunks/C0IRkBfy.js","_app/immutable/chunks/DYBES7nT.js"];
export const stylesheets = [];
export const fonts = [];
