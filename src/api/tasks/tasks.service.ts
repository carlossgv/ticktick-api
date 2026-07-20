import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { TickTickClientProvider } from 'src/core/ticktick.provider';
import { convertStringToTaskBody } from 'src/core/text-parser';
import type {
  TickTickTask,
  UpdateTaskParams,
} from 'src/core/types/ticktick.types';

type QuickAddResult = { taskBody: UpdateTaskParams };

export type TaskListItem = {
  id: string;
  title: string;
  project: string;
  when: string;
};

export type TodayTasksResult = {
  date: string;
  timeZone: string;
  overdue: TaskListItem[];
  today: TaskListItem[];
};

export type NextWeekTasksResult = {
  startDate: string;
  endDate: string;
  timeZone: string;
  tasks: TaskListItem[];
};

type TaskGroup = 'overdue' | 'today';

type ClassifiedTask = {
  group: TaskGroup;
  item: TaskListItem;
  isAllDay: boolean;
  sortAt: DateTime;
};

const DEFAULT_TIMEZONE = 'America/Santiago';

const getTimezone = () => process.env.TZ?.trim() || DEFAULT_TIMEZONE;

const parseTaskDate = (value: string | undefined, timeZone: string) => {
  if (!value) return null;

  const date = DateTime.fromISO(value, { setZone: true }).setZone(timeZone);
  return date.isValid ? date : null;
};

const formatTaskDate = (date: DateTime, isAllDay: boolean) =>
  isAllDay ? date.toFormat('yyyy-LL-dd') : date.toFormat('yyyy-LL-dd HH:mm');

const formatTaskWhen = (
  start: DateTime | null,
  due: DateTime | null,
  isAllDay: boolean,
) => {
  if (start && due && start.toMillis() !== due.toMillis()) {
    return `${formatTaskDate(start, isAllDay)} – ${formatTaskDate(due, isAllDay)}`;
  }

  return formatTaskDate(start ?? due!, isAllDay);
};

const isOpenTask = (task: TickTickTask) =>
  (task.status === undefined || task.status === 0) && task.deleted !== 1;

const compareClassifiedTasks = (
  left: ClassifiedTask,
  right: ClassifiedTask,
) => {
  if (left.group === 'today' && left.isAllDay !== right.isAllDay) {
    return left.isAllDay ? -1 : 1;
  }

  return left.sortAt.toMillis() - right.sortAt.toMillis();
};

@Injectable()
export class TasksService {
  constructor(private readonly ticktick: TickTickClientProvider) {}

  async quickAdd(
    text: string,
    opts?: { dryRun?: boolean },
  ): Promise<QuickAddResult> {
    const client = this.ticktick.get();
    const taskBody = await convertStringToTaskBody(text, client);

    if (!opts?.dryRun) {
      await client.addTasks([taskBody]);
    }

    return { taskBody };
  }

  async getTodayTasks(now = DateTime.now()): Promise<TodayTasksResult> {
    const client = this.ticktick.get();
    const [tasks, projects] = await Promise.all([
      client.fetchTasks(),
      client.fetchProjectsCached(),
    ]);
    const timeZone = getTimezone();
    const todayStart = now.setZone(timeZone).startOf('day');
    const todayEnd = todayStart.endOf('day');
    const projectNames = new Map(
      projects.map((project) => [project.id, project.name]),
    );
    const inboxId = client.getInboxId();
    const grouped: Record<TaskGroup, ClassifiedTask[]> = {
      overdue: [],
      today: [],
    };

    for (const task of tasks) {
      const classified = this.classifyTask(
        task,
        projectNames,
        inboxId,
        timeZone,
        todayStart,
        todayEnd,
      );

      if (classified) grouped[classified.group].push(classified);
    }

    return {
      date: todayStart.toISODate()!,
      timeZone,
      overdue: grouped.overdue
        .sort(compareClassifiedTasks)
        .map(({ item }) => item),
      today: grouped.today.sort(compareClassifiedTasks).map(({ item }) => item),
    };
  }

  async getNextWeekTasks(
    now = DateTime.now(),
  ): Promise<NextWeekTasksResult> {
    const client = this.ticktick.get();
    const [tasks, projects] = await Promise.all([
      client.fetchTasks(),
      client.fetchProjectsCached(),
    ]);
    const timeZone = getTimezone();
    const todayStart = now.setZone(timeZone).startOf('day');
    const nextWeekStart = todayStart.startOf('week').plus({ weeks: 1 });
    const nextWeekEnd = nextWeekStart.endOf('week');
    const projectNames = new Map(
      projects.map((project) => [project.id, project.name]),
    );
    const inboxId = client.getInboxId();
    const nextWeekTasks: ClassifiedTask[] = [];

    for (const task of tasks) {
      const classified = this.classifyNextWeekTask(
        task,
        projectNames,
        inboxId,
        timeZone,
        nextWeekStart,
        nextWeekEnd,
      );

      if (classified) nextWeekTasks.push(classified);
    }

    return {
      startDate: nextWeekStart.toISODate()!,
      endDate: nextWeekEnd.toISODate()!,
      timeZone,
      tasks: nextWeekTasks.sort(compareClassifiedTasks).map(({ item }) => item),
    };
  }

  private classifyTask(
    task: TickTickTask,
    projectNames: Map<string, string>,
    inboxId: string,
    timeZone: string,
    todayStart: DateTime,
    todayEnd: DateTime,
  ): ClassifiedTask | null {
    if (!isOpenTask(task)) return null;

    const start = parseTaskDate(task.startDate, timeZone);
    const due = parseTaskDate(task.dueDate, timeZone);
    const isRange = start && due;
    const scheduledAt = start ?? due;

    if (!scheduledAt) return null;

    let group: TaskGroup;
    let sortAt: DateTime;

    if (isRange && start && due) {
      if (start > todayEnd) return null;
      group = due < todayStart ? 'overdue' : 'today';
      sortAt = group === 'overdue' ? due : start;
    } else {
      if (scheduledAt > todayEnd) return null;
      group = scheduledAt < todayStart ? 'overdue' : 'today';
      sortAt = scheduledAt;
    }

    const project =
      task.projectId === inboxId
        ? 'Inbox'
        : (projectNames.get(task.projectId) ?? 'Unknown project');

    return {
      group,
      isAllDay: task.isAllDay,
      sortAt,
      item: {
        id: task.id,
        title: task.title.trim() || '(Untitled task)',
        project,
        when: formatTaskWhen(start, due, task.isAllDay),
      },
    };
  }

  private classifyNextWeekTask(
    task: TickTickTask,
    projectNames: Map<string, string>,
    inboxId: string,
    timeZone: string,
    nextWeekStart: DateTime,
    nextWeekEnd: DateTime,
  ): ClassifiedTask | null {
    if (!isOpenTask(task)) return null;

    const start = parseTaskDate(task.startDate, timeZone);
    const due = parseTaskDate(task.dueDate, timeZone);
    const scheduledAt = start ?? due;

    if (!scheduledAt) return null;

    if (start && due) {
      if (start > nextWeekEnd || due < nextWeekStart) return null;
    } else if (scheduledAt < nextWeekStart || scheduledAt > nextWeekEnd) {
      return null;
    }

    const project =
      task.projectId === inboxId
        ? 'Inbox'
        : (projectNames.get(task.projectId) ?? 'Unknown project');

    return {
      group: 'today',
      isAllDay: task.isAllDay,
      sortAt: start ?? due!,
      item: {
        id: task.id,
        title: task.title.trim() || '(Untitled task)',
        project,
        when: formatTaskWhen(start, due, task.isAllDay),
      },
    };
  }
}
