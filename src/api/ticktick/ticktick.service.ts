import { Injectable } from '@nestjs/common';
import { TickTickClient } from '../../core/ticktick.client';
import { convertStringToTaskBody } from '../../core/text-parser';
import { UpdateTaskParams } from '../../core/types/ticktick.types';

@Injectable()
export class TicktickService {
  private client = new TickTickClient();

  async ensureInitialized() {
    if (!this.client.mainData) {
      await this.client.init();
    }
  }

  async login(email: string, password: string) {
    await this.client.login(email, password);
  }

  async logout() {
    await this.client.logout();
  }

  async quickAdd(text: string) {
    await this.ensureInitialized();
    const body = await convertStringToTaskBody(text, this.client);
    await this.client.addTasks([body]);
    return { ok: true };
  }

  async getLists() {
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

  async completeTasks(tasks: UpdateTaskParams[]) {
    await this.ensureInitialized();
    await this.client.completeTasks(tasks);
  }
}
