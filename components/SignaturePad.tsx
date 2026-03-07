/**
 * SignaturePad — Touch-based signature capture for waivers.
 * Uses react-native-signature-canvas (WebView-based) for finger drawing.
 * Falls back to typed name input if the canvas fails to load.
 */
import React, { useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SignatureCanvas from 'react-native-signature-canvas';

import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { radii } from '@/lib/design-tokens';

type Props = {
  /** Called with base64 PNG data when signature is saved */
  onSave: (base64: string) => void;
  /** Called when signature is cleared */
  onClear: () => void;
  /** Whether a signature has been captured */
  hasSigned: boolean;
  /** Parent name for typed fallback placeholder */
  parentName?: string;
  /** Canvas height */
  height?: number;
  /** Accent color for buttons */
  accentColor?: string;
};

const WEBVIEW_STYLE = `.m-signature-pad {box-shadow: none; border: none; margin: 0; padding: 0;}
.m-signature-pad--body {border: none;}
.m-signature-pad--footer {display: none; margin: 0; padding: 0;}
body,html {width: 100%; height: 100%; margin: 0; padding: 0;}`;

export default function SignaturePad({
  onSave,
  onClear,
  hasSigned,
  parentName,
  height = 160,
  accentColor = BRAND.teal,
}: Props) {
  const sigRef = useRef<any>(null);
  const [useTyped, setUseTyped] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [canvasError, setCanvasError] = useState(false);

  const handleEnd = () => {
    sigRef.current?.readSignature();
  };

  const handleOK = (signature: string) => {
    if (signature) {
      onSave(signature);
    }
  };

  const handleClear = () => {
    sigRef.current?.clearSignature();
    setTypedName('');
    onClear();
  };

  const handleTypedSubmit = () => {
    if (typedName.trim().length >= 2) {
      // Convert typed name to a simple data URI marker
      onSave(`typed:${typedName.trim()}`);
    }
  };

  // Fallback: typed name input
  if (useTyped || canvasError) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.label}>Sign by typing your full name</Text>
          {!canvasError && (
            <TouchableOpacity onPress={() => setUseTyped(false)} hitSlop={8}>
              <Text style={[styles.switchLink, { color: accentColor }]}>Draw instead</Text>
            </TouchableOpacity>
          )}
        </View>
        <TextInput
          style={styles.typedInput}
          value={typedName}
          onChangeText={(t) => {
            setTypedName(t);
            if (t.trim().length >= 2) {
              onSave(`typed:${t.trim()}`);
            } else {
              onClear();
            }
          }}
          placeholder={parentName || 'Full legal name'}
          placeholderTextColor={BRAND.textMuted}
          autoCapitalize="words"
          textContentType="name"
        />
        {hasSigned && (
          <View style={styles.signedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={BRAND.teal} />
            <Text style={[styles.signedText, { color: BRAND.teal }]}>Signed</Text>
          </View>
        )}
      </View>
    );
  }

  // Canvas-based signature
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Draw your signature</Text>
        <TouchableOpacity onPress={() => setUseTyped(true)} hitSlop={8}>
          <Text style={[styles.switchLink, { color: accentColor }]}>Type instead</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.canvasWrap, { height }]}>
        <SignatureCanvas
          ref={sigRef}
          onEnd={handleEnd}
          onOK={handleOK}
          onEmpty={() => onClear()}
          webStyle={WEBVIEW_STYLE}
          backgroundColor="rgb(255,255,255)"
          penColor="#222"
          minWidth={1.5}
          maxWidth={3}
          dotSize={2}
          style={{ flex: 1 }}
          onError={() => {
            setCanvasError(true);
            setUseTyped(true);
          }}
        />
        {!hasSigned && (
          <View style={styles.placeholder} pointerEvents="none">
            <Text style={styles.placeholderText}>Sign here</Text>
          </View>
        )}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
          <Ionicons name="refresh-outline" size={16} color={BRAND.textMuted} />
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>

        {hasSigned && (
          <View style={styles.signedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={BRAND.teal} />
            <Text style={[styles.signedText, { color: BRAND.teal }]}>Signed</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
  switchLink: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
  },
  canvasWrap: {
    borderRadius: radii.card,
    borderWidth: 1.5,
    borderColor: BRAND.border,
    borderStyle: 'dashed',
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
    fontSize: 16,
    color: `${BRAND.textMuted}60`,
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: BRAND.warmGray,
  },
  clearText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
  },
  signedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  signedText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
  },
  typedInput: {
    backgroundColor: BRAND.white,
    borderBottomWidth: 2,
    borderBottomColor: BRAND.border,
    padding: 14,
    fontSize: 18,
    color: BRAND.textPrimary,
    fontStyle: 'italic',
    fontFamily: FONTS.bodyMedium,
  },
});
