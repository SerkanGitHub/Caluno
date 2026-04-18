
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	type MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;

	export interface AppTypes {
		RouteId(): "/(auth)" | "/(app)" | "/" | "/(app)/calendars" | "/(app)/calendars/[calendarId]" | "/(app)/calendars/[calendarId]/find-time" | "/(auth)/callback" | "/(app)/groups" | "/(auth)/logout" | "/(auth)/signin";
		RouteParams(): {
			"/(app)/calendars/[calendarId]": { calendarId: string };
			"/(app)/calendars/[calendarId]/find-time": { calendarId: string }
		};
		LayoutParams(): {
			"/(auth)": Record<string, never>;
			"/(app)": { calendarId?: string };
			"/": { calendarId?: string };
			"/(app)/calendars": { calendarId?: string };
			"/(app)/calendars/[calendarId]": { calendarId: string };
			"/(app)/calendars/[calendarId]/find-time": { calendarId: string };
			"/(auth)/callback": Record<string, never>;
			"/(app)/groups": Record<string, never>;
			"/(auth)/logout": Record<string, never>;
			"/(auth)/signin": Record<string, never>
		};
		Pathname(): "/" | `/calendars/${string}` & {} | `/calendars/${string}/find-time` & {} | "/callback" | "/groups" | "/logout" | "/signin";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/favicon.svg" | string & {};
	}
}