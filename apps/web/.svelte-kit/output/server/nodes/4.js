import * as server from '../entries/pages/(app)/calendars/_calendarId_/_page.server.ts.js';

export const index = 4;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(app)/calendars/_calendarId_/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/(app)/calendars/[calendarId]/+page.server.ts";
export const imports = ["_app/immutable/nodes/4.Cb2aSKmQ.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/CcxCXhwB.js","_app/immutable/chunks/DyFfV0ck.js","_app/immutable/chunks/hOISEb1Q.js","_app/immutable/chunks/BblT0OrB.js","_app/immutable/chunks/DywPX1lr.js","_app/immutable/chunks/Dqd_7uUk.js","_app/immutable/chunks/C3MEtIhj.js","_app/immutable/chunks/BG5Vx-Sp.js","_app/immutable/chunks/C1zP10-h.js","_app/immutable/chunks/C_Up9R7W.js"];
export const stylesheets = [];
export const fonts = [];
