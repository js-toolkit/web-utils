export function toggleNativeSubtitles(native: boolean, textTracks: TextTrackList): void {
  // console.log('toggleNativeSubtitles');
  for (let i = 0; i < textTracks.length; i += 1) {
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
