import AppBackground from '@/components/AppBackground';
import {
  BackgroundConfig,
  GRADIENT_OPTIONS,
  PATTERN_OPTIONS,
  SOLID_OPTIONS,
  useBackground,
} from '@/lib/background';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Category = 'solids' | 'gradients' | 'patterns' | 'custom';

export default function BackgroundPickerScreen() {
  const { colors } = useTheme();
  const { background, setBackground, resetToDefault } = useBackground();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<Category>(
    background.type === 'solid'
      ? 'solids'
      : background.type === 'gradient'
        ? 'gradients'
        : background.type === 'pattern'
          ? 'patterns'
          : 'custom'
  );
  const [opacity, setOpacity] = useState(background.opacity);

  const s = createStyles(colors);

  const categories: { key: Category; label: string; icon: string }[] = [
    { key: 'solids', label: 'Solids', icon: 'color-fill' },
    { key: 'gradients', label: 'Gradients', icon: 'color-palette' },
    { key: 'patterns', label: 'Patterns', icon: 'shapes' },
    { key: 'custom', label: 'Custom', icon: 'image' },
  ];

  const selectBackground = (config: BackgroundConfig) => {
    setBackground(config);
  };

  const handleOpacityChange = (newOpacity: number) => {
    setOpacity(newOpacity);
    setBackground({ ...background, opacity: newOpacity });
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      selectBackground({
        type: 'custom',
        value: result.assets[0].uri,
        opacity,
      });
    }
  };

  const isActive = (type: BackgroundConfig['type'], value: string) =>
    background.type === type && background.value === value;

  return (
    <View style={s.root}>
      {/* Live preview background */}
      <AppBackground />

      <SafeAreaView style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.title}>Background</Text>
            <Text style={s.subtitle}>Personalize your app</Text>
          </View>
          <TouchableOpacity onPress={resetToDefault} style={s.resetBtn}>
            <Ionicons name="refresh" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.categoryBar}
        >
          {categories.map((cat) => {
            const active = activeCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[s.categoryTab, active && s.categoryTabActive]}
                onPress={() => setActiveCategory(cat.key)}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={18}
                  color={active ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[s.categoryTabText, active && s.categoryTabTextActive]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Content */}
        <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
          {/* Opacity Slider */}
          {(activeCategory === 'patterns' || activeCategory === 'custom') && (
            <View style={s.opacitySection}>
              <Text style={s.sectionLabel}>OPACITY</Text>
              <View style={s.opacityRow}>
                {[0.05, 0.08, 0.1, 0.12, 0.15].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[
                      s.opacityBtn,
                      opacity === val && s.opacityBtnActive,
                    ]}
                    onPress={() => handleOpacityChange(val)}
                  >
                    <Text
                      style={[
                        s.opacityBtnText,
                        opacity === val && s.opacityBtnTextActive,
                      ]}
                    >
                      {Math.round(val * 100)}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Solids Grid */}
          {activeCategory === 'solids' && (
            <View style={s.gridSection}>
              <Text style={s.sectionLabel}>SOLID COLORS</Text>
              <View style={s.grid}>
                {SOLID_OPTIONS.map((solid) => {
                  const active = isActive('solid', solid.key);
                  return (
                    <TouchableOpacity
                      key={solid.key}
                      style={[s.swatch, active && s.swatchActive]}
                      onPress={() =>
                        selectBackground({
                          type: 'solid',
                          value: solid.key,
                          opacity,
                        })
                      }
                    >
                      <View
                        style={[
                          s.swatchColor,
                          {
                            backgroundColor: solid.color,
                            borderColor:
                              solid.color === '#FFFFFF'
                                ? colors.border
                                : 'transparent',
                            borderWidth: solid.color === '#FFFFFF' ? 1 : 0,
                          },
                        ]}
                      />
                      {active && (
                        <View style={s.checkmark}>
                          <Ionicons
                            name="checkmark-circle"
                            size={22}
                            color={colors.primary}
                          />
                        </View>
                      )}
                      <Text style={s.swatchLabel}>{solid.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Gradients Grid */}
          {activeCategory === 'gradients' && (
            <View style={s.gridSection}>
              <Text style={s.sectionLabel}>GRADIENTS</Text>
              <View style={s.grid}>
                {GRADIENT_OPTIONS.map((grad) => {
                  const active = isActive('gradient', grad.key);
                  return (
                    <TouchableOpacity
                      key={grad.key}
                      style={[s.swatch, active && s.swatchActive]}
                      onPress={() =>
                        selectBackground({
                          type: 'gradient',
                          value: grad.key,
                          opacity,
                        })
                      }
                    >
                      <LinearGradient
                        colors={grad.colors as [string, string, ...string[]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={s.swatchColor}
                      />
                      {active && (
                        <View style={s.checkmark}>
                          <Ionicons
                            name="checkmark-circle"
                            size={22}
                            color={colors.primary}
                          />
                        </View>
                      )}
                      <Text style={s.swatchLabel}>{grad.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Patterns Grid */}
          {activeCategory === 'patterns' && (
            <View style={s.gridSection}>
              <Text style={s.sectionLabel}>SPORT PATTERNS</Text>
              <View style={s.grid}>
                {PATTERN_OPTIONS.map((pat) => {
                  const active = isActive('pattern', pat.key);
                  return (
                    <TouchableOpacity
                      key={pat.key}
                      style={[s.swatch, active && s.swatchActive]}
                      onPress={() =>
                        selectBackground({
                          type: 'pattern',
                          value: pat.key,
                          opacity,
                        })
                      }
                    >
                      <View style={[s.swatchColor, s.patternSwatch]}>
                        <Ionicons
                          name={pat.icon as any}
                          size={28}
                          color="white"
                        />
                      </View>
                      {active && (
                        <View style={s.checkmark}>
                          <Ionicons
                            name="checkmark-circle"
                            size={22}
                            color={colors.primary}
                          />
                        </View>
                      )}
                      <Text style={s.swatchLabel}>{pat.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Custom Upload */}
          {activeCategory === 'custom' && (
            <View style={s.gridSection}>
              <Text style={s.sectionLabel}>CUSTOM IMAGE</Text>
              <TouchableOpacity style={s.uploadCard} onPress={handlePickImage}>
                <View style={s.uploadIcon}>
                  <Ionicons name="cloud-upload" size={40} color={colors.primary} />
                </View>
                <Text style={s.uploadTitle}>Upload Background Image</Text>
                <Text style={s.uploadSubtitle}>
                  Choose a photo from your library. It will be displayed at low
                  opacity behind all content.
                </Text>
              </TouchableOpacity>
              {background.type === 'custom' && background.value && (
                <View style={s.currentCustom}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  <Text style={s.currentCustomText}>
                    Custom background active
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1 },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backBtn: { padding: 8 },
    headerCenter: { flex: 1, marginLeft: 8 },
    title: { fontSize: 28, fontWeight: '800', color: colors.text },
    subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    resetBtn: {
      padding: 10,
      backgroundColor: colors.glassCard,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },

    categoryBar: { paddingHorizontal: 16, gap: 8, marginBottom: 16 },
    categoryTab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    categoryTabActive: {
      backgroundColor: colors.primary + '20',
      borderColor: colors.primary + '40',
    },
    categoryTabText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
    categoryTabTextActive: { color: colors.primary },

    content: { flex: 1, paddingHorizontal: 16 },

    opacitySection: { marginBottom: 20 },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 1.5,
      marginBottom: 12,
    },
    opacityRow: { flexDirection: 'row', gap: 8 },
    opacityBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      alignItems: 'center',
    },
    opacityBtnActive: {
      backgroundColor: colors.primary + '20',
      borderColor: colors.primary,
    },
    opacityBtnText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
    opacityBtnTextActive: { color: colors.primary },

    gridSection: { marginBottom: 24 },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    swatch: {
      width: '30%' as any,
      alignItems: 'center',
    },
    swatchActive: {},
    swatchColor: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: 16,
      overflow: 'hidden',
    },
    patternSwatch: {
      backgroundColor: '#1E293B',
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkmark: {
      position: 'absolute',
      top: 6,
      right: 6,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 11,
    },
    swatchLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
      marginTop: 6,
      textAlign: 'center',
    },

    uploadCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 20,
      padding: 32,
      alignItems: 'center',
      borderStyle: 'dashed',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        },
        android: { elevation: 6 },
      }),
    },
    uploadIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    uploadTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    uploadSubtitle: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 18,
    },
    currentCustom: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 16,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.success + '15',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.success + '30',
    },
    currentCustomText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.success,
    },
  });
