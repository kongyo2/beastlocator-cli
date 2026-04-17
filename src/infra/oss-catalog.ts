export type OssEntry = {
	readonly title: string;
	readonly license: string;
	readonly url: string;
};

export const OSS_CATALOG: readonly OssEntry[] = Object.freeze([
	{
		title: 'React',
		license: 'MIT',
		url: 'https://github.com/facebook/react'
	},
	{
		title: 'Ink',
		license: 'MIT',
		url: 'https://github.com/vadimdemedes/ink'
	},
	{
		title: '@inkjs/ui',
		license: 'MIT',
		url: 'https://github.com/vadimdemedes/ink-ui'
	},
	{
		title: 'zod',
		license: 'MIT',
		url: 'https://github.com/colinhacks/zod'
	},
	{
		title: 'neverthrow',
		license: 'MIT',
		url: 'https://github.com/supermacro/neverthrow'
	},
	{
		title: 'TypeScript',
		license: 'Apache-2.0',
		url: 'https://github.com/microsoft/TypeScript'
	},
	{
		title: 'oxlint',
		license: 'MIT',
		url: 'https://github.com/oxc-project/oxc'
	}
]);
