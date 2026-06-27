export interface InbuiltPreset {
  id: string;
  name: string;
  folderName: string;
  fileSuffix: string;
}

export const INBUILT_PRESETS: InbuiltPreset[] = [
  {
    id: 'default',
    name: 'Warm Pad',
    folderName: 'Warm Pad',
    fileSuffix: ' - WARM.mp3'
  },
  {
    id: 'calming-waves',
    name: 'Calming Waves Pad',
    folderName: 'Calming Waves Pad',
    fileSuffix: ' - Calming Waves.mp3'
  },
  {
    id: 'foundation',
    name: 'Foundation Pad',
    folderName: 'Foundation Pad',
    fileSuffix: '.mp3'
  }
];
