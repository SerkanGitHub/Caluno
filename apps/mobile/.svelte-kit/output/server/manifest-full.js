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
		client: {start:"_app/immutable/entry/start.D3AaKbOY.js",app:"_app/immutable/entry/app.CbC-_J5N.js",imports:["_app/immutable/entry/start.D3AaKbOY.js","_app/immutable/chunks/DtCgwQKJ.js","_app/immutable/chunks/DepkcXZA.js","_app/immutable/chunks/CWeFt6jb.js","_app/immutable/chunks/GqY2LIEs.js","_app/immutable/entry/app.CbC-_J5N.js","_app/immutable/chunks/DepkcXZA.js","_app/immutable/chunks/BGggUP-F.js","_app/immutable/chunks/DxTm2xT0.js","_app/immutable/chunks/GqY2LIEs.js","_app/immutable/chunks/BGBxUBMJ.js","_app/immutable/chunks/BEiRusqB.js","_app/immutable/chunks/CXIJq0rz.js","_app/immutable/chunks/DXq0d1jM.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:true},
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
