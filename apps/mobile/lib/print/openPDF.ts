import { Platform, Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';

export async function openOrSharePdf(uri: string) {
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      return;
    }
    if (Platform.OS === 'android') {
      const contentUri = await FileSystem.getContentUriAsync(uri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
      });
      return;
    }
    Alert.alert('PDF generado', uri);
  } catch (e: any) {
    Alert.alert('No se pudo abrir el PDF', e?.message ?? String(e));
  }
}
