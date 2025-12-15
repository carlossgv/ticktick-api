import { Injectable } from '@nestjs/common';
import { TickTickClientProvider } from 'src/core/ticktick.provider';
import { convertStringToTaskBody } from 'src/core/text-parser';
import type { UpdateTaskParams } from 'src/core/types/ticktick.types';

type QuickAddResult = { taskBody: UpdateTaskParams };

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
}
