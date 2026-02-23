# @js-toolkit/web-utils

[![npm package](https://img.shields.io/npm/v/@js-toolkit/web-utils.svg?style=flat-square)](https://www.npmjs.org/package/@js-toolkit/web-utils)
[![license](https://img.shields.io/npm/l/@js-toolkit/web-utils.svg?style=flat-square)](https://www.npmjs.org/package/@js-toolkit/web-utils)

TypeScript utilities for the browser: media, WebSocket, WebRTC, fullscreen, platform detection, responsive helpers, events, DOM, service workers, and more.

## Install

```bash
yarn add @js-toolkit/web-utils
# or
npm install @js-toolkit/web-utils
```

## Import

Use subpath imports for tree-shaking:

```typescript
import { FullscreenController } from '@js-toolkit/web-utils/FullscreenController';
import { getRandomID } from '@js-toolkit/web-utils/getRandomID';
import { isMobile } from '@js-toolkit/web-utils/platform/isMobile';
```

## API Overview

### Media and Video

| Module | Description |
|--------|-------------|
| `media/TextTracksController` | HTML5 video text tracks management |
| `media/PipController` | Picture-in-Picture controller |
| `media/MediaStreamController` | MediaStream attach/detach |
| `media/Capabilities` | Media type support detection |
| `media/timeRanges` | TimeRanges utilities |
| `media/resetMedia` | Reset media element and clear decoder buffer |
| `media/getMediaSource` | Get MediaSource or ManagedMediaSource |
| `media/getSourceBuffer` | Get SourceBuffer or ManagedSourceBuffer |
| `media/parseCueText` | WebVTT cue text parser |

### WebSocket and WebRTC

| Module | Description |
|--------|-------------|
| `ws/WSController` | WebSocket controller with auto-reconnect |
| `webrtc/PeerConnection` | RTCPeerConnection wrapper |
| `webrtc/sdputils` | SDP manipulation utilities |

### Fullscreen

| Module | Description |
|--------|-------------|
| `FullscreenController` | Fullscreen API controller with fallback |
| `fullscreen` | Cross-browser fullscreen utilities |
| `fullscreenUtils` | Pseudo-fullscreen helpers |

### Platform Detection

| Module | Description |
|--------|-------------|
| `platform/getPlatformInfo` | Browser/platform detection (ua-parser-js) |
| `platform/isSafari`, `isChrome` | Browser detection |
| `platform/isIOS`, `isAndroid`, `isMacOS` | OS detection |
| `platform/isMobile` | Mobile device detection |
| `platform/isTouchSupported` | Touch support detection |
| `platform/isMSESupported` | Media Source Extensions support |
| `platform/isEMESupported` | Encrypted Media Extensions support |
| `platform/isAirPlayAvailable` | AirPlay availability |
| `platform/Semver` | Semantic version parser |

### Responsive

| Module | Description |
|--------|-------------|
| `responsive/MediaQueryListener` | Media query change listener |
| `responsive/MediaQuery` | Static media query utilities |
| `responsive/ViewSize` | Viewport size enum and helpers |

### Events

| Module | Description |
|--------|-------------|
| `EventEmitterListener` | Unified listener for DOM/EventEmitter/EventTarget |
| `EventListeners` | Multi-target event listener manager |
| `getEventAwaiter` | Promise-based event waiting |

### DOM

| Module | Description |
|--------|-------------|
| `onDOMReady` | Execute callback when DOM is ready |
| `onPageReady` | Execute callback when page is loaded |
| `getInnerRect` | Element inner dimensions |
| `toLocalPoint` | Convert coordinates to local element space |
| `loadScript` | Dynamic script loading with deduplication |
| `copyToClipboard` | Copy text to clipboard |

### Files and Blobs

| Module | Description |
|--------|-------------|
| `saveFileAs` | Trigger file download |
| `loadImage` | Load image with caching |
| `blobToDataUrl`, `dataUrlToBlob` | Blob/DataURL conversions |
| `toBase64`, `fromBase64` | Unicode-safe base64 encoding |
| `takeScreenshot` | Capture screenshot from CanvasImageSource |

### Animation

| Module | Description |
|--------|-------------|
| `createLoop` | Interval-based loop with RAF throttling |
| `createRafLoop` | RequestAnimationFrame loop |

### Metrics

| Module | Description |
|--------|-------------|
| `metrics/ga/*` | Google Analytics helpers |
| `metrics/yandex/*` | Yandex Metrica helpers |

### Other

| Module | Description |
|--------|-------------|
| `getRandomID` | Random ID via crypto API |
| `getBrowserLanguage` | Browser language detection |
| `WakeLockController` | Screen wake lock |
| `serviceWorker/ServiceWorkerInstaller` | Service worker registration |
| `iframe/*` | Iframe parent-child communication |
| `viewableTracker` | Element visibility tracking |

## Usage Examples

### FullscreenController

```typescript
import { FullscreenController } from '@js-toolkit/web-utils/FullscreenController';

const controller = new FullscreenController(document.getElementById('player')!);
await controller.requestFullscreen();
console.log(controller.isFullscreen);
```

### Platform detection

```typescript
import { isMobile } from '@js-toolkit/web-utils/platform/isMobile';
import { isSafari } from '@js-toolkit/web-utils/platform/isSafari';

if (isMobile()) {
  // mobile-specific logic
}
if (isSafari()) {
  // Safari workaround
}
```

### Event awaiter

```typescript
import { getEventAwaiter } from '@js-toolkit/web-utils/getEventAwaiter';

const video = document.querySelector('video')!;
await getEventAwaiter(video, 'canplay').wait();
video.play();
```

### Dynamic script loading

```typescript
import { loadScript } from '@js-toolkit/web-utils/loadScript';

await loadScript('https://cdn.example.com/sdk.js');
```

## Repository

[https://github.com/js-toolkit/web-utils](https://github.com/js-toolkit/web-utils)
