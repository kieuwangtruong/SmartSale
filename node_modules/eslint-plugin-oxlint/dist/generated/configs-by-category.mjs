import { correctnessRules, nurseryRules, pedanticRules, perfRules, restrictionRules, styleRules, suspiciousRules } from "./rules-by-category.mjs";
//#region src/generated/configs-by-category.ts
var configByCategory = {
	"flat/pedantic": {
		name: "oxlint/pedantic",
		rules: pedanticRules
	},
	"flat/style": {
		name: "oxlint/style",
		rules: styleRules
	},
	"flat/suspicious": {
		name: "oxlint/suspicious",
		rules: suspiciousRules
	},
	"flat/restriction": {
		name: "oxlint/restriction",
		rules: restrictionRules
	},
	"flat/correctness": {
		name: "oxlint/correctness",
		rules: correctnessRules
	},
	"flat/nursery": {
		name: "oxlint/nursery",
		rules: nurseryRules
	},
	"flat/perf": {
		name: "oxlint/perf",
		rules: perfRules
	}
};
//#endregion
export { configByCategory as default };
