export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.svg","service-worker.js"]),
	mimeTypes: {".svg":"image/svg+xml"},
	_: {
		client: {start:"_app/immutable/entry/start.Md4x2UtY.js",app:"_app/immutable/entry/app.pRPBdpFz.js",imports:["_app/immutable/entry/start.Md4x2UtY.js","_app/immutable/chunks/C1zP10-h.js","_app/immutable/chunks/C_Up9R7W.js","_app/immutable/chunks/CcxCXhwB.js","_app/immutable/chunks/DyFfV0ck.js","_app/immutable/entry/app.pRPBdpFz.js","_app/immutable/chunks/CcxCXhwB.js","_app/immutable/chunks/DyFfV0ck.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/C_Up9R7W.js","_app/immutable/chunks/hOISEb1Q.js","_app/immutable/chunks/BblT0OrB.js","_app/immutable/chunks/BG5Vx-Sp.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js')),
			__memo(() => import('./nodes/6.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/(app)/calendars/[calendarId]",
				pattern: /^\/calendars\/([^/]+?)\/?$/,
				params: [{"name":"calendarId","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/(auth)/callback",
				pattern: /^\/callback\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/(auth)/callback/_server.ts.js'))
			},
			{
				id: "/(app)/groups",
				pattern: /^\/groups\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/(auth)/logout",
				pattern: /^\/logout\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/(auth)/logout/_server.ts.js'))
			},
			{
				id: "/(auth)/signin",
				pattern: /^\/signin\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
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
