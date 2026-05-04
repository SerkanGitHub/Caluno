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
		client: {start:"_app/immutable/entry/start.C6xJaI76.js",app:"_app/immutable/entry/app.74gIFL4I.js",imports:["_app/immutable/entry/start.C6xJaI76.js","_app/immutable/chunks/Pm6tYKBH.js","_app/immutable/chunks/BpmJnM1U.js","_app/immutable/chunks/CWeFt6jb.js","_app/immutable/chunks/B-UIgRvv.js","_app/immutable/entry/app.74gIFL4I.js","_app/immutable/chunks/PPVm8Dsz.js","_app/immutable/chunks/BpmJnM1U.js","_app/immutable/chunks/Dm6f-8yO.js","_app/immutable/chunks/BfevdSCe.js","_app/immutable/chunks/B-UIgRvv.js","_app/immutable/chunks/sJLkTBM_.js","_app/immutable/chunks/BBcdCx3g.js","_app/immutable/chunks/DHhxVyb8.js","_app/immutable/chunks/DQSIKspV.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:true},
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
				id: "/calendars/[calendarId]/find-time",
				pattern: /^\/calendars\/([^/]+?)\/find-time\/?$/,
				params: [{"name":"calendarId","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/groups",
				pattern: /^\/groups\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/signin",
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
