import { readFile, readdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { Skill } from "./types.js";

export const GLOBAL_SKILLS_DIR = join(homedir(), ".open-cli", "skills");
export const PROJECT_SKILLS_DIR = join(process.cwd(), ".opencli", "skills");

export interface ParsedSkill {
  name: string;
  description: string;
  body: string;
}

export function parseFrontmatter(content: string): ParsedSkill | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;

  const frontmatter = match[1];
  const body = match[2].trim();

  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m);

  if (!nameMatch || !descMatch) return null;

  return {
    name: nameMatch[1].trim(),
    description: descMatch[1].trim(),
    body,
  };
}

export async function loadSkillsFromDir(dir: string): Promise<Map<string, Skill>> {
  const skills = new Map<string, Skill>();

  if (!existsSync(dir)) return skills;

  const files = await readdir(dir);

  for (const file of files.filter((f) => f.endsWith(".md"))) {
    try {
      const filePath = join(dir, file);
      const content = await readFile(filePath, "utf-8");
      const parsed = parseFrontmatter(content);

      if (!parsed) {
        console.warn(`[skills] Skipping ${file}: missing name or description in frontmatter`);
        continue;
      }

      skills.set(parsed.name, {
        name: parsed.name,
        description: parsed.description,
        body: parsed.body,
        source: filePath,
      });
    } catch (error) {
      console.warn(`[skills] Failed to load ${file}:`, error);
    }
  }

  return skills;
}

export async function loadSkills(
  globalDir = GLOBAL_SKILLS_DIR,
  projectDir = PROJECT_SKILLS_DIR,
): Promise<Map<string, Skill>> {
  const global = await loadSkillsFromDir(globalDir);
  const project = await loadSkillsFromDir(projectDir);

  // Merge: project overrides global on conflict
  return new Map([...global, ...project]);
}
