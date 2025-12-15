import { Injectable } from '@nestjs/common';
import { TickTickClient } from 'src/core/ticktick.client';
import { convertStringToTaskBody } from 'src/core/text-parser';

@Injectable()
export class TasksService {
  async quickAdd(text: string): Promise<void> {
    const client = new TickTickClient();
    await client.init(); // lo que ya haces en el CLI

    const taskBody = await convertStringToTaskBody(text, client);
    console.debug('Task body created:', taskBody);
    await client.addTasks([taskBody]);
  }
}
