export function toggleNativeSubtitles(native: boolean, textTracks: TextTrackList): void {
  // console.log('toggleNativeSubtitles');
  const { length } = textTracks;
  for (let i = 0; i < length; i += 1) {
    const track = textTracks[i];
    if (native) {
      track.native = true;
    } else {
      delete track.native;
    }
    if (native && track.mode === 'hidden') {
      track.mode = 'showing';
    } else if (!native && track.mode === 'showing') {
      track.mode = 'hidden';
    }
    // console.log(track.label, track.mode);
  }
  // console.log('toggleNativeSubtitles end');
}
