/* eslint-disable no-prototype-builtins, no-plusplus, prefer-destructuring, no-param-reassign */

export interface PreferCodecs {
  videoRecvCodec?: string;
  videoSendCodec?: string;
  audioRecvCodec?: string;
  audioSendCodec?: string;

  opusStereo?: string;
  opusFec?: string;
  opusDtx?: string;
  opusMaxPbr?: string;

  videoSendInitialBitrate?: string;
  videoSendBitrate?: string;
  videoRecvBitrate?: string;
  audioSendBitrate?: string;
  audioRecvBitrate?: string;

  videoFec?: string;
}

interface FmtpObj {
  pt?: string;
  params?: Record<string, string>;
}

// This export function is used for logging.
export function trace(text: string): void {
  if (text.endsWith('\n')) {
    text = text.substring(0, text.length - 1);
  }
  if (window.performance) {
    const now = (window.performance.now() / 1000).toFixed(3);
    console.log(`${now}: ${text}`);
  } else {
    console.log(text);
  }
}

function iceCandidateType(candidateStr: string): string {
  return candidateStr.split(' ')[7];
}

export function isValidIceCandidate(
  { candidate }: RTCIceCandidate,
  config?: RTCConfiguration
): boolean {
  // const candidateStr = candidateObj.candidate;
  // Always eat TCP candidates. Not needed in this context.
  if (!candidate || candidate.includes('tcp')) {
    return false;
  }
  // If we're trying to eat non-relay candidates, do that.
  if (config && config.iceTransportPolicy === 'relay' && iceCandidateType(candidate) !== 'relay') {
    return false;
  }
  return true;
}

function maybeSetOpusOptions(sdp: string, params: PreferCodecs): string {
  // Set Opus in Stereo, if stereo is true, unset it, if stereo is false, and
  // do nothing if otherwise.
  if (params.opusStereo === 'true') {
    sdp = setCodecParam(sdp, 'opus/48000', 'stereo', '1');
  } else if (params.opusStereo === 'false') {
    sdp = removeCodecParam(sdp, 'opus/48000', 'stereo');
  }

  // Set Opus FEC, if opusfec is true, unset it, if opusfec is false, and
  // do nothing if otherwise.
  if (params.opusFec === 'true') {
    sdp = setCodecParam(sdp, 'opus/48000', 'useinbandfec', '1');
  } else if (params.opusFec === 'false') {
    sdp = removeCodecParam(sdp, 'opus/48000', 'useinbandfec');
  }

  // Set Opus DTX, if opusdtx is true, unset it, if opusdtx is false, and
  // do nothing if otherwise.
  if (params.opusDtx === 'true') {
    sdp = setCodecParam(sdp, 'opus/48000', 'usedtx', '1');
  } else if (params.opusDtx === 'false') {
    sdp = removeCodecParam(sdp, 'opus/48000', 'usedtx');
  }

  // Set Opus maxplaybackrate, if requested.
  if (params.opusMaxPbr) {
    sdp = setCodecParam(sdp, 'opus/48000', 'maxplaybackrate', params.opusMaxPbr);
  }
  return sdp;
}

function maybeSetAudioSendBitRate(sdp: string, params: PreferCodecs): string {
  if (!params.audioSendBitrate) {
    return sdp;
  }
  trace(`Prefer audio send bitrate: ${params.audioSendBitrate}`);
  return preferBitRate(sdp, params.audioSendBitrate, 'audio');
}

function maybeSetAudioReceiveBitRate(sdp: string, params: PreferCodecs): string {
  if (!params.audioRecvBitrate) {
    return sdp;
  }
  trace(`Prefer audio receive bitrate: ${params.audioRecvBitrate}`);
  return preferBitRate(sdp, params.audioRecvBitrate, 'audio');
}

function maybeSetVideoSendBitRate(sdp: string, params: PreferCodecs): string {
  if (!params.videoSendBitrate) {
    return sdp;
  }
  trace(`Prefer video send bitrate: ${params.videoSendBitrate}`);
  return preferBitRate(sdp, params.videoSendBitrate, 'video');
}

function maybeSetVideoReceiveBitRate(sdp: string, params: PreferCodecs): string {
  if (!params.videoRecvBitrate) {
    return sdp;
  }
  trace(`Prefer video receive bitrate: ${params.videoRecvBitrate}`);
  return preferBitRate(sdp, params.videoRecvBitrate, 'video');
}

// Add a b=AS:bitrate line to the m=mediaType section.
function preferBitRate(sdp: string, bitrate: string, mediaType: string): string {
  const sdpLines = sdp.split('\r\n');

  // Find m line for the given mediaType.
  const mLineIndex = findLine(sdpLines, 'm=', mediaType);
  if (mLineIndex === -1) {
    trace('Failed to add bandwidth line to sdp, as no m-line found');
    return sdp;
  }

  // Find next m-line if any.
  let nextMLineIndex = findLineInRange(sdpLines, mLineIndex + 1, -1, 'm=');
  if (nextMLineIndex === -1) {
    nextMLineIndex = sdpLines.length;
  }

  // Find c-line corresponding to the m-line.
  const cLineIndex = findLineInRange(sdpLines, mLineIndex + 1, nextMLineIndex, 'c=');
  if (cLineIndex === -1) {
    trace('Failed to add bandwidth line to sdp, as no c-line found');
    return sdp;
  }

  // Check if bandwidth line already exists between c-line and next m-line.
  const bLineIndex = findLineInRange(sdpLines, cLineIndex + 1, nextMLineIndex, 'b=AS');
  if (bLineIndex >= 0) {
    sdpLines.splice(bLineIndex, 1);
  }

  // Create the b (bandwidth) sdp line.
  const bwLine = `b=AS:${bitrate}`;
  // As per RFC 4566, the b line should follow after c-line.
  sdpLines.splice(cLineIndex + 1, 0, bwLine);
  sdp = sdpLines.join('\r\n');
  return sdp;
}

// Add an a=fmtp: x-google-min-bitrate=kbps line, if videoSendInitialBitrate
// is specified. We'll also add a x-google-min-bitrate value, since the max
// must be >= the min.
function maybeSetVideoSendInitialBitRate(sdp: string, params: PreferCodecs): string {
  let initialBitrate = params.videoSendInitialBitrate;
  if (!initialBitrate) {
    return sdp;
  }

  // Validate the initial bitrate value.
  let maxBitrate = initialBitrate;
  const bitrate = params.videoSendBitrate;
  if (bitrate) {
    if (initialBitrate > bitrate) {
      trace(`Clamping initial bitrate to max bitrate of ${bitrate} kbps.`);
      initialBitrate = bitrate;
      params.videoSendInitialBitrate = initialBitrate;
    }
    maxBitrate = bitrate;
  }

  const sdpLines = sdp.split('\r\n');

  // Search for m line.
  const mLineIndex = findLine(sdpLines, 'm=', 'video');
  if (mLineIndex === -1) {
    trace('Failed to find video m-line');
    return sdp;
  }

  const codec = params.videoRecvCodec || '';
  sdp = setCodecParam(sdp, codec, 'x-google-min-bitrate', params.videoSendInitialBitrate || '');
  sdp = setCodecParam(sdp, codec, 'x-google-max-bitrate', maxBitrate.toString());

  return sdp;
}

function removePayloadTypeFromMline(mLine: string, payloadType: string): string {
  const lines = mLine.split(' ');
  for (let i = 0; i < lines.length; ++i) {
    if (lines[i] === payloadType.toString()) {
      lines.splice(i, 1);
    }
  }
  return lines.join(' ');
}

function removeCodecByName(sdpLines: string[], codec: string): string[] {
  const index = findLine(sdpLines, 'a=rtpmap', codec);
  if (index === -1) {
    return sdpLines;
  }
  const payloadType = getCodecPayloadTypeFromLine(sdpLines[index]);
  sdpLines.splice(index, 1);

  // Search for the video m= line and remove the codec.
  const mLineIndex = findLine(sdpLines, 'm=', 'video');
  if (mLineIndex === -1) {
    return sdpLines;
  }
  sdpLines[mLineIndex] = removePayloadTypeFromMline(sdpLines[mLineIndex], payloadType);
  return sdpLines;
}

function removeCodecByPayloadType(sdpLines: string[], payloadType: string): string[] {
  const index = findLine(sdpLines, 'a=rtpmap', payloadType.toString());
  if (index === -1) {
    return sdpLines;
  }
  sdpLines.splice(index, 1);

  // Search for the video m= line and remove the codec.
  const mLineIndex = findLine(sdpLines, 'm=', 'video');
  if (mLineIndex === -1) {
    return sdpLines;
  }
  sdpLines[mLineIndex] = removePayloadTypeFromMline(sdpLines[mLineIndex], payloadType);
  return sdpLines;
}

function maybeRemoveVideoFec(sdp: string, params: PreferCodecs): string {
  if (params.videoFec !== 'false') {
    return sdp;
  }

  let sdpLines = sdp.split('\r\n');

  let index = findLine(sdpLines, 'a=rtpmap', 'red');
  if (index === -1) {
    return sdp;
  }
  const redPayloadType = getCodecPayloadTypeFromLine(sdpLines[index]);
  sdpLines = removeCodecByPayloadType(sdpLines, redPayloadType);

  sdpLines = removeCodecByName(sdpLines, 'ulpfec');

  // Remove fmtp lines associated with red codec.
  index = findLine(sdpLines, 'a=fmtp', redPayloadType.toString());
  if (index === -1) {
    return sdp;
  }
  const fmtpLine = parseFmtpLine(sdpLines[index]);
  const rtxPayloadType = fmtpLine.pt;
  if (rtxPayloadType == null) {
    return sdp;
  }
  sdpLines.splice(index, 1);

  sdpLines = removeCodecByPayloadType(sdpLines, rtxPayloadType);
  return sdpLines.join('\r\n');
}

// Promotes |audioSendCodec| to be the first in the m=audio line, if set.
function maybePreferAudioSendCodec(sdp: string, params: PreferCodecs): string {
  return maybePreferCodec(sdp, 'audio', 'send', params.audioSendCodec);
}

// Promotes |audioRecvCodec| to be the first in the m=audio line, if set.
function maybePreferAudioReceiveCodec(sdp: string, params: PreferCodecs): string {
  return maybePreferCodec(sdp, 'audio', 'receive', params.audioRecvCodec);
}

// Promotes |videoSendCodec| to be the first in the m=audio line, if set.
function maybePreferVideoSendCodec(sdp: string, params: PreferCodecs): string {
  return maybePreferCodec(sdp, 'video', 'send', params.videoSendCodec);
}

// Promotes |videoRecvCodec| to be the first in the m=audio line, if set.
function maybePreferVideoReceiveCodec(sdp: string, params: PreferCodecs): string {
  return maybePreferCodec(sdp, 'video', 'receive', params.videoRecvCodec);
}

// Sets |codec| as the default |type| codec if it's present.
// The format of |codec| is 'NAME/RATE', e.g. 'opus/48000'.
function maybePreferCodec(sdp: string, type: string, _dir: string, codec?: string): string {
  // const str = `${type} ${dir} codec`;
  if (!codec) {
    // trace(`No preference on ${str}.`);
    return sdp;
  }

  // trace(`Prefer ${str}: ${codec}`);

  const sdpLines = sdp.split('\r\n');

  // Search for m line.
  const mLineIndex = findLine(sdpLines, 'm=', type);
  if (mLineIndex === -1) {
    return sdp;
  }

  // If the codec is available, set it as the default in m line.
  const payload = getCodecPayloadType(sdpLines, codec);
  if (payload) {
    sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], payload);
  }

  sdp = sdpLines.join('\r\n');
  return sdp;
}

// Set fmtp param to specific codec in SDP. If param does not exists, add it.
function setCodecParam(sdp: string, codec: string, param: string, value: string): string {
  const sdpLines = sdp.split('\r\n');

  const fmtpLineIndex = findFmtpLine(sdpLines, codec);

  if (fmtpLineIndex === null) {
    const index = findLine(sdpLines, 'a=rtpmap', codec);
    if (index === -1) {
      return sdp;
    }
    const payload = getCodecPayloadTypeFromLine(sdpLines[index]);
    const fmtpObj: FmtpObj = {
      pt: payload.toString(),
      params: { [param]: value },
    };
    sdpLines.splice(index + 1, 0, writeFmtpLine(fmtpObj));
  } else {
    const fmtpObj = parseFmtpLine(sdpLines[fmtpLineIndex]);
    fmtpObj.params[param] = value;
    sdpLines[fmtpLineIndex] = writeFmtpLine(fmtpObj);
  }

  sdp = sdpLines.join('\r\n');
  return sdp;
}

// Remove fmtp param if it exists.
function removeCodecParam(sdp: string, codec: string, param: string): string {
  const sdpLines = sdp.split('\r\n');

  const fmtpLineIndex = findFmtpLine(sdpLines, codec);
  if (fmtpLineIndex === null) {
    return sdp;
  }

  const map = parseFmtpLine(sdpLines[fmtpLineIndex]);
  if (map) {
    delete map.params[param];

    const newLine = writeFmtpLine(map);
    if (newLine === null) {
      sdpLines.splice(fmtpLineIndex, 1);
    } else {
      sdpLines[fmtpLineIndex] = newLine;
    }
  }

  sdp = sdpLines.join('\r\n');
  return sdp;
}

// Split an fmtp line into an object including 'pt' and 'params'.
function parseFmtpLine(fmtpLine: string): RequiredSome<FmtpObj, 'params'> {
  const fmtpObj: FmtpObj = {};
  const spacePos = fmtpLine.indexOf(' ');
  const keyValues = fmtpLine.substring(spacePos + 1).split('; ');

  const pattern = /a=fmtp:(\d+)/;
  const result = pattern.exec(fmtpLine);
  if (result && result.length === 2) {
    fmtpObj.pt = result[1];
  } else {
    // return null;
  }

  const params = {};
  keyValues.forEach((keyValue) => {
    const pair = keyValue.split('=');
    if (pair.length === 2) {
      params[pair[0]] = pair[1];
    }
  });
  fmtpObj.params = params;

  return fmtpObj as RequiredSome<FmtpObj, 'params'>;
}

// Generate an fmtp line from an object including 'pt' and 'params'.
function writeFmtpLine(fmtpObj: FmtpObj): string {
  if (!fmtpObj.hasOwnProperty('pt') || !fmtpObj.hasOwnProperty('params')) {
    // return null;
    return '';
  }
  const { pt = '', params = {} } = fmtpObj;
  const keyValues = Object.entries(params).map(([key, value]) => `${key}=${value}`);
  if (keyValues.length === 0) {
    return '';
  }
  return `a=fmtp:${pt.toString()} ${keyValues.join('; ')}`;
}

// Find fmtp attribute for |codec| in |sdpLines|.
function findFmtpLine(sdpLines: string[], codec: string): number | null {
  // Find payload of codec.
  const payload = getCodecPayloadType(sdpLines, codec);
  // Find the payload in fmtp line.
  return payload ? findLine(sdpLines, `a=fmtp:${payload.toString()}`) : null;
}

// Find the line in sdpLines that starts with |prefix|, and, if specified,
// contains |substr| (case-insensitive search).
function findLine(sdpLines: string[], prefix: string, substr?: string): number {
  return findLineInRange(sdpLines, 0, -1, prefix, substr);
}

// Find the line in sdpLines[startLine...endLine - 1] that starts with |prefix|
// and, if specified, contains |substr| (case-insensitive search).
function findLineInRange(
  sdpLines: string[],
  startLine: number,
  endLine: number,
  prefix: string,
  substr?: string
): number {
  const realEndLine = endLine !== -1 ? endLine : sdpLines.length;
  for (let i = startLine; i < realEndLine; ++i) {
    if (sdpLines[i].startsWith(prefix)) {
      if (!substr || sdpLines[i].toLowerCase().includes(substr.toLowerCase())) {
        return i;
      }
    }
  }
  return -1;
}

// Gets the codec payload type from sdp lines.
function getCodecPayloadType(sdpLines: string[], codec: string): string | null {
  const index = findLine(sdpLines, 'a=rtpmap', codec);
  return index >= 0 ? getCodecPayloadTypeFromLine(sdpLines[index]) : null;
}

// Gets the codec payload type from an a=rtpmap:X line.
function getCodecPayloadTypeFromLine(sdpLine: string): string {
  const pattern = /a=rtpmap:(\d+) [a-zA-Z0-9-]+\/\d+/;
  const result = pattern.exec(sdpLine);
  return result && result.length === 2 ? result[1] : '';
}

// Returns a new m= line with the specified codec as the first one.
function setDefaultCodec(mLine: string, payload: string): string {
  const elements = mLine.split(' ');

  // Just copy the first three parameters; codec order starts on fourth.
  const newLine = elements.slice(0, 3);

  // Put target payload first and copy in the rest.
  newLine.push(payload);
  for (let i = 3; i < elements.length; i++) {
    if (elements[i] !== payload) {
      newLine.push(elements[i]);
    }
  }
  return newLine.join(' ');
}

export function prepareLocalDescription(
  desc: RTCSessionDescriptionInit,
  preferCodecs: PreferCodecs = {}
): RTCSessionDescriptionInit {
  let sdp = maybePreferAudioReceiveCodec(desc.sdp || '', preferCodecs);
  sdp = maybePreferVideoReceiveCodec(sdp, preferCodecs);
  sdp = maybeSetAudioReceiveBitRate(sdp, preferCodecs);
  sdp = maybeSetVideoReceiveBitRate(sdp, preferCodecs);
  sdp = maybeRemoveVideoFec(sdp, preferCodecs);

  const newDesc: RTCSessionDescriptionInit = {
    sdp,
    type: desc.type,
  };
  return newDesc;
}

export function prepareRemoteDescription(
  desc: RTCSessionDescriptionInit,
  preferCodecs: PreferCodecs = {}
): RTCSessionDescriptionInit {
  let sdp = maybeSetOpusOptions(desc.sdp || '', preferCodecs);
  sdp = maybePreferAudioSendCodec(sdp, preferCodecs);
  sdp = maybePreferVideoSendCodec(sdp, preferCodecs);
  sdp = maybeSetAudioSendBitRate(sdp, preferCodecs);
  sdp = maybeSetVideoSendBitRate(sdp, preferCodecs);
  sdp = maybeSetVideoSendInitialBitRate(sdp, preferCodecs);
  sdp = maybeRemoveVideoFec(sdp, preferCodecs);

  const newDesc: RTCSessionDescriptionInit = {
    sdp,
    type: desc.type,
  };
  return newDesc;
}
