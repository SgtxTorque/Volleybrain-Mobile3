import { useTheme } from '@/lib/theme';
import React from 'react';
import EmojiPickerModal from 'rn-emoji-keyboard';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
};

export default function EmojiPicker({ visible, onClose, onSelect }: Props) {
  const { colors, isDark } = useTheme();

  return (
    <EmojiPickerModal
      open={visible}
      onClose={onClose}
      onEmojiSelected={(emoji) => onSelect(emoji.emoji)}
      enableSearchBar
      enableRecentlyUsed
      categoryPosition="top"
      allowMultipleSelections
      theme={{
        backdrop: isDark ? '#00000080' : '#00000040',
        knob: isDark ? '#ffffff40' : '#00000020',
        container: isDark ? '#1a1a2e' : '#ffffff',
        header: isDark ? '#ffffff' : '#000000',
        skinTonesContainer: isDark ? '#2a2a3e' : '#f0f0f0',
        category: {
          icon: isDark ? '#ffffff80' : '#00000060',
          iconActive: isDark ? '#ffffff' : '#000000',
          container: isDark ? '#1a1a2e' : '#ffffff',
          containerActive: colors.primary + '20',
        },
        search: {
          text: isDark ? '#ffffff' : '#000000',
          placeholder: isDark ? '#ffffff60' : '#00000060',
          icon: isDark ? '#ffffff60' : '#00000060',
          background: isDark ? '#ffffff10' : '#00000008',
        },
      }}
    />
  );
}
