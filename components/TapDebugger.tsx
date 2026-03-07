/**
 * TapDebugger — temporary debug wrapper to verify touches reach components.
 * Wrap ANY component to get a red "TAP" dot and Alert on press.
 * REMOVE after debugging is complete.
 */
import React from 'react';
import { View, Text, Pressable, Alert } from 'react-native';

type Props = {
  label: string;
  onActualPress?: () => void;
  children: React.ReactNode;
};

export function TapDebug({ label, onActualPress, children }: Props) {
  return (
    <Pressable
      onPress={() => {
        console.log(`[TapDebug] "${label}" tapped`);
        Alert.alert(
          'TAP DETECTED',
          `"${label}" was tapped!\n\nThis proves the touch reached this component.`,
        );
        if (onActualPress) onActualPress();
      }}
      style={{ position: 'relative' }}
    >
      {children}
      {__DEV__ && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            backgroundColor: 'red',
            borderRadius: 4,
            padding: 2,
            zIndex: 9999,
          }}
          pointerEvents="none"
        >
          <Text style={{ color: 'white', fontSize: 8, fontWeight: '800' }}>
            TAP
          </Text>
        </View>
      )}
    </Pressable>
  );
}
