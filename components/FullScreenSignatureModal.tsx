/**
 * FullScreenSignatureModal — Landscape full-screen signature capture.
 * Opens as a modal overlay, locks to landscape, provides a large canvas
 * with no scroll interference. Falls back to typed name on canvas error.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SignatureCanvas from 'react-native-signature-canvas';
import * as ScreenOrientation from 'expo-screen-orientation';

import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

type Props = {
  visible: boolean;
  waiverTitle?: string;
  parentName?: string;
  accentColor?: string;
  onConfirm: (base64: string) => void;
  onCancel: () => void;
};

const WEBVIEW_STYLE = `.m-signature-pad {box-shadow: none; border: none; margin: 0; padding: 0;}
.m-signature-pad--body {border: none;}
.m-signature-pad--footer {display: none; margin: 0; padding: 0;}
body,html {width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden;}`;

export default function FullScreenSignatureModal({
  visible,
  waiverTitle,
  parentName,
  accentColor = BRAND.teal,
  onConfirm,
  onCancel,
}: Props) {
  const sigRef = useRef<any>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [useTyped, setUseTyped] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [canvasError, setCanvasError] = useState(false);
  const [pendingSignature, setPendingSignature] = useState<string | null>(null);

  // Lock to landscape when modal opens, back to portrait when it closes
  useEffect(() => {
    if (visible) {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    } else {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    }
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, [visible]);

  // Reset state when opening
  useEffect(() => {
    if (visible) {
      setHasDrawn(false);
      setUseTyped(false);
      setTypedName('');
      setPendingSignature(null);
    }
  }, [visible]);

  const handleEnd = useCallback(() => {
    sigRef.current?.readSignature();
  }, []);

  const handleOK = useCallback((signature: string) => {
    if (signature) {
      setHasDrawn(true);
      setPendingSignature(signature);
    }
  }, []);

  const handleClear = useCallback(() => {
    sigRef.current?.clearSignature();
    setHasDrawn(false);
    setTypedName('');
    setPendingSignature(null);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (useTyped || canvasError) {
      if (typedName.trim().length >= 2) {
        onConfirm(`typed:${typedName.trim()}`);
      }
    } else if (pendingSignature) {
      onConfirm(pendingSignature);
    }
  }, [useTyped, canvasError, typedName, pendingSignature, onConfirm]);

  const canConfirm = (useTyped || canvasError)
    ? typedName.trim().length >= 2
    : hasDrawn && !!pendingSignature;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      supportedOrientations={['landscape-left', 'landscape-right', 'portrait']}
      onRequestClose={onCancel}
    >
      <StatusBar hidden />
      <View style={s.backdrop}>
        {/* Title bar */}
        <View style={s.titleBar}>
          <Text style={s.titleText} numberOfLines={1}>
            {waiverTitle || 'Sign Below'}
          </Text>
          <TouchableOpacity onPress={() => setUseTyped(!useTyped && !canvasError)} hitSlop={8}>
            <Text style={[s.switchLink, { color: accentColor }]}>
              {(useTyped || canvasError) ? 'Draw instead' : 'Type instead'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Signature area */}
        <View style={s.canvasContainer}>
          {(useTyped || canvasError) ? (
            <View style={s.typedContainer}>
              <Text style={s.typedLabel}>Type your full legal name</Text>
              <TextInput
                style={s.typedInput}
                value={typedName}
                onChangeText={setTypedName}
                placeholder={parentName || 'Full legal name'}
                placeholderTextColor={`${BRAND.white}40`}
                autoCapitalize="words"
                autoFocus
                textContentType="name"
              />
            </View>
          ) : (
            <View style={s.canvasWrap}>
              <SignatureCanvas
                ref={sigRef}
                onEnd={handleEnd}
                onOK={handleOK}
                onEmpty={() => { setHasDrawn(false); setPendingSignature(null); }}
                webStyle={WEBVIEW_STYLE}
                backgroundColor="rgb(255,255,255)"
                penColor="#222"
                minWidth={2}
                maxWidth={4}
                dotSize={3}
                style={{ flex: 1 }}
                onError={() => {
                  setCanvasError(true);
                  setUseTyped(true);
                }}
              />
              {!hasDrawn && (
                <View style={s.placeholder} pointerEvents="none">
                  <Text style={s.placeholderText}>Sign here</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Action buttons */}
        <View style={s.actionsBar}>
          <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.clearBtn} onPress={handleClear}>
            <Ionicons name="refresh-outline" size={18} color={BRAND.white} />
            <Text style={s.clearText}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.confirmBtn, { backgroundColor: canConfirm ? accentColor : `${accentColor}40` }]}
            onPress={handleConfirm}
            disabled={!canConfirm}
          >
            <Ionicons name="checkmark-circle" size={20} color={BRAND.white} />
            <Text style={s.confirmText}>Confirm Signature</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    justifyContent: 'space-between',
  },
  titleBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  titleText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: BRAND.white,
    flex: 1,
    marginRight: 16,
  },
  switchLink: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
  },
  canvasContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  canvasWrap: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: BRAND.white,
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 22,
    color: `${BRAND.textMuted}50`,
    fontStyle: 'italic',
  },
  typedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  typedLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: `${BRAND.white}CC`,
  },
  typedInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderBottomWidth: 2,
    borderBottomColor: BRAND.white,
    padding: 16,
    fontSize: 24,
    color: BRAND.white,
    fontStyle: 'italic',
    fontFamily: FONTS.bodyMedium,
    width: '60%',
    textAlign: 'center',
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 16,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 15,
    color: `${BRAND.white}99`,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  clearText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 15,
    color: BRAND.white,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  confirmText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: BRAND.white,
  },
});
