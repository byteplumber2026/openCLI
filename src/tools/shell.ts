import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const TIMEOUT = 30000; // 30 seconds

export interface ShellRunArgs {
  command: string;
  workdir?: string;
}

export async function shellRun(args: ShellRunArgs): Promise<string> {
  const { command, workdir } = args;

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: workdir || process.cwd(),
      timeout: TIMEOUT,
      maxBuffer: 1024 * 1024, // 1MB
    });

    const output = stdout || stderr;
    return output.trim() || '(no output)';
  } catch (error: any) {
    if (error.killed) {
      throw new Error(`Command timed out after ${TIMEOUT / 1000}s`);
    }
    if (error.stderr) {
      throw new Error(error.stderr.trim());
    }
    throw new Error(error.message);
  }
}
