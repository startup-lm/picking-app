import * as Haptics from 'expo-haptics';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

export type FeedbackKind = 'success' | 'error' | 'warning';

let okPlayer: AudioPlayer | null = null;
let errorPlayer: AudioPlayer | null = null;

export function initFeedback(): void {
  if (okPlayer && errorPlayer) return;
  try {
    if (!okPlayer) {
      okPlayer = createAudioPlayer(require('../assets/sounds/scan-ok.wav'));
    }
    if (!errorPlayer) {
      errorPlayer = createAudioPlayer(require('../assets/sounds/scan-error.wav'));
    }
  } catch {
    // El feedback nunca rompe el flujo
  }
}

export async function feedback(kind: FeedbackKind): Promise<void> {
  try {
    if (kind === 'success') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (!okPlayer) initFeedback();
      if (okPlayer) {
        try {
          const seekPromise = okPlayer.seekTo(0);
          if (seekPromise && typeof seekPromise.catch === 'function') {
            seekPromise.catch(() => {});
          }
          okPlayer.play();
        } catch {
          // ignore
        }
      }
    } else if (kind === 'error') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      if (!errorPlayer) initFeedback();
      if (errorPlayer) {
        try {
          const seekPromise = errorPlayer.seekTo(0);
          if (seekPromise && typeof seekPromise.catch === 'function') {
            seekPromise.catch(() => {});
          }
          errorPlayer.play();
        } catch {
          // ignore
        }
      }
    } else if (kind === 'warning') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
  } catch {
    // Cualquier excepción de audio o háptica se ignora: el feedback nunca rompe el flujo
  }
}
