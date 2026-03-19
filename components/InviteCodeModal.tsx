/**
 * InviteCodeModal — displays the team's invite code with copy + share actions.
 */
import React, { useState } from 'react';
import { Modal, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

type InviteCodeModalProps = {
  visible: boolean;
  onClose: () => void;
  teamName: string;
  inviteCode: string;
};

export default function InviteCodeModal({ visible, onClose, teamName, inviteCode }: InviteCodeModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join ${teamName} on Lynx! Download the app and enter code: ${inviteCode}`,
      });
    } catch {
      // User cancelled share
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>Invite Parents to {teamName}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={BRAND.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Invite code display */}
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{inviteCode || '---'}</Text>
          </View>

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} activeOpacity={0.7}>
              <Ionicons name={copied ? 'checkmark-circle' : 'copy-outline'} size={18} color={BRAND.white} />
              <Text style={styles.copyBtnText}>{copied ? 'Copied!' : 'Copy Code'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.7}>
              <Ionicons name="share-outline" size={18} color={BRAND.skyBlue} />
              <Text style={styles.shareBtnText}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* Instructions */}
          <Text style={styles.instructions}>
            Parents should download Lynx, create an account, and enter this code to join your team.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: BRAND.white,
    borderRadius: 14,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: BRAND.textPrimary,
    flex: 1,
    marginRight: 12,
  },
  codeBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: BRAND.skyBlue,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  codeText: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 26,
    color: BRAND.navy,
    letterSpacing: 3,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  copyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: BRAND.skyBlue,
    borderRadius: 10,
    paddingVertical: 12,
  },
  copyBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.white,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: BRAND.offWhite,
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  shareBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.skyBlue,
  },
  instructions: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
