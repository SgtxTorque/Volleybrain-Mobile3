import { Sport, useSport } from '@/lib/sport';
import { useTheme } from '@/lib/theme';
import React, { useState } from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function SportSelector() {
  const { colors } = useTheme();
  const { sports, activeSport, setActiveSport, sportColors } = useSport();
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelectSport = (sport: Sport) => {
    setActiveSport(sport);
    setModalVisible(false);
  };

  if (!activeSport || sports.length <= 1) return null;

  return (
    <>
      <TouchableOpacity
        style={[styles.selector, { backgroundColor: sportColors.primary + '20', borderColor: sportColors.primary }]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.icon}>{activeSport.icon}</Text>
        <Text style={[styles.sportName, { color: sportColors.primary }]}>{activeSport.code}</Text>
        <Text style={[styles.arrow, { color: sportColors.primary }]}>▼</Text>
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Switch Sport</Text>
            
            {sports.map(sport => (
              <TouchableOpacity
                key={sport.id}
                style={[
                  styles.sportOption,
                  { 
                    backgroundColor: sport.id === activeSport.id 
                      ? sport.color_primary + '20' 
                      : colors.background,
                    borderColor: sport.id === activeSport.id 
                      ? sport.color_primary 
                      : colors.border,
                  }
                ]}
                onPress={() => handleSelectSport(sport)}
              >
                <Text style={styles.sportIcon}>{sport.icon}</Text>
                <View style={styles.sportInfo}>
                  <Text style={[styles.sportTitle, { color: colors.text }]}>{sport.name}</Text>
                  <Text style={[styles.sportCode, { color: sport.color_primary }]}>{sport.code}</Text>
                </View>
                {sport.id === activeSport.id && (
                  <View style={[styles.checkmark, { backgroundColor: sport.color_primary }]}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  icon: {
    fontSize: 16,
  },
  sportName: {
    fontSize: 14,
    fontWeight: '600',
  },
  arrow: {
    fontSize: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  sportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  sportIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  sportInfo: {
    flex: 1,
  },
  sportTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sportCode: {
    fontSize: 14,
    fontWeight: '500',
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});