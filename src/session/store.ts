import {
  readFile,
  writeFile,
  readdir,
  mkdir,
  unlink,
  rename,
} from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { Session, SessionMetadata } from "./types.js";
import { getProjectHash } from "./hash.js";

const SESSIONS_DIR = join(homedir(), ".open-cli", "sessions");

function getSessionDir(projectHash: string): string {
  return join(SESSIONS_DIR, projectHash);
}

function getSessionPath(projectHash: string, tag: string): string {
  return join(getSessionDir(projectHash), `${tag}.json`);
}

export async function ensureSessionsDir(): Promise<void> {
  await mkdir(SESSIONS_DIR, { recursive: true });
}

export async function saveSession(
  tag: string,
  messages: Session["messages"],
  provider: string,
  model: string,
  cwd: string,
): Promise<Session> {
  const projectHash = getProjectHash(cwd);
  const sessionDir = getSessionDir(projectHash);
  await mkdir(sessionDir, { recursive: true });

  const id = `${projectHash}-${tag}`;
  const now = new Date().toISOString();

  const session: Session = {
    id,
    tag,
    messages,
    provider,
    model,
    createdAt: now,
    updatedAt: now,
    projectHash,
  };

  // Atomic write: write to temp file then rename
  const sessionPath = getSessionPath(projectHash, tag);
  const tempPath = `${sessionPath}.tmp`;

  await writeFile(tempPath, JSON.stringify(session, null, 2), "utf-8");
  await rename(tempPath, sessionPath);

  return session;
}

export async function loadSession(
  tag: string,
  cwd: string,
): Promise<Session | null> {
  const projectHash = getProjectHash(cwd);
  const sessionPath = getSessionPath(projectHash, tag);

  if (!existsSync(sessionPath)) {
    return null;
  }

  const content = await readFile(sessionPath, "utf-8");
  return JSON.parse(content) as Session;
}

export async function listSessions(cwd: string): Promise<SessionMetadata[]> {
  const projectHash = getProjectHash(cwd);
  const sessionDir = getSessionDir(projectHash);

  if (!existsSync(sessionDir)) {
    return [];
  }

  const files = await readdir(sessionDir);
  const sessions: SessionMetadata[] = [];

  for (const file of files.filter((f) => f.endsWith(".json"))) {
    try {
      const content = await readFile(join(sessionDir, file), "utf-8");
      const session = JSON.parse(content) as Session;
      sessions.push({
        id: session.id,
        tag: session.tag,
        provider: session.provider,
        model: session.model,
        messageCount: session.messages.length,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      });
    } catch {
      // Skip invalid session files
    }
  }

  return sessions.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export async function deleteSession(
  tag: string,
  cwd: string,
): Promise<boolean> {
  const projectHash = getProjectHash(cwd);
  const sessionPath = getSessionPath(projectHash, tag);

  if (!existsSync(sessionPath)) {
    return false;
  }

  await unlink(sessionPath);
  return true;
}
