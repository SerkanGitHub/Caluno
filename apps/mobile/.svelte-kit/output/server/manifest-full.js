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
		client: {start:"_app/immutable/entry/start.e8nVXlAF.js",app:"_app/immutable/entry/app.aEpgk8ZS.js",imports:["_app/immutable/entry/start.e8nVXlAF.js","_app/immutable/chunks/ogggxL16.js","_app/immutable/chunks/BrFZ6NHt.js","_app/immutable/chunks/CWeFt6jb.js","_app/immutable/chunks/CKbkPM2I.js","_app/immutable/entry/app.aEpgk8ZS.js","_app/immutable/chunks/PPVm8Dsz.js","_app/immutable/chunks/BrFZ6NHt.js","_app/immutable/chunks/D8jecx1F.js","_app/immutable/chunks/C-QreVHk.js","_app/immutable/chunks/CKbkPM2I.js","_app/immutable/chunks/aspVDWtK.js","_app/immutable/chunks/rpg3dlon.js","_app/immutable/chunks/Btw0dzQj.js","_app/immutable/chunks/TkKPizu3.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:true},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js'))
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
			},
			{
				id: "/calendars/[calendarId]",
				pattern: /^\/calendars\/([^/]+?)\/?$/,
				params: [{"name":"calendarId","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/groups",
				pattern: /^\/groups\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/signin",
				pattern: /^\/signin\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
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
