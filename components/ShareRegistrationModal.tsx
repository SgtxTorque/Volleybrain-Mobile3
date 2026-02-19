import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

// =============================================================================
// USAGE:
// 
// import ShareRegistrationModal from '@/components/ShareRegistrationModal';
// 
// const [showShare, setShowShare] = useState(false);
// 
// <TouchableOpacity onPress={() => setShowShare(true)}>
//   <Text>Share Registration</Text>
// </TouchableOpacity>
// 
// <ShareRegistrationModal 
//   visible={showShare} 
//   onClose={() => setShowShare(false)} 
// />
// =============================================================================

const BASE_REGISTRATION_URL = 'https://app.volleybrain.com/register';

type Props = {
  visible: boolean;
  onClose: () => void;
  // Optional: customize the URL (e.g., add referral tracking)
  customUrl?: string;
  // Optional: customize the title
  title?: string;
  onMount?: () => void;
  onUnmount?: () => void;
  onVisibleChange?: (v: boolean) => void;
};

export default function ShareRegistrationModal({
  visible,
  onClose,
  customUrl,
  title = 'Share Registration',
  onMount,
  onUnmount,
  onVisibleChange,
}: Props) {
  if (!visible) return null;
  const { colors } = useTheme();
  const { organization, profile } = useAuth();
  const [copied, setCopied] = useState(false);
  const orgName = organization?.name || 'our organization';
  const orgSlug = (organization as any)?.slug || profile?.current_organization_id || '';
  const dynamicUrl = orgSlug ? `${BASE_REGISTRATION_URL}/${orgSlug}` : BASE_REGISTRATION_URL;

  React.useEffect(() => {
    onMount?.();
    onVisibleChange?.(true);
    return () => {
      onUnmount?.();
      onVisibleChange?.(false);
    };
  }, []);

  const url = customUrl || dynamicUrl;

  const handleCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy link');
    }
  };

  const handleShare = async () => {
    try {
      const message = `Join ${orgName}! Register your player here: ${url}`;

      await Share.share({
        message: message,
        url: url, // iOS only
        title: `${orgName} Registration`,
      });
    } catch (error: any) {
      if (error?.message !== 'User did not share') {
        if (__DEV__) console.error('Share error:', error);
      }
    }
  };

  const handleTextShare = async () => {
    const message = `Hey! I wanted to share this with you - ${orgName} is open for registration. Sign up here: ${url}`;
    
    try {
      await Share.share({
        message: message,
      });
    } catch (error) {
      if (__DEV__) console.error('Text share error:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
      }} pointerEvents={visible ? 'auto' : 'none'}>
        <View style={{
          backgroundColor: colors.card,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}>
            <View style={{ width: 40 }} />
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>
              {title}
            </Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* QR Code Section */}
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <View style={{
              backgroundColor: '#FFFFFF',
              padding: 16,
              borderRadius: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}>
              <QRCode
                value={url}
                size={180}
                backgroundColor="#FFFFFF"
                color="#000000"
              />
            </View>
            
            <Text style={{ 
              color: colors.textSecondary, 
              fontSize: 13, 
              marginTop: 12,
              textAlign: 'center',
            }}>
              Scan to open registration
            </Text>
          </View>

          {/* URL Display */}
          <View style={{
            marginHorizontal: 16,
            marginBottom: 16,
            backgroundColor: colors.background,
            borderRadius: 12,
            padding: 12,
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            <Ionicons name="link" size={18} color={colors.textSecondary} />
            <Text 
              style={{ 
                flex: 1, 
                color: colors.text, 
                fontSize: 13, 
                marginLeft: 8,
              }}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {url}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            {/* Copy Link Button */}
            <TouchableOpacity
              onPress={handleCopyLink}
              style={{
                backgroundColor: copied ? colors.success : colors.primary,
                paddingVertical: 14,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Ionicons 
                name={copied ? 'checkmark' : 'copy-outline'} 
                size={20} 
                color={copied ? '#fff' : colors.background} 
              />
              <Text style={{ 
                color: copied ? '#fff' : colors.background, 
                fontWeight: '600', 
                fontSize: 16 
              }}>
                {copied ? 'Copied!' : 'Copy Link'}
              </Text>
            </TouchableOpacity>

            {/* Share Row */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {/* Text/Message Share */}
              <TouchableOpacity
                onPress={handleTextShare}
                style={{
                  flex: 1,
                  backgroundColor: '#34C759',
                  paddingVertical: 14,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Ionicons name="chatbubble" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '600' }}>Text</Text>
              </TouchableOpacity>

              {/* General Share */}
              <TouchableOpacity
                onPress={handleShare}
                style={{
                  flex: 1,
                  backgroundColor: colors.background,
                  paddingVertical: 14,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Ionicons name="share-outline" size={18} color={colors.text} />
                <Text style={{ color: colors.text, fontWeight: '600' }}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Helper Text */}
          <Text style={{
            textAlign: 'center',
            color: colors.textSecondary,
            fontSize: 12,
            marginTop: 16,
            paddingHorizontal: 32,
          }}>
            Share this link with parents to register for {orgName}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

// =============================================================================
// COMPACT SHARE BUTTON - Use this to add a share button anywhere
// =============================================================================

type ShareButtonProps = {
  style?: any;
  iconOnly?: boolean;
  label?: string;
};

export function ShareRegistrationButton({ style, iconOnly = false, label = 'Share' }: ShareButtonProps) {
  const { colors } = useTheme();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => setShowModal(true)}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: colors.primary + '20',
            paddingHorizontal: iconOnly ? 10 : 14,
            paddingVertical: 8,
            borderRadius: 8,
          },
          style,
        ]}
      >
        <Ionicons name="share-outline" size={18} color={colors.primary} />
        {!iconOnly && (
          <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>
            {label}
          </Text>
        )}
      </TouchableOpacity>

      <ShareRegistrationModal
        visible={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}

// =============================================================================
// FAB (Floating Action Button) VERSION - Sticky share button
// =============================================================================

export function ShareRegistrationFAB() {
  const { colors } = useTheme();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => setShowModal(true)}
        style={{
          position: 'absolute',
          bottom: 90,
          right: 16,
          backgroundColor: colors.primary,
          width: 56,
          height: 56,
          borderRadius: 28,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 5,
        }}
      >
        <Ionicons name="qr-code" size={24} color={colors.background} />
      </TouchableOpacity>

      <ShareRegistrationModal
        visible={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
