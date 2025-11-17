#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import prompts from 'prompts';
import { TicktickApp } from 'src/core/ticktick.app';

type LoginAnswers = {
  email?: string;
  password?: string;
};

const app = new TicktickApp();

async function handleLogout(): Promise<void> {
  await app.logout();
  console.log('Logged out successfully.');
}

async function handleLogin(): Promise<void> {
  // prompts devuelve any; aceptamos el cast controlado
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const response = (await prompts([
    { type: 'text', name: 'email', message: 'Email:' },
    { type: 'password', name: 'password', message: 'Password:' },
  ])) as LoginAnswers;

  if (!response.email || !response.password) {
    console.log('Login cancelled.');
    return;
  }

  await app.login(response.email, response.password);
  console.log('Login successful.');
}

async function handleQuickAdd(text: string): Promise<void> {
  try {
    await app.quickAdd(text);
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

  if (argv.logout) {
    await handleLogout();
    return;
  }

  if (argv.login) {
    await handleLogin();
    return;
  }

  const [taskText] = argv._;
  if (typeof taskText === 'string' && taskText.trim().length > 0) {
    await handleQuickAdd(taskText);
    return;
  }

  console.log('Nothing to do. Use --help for usage.');
}

void main();
