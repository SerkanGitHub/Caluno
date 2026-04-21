import * as universal from '../entries/pages/_layout.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.BjJJKCEl.js","_app/immutable/chunks/CWeFt6jb.js","_app/immutable/chunks/Bz8fQu9c.js","_app/immutable/chunks/Dv_1JmhW.js","_app/immutable/chunks/0OXdl1NC.js","_app/immutable/chunks/ArBnPO9p.js","_app/immutable/chunks/uEfWio4P.js","_app/immutable/chunks/CJlcAf7m.js"];
export const stylesheets = ["_app/immutable/assets/0.ci6y-9Wa.css"];
export const fonts = [];
