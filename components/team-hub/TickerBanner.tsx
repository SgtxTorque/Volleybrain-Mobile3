/**
 * TickerBanner — editable team motto / announcement marquee.
 * Auto-scrolls if text overflows. Coach/admin can edit inline.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

export type TickerBannerProps = {
  teamId: string;
  teamName: string;
  motto: string | null;
  canEdit: boolean;
  onMottoUpdated?: (motto: string) => void;
};

export default function TickerBanner({ teamId, teamName, motto, canEdit, onMottoUpdated }: TickerBannerProps) {
  const displayText = motto || `Welcome to ${teamName}!`;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayText);
  const [textWidth, setTextWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const scrollAnim = useRef(new Animated.Value(0)).current;

  const shouldScroll = textWidth > containerWidth && !editing;

  // Marquee animation
  useEffect(() => {
    if (!shouldScroll) {
      scrollAnim.setValue(0);
      return;
    }
    const distance = textWidth + containerWidth;
    const duration = distance * 25; // ~25ms per pixel
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(2000),
        Animated.timing(scrollAnim, {
          toValue: -textWidth - 40,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(scrollAnim, {
          toValue: containerWidth,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shouldScroll, textWidth, containerWidth]);

  const handleSave = async () => {
    const trimmed = draft.trim().slice(0, 150);
    setEditing(false);
    if (trimmed === (motto || '')) return;

    const { error } = await supabase.from('teams').update({ motto: trimmed }).eq('id', teamId);
    if (!error) onMottoUpdated?.(trimmed);
  };

  if (editing) {
    return (
      <View style={s.container}>
        <TextInput
          style={s.input}
          value={draft}
          onChangeText={(t) => setDraft(t.slice(0, 150))}
          maxLength={150}
          autoFocus
          onSubmitEditing={handleSave}
          onBlur={handleSave}
          returnKeyType="done"
          placeholder="Team motto or announcement..."
          placeholderTextColor={BRAND.textFaint}
        />
        <Text style={s.charCount}>{draft.length}/150</Text>
      </View>
    );
  }

  return (
    <View
      style={s.container}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width - 48)}
    >
      <View style={s.tickerRow}>
        <View style={s.tickerOverflow}>
          <Animated.View style={{ transform: [{ translateX: shouldScroll ? scrollAnim : 0 }] }}>
            <Text
              style={s.tickerText}
              numberOfLines={1}
              onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
            >
              {displayText}
            </Text>
          </Animated.View>
        </View>
        {canEdit && (
          <TouchableOpacity
            style={s.editBtn}
            onPress={() => { setDraft(motto || ''); setEditing(true); }}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil" size={14} color={BRAND.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: BRAND.warmGray,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  tickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tickerOverflow: {
    flex: 1,
    overflow: 'hidden',
  },
  tickerText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.textPrimary,
  },
  editBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.skyBlue,
    paddingVertical: 4,
  },
  charCount: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: BRAND.textFaint,
    textAlign: 'right',
    marginTop: 2,
  },
});
