export interface Skill {
  name: string;
  description: string;
  body: string;       // full markdown content after frontmatter
  source: string;     // absolute path to the .md file
}
