/**
 * FullScreenWaiverViewer — Full-screen reading experience for waivers.
 * Scroll-gated confirm: "I Have Read and Agree" button stays disabled
 * until the user scrolls to the bottom of the waiver text.
 */
import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

type Props = {
  visible: boolean;
  title: string;
  text: string;
  accentColor?: string;
  onAgree: () => void;
  onCancel: () => void;
};

export default function FullScreenWaiverViewer({
  visible,
  title,
  text,
  accentColor = BRAND.teal,
  onAgree,
  onCancel,
}: Props) {
  const insets = useSafeAreaInsets();
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const isShortText = text.length < 200;

  // Reset scroll state when modal opens
  React.useEffect(() => {
    if (visible) setHasScrolledToBottom(isShortText);
  }, [visible, isShortText]);

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const nearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 30;
    if (nearBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const canAgree = hasScrolledToBottom;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onCancel}
    >
      <StatusBar barStyle="dark-content" />
      <View style={[s.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={onCancel} hitSlop={8} style={s.closeBtn}>
            <Ionicons name="close" size={24} color={BRAND.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Waiver text */}
        <ScrollView
          style={s.scrollView}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator
          onScroll={handleScroll}
          scrollEventThrottle={100}
        >
          <Text style={s.waiverText}>{text}</Text>
        </ScrollView>

        {/* Scroll hint */}
        {!hasScrolledToBottom && (
          <View style={s.scrollHint}>
            <Ionicons name="chevron-down" size={16} color={BRAND.textMuted} />
            <Text style={s.scrollHintText}>Scroll to read the full waiver</Text>
          </View>
        )}

        {/* Agree button */}
        <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={[
              s.agreeBtn,
              { backgroundColor: canAgree ? accentColor : `${accentColor}30` },
            ]}
            onPress={onAgree}
            disabled={!canAgree}
            activeOpacity={0.8}
          >
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={canAgree ? BRAND.white : `${BRAND.white}60`}
            />
            <Text style={[s.agreeBtnText, !canAgree && { opacity: 0.5 }]}>
              I Have Read and Agree
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  closeBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: FONTS.bodyBold,
    fontSize: 17,
    color: BRAND.textPrimary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  waiverText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 16,
    color: BRAND.textPrimary,
    lineHeight: 26,
  },
  scrollHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: `${BRAND.textMuted}08`,
    borderTopWidth: 1,
    borderTopColor: BRAND.border,
  },
  scrollHintText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BRAND.border,
  },
  agreeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  agreeBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 17,
    color: BRAND.white,
  },
});
