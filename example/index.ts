import { serve } from '@hono/node-server';
import { Hono } from 'hono';

import { timing } from '../dist/timing';

const app = new Hono();
app.use('*', timing());
app.get('/', (c) => c.text('Hello Hono!'));

serve(app);
