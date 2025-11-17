#!/usr/bin/env node
import meow from 'meow';
import prompts from 'prompts';
import { TickTickClient } from '../core/ticktick.client';
import { convertStringToTaskBody } from '../core/text-parser';

const cli = meow(
  `
  Usage
    $ ticktick ["task to add"]
    $ ticktick --login
    $ ticktick --logout

  Options
    --login, -l     Log into your TickTick account via email/password
    --logout        Log out and remove session cookies

  Examples
    $ ticktick "Buy milk #groceries"
    $ ticktick --login
    $ ticktick --logout
`,
  {
    importMeta: import.meta,
    flags: {
      login: {
        type: 'boolean',
        alias: 'l',
      },
      logout: {
        type: 'boolean',
      },
    },
  },
);

async function quickAddTask(text: string) {
  const client = new TickTickClient();
  await client.init();
  let taskBody;
  try {
    taskBody = await convertStringToTaskBody(text, client);
  } catch (error) {
    console.error('Error parsing task:', error);
    return;
  }
  await client.addTasks([taskBody]);
  console.log('Task added successfully');
}

(async () => {
  if (cli.flags.logout) {
    const client = new TickTickClient();
    await client.logout();
    console.log('Logged out successfully.');
    return;
  }

  if (cli.flags.login) {
    try {
      
    response = await prompts([
      { type: 'text', name: 'email', message: 'Email:' },
      { type: 'password', name: 'password', message: 'Password:' },
    ]);
    } catch (error) {
      
    }

    const client = new TickTickClient();
    await client.login(response.email, response.password);
    console.log('Login successful.');
    return;
  }

  if (cli.input.length > 0) {
    const quickAddText = cli.input.join(' ');
    await quickAddTask(quickAddText);
    return;
  }

  console.log('Nothing to do. Use --help for usage.');
})();
