// ESLint (flat config) on top of Expo's base rules: JSX, TypeScript, hooks, platform file extensions.
// Run with `npm run lint`. Rules that the existing code breaks in bulk are warnings, not errors, so the lint step
// can gate new mistakes without first requiring a clean-up of the whole codebase; tighten them as screens are fixed.
const expoConfig = require('eslint-config-expo/flat')
const { defineConfig } = require('eslint/config')

module.exports = defineConfig([
	expoConfig,
	{
		ignores: ['dist/*', 'android/*', 'ios/*', 'node_modules/*', '.expo/*', 'coverage/*'],
	},
	{
		// Ambient declaration files: their module names resolve through the type packages, not the import resolver.
		files: ['**/*.d.ts'],
		rules: { 'import/no-unresolved': 'off' },
	},
	{
		rules: {
			// Existing code breaks these in bulk (the newer React-Compiler-era hooks rules above all); they stay visible as
			// warnings. rules-of-hooks, parse errors and the rest of the recommended set still fail the lint step.
			'react-hooks/exhaustive-deps': 'warn',
			'react-hooks/refs': 'warn',
			'react-hooks/set-state-in-effect': 'warn',
			'react-hooks/immutability': 'warn',
			'react-hooks/purity': 'warn',
			'react-hooks/preserve-manual-memoization': 'warn',
			'react-hooks/use-memo': 'warn',
			'react/no-unescaped-entities': 'warn',
			'import/export': 'warn',
			'react/display-name': 'off',
		},
	},
])
