const require_rules_by_scope = require("./rules-by-scope.cjs");
//#region src/generated/configs-by-scope.ts
var configByScope = {
	"flat/eslint": {
		name: "oxlint/eslint",
		rules: require_rules_by_scope.eslintRules
	},
	"flat/import": {
		name: "oxlint/import",
		rules: require_rules_by_scope.importRules
	},
	"flat/jest": {
		name: "oxlint/jest",
		rules: require_rules_by_scope.jestRules
	},
	"flat/jsdoc": {
		name: "oxlint/jsdoc",
		rules: require_rules_by_scope.jsdocRules
	},
	"flat/jsx-a11y": {
		name: "oxlint/jsx-a11y",
		rules: require_rules_by_scope.jsxA11yRules
	},
	"flat/nextjs": {
		name: "oxlint/nextjs",
		rules: require_rules_by_scope.nextjsRules
	},
	"flat/node": {
		name: "oxlint/node",
		rules: require_rules_by_scope.nodeRules
	},
	"flat/promise": {
		name: "oxlint/promise",
		rules: require_rules_by_scope.promiseRules
	},
	"flat/react": {
		name: "oxlint/react",
		rules: require_rules_by_scope.reactRules
	},
	"flat/react-hooks": {
		name: "oxlint/react-hooks",
		rules: require_rules_by_scope.reactHooksRules
	},
	"flat/react-perf": {
		name: "oxlint/react-perf",
		rules: require_rules_by_scope.reactPerfRules
	},
	"flat/typescript": {
		name: "oxlint/typescript",
		rules: require_rules_by_scope.typescriptRules
	},
	"flat/unicorn": {
		name: "oxlint/unicorn",
		rules: require_rules_by_scope.unicornRules
	},
	"flat/vitest": {
		name: "oxlint/vitest",
		rules: require_rules_by_scope.vitestRules
	},
	"flat/vue": {
		name: "oxlint/vue",
		rules: require_rules_by_scope.vueRules
	}
};
//#endregion
exports.default = configByScope;
