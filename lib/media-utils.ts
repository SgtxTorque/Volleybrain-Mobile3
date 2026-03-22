import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

const MAX_IMAGE_SIZE = 1024;
const IMAGE_QUALITY = 0.7;

export type MediaResult = {
  uri: string;
  type: 'image' | 'video' | 'audio';
  width?: number;
  height?: number;
  fileName: string;
  fileSize?: number;
};

export const requestMediaPermissions = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
};

export const requestCameraPermissions = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
};

export const pickImage = async (): Promise<MediaResult | null> => {
  const hasPermission = await requestMediaPermissions();
  if (!hasPermission) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
  });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  try {
    const compressed = await compressImage(asset.uri, asset.width, asset.height);
    return {
      uri: compressed.uri,
      type: 'image',
      width: compressed.width,
      height: compressed.height,
      fileName: `image_${Date.now()}.jpg`,
    };
  } catch (err) {
    if (__DEV__) console.error('[pickImage] compressImage failed (possibly HEIC):', err);
    // Fallback: return original asset without compression
    return {
      uri: asset.uri,
      type: 'image',
      width: asset.width,
      height: asset.height,
      fileName: `image_${Date.now()}.jpg`,
    };
  }
};

export const pickVideo = async (): Promise<MediaResult | null> => {
  const hasPermission = await requestMediaPermissions();
  if (!hasPermission) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    allowsEditing: true,
    videoMaxDuration: 60,
    quality: 0.5,
  });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  
  return {
    uri: asset.uri,
    type: 'video',
    width: asset.width,
    height: asset.height,
    fileName: `video_${Date.now()}.mp4`,
  };
};

export const takePhoto = async (): Promise<MediaResult | null> => {
  const hasPermission = await requestCameraPermissions();
  if (!hasPermission) return null;

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: false,
    quality: 1,
  });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  try {
    const compressed = await compressImage(asset.uri, asset.width, asset.height);
    return {
      uri: compressed.uri,
      type: 'image',
      width: compressed.width,
      height: compressed.height,
      fileName: `photo_${Date.now()}.jpg`,
    };
  } catch (err) {
    if (__DEV__) console.error('[takePhoto] compressImage failed (possibly HEIC):', err);
    return {
      uri: asset.uri,
      type: 'image',
      width: asset.width,
      height: asset.height,
      fileName: `photo_${Date.now()}.jpg`,
    };
  }
};

export const compressImage = async (
  uri: string,
  width?: number,
  height?: number
): Promise<{ uri: string; width: number; height: number }> => {
  let newWidth = width || MAX_IMAGE_SIZE;
  let newHeight = height || MAX_IMAGE_SIZE;

  if (newWidth > MAX_IMAGE_SIZE || newHeight > MAX_IMAGE_SIZE) {
    const ratio = Math.min(MAX_IMAGE_SIZE / newWidth, MAX_IMAGE_SIZE / newHeight);
    newWidth = Math.round(newWidth * ratio);
    newHeight = Math.round(newHeight * ratio);
  }

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: newWidth, height: newHeight } }],
    { compress: IMAGE_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
  );

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
};

export const rotateImage = async (
  uri: string,
  degrees: number,
): Promise<{ uri: string; width: number; height: number }> => {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ rotate: degrees }],
    { compress: IMAGE_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
  );
  return { uri: result.uri, width: result.width, height: result.height };
};

export const cropImage = async (
  uri: string,
  crop: { originX: number; originY: number; width: number; height: number },
): Promise<{ uri: string; width: number; height: number }> => {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ crop }],
    { compress: IMAGE_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
  );
  return { uri: result.uri, width: result.width, height: result.height };
};

export const uploadMedia = async (
  media: MediaResult,
  folderPath: string,
  bucket: string = 'chat-media'
): Promise<string | null> => {
  try {
    if (__DEV__) console.log('[uploadMedia] Starting:', { uri: media.uri?.substring(0, 50), type: media.type, bucket, folderPath });

    const fileExt = media.type === 'image' ? 'jpg' : media.type === 'audio' ? 'm4a' : 'mp4';
    const filePath = `${folderPath}/${Date.now()}.${fileExt}`;

    // Fetch the file as a blob
    const response = await fetch(media.uri);
    if (!response.ok) {
      if (__DEV__) console.error('[uploadMedia] fetch failed:', response.status, response.statusText);
      return null;
    }
    const blob = await response.blob();
    if (__DEV__) console.log('[uploadMedia] blob size:', blob.size);

    // Convert blob to ArrayBuffer
    const arrayBuffer = await new Response(blob).arrayBuffer();
    if (__DEV__) console.log('[uploadMedia] arrayBuffer size:', arrayBuffer.byteLength);

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, arrayBuffer, {
        contentType: media.type === 'image' ? 'image/jpeg' : media.type === 'audio' ? 'audio/m4a' : 'video/mp4',
        upsert: false,
      });

    if (error) {
      if (__DEV__) console.error('[uploadMedia] Supabase upload error:', JSON.stringify(error));
      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    if (__DEV__) console.log('[uploadMedia] Success:', data.publicUrl?.substring(0, 80));
    return data.publicUrl;
  } catch (error) {
    if (__DEV__) console.error('[uploadMedia] Exception:', error);
    return null;
  }
};