const require_rules_by_category = require("./rules-by-category.cjs");
//#region src/generated/configs-by-category.ts
var configByCategory = {
	"flat/pedantic": {
		name: "oxlint/pedantic",
		rules: require_rules_by_category.pedanticRules
	},
	"flat/style": {
		name: "oxlint/style",
		rules: require_rules_by_category.styleRules
	},
	"flat/suspicious": {
		name: "oxlint/suspicious",
		rules: require_rules_by_category.suspiciousRules
	},
	"flat/restriction": {
		name: "oxlint/restriction",
		rules: require_rules_by_category.restrictionRules
	},
	"flat/correctness": {
		name: "oxlint/correctness",
		rules: require_rules_by_category.correctnessRules
	},
	"flat/nursery": {
		name: "oxlint/nursery",
		rules: require_rules_by_category.nurseryRules
	},
	"flat/perf": {
		name: "oxlint/perf",
		rules: require_rules_by_category.perfRules
	}
};
//#endregion
exports.default = configByCategory;
