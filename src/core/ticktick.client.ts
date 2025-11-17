import axios, { AxiosInstance } from 'axios';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  ErrorLoginResponse,
  HandleTasksBody,
  UpdateTaskParams,
  TaskOperationResponse,
  TickTickMainResponse,
  TickTickProject,
  TickTickTask,
  DeleteTaskParams,
  Condition,
  TickTickFilterRule,
} from './types/ticktick.types';
import { List } from './types/list.types';
import { now } from './text-parser';

function getFilePath(filename: string): string {
  const home = os.homedir();
  if (!home) throw new Error('Unable to determine the home directory.');
  return path.join(home, filename);
}

export class TickTickClient {
  private cookieFile: string;
  private axiosInstance: AxiosInstance;
  private ticktickUrl = 'https://api.ticktick.com/api/v2';
  private xDeviceHeader =
    '{"platform":"web","os":"macOS 10.15.7","device":"Chrome 121.0.0.0","name":"","version":5070,"id":"65bcdf6491ea1a2e7db71fbe","channel":"website","campaign":"","websocket":""}';

  private headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-device': this.xDeviceHeader,
  };

  private dataFilePath = '.ticktick_data';
  private inboxId: string | null = null;
  public mainData: TickTickMainResponse | null = null;

  constructor() {
    this.cookieFile = getFilePath(this.dataFilePath);
    this.axiosInstance = axios.create({
      headers: this.headers,
      withCredentials: true,
    });
  }

  public async init(): Promise<void> {
    this.mainData = await this.getMainData();
    this.inboxId = this.setInboxId();
  }

  async getSessionCookies(): Promise<string[]> {
    try {
      const data = await fs.readFile(this.cookieFile, 'utf-8');
      return data.split(';').map((s) => s.trim());
    } catch (err: unknown) {
      // Si el archivo no existe, intentamos login con env
      if (this.isErrnoException(err) && err.code === 'ENOENT') {
        const creds = this.getEnvCredentials();

        if (!creds) {
          throw new Error(
            'No TickTick session found and TICKTICK_EMAIL/TICKTICK_PASSWORD (o ticktick_email/ticktick_password) are not set. ' +
              'In local mode, run login from the CLI; in server mode, configure env vars.',
          );
        }

        console.log(
          'No session file found. Logging into TickTick using environment variables...',
        );
        await this.login(creds.email, creds.password);

        // Reintentamos leer la cookie recién escrita
        const data = await fs.readFile(this.cookieFile, 'utf-8');
        return data.split(';').map((s) => s.trim());
      }

      // Otro tipo de error → lo propagamos
      throw err;
    }
  }

  async login(username: string, password: string): Promise<void> {
    try {
      const body = { username, password };
      const response = await this.axiosInstance.post(
        `${this.ticktickUrl}/user/signon?wc=true&remember=true`,
        body,
      );

      const cookies = response.headers['set-cookie'] || [];
      await fs.writeFile(this.cookieFile, cookies.join(';'));
    } catch (err: unknown) {
      // Narrow to AxiosError with a response
      if (axios.isAxiosError<ErrorLoginResponse>(err) && err.response?.data) {
        const error = err.response.data;
        console.error(
          `Login failed! Code: ${error.errorCode}, Message: ${error.errorMessage}, ID: ${error.errorId}`,
        );
        console.error(`Remainder times: ${error.data.remainderTimes}`);
        return;
      }

      // Not an Axios error (or no response data) → rethrow
      throw err;
    }
  }

  // helper somewhere in the same file or a utils file
  private isErrnoException(error: unknown): error is NodeJS.ErrnoException {
    return typeof error === 'object' && error !== null && 'code' in error;
  }

  async logout(): Promise<void> {
    try {
      await fs.unlink(this.cookieFile);
    } catch (err: unknown) {
      if (this.isErrnoException(err) && err.code === 'ENOENT') {
        console.warn('No session found to log out.');
        return;
      }

      console.error('Failed to log out:', err);
      throw err;
    }
  }

  async refreshMainData(): Promise<void> {
    this.mainData = await this.getMainData();
    this.inboxId = this.setInboxId();
  }

  async getMainData(): Promise<TickTickMainResponse> {
    const cookies = await this.getSessionCookies();
    const response = await this.axiosInstance.get<TickTickMainResponse>(
      `${this.ticktickUrl}/batch/check/0`,
      {
        headers: {
          Cookie: cookies.join(';'),
        },
      },
    );

    if (!response.data.inboxId || typeof response.data.inboxId !== 'string') {
      throw new Error('Inbox ID is missing or invalid in response.');
    }

    return response.data;
  }

  private setInboxId(): string {
    return this.mainData!.inboxId;
  }

  getInboxId(): string {
    if (!this.inboxId) {
      throw new Error('Inbox ID is not set. Call init() first.');
    }
    return this.inboxId;
  }

  getTasksByProjectId(projectId: string): TickTickTask[] {
    const tasks = this.mainData!.syncTaskBean.update.filter(
      (task) => task.projectId === projectId,
    );

    if (!Array.isArray(tasks)) {
      throw new Error('Invalid task data format');
    }

    return tasks.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  getInboxTasks(): TickTickTask[] {
    return this.getTasksByProjectId(this.inboxId!);
  }

  async fetchTasks(): Promise<TickTickTask[]> {
    const mainData = await this.getMainData();
    const tasks = mainData.syncTaskBean.update;

    if (!Array.isArray(tasks)) {
      throw new Error('Invalid task data format');
    }

    return tasks;
  }

  async deleteTasks(tasks: DeleteTaskParams[]): Promise<void> {
    const cookies = await this.getSessionCookies();

    const body: HandleTasksBody = {
      add: [],
      update: [],
      delete: tasks,
    };
    const response = await this.axiosInstance.post<TaskOperationResponse>(
      `${this.ticktickUrl}/batch/task`,
      body,
      {
        headers: {
          Cookie: cookies.join(';'),
        },
      },
    );

    if (!response.data || Object.keys(response.data.id2error).length > 0) {
      console.error(
        `Error in task operation: ${JSON.stringify(response.data.id2error)}`,
      );
    }
  }

  async completeTasks(tasks: UpdateTaskParams[]): Promise<void> {
    const completedTasks = tasks.map((task) => ({
      ...task,
      completedTime: now(),
      status: 2,
      completedUserId: task.creator,
    }));

    await this.updateTasks(completedTasks);
  }

  async updateTasks(tasks: UpdateTaskParams[]): Promise<void> {
    const updatedTasks = tasks.map((task) => ({
      ...task,
      modifiedTime: now(),
    }));

    const body: HandleTasksBody = {
      add: [],
      update: updatedTasks,
      delete: [],
    };

    const cookies = await this.getSessionCookies();

    const response = await this.axiosInstance.post<TaskOperationResponse>(
      `${this.ticktickUrl}/batch/task`,
      body,
      {
        headers: {
          Cookie: cookies.join(';'),
        },
      },
    );

    if (!response.data || Object.keys(response.data.id2error).length > 0) {
      console.error(
        `Error in task operation: ${JSON.stringify(response.data.id2error)}`,
      );
    }
  }

  async addTasks(tasks: UpdateTaskParams[]): Promise<void> {
    const body: HandleTasksBody = {
      add: tasks,
      update: [],
      delete: [],
    };

    const cookies = await this.getSessionCookies();

    const response = await this.axiosInstance.post<TaskOperationResponse>(
      `${this.ticktickUrl}/batch/task`,
      body,
      {
        headers: {
          Cookie: cookies.join(';'),
        },
      },
    );

    if (!response.data || Object.keys(response.data.id2error).length > 0) {
      console.error(
        `Error in task operation: ${JSON.stringify(response.data.id2error)}`,
      );
    }
  }

  async fetchProjects(): Promise<TickTickProject[]> {
    const cookies = await this.getSessionCookies();
    const response = await this.axiosInstance.get<TickTickProject[]>(
      `${this.ticktickUrl}/projects`,
      {
        headers: {
          Cookie: cookies.join(';'),
        },
      },
    );
    return response.data;
  }

  async getLists(): Promise<List[]> {
    const projects = await this.fetchProjects();
    const filters = this.getFilters();

    return [
      ...filters.map((f) => ({
        id: f.id,
        name: f.name,
        isFilter: true,
      })),
      ...projects.map((p) => ({
        id: p.id,
        name: p.name,
        isFilter: false,
      })),
    ];
  }

  getFilters(): List[] {
    if (!this.mainData?.filters) {
      return [];
    }
    return this.mainData.filters.map((filter) => ({
      id: filter.id,
      name: filter.name,
      isFilter: true,
    }));
  }

  private parseFilterRule(rule: string): TickTickFilterRule | null {
    try {
      const parsed = JSON.parse(rule) as TickTickFilterRule;

      // sanity check mínima para no confiar 100% en el cast
      if (!parsed || !Array.isArray(parsed.and)) {
        console.error('Invalid filter rule format:', parsed);
        return null;
      }

      return parsed;
    } catch (error) {
      console.error('Error parsing filter rule:', error);
      return null;
    }
  }

  private conditionMappers: Record<
    string,
    (task: TickTickTask, condition: Condition) => boolean
  > = {
    dueDate: (task, condition) => {
      const hasDueDate = !!task.dueDate;
      return condition.not.includes('nodue') ? hasDueDate : !hasDueDate;
    },

    listOrGroup: (task, condition) => {
      for (const notCond of condition.not) {
        if (typeof notCond === 'object' && 'or' in notCond) {
          if (notCond.conditionName === 'list') {
            if (notCond.or.includes(task.projectId)) return false;
          }
        }
      }
      return true;
    },
  };

  getTasksByFilter(filterId: string): TickTickTask[] {
    const tasks = this.mainData!.syncTaskBean.update;

    if (!this.mainData?.filters) {
      return [];
    }

    const filter = this.mainData.filters.find((f) => f.id === filterId);

    if (!filter) {
      console.error('Filter not found');
      return [];
    }

    if (!filter.rule) {
      return tasks;
    }

    const rule = this.parseFilterRule(filter.rule);

    if (!rule) {
      console.error('Invalid filter rule');
      return tasks;
    }

    return tasks.filter((task) =>
      rule.and.every((condition) => {
        const mapper = this.conditionMappers[condition.conditionName];
        if (!mapper) return true; // condición desconocida -> ignorar
        return mapper(task, condition);
      }),
    );
  }

  private getEnvCredentials(): { email: string; password: string } | null {
    const email =
      process.env.TICKTICK_EMAIL ?? process.env.ticktick_email ?? '';
    const password =
      process.env.TICKTICK_PASSWORD ?? process.env.ticktick_password ?? '';

    if (!email || !password) {
      return null;
    }

    return { email, password };
  }
}
