declare global {
  interface Navigator {
    userLanguage: string;
  }
}

/**
 * @param includeRegion subtag separated by `-`.
 */
export function getBrowserLanguage(includeRegion = false): string {
  const language =
    navigator.languages && navigator.languages.length > 0
      ? navigator.languages[0]
      : navigator.language || navigator.userLanguage;
  return includeRegion ? language : language.split('-')[0];
}
