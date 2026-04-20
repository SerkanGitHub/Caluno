export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.COGiVDO5.js",app:"_app/immutable/entry/app.CD1jARpC.js",imports:["_app/immutable/entry/start.COGiVDO5.js","_app/immutable/chunks/B4jHWqg4.js","_app/immutable/chunks/dcLUnqGf.js","_app/immutable/chunks/4Y___cZe.js","_app/immutable/entry/app.CD1jARpC.js","_app/immutable/chunks/dcLUnqGf.js","_app/immutable/chunks/Ds6tSSsm.js","_app/immutable/chunks/X0df5b2B.js","_app/immutable/chunks/4Y___cZe.js","_app/immutable/chunks/oY3twIYM.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
