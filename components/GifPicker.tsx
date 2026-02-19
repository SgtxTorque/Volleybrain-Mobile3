import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// Tenor API - free tier, no key required for basic usage
const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ'; // Google's public Tenor key

type Gif = {
  id: string;
  url: string;
  preview: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (gifUrl: string) => void;
};

export default function GifPicker({ visible, onClose, onSelect }: Props) {
  if (!visible) return null;
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFeatured = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&limit=30&media_filter=gif,tinygif&contentfilter=medium`
      );
      const data = await response.json();
      
      if (data.results) {
        setGifs(data.results.map((gif: any) => ({
          id: gif.id,
          url: gif.media_formats.gif.url,
          preview: gif.media_formats.tinygif?.url || gif.media_formats.gif.url,
        })));
      }
    } catch (error) {
      if (__DEV__) console.error('Error fetching GIFs:', error);
    }
    setLoading(false);
  };

  const searchGifs = async (query: string) => {
    if (!query.trim()) {
      fetchFeatured();
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `https://tenor.googleapis.com/v2/search?key=${TENOR_API_KEY}&q=${encodeURIComponent(query)}&limit=30&media_filter=gif,tinygif&contentfilter=medium`
      );
      const data = await response.json();
      
      if (data.results) {
        setGifs(data.results.map((gif: any) => ({
          id: gif.id,
          url: gif.media_formats.gif.url,
          preview: gif.media_formats.tinygif?.url || gif.media_formats.gif.url,
        })));
      }
    } catch (error) {
      if (__DEV__) console.error('Error searching GIFs:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (visible) {
      fetchFeatured();
    }
  }, [visible]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchGifs(searchQuery);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelect = (gif: Gif) => {
    onSelect(gif.url);
    onClose();
    setSearchQuery('');
  };

  const s = createStyles(colors);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.overlay} pointerEvents={visible ? 'auto' : 'none'}>
        <View style={s.container}>
          <View style={s.header}>
            <Text style={s.title}>GIFs</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={s.searchContainer}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={s.searchInput}
              placeholder="Search GIFs..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); fetchFeatured(); }}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View style={s.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : gifs.length === 0 ? (
            <View style={s.loadingContainer}>
              <Text style={s.noResults}>No GIFs found</Text>
            </View>
          ) : (
            <ScrollView style={s.gifGrid} contentContainerStyle={s.gifGridContent}>
              <View style={s.gifRow}>
                {gifs.map(gif => (
                  <TouchableOpacity key={gif.id} style={s.gifBtn} onPress={() => handleSelect(gif)}>
                    <Image source={{ uri: gif.preview }} style={s.gifImage} resizeMode="cover" />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          <View style={s.footer}>
            <Image 
              source={{ uri: 'https://www.gstatic.com/tenor/web/attribution/PB_tenor_logo_blue_horizontal.png' }} 
              style={s.tenorLogo} 
              resizeMode="contain"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '70%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, margin: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, gap: 8 },
  searchInput: { flex: 1, fontSize: 16, color: colors.text },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noResults: { fontSize: 16, color: colors.textMuted },
  gifGrid: { flex: 1 },
  gifGridContent: { padding: 4 },
  gifRow: { flexDirection: 'row', flexWrap: 'wrap' },
  gifBtn: { width: '33.33%', aspectRatio: 1, padding: 2 },
  gifImage: { width: '100%', height: '100%', borderRadius: 8, backgroundColor: colors.border },
  footer: { padding: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border },
  tenorLogo: { width: 80, height: 20 },
});