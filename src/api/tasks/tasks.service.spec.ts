import { DateTime } from 'luxon';

jest.mock('src/core/ticktick.provider', () => ({
  TickTickClientProvider: class TickTickClientProvider {},
}));
jest.mock('src/core/text-parser', () => ({
  convertStringToTaskBody: jest.fn(),
}));

import { TasksService } from './tasks.service';
import type {
  TickTickProject,
  TickTickTask,
} from 'src/core/types/ticktick.types';

const project: TickTickProject = { id: 'work', name: 'Work' };

const validDateTime = (value: string) => {
  const date = DateTime.fromISO(value);

  if (!date.isValid) {
    throw new Error(`Invalid test date: ${value}`);
  }

  return date;
};

const task = (
  id: string,
  overrides: Partial<TickTickTask> = {},
): TickTickTask => ({
  id,
  projectId: 'work',
  sortOrder: 0,
  title: id,
  content: '',
  timeZone: 'America/Santiago',
  reminders: [],
  tags: [],
  createdTime: '2026-07-01T00:00:00.000+0000',
  creator: 1,
  isAllDay: true,
  status: 0,
  ...overrides,
});

describe('TasksService.getTodayTasks', () => {
  const originalTimezone = process.env.TZ;

  beforeEach(() => {
    process.env.TZ = 'America/Santiago';
  });

  afterAll(() => {
    if (originalTimezone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTimezone;
    }
  });

  it('groups active scheduled tasks into overdue and today', async () => {
    const tasks = [
      task('overdue', { startDate: '2026-07-18T04:00:00.000+0000' }),
      task('today-all-day', { startDate: '2026-07-20T04:00:00.000+0000' }),
      task('today-timed', {
        startDate: '2026-07-20T13:00:00.000+0000',
        isAllDay: false,
      }),
      task('active-range', {
        startDate: '2026-07-19T04:00:00.000+0000',
        dueDate: '2026-07-21T04:00:00.000+0000',
      }),
      task('expired-range', {
        startDate: '2026-07-17T04:00:00.000+0000',
        dueDate: '2026-07-19T04:00:00.000+0000',
      }),
      task('future', { startDate: '2026-07-21T04:00:00.000+0000' }),
      task('completed', {
        startDate: '2026-07-20T04:00:00.000+0000',
        status: 2,
      }),
      task('undated'),
      task('inbox', {
        projectId: 'inbox',
        startDate: '2026-07-20T04:00:00.000+0000',
      }),
    ];
    const client = {
      fetchTasks: jest.fn().mockResolvedValue(tasks),
      fetchProjectsCached: jest.fn().mockResolvedValue([project]),
      getInboxId: jest.fn().mockReturnValue('inbox'),
    };
    const service = new TasksService({
      get: () => client,
    } as never);

    const result = await service.getTodayTasks(
      validDateTime('2026-07-20T12:00:00.000+0000'),
    );

    expect(result).toEqual({
      date: '2026-07-20',
      timeZone: 'America/Santiago',
      overdue: [
        {
          id: 'overdue',
          title: 'overdue',
          project: 'Work',
          when: '2026-07-18',
        },
        {
          id: 'expired-range',
          title: 'expired-range',
          project: 'Work',
          when: '2026-07-17 – 2026-07-19',
        },
      ],
      today: [
        {
          id: 'active-range',
          title: 'active-range',
          project: 'Work',
          when: '2026-07-19 – 2026-07-21',
        },
        {
          id: 'today-all-day',
          title: 'today-all-day',
          project: 'Work',
          when: '2026-07-20',
        },
        {
          id: 'inbox',
          title: 'inbox',
          project: 'Inbox',
          when: '2026-07-20',
        },
        {
          id: 'today-timed',
          title: 'today-timed',
          project: 'Work',
          when: '2026-07-20 09:00',
        },
      ],
    });
  });

  it('classifies times by the configured timezone and falls back to due dates', async () => {
    const client = {
      fetchTasks: jest.fn().mockResolvedValue([
        task('previous-local-day', {
          startDate: '2026-07-20T01:30:00.000+0000',
          isAllDay: false,
        }),
        task('due-today', {
          startDate: undefined,
          dueDate: '2026-07-20T15:00:00.000+0000',
          isAllDay: false,
        }),
      ]),
      fetchProjectsCached: jest.fn().mockResolvedValue([project]),
      getInboxId: jest.fn().mockReturnValue('inbox'),
    };
    const service = new TasksService({
      get: () => client,
    } as never);

    const result = await service.getTodayTasks(
      validDateTime('2026-07-20T12:00:00.000+0000'),
    );

    expect(result.overdue).toEqual([
      {
        id: 'previous-local-day',
        title: 'previous-local-day',
        project: 'Work',
        when: '2026-07-19 21:30',
      },
    ]);
    expect(result.today).toEqual([
      {
        id: 'due-today',
        title: 'due-today',
        project: 'Work',
        when: '2026-07-20 11:00',
      },
    ]);
  });
});
