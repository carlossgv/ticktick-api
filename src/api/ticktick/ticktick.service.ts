import { Injectable } from '@nestjs/common';
import { TicktickApp } from '../../core/ticktick.app';

@Injectable()
export class TicktickService {
  private readonly app = new TicktickApp();

  async login(email: string, password: string): Promise<void> {
    await this.app.login(email, password);
  }

  async logout(): Promise<void> {
    await this.app.logout();
  }

  async quickAdd(text: string) {
    return this.app.quickAdd(text);
  }

  async getLists() {
    return this.app.getLists();
  }

  async getInboxTasks() {
    return this.app.getInboxTasks();
  }

  async getTasksByProject(projectId: string) {
    return this.app.getTasksByProject(projectId);
  }
}
