import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { parseFrontmatter, loadSkillsFromDir, loadSkills } from "../../src/skills/loader.js";

const TMP = join(tmpdir(), "opencli-skills-test");

beforeEach(async () => {
  await mkdir(TMP, { recursive: true });
});

afterEach(async () => {
  await rm(TMP, { recursive: true, force: true });
});

describe("parseFrontmatter", () => {
  it("parses name and description from frontmatter", () => {
    const content = `---
name: code-review
description: Reviews code for bugs
---

You are a code reviewer.`;
    const result = parseFrontmatter(content);
    expect(result?.name).toBe("code-review");
    expect(result?.description).toBe("Reviews code for bugs");
    expect(result?.body).toBe("You are a code reviewer.");
  });

  it("returns null when name is missing", () => {
    const content = `---
description: Reviews code
---

Body.`;
    expect(parseFrontmatter(content)).toBeNull();
  });

  it("returns null when description is missing", () => {
    const content = `---
name: review
---

Body.`;
    expect(parseFrontmatter(content)).toBeNull();
  });

  it("returns null when there is no frontmatter", () => {
    const content = `Just plain text with no frontmatter.`;
    expect(parseFrontmatter(content)).toBeNull();
  });

  it("trims body whitespace", () => {
    const content = `---
name: test
description: A test skill
---

  Body with leading space.  `;
    const result = parseFrontmatter(content);
    expect(result?.body).toBe("Body with leading space.");
  });
});

describe("loadSkillsFromDir", () => {
  it("loads valid skill files from a directory", async () => {
    await writeFile(
      join(TMP, "review.md"),
      `---\nname: review\ndescription: Code review\n---\n\nReview instructions.`,
    );
    const skills = await loadSkillsFromDir(TMP);
    expect(skills.size).toBe(1);
    expect(skills.get("review")?.description).toBe("Code review");
    expect(skills.get("review")?.body).toBe("Review instructions.");
  });

  it("skips files with missing frontmatter fields", async () => {
    await writeFile(join(TMP, "bad.md"), `---\nname: bad\n---\n\nNo description.`);
    const skills = await loadSkillsFromDir(TMP);
    expect(skills.size).toBe(0);
  });

  it("ignores non-.md files", async () => {
    await writeFile(join(TMP, "review.txt"), `Some text`);
    const skills = await loadSkillsFromDir(TMP);
    expect(skills.size).toBe(0);
  });

  it("returns empty map when directory does not exist", async () => {
    const skills = await loadSkillsFromDir("/nonexistent/path");
    expect(skills.size).toBe(0);
  });
});

describe("loadSkills (merge)", () => {
  it("merges global and project skills, project wins on conflict", async () => {
    const globalDir = join(TMP, "global");
    const projectDir = join(TMP, "project");
    await mkdir(globalDir, { recursive: true });
    await mkdir(projectDir, { recursive: true });

    await writeFile(
      join(globalDir, "review.md"),
      `---\nname: review\ndescription: Global review\n---\n\nGlobal body.`,
    );
    await writeFile(
      join(projectDir, "review.md"),
      `---\nname: review\ndescription: Project review\n---\n\nProject body.`,
    );
    await writeFile(
      join(globalDir, "refactor.md"),
      `---\nname: refactor\ndescription: Refactor skill\n---\n\nRefactor body.`,
    );

    const skills = await loadSkills(globalDir, projectDir);
    expect(skills.size).toBe(2);
    expect(skills.get("review")?.description).toBe("Project review");
    expect(skills.get("refactor")?.description).toBe("Refactor skill");
  });
});
