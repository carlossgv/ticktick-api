#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import prompts from 'prompts';
import axios from 'axios';
import { TicktickApp } from 'src/core/ticktick.app';

type LoginAnswers = {
  email?: string;
  password?: string;
};

const app = new TicktickApp();

const API_URL = process.env.TICKTICK_API_URL;

async function handleLogout(): Promise<void> {
  if (API_URL) {
    console.log(
      'logout via CLI no está soportado cuando usas API remoto. ' +
        'Configura las credenciales directamente en el servidor.',
    );
    return;
  }

  await app.logout();
  console.log('Logged out successfully.');
}

async function handleLogin(): Promise<void> {
  if (API_URL) {
    console.log(
      'login via CLI no está soportado cuando usas API remoto. ' +
        'Configura las credenciales directamente en el servidor.',
    );
    return;
  }

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
  const API_URL = process.env.TICKTICK_API_URL;
  const API_KEY = process.env.TICKTICK_API_KEY;

  // MODO API REMOTO
  if (API_URL) {
    try {
      await axios.post(
        `${API_URL}/tasks/quick-add`,
        { text },
        {
          headers: API_KEY ? { 'x-api-key': API_KEY } : {},
        },
      );
      console.log('Task added successfully (via API)');
    } catch (error: any) {
      console.error(
        'Error calling remote API:',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error?.response?.data ?? error?.message ?? error,
      );
      process.exitCode = 1;
    }
    return;
  }

  // MODO LOCAL (usa TicktickApp como ya lo tenías)
  try {
    await app.quickAdd(text);
    console.log('Task added successfully (local)');
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
      describe:
        'Log into your TickTick account via email/password (local mode)',
    })
    .option('logout', {
      type: 'boolean',
      describe: 'Log out and remove session cookies (local mode)',
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
