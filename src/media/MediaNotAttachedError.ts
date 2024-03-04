import { ErrorCompat } from '@js-toolkit/utils/ErrorCompat';

export class MediaNotAttachedError extends ErrorCompat {
  constructor(
    message = 'Media element is not attached yet.',
    options: ErrorOptions | undefined = undefined
  ) {
    super(MediaNotAttachedError, message, { ...options, name: 'MediaNotAttachedError ' });
  }
}
