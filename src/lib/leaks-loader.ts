import { promises as fs } from "fs";
import path from "path";
import yaml from "js-yaml";

const LEAKS_DATA_PATH =
  process.env.LEAKS_DATA_PATH || "/home/6ure/plugins/Skript/scripts/Data/Leaks";

/**
 * Recursively list all file paths under dir.
 */
async function listAllFilesRecursive(
  dir: string,
  baseDir?: string,
  list?: string[]
): Promise<string[]> {
  const currentBaseDir = baseDir || dir;
  const currentList = list || [];
  let names: string[];

  try {
    names = await fs.readdir(dir);
  } catch (e) {
    console.warn("[Leaks] Cannot read directory", dir, (e as Error).message);
    return currentList;
  }

  for (const name of names) {
    const fullPath = path.join(dir, name);
    try {
      const stat = await fs.stat(fullPath);
      if (stat.isFile()) {
        const relative = path.relative(currentBaseDir, fullPath);
        currentList.push(relative);
      } else if (stat.isDirectory()) {
        await listAllFilesRecursive(fullPath, currentBaseDir, currentList);
      }
    } catch {
      continue;
    }
  }

  return currentList;
}

/**
 * List relative paths of .yml and .yaml files under dir (recursive).
 */
export async function listYamlFilesInDir(dirPath: string): Promise<string[]> {
  if (!dirPath) return [];
  try {
    const stat = await fs.stat(dirPath);
    if (!stat.isDirectory()) return [];
  } catch {
    return [];
  }

  const all = await listAllFilesRecursive(dirPath);
  return all.filter((f) => {
    const lower = f.toLowerCase();
    return lower.endsWith(".yml") || lower.endsWith(".yaml");
  });
}

/** Strip !skriptdate '...' to plain string so js-yaml doesn't throw */
function stripSkriptDate(content: string) {
  if (!content || typeof content !== "string") return content;
  return content.replace(/!skriptdate\s+'([^']*)'/g, "'$1'");
}

/**
 * Quote Guild/Channel/Message/Member values so js-yaml keeps them as strings.
 */
function quoteSnowflakeIds(content: string) {
  if (!content || typeof content !== "string") return content;
  return content.replace(
    /(\s*(?:Guild|Channel|Message|Member):\s*)(\d{15,})/gm,
    (_, prefix, id) => `${prefix}"${id}"`
  );
}

/**
 * Read a YAML file and return the Editor value from the first leak entry, or null.
 */
export async function getEditorFromYamlFile(
  dirPath: string,
  relativePath: string
): Promise<string | null> {
  const filePath = path.join(dirPath, relativePath);
  try {
    const content = await fs.readFile(filePath, "utf8");
    let raw = stripSkriptDate(content);
    raw = quoteSnowflakeIds(raw);

    const data = yaml.load(raw, { schema: yaml.DEFAULT_SCHEMA });
    if (!data || typeof data !== "object") return null;

    // Search for Editor at the top level or first nested object
    let editor: string | null = null;
    const searchEditor = (obj: any): string | null => {
      if (!obj || typeof obj !== "object") return null;
      if (obj.Editor) return String(obj.Editor).trim();
      if (obj.editor) return String(obj.editor).trim();
      for (const val of Object.values(obj)) {
        if (val && typeof val === "object" && !Array.isArray(val)) {
          const res = searchEditor(val);
          if (res) return res;
        }
      }
      // Check array items
      if (Array.isArray(obj)) {
        for (const item of obj) {
          const res = searchEditor(item);
          if (res) return res;
        }
      }
      return null;
    };

    editor = searchEditor(data);
    return editor;
  } catch (e) {
    return null;
  }
}

export { LEAKS_DATA_PATH };
