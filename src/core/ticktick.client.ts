import axios, { AxiosInstance } from 'axios';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

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
  const dataDir = process.env.TICKTICK_DATA_DIR?.trim();
  if (dataDir) return path.join(dataDir, filename);

  const home = os.homedir();
  if (!home) throw new Error('Unable to determine the home directory.');
  return path.join(home, filename);
}

type XDevice = {
  platform: 'web';
  os: string;
  device: string;
  name: string;
  version: number;
  id: string;
  channel: 'website';
  campaign?: string;
  websocket?: string;
};

export class TickTickClient {
  private projectsCache: { data: TickTickProject[]; expiresAt: number } | null =
    null;

  private axiosInstance: AxiosInstance;
  private ticktickUrl = 'https://api.ticktick.com/api/v2';

  private dataFilePath = '.ticktick_data';
  private deviceIdFilePath = '.ticktick_device_id';

  private cookieFile: string;
  private deviceIdFile: string;

  private xDeviceHeader: string | null = null;

  private inboxId: string | null = null;
  public mainData: TickTickMainResponse | null = null;

  constructor() {
    this.cookieFile = getFilePath(this.dataFilePath);
    this.deviceIdFile = getFilePath(this.deviceIdFilePath);

    // axios instance created without x-device; we inject it once we have a persistent device id
    this.axiosInstance = axios.create({
      headers: {
        'Content-Type': 'application/json',
        // Helps look like a browser client; some endpoints are picky.
        'User-Agent':
          process.env.TICKTICK_USER_AGENT?.trim() ||
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      },
      withCredentials: true,
    });
  }

  public async init(): Promise<void> {
    await this.ensureXDeviceHeader();
    this.mainData = await this.getMainData();
    this.inboxId = this.setInboxId();
  }

  // ─────────────────────────────
  // X-DEVICE
  // ─────────────────────────────

  private async ensureXDeviceHeader(): Promise<void> {
    if (this.xDeviceHeader) return;

    await fs.mkdir(path.dirname(this.deviceIdFile), { recursive: true });

    const id = await this.getOrCreateDeviceId();
    const version = this.getWebClientVersion();

    const xDevice: XDevice = {
      platform: 'web',
      os: process.env.TICKTICK_DEVICE_OS?.trim() || 'Node.js',
      device: process.env.TICKTICK_DEVICE_NAME?.trim() || 'ticktick-api',
      name: process.env.TICKTICK_DEVICE_LABEL?.trim() || 'ticktick-api',
      version,
      id,
      channel: 'website',
      campaign: '',
      websocket: '',
    };

    this.xDeviceHeader = JSON.stringify(xDevice);

    // set default header on axios instance
    this.axiosInstance.defaults.headers.common['x-device'] = this.xDeviceHeader;

    // Optional: some endpoints behave better with origin/referer matching webapp
    if (process.env.TICKTICK_WEB_ORIGIN?.trim()) {
      this.axiosInstance.defaults.headers.common['Origin'] =
        process.env.TICKTICK_WEB_ORIGIN.trim();
    }
    if (process.env.TICKTICK_WEB_REFERER?.trim()) {
      this.axiosInstance.defaults.headers.common['Referer'] =
        process.env.TICKTICK_WEB_REFERER.trim();
    }
  }

  private getWebClientVersion(): number {
    const raw = process.env.TICKTICK_WEB_VERSION?.trim();
    const v = raw ? Number(raw) : NaN;
    // fallback to the value you scraped; keep stable unless TickTick changes it
    return Number.isFinite(v) ? v : 5070;
  }

  private async getOrCreateDeviceId(): Promise<string> {
    try {
      const existing = (await fs.readFile(this.deviceIdFile, 'utf-8')).trim();
      if (existing) return existing;
    } catch (err: unknown) {
      if (!(this.isErrnoException(err) && err.code === 'ENOENT')) throw err;
    }

    // 24 hex chars (similar shape to what you scraped)
    const newId = crypto.randomBytes(12).toString('hex');
    await fs.writeFile(this.deviceIdFile, newId, 'utf-8');
    return newId;
  }

  // ─────────────────────────────
  // SESSION / AUTH
  // ─────────────────────────────

  async getSessionCookies(): Promise<string[]> {
    try {
      await fs.mkdir(path.dirname(this.cookieFile), { recursive: true });
      const data = await fs.readFile(this.cookieFile, 'utf-8');
      return data.split(';').map((s) => s.trim());
    } catch (err: unknown) {
      if (this.isErrnoException(err) && err.code === 'ENOENT') {
        const creds = this.getEnvCredentials();

        if (!creds) {
          throw new Error(
            'No TickTick session found and TICKTICK_EMAIL/TICKTICK_PASSWORD (o ticktick_email/ticktick_password) are not set. ' +
              'In local mode, run login; in server mode, configure env vars.',
          );
        }

        console.log(
          'No session file found. Logging into TickTick using environment variables...',
        );
        await this.login(creds.email, creds.password);

        const data = await fs.readFile(this.cookieFile, 'utf-8');
        return data.split(';').map((s) => s.trim());
      }

      throw err;
    }
  }

  async login(username: string, password: string): Promise<void> {
    await this.ensureXDeviceHeader();

    try {
      const body = { username, password };
      const response = await this.axiosInstance.post(
        `${this.ticktickUrl}/user/signon?wc=true&remember=true`,
        body,
      );

      const cookies = response.headers['set-cookie'] || [];
      await fs.writeFile(this.cookieFile, cookies.join(';'));
    } catch (err: unknown) {
      if (axios.isAxiosError<ErrorLoginResponse>(err) && err.response?.data) {
        const error = err.response.data;
        throw new Error(
          `Login failed! Code: ${error.errorCode}, Message: ${error.errorMessage}, ID: ${error.errorId}`,
        );
      }
      throw err;
    }
  }

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
      throw err;
    }
  }

  async refreshMainData(): Promise<void> {
    this.mainData = await this.getMainData();
    this.inboxId = this.setInboxId();
  }

  // ─────────────────────────────
  // API CALLS
  // ─────────────────────────────

  async getMainData(): Promise<TickTickMainResponse> {
    await this.ensureXDeviceHeader();

    return this.withAuthRetry(async () => {
      const cookies = await this.getSessionCookies();
      const response = await this.axiosInstance.get<TickTickMainResponse>(
        `${this.ticktickUrl}/batch/check/0`,
        { headers: { Cookie: cookies.join(';') } },
      );

      if (!response.data?.inboxId || typeof response.data.inboxId !== 'string') {
        throw new Error('Inbox ID is missing or invalid in response.');
      }

      return response.data;
    });
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
    await this.ensureXDeviceHeader();

    const cookies = await this.getSessionCookies();

    const body: HandleTasksBody = {
      add: [],
      update: [],
      delete: tasks,
    };

    const response = await this.axiosInstance.post<TaskOperationResponse>(
      `${this.ticktickUrl}/batch/task`,
      body,
      { headers: { Cookie: cookies.join(';') } },
    );

    if (!response.data) throw new Error('TickTick returned empty response');
    if (Object.keys(response.data.id2error ?? {}).length > 0) {
      throw new Error(
        `TickTick delete failed: ${JSON.stringify(response.data.id2error)}`,
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
    await this.ensureXDeviceHeader();

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
      { headers: { Cookie: cookies.join(';') } },
    );

    if (!response.data) throw new Error('TickTick returned empty response');
    if (Object.keys(response.data.id2error ?? {}).length > 0) {
      throw new Error(
        `TickTick update failed: ${JSON.stringify(response.data.id2error)}`,
      );
    }
  }

  async addTasks(tasks: UpdateTaskParams[]): Promise<void> {
    await this.ensureXDeviceHeader();

    await this.withAuthRetry(async () => {
      const body: HandleTasksBody = { add: tasks, update: [], delete: [] };
      const cookies = await this.getSessionCookies();

      const response = await this.axiosInstance.post<TaskOperationResponse>(
        `${this.ticktickUrl}/batch/task`,
        body,
        { headers: { Cookie: cookies.join(';') } },
      );

      if (!response.data) throw new Error('TickTick returned empty response');

      const errors = response.data.id2error;
      if (errors && Object.keys(errors).length > 0) {
        throw new Error(
          `TickTick task creation failed: ${JSON.stringify(errors)}`,
        );
      }
    });
  }

  async fetchProjects(): Promise<TickTickProject[]> {
    await this.ensureXDeviceHeader();

    return this.withAuthRetry(async () => {
      const cookies = await this.getSessionCookies();
      const response = await this.axiosInstance.get<TickTickProject[]>(
        `${this.ticktickUrl}/projects`,
        { headers: { Cookie: cookies.join(';') } },
      );
      return response.data;
    });
  }

  private clearCaches() {
    this.projectsCache = null;
  }

  async fetchProjectsCached(ttlMs = 5 * 60 * 1000): Promise<TickTickProject[]> {
    const t = Date.now();
    if (this.projectsCache && this.projectsCache.expiresAt > t) {
      return this.projectsCache.data;
    }
    const data = await this.fetchProjects();
    this.projectsCache = { data, expiresAt: t + ttlMs };
    return data;
  }

  async getLists(): Promise<List[]> {
    const projects = await this.fetchProjects();
    const filters = this.getFilters();

    return [
      ...filters.map((f) => ({ id: f.id, name: f.name, isFilter: true })),
      ...projects.map((p) => ({ id: p.id, name: p.name, isFilter: false })),
    ];
  }

  getFilters(): List[] {
    if (!this.mainData?.filters) return [];
    return this.mainData.filters.map((filter) => ({
      id: filter.id,
      name: filter.name,
      isFilter: true,
    }));
  }

  private parseFilterRule(rule: string): TickTickFilterRule | null {
    try {
      const parsed = JSON.parse(rule) as TickTickFilterRule;
      if (!parsed || !Array.isArray(parsed.and)) return null;
      return parsed;
    } catch {
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

    if (!this.mainData?.filters) return [];

    const filter = this.mainData.filters.find((f) => f.id === filterId);
    if (!filter) return [];

    if (!filter.rule) return tasks;

    const rule = this.parseFilterRule(filter.rule);
    if (!rule) return tasks;

    return tasks.filter((task) =>
      rule.and.every((condition) => {
        const mapper = this.conditionMappers[condition.conditionName];
        if (!mapper) return true;
        return mapper(task, condition);
      }),
    );
  }

  private getEnvCredentials(): { email: string; password: string } | null {
    const email =
      process.env.TICKTICK_EMAIL ?? process.env.ticktick_email ?? '';
    const password =
      process.env.TICKTICK_PASSWORD ?? process.env.ticktick_password ?? '';

    if (!email || !password) return null;
    return { email, password };
  }

  private async withAuthRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err: unknown) {
      const is401 =
        axios.isAxiosError(err) &&
        (err.response?.status === 401 || err.response?.status === 403);

      if (!is401) throw err;

      const creds = this.getEnvCredentials();
      if (!creds) throw err;

      await this.ensureXDeviceHeader();
      await this.login(creds.email, creds.password);
      this.clearCaches();
      await this.refreshMainData();

      return await fn();
    }
  }
}
