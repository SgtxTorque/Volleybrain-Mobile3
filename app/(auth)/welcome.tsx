import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

const { width: SCREEN_W } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  // Entrance animations
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const mascotY = useRef(new Animated.Value(40)).current;
  const mascotOpacity = useRef(new Animated.Value(0)).current;
  const cta1Y = useRef(new Animated.Value(30)).current;
  const cta1Opacity = useRef(new Animated.Value(0)).current;
  const cta2Y = useRef(new Animated.Value(30)).current;
  const cta2Opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo fade in (300ms)
    Animated.timing(logoOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Mascot spring up (400ms delay)
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(mascotY, {
          toValue: 0,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(mascotOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }, 300);

    // CTAs stagger in
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(cta1Y, { toValue: 0, friction: 7, useNativeDriver: true }),
        Animated.timing(cta1Opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    }, 600);

    setTimeout(() => {
      Animated.parallel([
        Animated.spring(cta2Y, { toValue: 0, friction: 7, useNativeDriver: true }),
        Animated.timing(cta2Opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    }, 700);
  }, []);

  return (
    <LinearGradient
      colors={[BRAND.navy, BRAND.skyBlue]}
      style={s.gradient}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
    >
      <SafeAreaView style={s.safe}>
        {/* Logo - upper third */}
        <Animated.View style={[s.logoWrap, { opacity: logoOpacity }]}>
          <Image
            source={require('@/assets/images/lynx-logo.png')}
            style={s.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Mascot - center */}
        <Animated.View
          style={[
            s.mascotWrap,
            { opacity: mascotOpacity, transform: [{ translateY: mascotY }] },
          ]}
        >
          <Image
            source={require('@/assets/images/lynx-mascot.png')}
            style={s.mascot}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Tagline */}
        <Animated.Text style={[s.tagline, { opacity: mascotOpacity }]}>
          Youth Sports Management
        </Animated.Text>

        {/* CTAs - bottom third */}
        <View style={s.ctaWrap}>
          {/* Get Started (filled teal) */}
          <Animated.View style={{ opacity: cta1Opacity, transform: [{ translateY: cta1Y }] }}>
            <TouchableOpacity
              style={s.ctaPrimary}
              onPress={() => router.push('/(auth)/signup')}
              activeOpacity={0.85}
            >
              <Text style={s.ctaPrimaryText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </Animated.View>

          {/* I Already Have an Account (outlined) */}
          <Animated.View style={{ opacity: cta2Opacity, transform: [{ translateY: cta2Y }] }}>
            <TouchableOpacity
              style={s.ctaSecondary}
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.85}
            >
              <Text style={s.ctaSecondaryText}>I Already Have an Account</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Legal */}
        <Animated.Text style={[s.legal, { opacity: cta2Opacity }]}>
          By continuing, you agree to our{' '}
          <Text style={s.legalLink} onPress={() => router.push('/privacy-policy')}>
            Privacy Policy
          </Text>{' '}
          and{' '}
          <Text style={s.legalLink} onPress={() => router.push('/terms-of-service')}>
            Terms of Service
          </Text>
        </Animated.Text>
      </SafeAreaView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safe: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  logoWrap: {
    marginTop: 48,
    alignItems: 'center',
  },
  logo: {
    width: 180,
    height: 74,
  },
  mascotWrap: {
    alignItems: 'center',
  },
  mascot: {
    width: 140,
    height: 200,
  },
  tagline: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.5,
    marginTop: -8,
  },
  ctaWrap: {
    width: '100%',
    gap: 12,
  },
  ctaPrimary: {
    backgroundColor: BRAND.teal,
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaPrimaryText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 18,
    color: '#fff',
  },
  ctaSecondary: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaSecondaryText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: '#fff',
  },
  legal: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 16,
  },
  legalLink: {
    color: 'rgba(255,255,255,0.7)',
    textDecorationLine: 'underline',
  },
});
