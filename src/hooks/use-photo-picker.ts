import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { useStudio } from '@/state/studio-context';

export function usePhotoPicker() {
  const studio = useStudio();
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  async function pick(camera = false): Promise<boolean> {
    setError(null); setPicking(true);
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) throw new Error('Camera access is off. Allow it in device settings, or choose a photo from your library.');
      }
      const result = camera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.9, cameraType: ImagePicker.CameraType.front })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.9, allowsMultipleSelection: false, exif: false });
      if (result.canceled || !result.assets?.[0]) return false;
      const asset = result.assets[0];
      studio.setPhoto({ uri: asset.uri, width: asset.width, height: asset.height, isSample: false });
      studio.haptic(); return true;
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not open your photo library.'); return false; }
    finally { setPicking(false); }
  }
  return { pick, picking, error };
}
