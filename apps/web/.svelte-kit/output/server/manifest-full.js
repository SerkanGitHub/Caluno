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
		client: {start:"_app/immutable/entry/start.BNCE8Q8n.js",app:"_app/immutable/entry/app.B459StKA.js",imports:["_app/immutable/entry/start.BNCE8Q8n.js","_app/immutable/chunks/BVDj2TQX.js","_app/immutable/chunks/D58iBqSA.js","_app/immutable/chunks/BIyNKtvS.js","_app/immutable/chunks/bY-7bDrD.js","_app/immutable/entry/app.B459StKA.js","_app/immutable/chunks/CinHc9Pg.js","_app/immutable/chunks/BIyNKtvS.js","_app/immutable/chunks/bY-7bDrD.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/D58iBqSA.js","_app/immutable/chunks/BWcPjAJn.js","_app/immutable/chunks/C-ffgH8v.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:true},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js')),
			__memo(() => import('./nodes/6.js')),
			__memo(() => import('./nodes/7.js'))
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
				id: "/(app)/calendars/[calendarId]/find-time",
				pattern: /^\/calendars\/([^/]+?)\/find-time\/?$/,
				params: [{"name":"calendarId","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 5 },
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
				page: { layouts: [0,2,], errors: [1,,], leaf: 6 },
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
				page: { layouts: [0,], errors: [1,], leaf: 7 },
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
