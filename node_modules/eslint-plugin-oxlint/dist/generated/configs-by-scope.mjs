import { eslintRules, importRules, jestRules, jsdocRules, jsxA11yRules, nextjsRules, nodeRules, promiseRules, reactHooksRules, reactPerfRules, reactRules, typescriptRules, unicornRules, vitestRules, vueRules } from "./rules-by-scope.mjs";
//#region src/generated/configs-by-scope.ts
var configByScope = {
	"flat/eslint": {
		name: "oxlint/eslint",
		rules: eslintRules
	},
	"flat/import": {
		name: "oxlint/import",
		rules: importRules
	},
	"flat/jest": {
		name: "oxlint/jest",
		rules: jestRules
	},
	"flat/jsdoc": {
		name: "oxlint/jsdoc",
		rules: jsdocRules
	},
	"flat/jsx-a11y": {
		name: "oxlint/jsx-a11y",
		rules: jsxA11yRules
	},
	"flat/nextjs": {
		name: "oxlint/nextjs",
		rules: nextjsRules
	},
	"flat/node": {
		name: "oxlint/node",
		rules: nodeRules
	},
	"flat/promise": {
		name: "oxlint/promise",
		rules: promiseRules
	},
	"flat/react": {
		name: "oxlint/react",
		rules: reactRules
	},
	"flat/react-hooks": {
		name: "oxlint/react-hooks",
		rules: reactHooksRules
	},
	"flat/react-perf": {
		name: "oxlint/react-perf",
		rules: reactPerfRules
	},
	"flat/typescript": {
		name: "oxlint/typescript",
		rules: typescriptRules
	},
	"flat/unicorn": {
		name: "oxlint/unicorn",
		rules: unicornRules
	},
	"flat/vitest": {
		name: "oxlint/vitest",
		rules: vitestRules
	},
	"flat/vue": {
		name: "oxlint/vue",
		rules: vueRules
	}
};
//#endregion
export { configByScope as default };
