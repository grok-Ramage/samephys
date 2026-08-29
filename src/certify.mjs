import { reportToText, runCertificate } from "./certify.ts";

const report = runCertificate();
console.log(reportToText(report));
process.exit(report.ok ? 0 : 1);
