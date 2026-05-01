import { getAvailableYamlFiles } from "./src/lib/protection-links-file";

async function main() {
  console.log("Fetching available YAML files...");
  const t0 = Date.now();
  const files = await getAvailableYamlFiles();
  console.log("Found", files.length, "files in", Date.now() - t0, "ms");
}
main().catch(console.error);
