/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable max-classes-per-file */
/* eslint-disable @typescript-eslint/no-namespace */

import { EventEmitter } from '@js-toolkit/utils/EventEmitter';
import { ErrorCompat } from '@js-toolkit/utils/ErrorCompat';
import { onPageReady } from '../onPageReady';
import { isLocalhost } from './utils';

/*
 * https://web.dev/articles/service-workers-registration?hl=ru
 */

export class ServiceWorkerUnavailableError extends ErrorCompat {
  constructor() {
    super(ServiceWorkerUnavailableError, 'ServiceWorker is not available', {
      name: 'ServiceWorkerUnavailableError',
    });
  }
}

export class ServiceWorkerInstaller
  extends EventEmitter<
    {
      registered: [{ registration: ServiceWorkerRegistration }];
      unregistered: [{ registration: ServiceWorkerRegistration }];
      updatePending: [{ registration: ServiceWorkerRegistration }];
      updated: [{ registration: ServiceWorkerRegistration }];
      error: [{ error: unknown }];
    },
    ServiceWorkerInstaller
  >
  implements Disposable
{
  static isAvailable(): boolean {
    return 'serviceWorker' in navigator;
  }

  // private readonly logPrefix = 'SW:';
  // private readonly options;
  private registration: ServiceWorkerRegistration | undefined;
  private cancelDefferedRegister: VoidFunction | undefined;

  constructor(/* options: ServiceWorkerInstaller.Options */) {
    super();
    // this.options = { ...options, logger: options.logger ?? console };
  }

  register(swUrl: string | URL, options?: ServiceWorkerInstaller.RegistrationOptions): void {
    if (!ServiceWorkerInstaller.isAvailable()) {
      throw new ServiceWorkerUnavailableError();
    }

    const { deffered, ...swOptions } = options ?? {};

    const register = async (): Promise<void> => {
      try {
        if (isLocalhost()) {
          // This is running on localhost. Let's check if a service worker still exists or not.
          const response = await fetch(swUrl);
          if (!response.ok) {
            throw new Error(`No service worker found at '${response.url}'.`, {
              cause: `Response: ${response.status} ${response.statusText}`,
            });
          }
        }

        const registration = await navigator.serviceWorker.register(swUrl, swOptions);
        this.registration = registration;
        this.emit('registered', { registration });

        // https://whatwebcando.today/articles/handling-service-worker-updates/
        registration.onupdatefound = () => {
          // At this point we only know the browser detected the Service Worker file change.
          //
          // Wait until the new instance is ready for activation (its state is installed).
          const sw = registration.installing;
          if (sw == null) {
            return;
          }
          sw.onstatechange = () => {
            if (sw.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // At this point, the updated precached content has been fetched,
                // but the previous service worker will still serve the older content (until all client tabs are closed).
                this.emit('updatePending', { registration });
              } else {
                // It's the first install.
                // At this point, everything has been precached.
                // It's the perfect time to display a "Content is cached for offline use." message.
                this.emit('updated', { registration });
              }
            }
          };
          sw.onerror = (error) => {
            // this.options.logger.error(this.logPrefix, 'Installing worker:', error);
            const nextError = new Error('Error during service worker installation', {
              cause: error,
            });
            this.emit('error', { error: nextError });
          };
        };
      } catch (error) {
        const nextError = new Error('Error during service worker registration', { cause: error });
        // this.options.logger.error(this.logPrefix, getErrorMessage(nextError));
        this.emit('error', { error: nextError });
      }
    };

    if (deffered) {
      this.cancelDefferedRegister = onPageReady(
        register,
        typeof deffered === 'number' ? { timeout: deffered } : undefined
      );
    } else {
      void register();
    }
  }

  unregister(): void {
    if (this.cancelDefferedRegister) this.cancelDefferedRegister();
    this.registration?.unregister().catch((error: unknown) => {
      const nextError = new Error('Error during service worker unregister', { cause: error });
      // this.options.logger.error(this.logPrefix, getErrorMessage(nextError));
      this.emit('error', { error: nextError });
    });
  }

  destroy(): void {
    if (this.cancelDefferedRegister) this.cancelDefferedRegister();
    this.removeAllListeners();
  }

  [Symbol.dispose](): void {
    this.destroy();
  }
}

export namespace ServiceWorkerInstaller {
  // export interface Options {
  //   readonly logger?: Pick<Console, 'info' | 'error'> | undefined;
  // }

  export interface RegistrationOptions extends globalThis.RegistrationOptions {
    /** Wait for page ready. */
    readonly deffered?: boolean | number;
  }
}
