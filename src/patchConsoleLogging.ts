type Methods = Pick<Console, 'debug' | 'error' | 'info' | 'log' | 'trace' | 'warn'>;

const methods: Methods = {
  debug: console.debug.bind(console),
  error: console.error.bind(console),
  info: console.info.bind(console),
  log: console.log.bind(console),
  trace: console.trace.bind(console),
  warn: console.warn.bind(console),
};

interface PatchConsoleLoggingOptions {
  /** Defaults to 'replace'. */
  readonly mode?: 'replace' | 'prepend' | 'append';
}

type CustomMethod = (level: keyof Methods, ...data: unknown[]) => void;

export function restoreConsoleLogging(): void {
  Object.entries(methods).forEach(([name, fn]) => {
    console[name as keyof Methods] = fn;
  });
}

export function patchConsoleLogging(
  customMethod: CustomMethod,
  { mode = 'replace' }: PatchConsoleLoggingOptions = {}
): void {
  restoreConsoleLogging();
  Object.getOwnPropertyNames(methods).forEach((key) => {
    const name = key as keyof Methods;
    console[name] = (...args) => {
      if (mode === 'append') methods[name](...args);
      customMethod(name, ...args);
      if (mode === 'prepend') methods[name](...args);
    };
  });
}
