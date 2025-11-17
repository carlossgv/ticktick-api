#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import prompts from 'prompts';
import { TickTickClient } from '../core/ticktick.client';
import { convertStringToTaskBody } from '../core/text-parser';

type LoginAnswers = {
  email?: string;
  password?: string;
};

async function handleLogout(): Promise<void> {
  const client = new TickTickClient();
  await client.logout();
  console.log('Logged out successfully.');
}

async function handleLogin(): Promise<void> {
  const response = (await prompts([
    { type: 'text', name: 'email', message: 'Email:' },
    { type: 'password', name: 'password', message: 'Password:' },
  ])) as LoginAnswers;

  if (!response.email || !response.password) {
    console.log('Login cancelled.');
    return;
  }

  const client = new TickTickClient();
  await client.login(response.email, response.password);
  console.log('Login successful.');
}

async function handleQuickAdd(text: string): Promise<void> {
  const client = new TickTickClient();
  await client.init();

  try {
    const taskBody = await convertStringToTaskBody(text, client);
    await client.addTasks([taskBody]);
    console.log('Task added successfully');
  } catch (error) {
    console.error('Error parsing or adding task:', error);
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  const argv = await yargs(hideBin(process.argv))
    .scriptName('ticktick')
    .usage('$0 ["task to add"]')
    .option('login', {
      alias: 'l',
      type: 'boolean',
      describe: 'Log into your TickTick account via email/password',
    })
    .option('logout', {
      type: 'boolean',
      describe: 'Log out and remove session cookies',
    })
    .help()
    .parseAsync();

  // 1) logout tiene prioridad si viene mezclado (por si acaso)
  if (argv.logout) {
    await handleLogout();
    return;
  }

  // 2) login
  if (argv.login) {
    await handleLogin();
    return;
  }

  // 3) quick add con argumento posicional
  const [taskText] = argv._;
  if (typeof taskText === 'string' && taskText.trim().length > 0) {
    await handleQuickAdd(taskText);
    return;
  }

  // 4) nada que hacer
  console.log('Nothing to do. Use --help for usage.');
}

// Evita "promises must be awaited" pero igual lo lanzamos como CLI
void main();
