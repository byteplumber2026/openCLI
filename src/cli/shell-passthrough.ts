import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const TIMEOUT = 30000; // 30 seconds

export interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export function isShellPassthrough(input: string): boolean {
  const trimmed = input.trim();
  // Must start with ! and have something after it (not just ! or ! )
  if (!trimmed.startsWith("!")) {
    return false;
  }
  const afterBang = trimmed.slice(1).trim();
  return afterBang.length > 0;
}

export function isShellModeToggle(input: string): boolean {
  const trimmed = input.trim();
  // Lone ! or just ! with whitespace
  return trimmed === "!";
}

export async function executeShellPassthrough(
  command: string,
): Promise<ShellResult> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: TIMEOUT,
      maxBuffer: 1024 * 1024, // 1MB
    });

    return {
      stdout: stdout || "",
      stderr: stderr || "",
      exitCode: 0,
    };
  } catch (error: any) {
    // Command failed - return the error output
    return {
      stdout: error.stdout || "",
      stderr: error.stderr || error.message || "Unknown error",
      exitCode: error.code || 1,
    };
  }
}

export function formatShellOutput(result: ShellResult): string {
  const lines: string[] = [];

  if (result.stdout) {
    lines.push(result.stdout);
  }

  if (result.stderr) {
    if (result.exitCode !== 0) {
      lines.push(`\nError: ${result.stderr}`);
    } else {
      lines.push(result.stderr);
    }
  }

  lines.push(`\n(exit code: ${result.exitCode})`);

  return lines.join("\n").trim();
}
