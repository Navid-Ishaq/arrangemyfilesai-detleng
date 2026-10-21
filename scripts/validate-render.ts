import { readFile } from "node:fs/promises";
import YAML from "yaml";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
const response = await fetch("https://render.com/schema/render.yaml.json", {
  signal: AbortSignal.timeout(15000),
});
if (!response.ok)
  throw new Error("Could not retrieve the official Render schema.");
const schema = await response.json();
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);
const good = validate(YAML.parse(await readFile("render.yaml", "utf8")));
console.log("Render Blueprint JSON Schema validation:", good ? "PASS" : "FAIL");
if (!good) {
  console.log(validate.errors);
  process.exitCode = 1;
}
