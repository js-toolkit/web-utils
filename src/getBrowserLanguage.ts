declare global {
  interface Navigator {
    userLanguage: string;
  }
}

export function getBrowserLanguage(): string | undefined {
  if (typeof window !== 'undefined' && 'navigator' in window) {
    const language =
      navigator.languages && navigator.languages.length > 0
        ? navigator.languages[0]
        : navigator.language || navigator.userLanguage;
    return language.split('-')[0];
  }
  return undefined;
}

export default getBrowserLanguage;
