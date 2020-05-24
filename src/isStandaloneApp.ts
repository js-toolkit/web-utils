// https://stackoverflow.com/questions/21125337/how-to-detect-if-web-app-running-standalone-on-chrome-mobile
export default function isStandaloneApp(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches;
}
