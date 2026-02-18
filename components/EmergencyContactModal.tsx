import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type EmergencyContactModalProps = {
  visible: boolean;
  onClose: () => void;
  player: {
    first_name?: string;
    last_name?: string;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    emergency_contact_relation?: string | null;
    medical_conditions?: string | null;
    allergies?: string | null;
    medications?: string | null;
  } | null;
};

export default function EmergencyContactModal({ visible, onClose, player }: EmergencyContactModalProps) {
  if (!visible) return null;
  const { colors } = useTheme();
  const s = createStyles(colors);

  if (!player) return null;

  const hasEmergencyContact = player.emergency_contact_name || player.emergency_contact_phone;
  const hasMedical = player.medical_conditions || player.allergies || player.medications;

  const handleCall = () => {
    if (!player.emergency_contact_phone) return;
    const phoneNumber = player.emergency_contact_phone.replace(/[^\d+]/g, '');
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Unable to Call', 'Could not open the phone dialer.');
    });
  };

  const handleText = () => {
    if (!player.emergency_contact_phone) return;
    const phoneNumber = player.emergency_contact_phone.replace(/[^\d+]/g, '');
    Linking.openURL(`sms:${phoneNumber}`).catch(() => {
      Alert.alert('Unable to Text', 'Could not open the messaging app.');
    });
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.card} onPress={() => {}}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerIcon}>
              <Ionicons name="medkit" size={24} color={colors.danger} />
            </View>
            <View style={s.headerText}>
              <Text style={s.title}>EMERGENCY INFO</Text>
              <Text style={s.playerName}>
                {player.first_name} {player.last_name}
              </Text>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={s.content}>
            {/* Emergency Contact Section */}
            {hasEmergencyContact ? (
              <View style={s.section}>
                <Text style={s.sectionTitle}>EMERGENCY CONTACT</Text>
                <View style={s.contactCard}>
                  <View style={s.contactInfo}>
                    <Text style={s.contactName}>
                      {player.emergency_contact_name || 'Unknown'}
                    </Text>
                    {player.emergency_contact_relation && (
                      <View style={s.relationBadge}>
                        <Text style={s.relationText}>
                          {player.emergency_contact_relation}
                        </Text>
                      </View>
                    )}
                    {player.emergency_contact_phone && (
                      <Text style={s.contactPhone}>
                        {player.emergency_contact_phone}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Action Buttons */}
                {player.emergency_contact_phone && (
                  <View style={s.actionButtons}>
                    <TouchableOpacity style={s.callButton} onPress={handleCall}>
                      <Ionicons name="call" size={22} color="#fff" />
                      <Text style={s.callButtonText}>Call Now</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.textButton} onPress={handleText}>
                      <Ionicons name="chatbubble" size={22} color={colors.info} />
                      <Text style={s.textButtonText}>Text</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              <View style={s.section}>
                <Text style={s.sectionTitle}>EMERGENCY CONTACT</Text>
                <View style={s.warningCard}>
                  <Ionicons name="warning" size={28} color={colors.warning} />
                  <Text style={s.warningText}>
                    No emergency contact on file for this player.
                  </Text>
                </View>
              </View>
            )}

            {/* Medical Section */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>MEDICAL INFORMATION</Text>

              {hasMedical ? (
                <View style={s.medicalCard}>
                  {player.medical_conditions && (
                    <View style={s.medicalRow}>
                      <View style={s.medicalIconWrap}>
                        <Ionicons name="heart" size={18} color={colors.danger} />
                      </View>
                      <View style={s.medicalContent}>
                        <Text style={s.medicalLabel}>Medical Conditions</Text>
                        <Text style={s.medicalValue}>{player.medical_conditions}</Text>
                      </View>
                    </View>
                  )}

                  {player.allergies && (
                    <View style={s.medicalRow}>
                      <View style={[s.medicalIconWrap, { backgroundColor: colors.warning + '20' }]}>
                        <Ionicons name="alert-circle" size={18} color={colors.warning} />
                      </View>
                      <View style={s.medicalContent}>
                        <Text style={s.medicalLabel}>Allergies</Text>
                        <Text style={[s.medicalValue, { color: colors.warning }]}>
                          {player.allergies}
                        </Text>
                      </View>
                    </View>
                  )}

                  {player.medications && (
                    <View style={s.medicalRow}>
                      <View style={[s.medicalIconWrap, { backgroundColor: colors.info + '20' }]}>
                        <Ionicons name="medical" size={18} color={colors.info} />
                      </View>
                      <View style={s.medicalContent}>
                        <Text style={s.medicalLabel}>Medications</Text>
                        <Text style={s.medicalValue}>{player.medications}</Text>
                      </View>
                    </View>
                  )}
                </View>
              ) : (
                <View style={s.noMedicalCard}>
                  <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                  <Text style={s.noMedicalText}>
                    No medical conditions, allergies, or medications reported.
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    backgroundColor: colors.glassCard,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.danger + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.danger,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  playerName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  contactCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactInfo: {
    alignItems: 'center',
  },
  contactName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  relationBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  relationText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  contactPhone: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
    letterSpacing: 0.5,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.success,
    paddingVertical: 14,
    borderRadius: 12,
  },
  callButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  textButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.info + '20',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.info + '40',
  },
  textButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.info,
  },
  warningCard: {
    backgroundColor: colors.warning + '15',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  warningText: {
    fontSize: 14,
    color: colors.warning,
    textAlign: 'center',
    fontWeight: '500',
  },
  medicalCard: {
    backgroundColor: colors.danger + '10',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.danger + '25',
  },
  medicalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '40',
  },
  medicalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.danger + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medicalContent: {
    flex: 1,
  },
  medicalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  medicalValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.danger,
    lineHeight: 20,
  },
  noMedicalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.success + '10',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.success + '25',
  },
  noMedicalText: {
    fontSize: 14,
    color: colors.success,
    flex: 1,
    fontWeight: '500',
  },
});
