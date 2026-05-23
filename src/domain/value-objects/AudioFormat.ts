export enum AudioFormat {
  WAV = 'wav',
  MP3 = 'mp3',
  WEBM = 'webm',
  OGG = 'ogg',
  M4A = 'm4a',
}

export function getAudioFormatFromMimeType(mimeType: string): AudioFormat {
  if (mimeType.includes('wav')) return AudioFormat.WAV;
  if (mimeType.includes('mp3') || mimeType.includes('mpeg')) return AudioFormat.MP3;
  if (mimeType.includes('webm')) return AudioFormat.WEBM;
  if (mimeType.includes('ogg')) return AudioFormat.OGG;
  if (mimeType.includes('m4a')) return AudioFormat.M4A;

  throw new Error(`Unsupported MIME type: ${mimeType}`);
}

export function getMimeTypeFromFormat(format: AudioFormat): string {
  switch (format) {
    case AudioFormat.WAV:
      return 'audio/wav';
    case AudioFormat.MP3:
      return 'audio/mpeg';
    case AudioFormat.WEBM:
      return 'audio/webm';
    case AudioFormat.OGG:
      return 'audio/ogg';
    case AudioFormat.M4A:
      return 'audio/mp4';
  }
}
