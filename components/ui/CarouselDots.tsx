import React from 'react';
import { StyleSheet, View } from 'react-native';

type CarouselDotsProps = {
  total: number;
  activeIndex: number;
  activeColor?: string;
  inactiveColor?: string;
};

export default function CarouselDots({
  total,
  activeIndex,
  activeColor = '#333',
  inactiveColor = '#999',
}: CarouselDotsProps) {
  if (total <= 1) return null;

  return (
    <View style={styles.container}>
      {Array.from({ length: total }, (_, i) => {
        const isActive = i === activeIndex;
        const distance = Math.abs(i - activeIndex);

        // Instagram-style fade for 5+ items
        let scale = 1;
        let dotOpacity = 1;
        if (total >= 5) {
          if (distance > 2) {
            scale = 0.6;
            dotOpacity = 0.3;
          } else if (distance > 1) {
            scale = 0.8;
            dotOpacity = 0.6;
          }
        }

        return (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: isActive ? activeColor : inactiveColor,
                width: isActive ? 8 : 6,
                height: isActive ? 8 : 6,
                opacity: isActive ? 1 : dotOpacity,
                transform: [{ scale: isActive ? 1 : scale }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  dot: {
    borderRadius: 999,
  },
});
