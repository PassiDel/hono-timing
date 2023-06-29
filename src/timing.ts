import type { Context, MiddlewareHandler } from 'hono';

declare module 'hono' {
  interface ContextVariableMap {
    metric?: {
      headers: string[];
      timers: Map<string, Timer>;
    };
  }
}

interface Timer {
  description?: string;
  start: ReturnType<typeof process.hrtime>;
}

interface Config {
  total: boolean;
  enabled: boolean | ((c: Context) => boolean);
  totalDescription: string;
  autoEnd: boolean;
}

export const timing = (config?: Partial<Config>): MiddlewareHandler => {
  const options = {
    ...{
      total: true,
      enabled: true,
      totalDescription: 'Total Response Time',
      autoEnd: true
    },
    ...config
  };
  return async (c, next) => {
    const headers: string[] = [];
    const timers = new Map<string, Timer>();
    c.set('metric', { headers, timers });

    if (options.total) {
      startTime(c, 'total', options.totalDescription);
    }
    await next();

    if (options.total) {
      endTime(c, 'total');
    }

    if (options.autoEnd) {
      timers.forEach((_, key) => endTime(c, key));
    }

    const enabled =
      typeof options.enabled === 'function'
        ? options.enabled(c)
        : options.enabled;

    if (enabled) {
      c.res.headers.append('Server-Timing', headers.join(','));
    }
  };
};

interface SetMetric {
  (
    c: Context,
    name: string,
    value: number,
    description?: string,
    precision?: number
  ): void;

  (c: Context, name: string, description?: string): void;
}

export const setMetric: SetMetric = (
  c: Context,
  name: string,
  valueDescription: number | string | undefined,
  description?: string,
  precision?: number
) => {
  const metrics = c.get('metric');
  if (!metrics) {
    console.warn(
      'Metrics not initialized! Please add the `timing()` middleware to this route!'
    );
    return;
  }
  if (typeof valueDescription === 'number') {
    const dur = valueDescription.toFixed(precision || 1);

    const metric = description
      ? `${name};dur=${dur};desc="${description}"`
      : `${name};dur=${dur}`;

    metrics.headers.push(metric);
  } else {
    // Value-less metric
    const metric = valueDescription
      ? `${name};desc="${valueDescription}"`
      : `${name}`;

    metrics.headers.push(metric);
  }
};

export const startTime = (c: Context, name: string, description?: string) => {
  const metrics = c.get('metric');
  if (!metrics) {
    console.warn(
      'Metrics not initialized! Please add the `timing()` middleware to this route!'
    );
    return;
  }
  metrics.timers.set(name, { description, start: process.hrtime() });
};

export const endTime = (c: Context, name: string, precision?: number) => {
  const metrics = c.get('metric');
  if (!metrics) {
    console.warn(
      'Metrics not initialized! Please add the `timing()` middleware to this route!'
    );
    return;
  }
  if (!metrics.timers.has(name)) {
    console.warn(`Timer "${name}" does not exist!`);
    return;
  }
  const { description, start } = metrics.timers.get(name)!!;

  const duration = process.hrtime(start);
  const value = duration[0] * 1e3 + duration[1] * 1e-6;

  setMetric(c, name, value, description, precision);
  metrics.timers.delete(name);
};
