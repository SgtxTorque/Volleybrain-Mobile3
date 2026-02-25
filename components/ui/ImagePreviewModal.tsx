import { compressImage, cropImage, rotateImage, MediaResult } from '@/lib/media-utils';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CROP_PADDING = 20;

// =============================================================================
// TYPES
// =============================================================================

type ImagePreviewModalProps = {
  visible: boolean;
  media: MediaResult | null;
  onAccept: (result: MediaResult) => void;
  onCancel: () => void;
};

type AspectRatio = 'free' | 'square' | '4:3' | '16:9';

const ASPECT_RATIOS: { key: AspectRatio; label: string; ratio: number | null }[] = [
  { key: 'free', label: 'Free', ratio: null },
  { key: 'square', label: '1:1', ratio: 1 },
  { key: '4:3', label: '4:3', ratio: 4 / 3 },
  { key: '16:9', label: '16:9', ratio: 16 / 9 },
];

// =============================================================================
// COMPONENT
// =============================================================================

export default function ImagePreviewModal({
  visible,
  media,
  onAccept,
  onCancel,
}: ImagePreviewModalProps) {
  const { colors } = useTheme();
  const [currentUri, setCurrentUri] = useState<string | null>(null);
  const [currentWidth, setCurrentWidth] = useState(0);
  const [currentHeight, setCurrentHeight] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [isCropMode, setIsCropMode] = useState(false);
  const [cropAspect, setCropAspect] = useState<AspectRatio>('free');

  // Crop mode shared values (pan-zoom image within fixed frame)
  const cropScale = useSharedValue(1);
  const savedCropScale = useSharedValue(1);
  const cropTranslateX = useSharedValue(0);
  const cropTranslateY = useSharedValue(0);
  const savedCropTranslateX = useSharedValue(0);
  const savedCropTranslateY = useSharedValue(0);

  // Reset state when modal opens with new media
  React.useEffect(() => {
    if (visible && media) {
      setCurrentUri(media.uri);
      setCurrentWidth(media.width || 1024);
      setCurrentHeight(media.height || 1024);
      setRotation(0);
      setIsCropMode(false);
      setCropAspect('free');
      cropScale.value = 1;
      savedCropScale.value = 1;
      cropTranslateX.value = 0;
      cropTranslateY.value = 0;
      savedCropTranslateX.value = 0;
      savedCropTranslateY.value = 0;
    }
  }, [visible, media?.uri]);

  // ---------------------------------------------------------------------------
  // Crop frame calculations
  // ---------------------------------------------------------------------------

  const getCropFrame = useCallback(() => {
    const maxW = SCREEN_WIDTH - CROP_PADDING * 2;
    const maxH = SCREEN_HEIGHT * 0.55;

    const selectedRatio = ASPECT_RATIOS.find((a) => a.key === cropAspect);
    if (!selectedRatio?.ratio) {
      // Free mode: use image aspect ratio
      const imgRatio = currentWidth / (currentHeight || 1);
      if (imgRatio > maxW / maxH) {
        return { width: maxW, height: maxW / imgRatio };
      }
      return { width: maxH * imgRatio, height: maxH };
    }

    const ratio = selectedRatio.ratio;
    if (ratio > maxW / maxH) {
      return { width: maxW, height: maxW / ratio };
    }
    return { width: maxH * ratio, height: maxH };
  }, [cropAspect, currentWidth, currentHeight]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleRotate = useCallback(async () => {
    if (!currentUri || processing) return;
    setProcessing(true);
    try {
      const newRotation = rotation + 90;
      const result = await rotateImage(currentUri, 90);
      setCurrentUri(result.uri);
      setCurrentWidth(result.width);
      setCurrentHeight(result.height);
      setRotation(newRotation);
    } catch (err) {
      if (__DEV__) console.error('[ImagePreview] rotate error:', err);
    } finally {
      setProcessing(false);
    }
  }, [currentUri, rotation, processing]);

  const handleAccept = useCallback(async () => {
    if (!currentUri || !media || processing) return;
    setProcessing(true);
    try {
      // Compress the final image
      const compressed = await compressImage(currentUri, currentWidth, currentHeight);
      onAccept({
        uri: compressed.uri,
        type: 'image',
        width: compressed.width,
        height: compressed.height,
        fileName: media.fileName,
      });
    } catch (err) {
      if (__DEV__) console.error('[ImagePreview] accept error:', err);
      // Fallback: return as-is
      onAccept({ ...media, uri: currentUri, width: currentWidth, height: currentHeight });
    } finally {
      setProcessing(false);
    }
  }, [currentUri, currentWidth, currentHeight, media, processing, onAccept]);

  const handleCropDone = useCallback(async () => {
    if (!currentUri || processing) return;
    setProcessing(true);
    try {
      const frame = getCropFrame();

      // Calculate the image display size within the crop area
      const imgAspect = currentWidth / (currentHeight || 1);
      let displayW: number, displayH: number;
      if (imgAspect > frame.width / frame.height) {
        displayW = frame.width;
        displayH = frame.width / imgAspect;
      } else {
        displayH = frame.height;
        displayW = frame.height * imgAspect;
      }

      const sc = savedCropScale.value;
      const tx = savedCropTranslateX.value;
      const ty = savedCropTranslateY.value;

      // Visible area in display coordinates
      const visibleX = frame.width / 2 - tx;
      const visibleY = frame.height / 2 - ty;

      // Convert to image coordinates
      const scaledDisplayW = displayW * sc;
      const scaledDisplayH = displayH * sc;
      const imgOffsetX = (frame.width - scaledDisplayW) / 2;
      const imgOffsetY = (frame.height - scaledDisplayH) / 2;

      const imgX = ((visibleX - imgOffsetX) / scaledDisplayW) * currentWidth - (frame.width / (2 * sc)) / displayW * currentWidth;
      const imgY = ((visibleY - imgOffsetY) / scaledDisplayH) * currentHeight - (frame.height / (2 * sc)) / displayH * currentHeight;
      const imgW = (frame.width / sc / displayW) * currentWidth;
      const imgH = (frame.height / sc / displayH) * currentHeight;

      // Clamp crop to image bounds
      const originX = Math.max(0, Math.min(imgX, currentWidth - 1));
      const originY = Math.max(0, Math.min(imgY, currentHeight - 1));
      const cropW = Math.min(imgW, currentWidth - originX);
      const cropH = Math.min(imgH, currentHeight - originY);

      if (cropW > 10 && cropH > 10) {
        const result = await cropImage(currentUri, {
          originX: Math.round(originX),
          originY: Math.round(originY),
          width: Math.round(cropW),
          height: Math.round(cropH),
        });
        setCurrentUri(result.uri);
        setCurrentWidth(result.width);
        setCurrentHeight(result.height);
      }
    } catch (err) {
      if (__DEV__) console.error('[ImagePreview] crop error:', err);
    } finally {
      setProcessing(false);
      setIsCropMode(false);
      // Reset crop gestures
      cropScale.value = 1;
      savedCropScale.value = 1;
      cropTranslateX.value = 0;
      cropTranslateY.value = 0;
      savedCropTranslateX.value = 0;
      savedCropTranslateY.value = 0;
    }
  }, [currentUri, currentWidth, currentHeight, processing, getCropFrame, cropScale, savedCropScale, cropTranslateX, cropTranslateY, savedCropTranslateX, savedCropTranslateY]);

  // ---------------------------------------------------------------------------
  // Crop gestures
  // ---------------------------------------------------------------------------

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      cropScale.value = Math.max(1, savedCropScale.value * e.scale);
    })
    .onEnd(() => {
      if (cropScale.value < 1) cropScale.value = withSpring(1);
      savedCropScale.value = cropScale.value;
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      cropTranslateX.value = savedCropTranslateX.value + e.translationX;
      cropTranslateY.value = savedCropTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedCropTranslateX.value = cropTranslateX.value;
      savedCropTranslateY.value = cropTranslateY.value;
    });

  const cropGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const cropImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: cropTranslateX.value },
      { translateY: cropTranslateY.value },
      { scale: cropScale.value },
    ],
  }));

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!visible || !media || !currentUri) return null;

  const frame = getCropFrame();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <GestureHandlerRootView style={styles.root}>
        <View style={[styles.container, { backgroundColor: '#000' }]}>
          {isCropMode ? (
            /* ---- CROP MODE ---- */
            <>
              {/* Crop area with image */}
              <View style={styles.cropAreaContainer}>
                <View
                  style={[
                    styles.cropFrame,
                    { width: frame.width, height: frame.height },
                  ]}
                >
                  <GestureDetector gesture={cropGesture}>
                    <Animated.View style={cropImageStyle}>
                      <Image
                        source={{ uri: currentUri }}
                        style={{
                          width: frame.width,
                          height: frame.width / (currentWidth / (currentHeight || 1)),
                        }}
                        resizeMode="contain"
                      />
                    </Animated.View>
                  </GestureDetector>
                </View>
                {/* Crop frame border */}
                <View
                  style={[
                    styles.cropBorder,
                    {
                      width: frame.width + 4,
                      height: frame.height + 4,
                      top: (SCREEN_HEIGHT * 0.55 - frame.height) / 2 + SCREEN_HEIGHT * 0.1 - 2,
                      left: (SCREEN_WIDTH - frame.width) / 2 - 2,
                    },
                  ]}
                  pointerEvents="none"
                >
                  {/* Corner handles */}
                  {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y], i) => (
                    <View
                      key={i}
                      style={[
                        styles.cropCorner,
                        {
                          top: y ? undefined : -2,
                          bottom: y ? -2 : undefined,
                          left: x ? undefined : -2,
                          right: x ? -2 : undefined,
                        },
                      ]}
                    />
                  ))}
                  {/* Grid lines */}
                  <View style={[styles.cropGridLineH, { top: '33.3%' }]} />
                  <View style={[styles.cropGridLineH, { top: '66.6%' }]} />
                  <View style={[styles.cropGridLineV, { left: '33.3%' }]} />
                  <View style={[styles.cropGridLineV, { left: '66.6%' }]} />
                </View>
              </View>

              {/* Bottom: aspect ratios + actions */}
              <View style={styles.cropBottomBar}>
                <View style={styles.aspectRow}>
                  {ASPECT_RATIOS.map((ar) => (
                    <TouchableOpacity
                      key={ar.key}
                      style={[
                        styles.aspectBtn,
                        cropAspect === ar.key && { backgroundColor: colors.primary },
                      ]}
                      onPress={() => setCropAspect(ar.key)}
                    >
                      <Text
                        style={[
                          styles.aspectBtnText,
                          { color: cropAspect === ar.key ? '#fff' : 'rgba(255,255,255,0.7)' },
                        ]}
                      >
                        {ar.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.cropActions}>
                  <TouchableOpacity style={styles.cropCancelBtn} onPress={() => setIsCropMode(false)}>
                    <Text style={styles.cropCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cropDoneBtn, { backgroundColor: colors.primary }]}
                    onPress={handleCropDone}
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={20} color="#fff" />
                        <Text style={styles.cropDoneText}>Done</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : (
            /* ---- PREVIEW MODE ---- */
            <>
              {/* Close button */}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onCancel}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>

              {/* Image preview */}
              <View style={styles.previewContainer}>
                <Image
                  source={{ uri: currentUri }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              </View>

              {/* Bottom toolbar */}
              <View style={styles.toolbar}>
                <TouchableOpacity style={styles.toolBtn} onPress={() => setIsCropMode(true)}>
                  <Ionicons name="crop-outline" size={24} color="#fff" />
                  <Text style={styles.toolBtnText}>Crop</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.toolBtn} onPress={handleRotate} disabled={processing}>
                  {processing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="refresh-outline" size={24} color="#fff" />
                  )}
                  <Text style={styles.toolBtnText}>Rotate</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
                  onPress={handleAccept}
                  disabled={processing}
                  activeOpacity={0.8}
                >
                  {processing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={24} color="#fff" />
                      <Text style={styles.acceptBtnText}>Use Photo</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: {
    flex: 1,
  },

  // Preview mode
  closeBtn: {
    position: 'absolute',
    top: 54,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  previewImage: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_HEIGHT * 0.6,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 44,
    paddingTop: 16,
    gap: 20,
  },
  toolBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  toolBtnText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
  },
  acceptBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Crop mode
  cropAreaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: SCREEN_HEIGHT * 0.1,
  },
  cropFrame: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cropBorder: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#fff',
  },
  cropCorner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#fff',
    borderWidth: 3,
  },
  cropGridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  cropGridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  cropBottomBar: {
    paddingHorizontal: 20,
    paddingBottom: 44,
    paddingTop: 16,
    gap: 16,
  },
  aspectRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  aspectBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  aspectBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cropActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cropCancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  cropCancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cropDoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  cropDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
