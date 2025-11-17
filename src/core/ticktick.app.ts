import { TickTickClient } from './ticktick.client';
import { convertStringToTaskBody } from './text-parser';
import { UpdateTaskParams } from './types/ticktick.types';
import { List } from './types/list.types';

export class TicktickApp {
  private readonly client: TickTickClient;

  constructor(client?: TickTickClient) {
    this.client = client ?? new TickTickClient();
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.client.mainData) {
      await this.client.init();
    }
  }

  // === Auth ===

  async login(email: string, password: string): Promise<void> {
    await this.client.login(email, password);
  }

  async logout(): Promise<void> {
    await this.client.logout();
  }

  // === Tasks / lists ===

  async quickAdd(text: string): Promise<{ ok: true }> {
    await this.ensureInitialized();
    const taskBody = await convertStringToTaskBody(text, this.client);
    await this.client.addTasks([taskBody]);
    return { ok: true };
  }

  async getLists(): Promise<List[]> {
    await this.ensureInitialized();
    return this.client.getLists();
  }

  async getInboxTasks() {
    await this.ensureInitialized();
    return this.client.getInboxTasks();
  }

  async getTasksByProject(projectId: string) {
    await this.ensureInitialized();
    return this.client.getTasksByProjectId(projectId);
  }

  async completeTasks(tasks: UpdateTaskParams[]): Promise<void> {
    await this.ensureInitialized();
    await this.client.completeTasks(tasks);
  }
}
