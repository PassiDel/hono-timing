import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { endTime, setMetric, startTime, timing } from '@puazzi/hono-timing';

const app = new Hono();

app.use(
  '*',
  timing({
    enabled: (c) => c.req.method === 'GET'
  })
);

app.get('/', async (c) => {
  // add custom metrics
  setMetric(c, 'region', 'europe-west3');

  // add custom metrics with timing, must be in milliseconds
  setMetric(c, 'custom', 23.8, 'My custom Metric');

  // start a new timer
  startTime(c, 'db');

  await new Promise((r) => setTimeout(r, 187));
  // end the timer
  endTime(c, 'db');

  return c.json({ response: '' });
});

serve(app);
