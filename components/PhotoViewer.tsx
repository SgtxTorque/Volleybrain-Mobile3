import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

// =============================================================================
// TYPES
// =============================================================================

export type GalleryItem = {
  url: string;
  type: 'image' | 'video';
  postId: string;
  authorName: string;
  authorAvatar: string | null;
  createdAt: string;
  caption: string | null;
  teamName: string;
  reactions: { emoji: string; count: number }[];
};

type PhotoViewerProps = {
  visible: boolean;
  items: GalleryItem[];
  initialIndex: number;
  isCoachOrAdmin?: boolean;
  onClose: () => void;
  onViewPost?: (postId: string) => void;
  onDelete?: (url: string, postId: string) => void;
};

// =============================================================================
// ZOOMABLE IMAGE
// =============================================================================

function ZoomableImage({
  uri,
  width,
  height,
  onZoomChange,
}: {
  uri: string;
  width: number;
  height: number;
  onZoomChange?: (zoomed: boolean) => void;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const updateZoomState = useCallback(
    (zoomed: boolean) => {
      onZoomChange?.(zoomed);
    },
    [onZoomChange],
  );

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(updateZoomState)(false);
      } else {
        savedScale.value = scale.value;
        runOnJS(updateZoomState)(scale.value > 1);
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(updateZoomState)(false);
      } else {
        scale.value = withSpring(2.5);
        savedScale.value = 2.5;
        runOnJS(updateZoomState)(true);
      }
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);
  const gesture = Gesture.Exclusive(doubleTapGesture, composedGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ width, height, justifyContent: 'center', alignItems: 'center' }, animatedStyle]}>
        <Image
          source={{ uri }}
          style={{ width, height }}
          resizeMode="contain"
        />
      </Animated.View>
    </GestureDetector>
  );
}

// =============================================================================
// PHOTO VIEWER
// =============================================================================

export default function PhotoViewer({
  visible,
  items,
  initialIndex,
  isCoachOrAdmin = false,
  onClose,
  onViewPost,
  onDelete,
}: PhotoViewerProps) {
  const { colors } = useTheme();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const current = items[currentIndex] || items[0];
  const isVideo = current?.type === 'video';

  // -------------------------------------------------------------------------
  // Orientation lock/unlock
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (visible) {
      ScreenOrientation.unlockAsync().catch(() => {});
    } else {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    }
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, [visible]);

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const handleSave = useCallback(async () => {
    if (!current) return;
    try {
      setSaving(true);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'VolleyBrain needs permission to save photos to your device.');
        return;
      }
      const ext = isVideo ? 'mp4' : 'jpg';
      const localUri = `${FileSystem.cacheDirectory}vb_download_${Date.now()}.${ext}`;
      const download = await FileSystem.downloadAsync(current.url, localUri);
      await MediaLibrary.saveToLibraryAsync(download.uri);
      Alert.alert('Saved', isVideo ? 'Video saved to your device.' : 'Photo saved to your device.');
    } catch (err) {
      if (__DEV__) console.error('[PhotoViewer] save error:', err);
      Alert.alert('Error', 'Could not save to device. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [current?.url, isVideo]);

  const handleShare = useCallback(async () => {
    if (!current) return;
    try {
      await Share.share({ message: current.url, url: current.url });
    } catch (err) {
      if (__DEV__) console.error('[PhotoViewer] share error:', err);
    }
  }, [current?.url]);

  const handleViewPost = useCallback(() => {
    setShowMenu(false);
    onClose();
    onViewPost?.(current?.postId);
  }, [current?.postId, onClose, onViewPost]);

  const handleDelete = useCallback(() => {
    if (!current) return;
    setShowMenu(false);
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete?.(current.url, current.postId);
            onClose();
          },
        },
      ],
    );
  }, [current?.url, current?.postId, onClose, onDelete]);

  const openMenu = useCallback(() => {
    if (Platform.OS === 'ios') {
      const options = ['Save to Device', 'Share', 'View Original Post'];
      if (isCoachOrAdmin) options.push('Delete Photo');
      options.push('Cancel');
      ActionSheetIOS.showActionSheetWithOptions(
        { options, destructiveButtonIndex: isCoachOrAdmin ? 3 : undefined, cancelButtonIndex: options.length - 1 },
        (idx) => {
          if (idx === 0) handleSave();
          else if (idx === 1) handleShare();
          else if (idx === 2) handleViewPost();
          else if (idx === 3 && isCoachOrAdmin) handleDelete();
        },
      );
    } else {
      setShowMenu(true);
    }
  }, [isCoachOrAdmin, handleSave, handleShare, handleViewPost, handleDelete]);

  const handleScroll = useCallback(
    (e: any) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / screenW);
      if (idx >= 0 && idx < items.length) {
        setCurrentIndex(idx);
        setIsZoomed(false);
      }
    },
    [items.length, screenW],
  );

  if (!current) return null;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <GestureHandlerRootView style={staticStyles.root}>
        <View style={staticStyles.container}>
          {/* Swipeable media pages */}
          <FlatList
            ref={flatListRef}
            horizontal
            pagingEnabled
            scrollEnabled={!isZoomed}
            showsHorizontalScrollIndicator={false}
            data={items}
            keyExtractor={(_, i) => String(i)}
            initialScrollIndex={initialIndex}
            getItemLayout={(_, index) => ({
              length: screenW,
              offset: screenW * index,
              index,
            })}
            onMomentumScrollEnd={handleScroll}
            renderItem={({ item }) => (
              <View style={{ width: screenW, height: screenH, justifyContent: 'center', alignItems: 'center' }}>
                {item.type === 'video' ? (
                  <Video
                    source={{ uri: item.url }}
                    style={{ width: screenW, height: screenH }}
                    resizeMode={ResizeMode.CONTAIN}
                    useNativeControls
                    shouldPlay={false}
                  />
                ) : (
                  <ZoomableImage
                    uri={item.url}
                    width={screenW}
                    height={screenH}
                    onZoomChange={setIsZoomed}
                  />
                )}
              </View>
            )}
          />

          {/* Top bar */}
          <View style={staticStyles.topBar}>
            <TouchableOpacity onPress={onClose} style={staticStyles.topBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <View style={staticStyles.topBarCounter}>
              {items.length > 1 && (
                <Text style={staticStyles.counterText}>{currentIndex + 1} / {items.length}</Text>
              )}
            </View>
            <View style={staticStyles.topBarRight}>
              <TouchableOpacity onPress={handleSave} style={staticStyles.topBtn} disabled={saving} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="download-outline" size={24} color="#fff" />
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={openMenu} style={staticStyles.topBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom info panel */}
          <View style={staticStyles.bottomPanel}>
            <View style={staticStyles.authorRow}>
              {current.authorAvatar ? (
                <Image source={{ uri: current.authorAvatar }} style={staticStyles.authorAvatar} />
              ) : (
                <View style={[staticStyles.authorAvatarPlaceholder, { backgroundColor: colors.primary }]}>
                  <Ionicons name="person" size={14} color="#fff" />
                </View>
              )}
              <View style={staticStyles.authorInfo}>
                <Text style={staticStyles.authorName} numberOfLines={1}>{current.authorName || 'Unknown'}</Text>
                <Text style={staticStyles.dateLine}>{formatDate(current.createdAt)} · {current.teamName}</Text>
              </View>
            </View>
            {current.caption ? (
              <Text style={staticStyles.caption} numberOfLines={3}>{current.caption}</Text>
            ) : null}
            {current.reactions.length > 0 && (
              <View style={staticStyles.reactionRow}>
                {current.reactions.map((r, i) => (
                  <Text key={i} style={staticStyles.reactionChip}>{r.emoji} {r.count}</Text>
                ))}
              </View>
            )}
          </View>

          {/* Android action menu overlay */}
          {showMenu && Platform.OS !== 'ios' && (
            <TouchableOpacity
              style={staticStyles.menuOverlay}
              activeOpacity={1}
              onPress={() => setShowMenu(false)}
            >
              <View style={staticStyles.menuSheet}>
                <TouchableOpacity style={staticStyles.menuItem} onPress={() => { setShowMenu(false); handleSave(); }}>
                  <Ionicons name="download-outline" size={20} color="#fff" />
                  <Text style={staticStyles.menuItemText}>Save to Device</Text>
                </TouchableOpacity>
                <TouchableOpacity style={staticStyles.menuItem} onPress={() => { setShowMenu(false); handleShare(); }}>
                  <Ionicons name="share-outline" size={20} color="#fff" />
                  <Text style={staticStyles.menuItemText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity style={staticStyles.menuItem} onPress={() => { setShowMenu(false); handleViewPost(); }}>
                  <Ionicons name="chatbubble-outline" size={20} color="#fff" />
                  <Text style={staticStyles.menuItemText}>View Original Post</Text>
                </TouchableOpacity>
                {isCoachOrAdmin && (
                  <TouchableOpacity style={staticStyles.menuItem} onPress={handleDelete}>
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    <Text style={[staticStyles.menuItemText, { color: '#FF3B30' }]}>Delete Photo</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[staticStyles.menuItem, staticStyles.menuCancel]} onPress={() => setShowMenu(false)}>
                  <Text style={staticStyles.menuItemText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const staticStyles = StyleSheet.create({
  root: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  topBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarCounter: {
    flex: 1,
    alignItems: 'center',
  },
  counterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  topBarRight: {
    flexDirection: 'row',
    gap: 4,
  },

  // Bottom panel
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    gap: 8,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  authorAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  dateLine: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 1,
  },
  caption: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    lineHeight: 18,
  },
  reactionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  reactionChip: {
    color: '#fff',
    fontSize: 13,
  },

  // Android menu overlay
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
    paddingBottom: 34,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuItemText: {
    color: '#fff',
    fontSize: 16,
  },
  menuCancel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.15)',
    marginTop: 4,
    justifyContent: 'center',
  },
});
