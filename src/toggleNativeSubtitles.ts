export default function toggleNativeSubtitles(enabled: boolean, textTracks: TextTrackList): void {
  // console.log('toggleNativeSubtitles');
  for (let i = 0; i < textTracks.length; i += 1) {
    const track = textTracks[i];
    if (enabled && track.mode === 'hidden') {
      track.mode = 'showing';
    } else if (!enabled && track.mode === 'showing') {
      track.mode = 'hidden';
    }
    // console.log(track.label, track.mode);
  }
  // console.log('toggleNativeSubtitles end');
}
