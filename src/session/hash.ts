import { createHash } from "crypto";

export function getProjectHash(cwd: string): string {
  return createHash("md5").update(cwd).digest("hex").slice(0, 12);
}
