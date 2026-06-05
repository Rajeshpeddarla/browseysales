import { AgentContext, AgentResult } from './types';

export abstract class BaseAgent {
  abstract name: string;

  /**
   * Executes the agent's core logic based on the provided context.
   * @param context The context for the current research run, including the domain and goal.
   * @returns A promise that resolves to an AgentResult containing the outcome of the execution.
   */
  abstract execute(context: AgentContext): Promise<AgentResult>;

  /**
   * Helper function to wrap execution with timing and standard error handling.
   */
  protected async runWithTiming(
    executeFn: () => Promise<Omit<AgentResult, 'duration_ms' | 'agent_name'>>
  ): Promise<AgentResult> {
    const startTime = Date.now();
    try {
      const result = await executeFn();
      return {
        ...result,
        agent_name: this.name,
        duration_ms: Date.now() - startTime,
      };
    } catch (error) {
      console.error(`[${this.name}] Execution failed:`, error);
      return {
        agent_name: this.name,
        status: 'failed',
        data: { error: error instanceof Error ? error.message : String(error) },
        confidence: 0,
        execution_summary: `Agent execution failed: ${error instanceof Error ? error.message : String(error)}`,
        duration_ms: Date.now() - startTime,
      };
    }
  }
}
