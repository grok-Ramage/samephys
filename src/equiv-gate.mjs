import { equivReportToText, runEquivBattery } from "./equiv-gate.ts";

const report = runEquivBattery();
console.log(equivReportToText(report));
process.exit(report.ok ? 0 : 1);
