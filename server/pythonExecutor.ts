import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";

export interface PythonExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  timedOut?: boolean;
}

export interface PythonExecutionOptions {
  timeout?: number; // in milliseconds, default 30000 (30 seconds)
  args?: string[];
}

/**
 * Execute a Python script with timeout handling
 */
export async function executePython(
  scriptPath: string,
  args: string[] = [],
  options: PythonExecutionOptions = {}
): Promise<PythonExecutionResult> {
  const { timeout = 30000 } = options;

  return new Promise((resolve) => {
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const pythonProcess = spawn(pythonCmd, [scriptPath, ...args]);

    let output = '';
    let errorOutput = '';
    let timedOut = false;
    let resolved = false;

    // Set up timeout
    const timeoutHandle = setTimeout(() => {
      if (!resolved) {
        timedOut = true;
        pythonProcess.kill('SIGTERM');

        // Force kill after 5 seconds if still running
        setTimeout(() => {
          if (!resolved) {
            pythonProcess.kill('SIGKILL');
          }
        }, 5000);
      }
    }, timeout);

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutHandle);

        if (timedOut) {
          resolve({
            success: false,
            output: '',
            error: 'Python execution timed out',
            timedOut: true
          });
        } else if (code === 0) {
          resolve({
            success: true,
            output
          });
        } else {
          resolve({
            success: false,
            output,
            error: errorOutput || `Python process exited with code ${code}`
          });
        }
      }
    });

    pythonProcess.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutHandle);

        resolve({
          success: false,
          output: '',
          error: `Failed to start Python process: ${err.message}`
        });
      }
    });
  });
}

/**
 * Execute Python script with JSON input and output
 */
export async function executePythonWithJSON<T = any>(
  scriptPath: string,
  inputData: any,
  options: PythonExecutionOptions = {}
): Promise<{ success: boolean; data?: T; error?: string; timedOut?: boolean }> {
  const jsonInput = JSON.stringify(inputData);
  const result = await executePython(scriptPath, [jsonInput], options);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      timedOut: result.timedOut
    };
  }

  try {
    const data = JSON.parse(result.output);

    // Check if Python script returned an error in JSON format
    if (data.error) {
      return {
        success: false,
        error: data.error
      };
    }

    return {
      success: true,
      data
    };
  } catch (parseError) {
    return {
      success: false,
      error: `Failed to parse Python output: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
    };
  }
}
