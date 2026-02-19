import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

// =============================================================================
// TYPES
// =============================================================================

type SeasonFee = {
  id: string;
  season_id: string;
  fee_type: string;
  fee_name: string;
  amount: number;
  due_date: string | null;
  required: boolean;
  sort_order: number;
};

type Props = {
  seasonId: string;
  seasonName?: string;
};

// =============================================================================
// PRESET FEE TEMPLATES
// =============================================================================

const FEE_TEMPLATES = [
  { fee_type: 'registration', fee_name: 'Registration Fee', amount: 125 },
  { fee_type: 'uniform', fee_name: 'Uniform Package', amount: 85 },
  { fee_type: 'monthly_1', fee_name: 'Monthly Dues - Month 1', amount: 50 },
  { fee_type: 'monthly_2', fee_name: 'Monthly Dues - Month 2', amount: 50 },
  { fee_type: 'monthly_3', fee_name: 'Monthly Dues - Month 3', amount: 50 },
  { fee_type: 'tournament', fee_name: 'Tournament Fee', amount: 75 },
  { fee_type: 'other', fee_name: 'Other Fee', amount: 0 },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function SeasonFeesManager({ seasonId, seasonName }: Props) {
  const { colors } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [fees, setFees] = useState<SeasonFee[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFee, setEditingFee] = useState<SeasonFee | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [feeName, setFeeName] = useState('');
  const [feeType, setFeeType] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  const fetchFees = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('season_fees')
        .select('*')
        .eq('season_id', seasonId)
        .order('sort_order');

      if (error) throw error;
      setFees(data || []);
    } catch (error) {
      if (__DEV__) console.error('Error fetching fees:', error);
    } finally {
      setLoading(false);
    }
  }, [seasonId]);

  useEffect(() => {
    if (seasonId) {
      fetchFees();
    }
  }, [seasonId, fetchFees]);

  // =============================================================================
  // FORM HANDLERS
  // =============================================================================

  const resetForm = () => {
    setFeeName('');
    setFeeType('');
    setAmount('');
    setDueDate(null);
    setEditingFee(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (fee: SeasonFee) => {
    setEditingFee(fee);
    setFeeName(fee.fee_name);
    setFeeType(fee.fee_type);
    setAmount(fee.amount.toString());
    setDueDate(fee.due_date ? new Date(fee.due_date + 'T00:00:00') : null);
    setShowAddModal(true);
  };

  const selectTemplate = (template: typeof FEE_TEMPLATES[0]) => {
    setFeeType(template.fee_type);
    setFeeName(template.fee_name);
    setAmount(template.amount.toString());
  };

  const handleSave = async () => {
    if (!feeName.trim() || !amount.trim()) {
      Alert.alert('Missing Fields', 'Please enter a fee name and amount.');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    setSaving(true);

    try {
      const feeData = {
        season_id: seasonId,
        fee_type: feeType || feeName.toLowerCase().replace(/\s+/g, '_'),
        fee_name: feeName.trim(),
        amount: amountNum,
        due_date: dueDate ? dueDate.toISOString().split('T')[0] : null,
        sort_order: editingFee ? editingFee.sort_order : fees.length,
      };

      if (editingFee) {
        const { error } = await supabase
          .from('season_fees')
          .update(feeData)
          .eq('id', editingFee.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('season_fees')
          .insert(feeData);

        if (error) throw error;
      }

      setShowAddModal(false);
      resetForm();
      fetchFees();
    } catch (error) {
      if (__DEV__) console.error('Error saving fee:', error);
      Alert.alert('Error', 'Failed to save fee. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (fee: SeasonFee) => {
    Alert.alert(
      'Delete Fee',
      `Are you sure you want to delete "${fee.fee_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('season_fees')
                .delete()
                .eq('id', fee.id);

              if (error) throw error;
              fetchFees();
            } catch (error) {
              if (__DEV__) console.error('Error deleting fee:', error);
              Alert.alert('Error', 'Failed to delete fee.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No due date';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const totalFees = fees.reduce((sum, f) => sum + f.amount, 0);

  // =============================================================================
  // RENDER
  // =============================================================================

  if (loading) {
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ marginTop: 24 }}>
      {/* Section Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <View>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>
            Season Fees
          </Text>
          {fees.length > 0 && (
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
              Total: ${totalFees}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={openAddModal}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.primary,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 8,
          }}
        >
          <Ionicons name="add" size={18} color="#000" />
          <Text style={{ color: '#000', fontWeight: '600', marginLeft: 4 }}>Add Fee</Text>
        </TouchableOpacity>
      </View>

      {/* Fees List */}
      {fees.length === 0 ? (
        <View style={{
          backgroundColor: colors.card,
          borderRadius: 12,
          padding: 24,
          alignItems: 'center',
        }}>
          <Ionicons name="receipt-outline" size={32} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>
            No fees added yet.{'\n'}Add fees that parents will pay for this season.
          </Text>
        </View>
      ) : (
        <View style={{ backgroundColor: colors.card, borderRadius: 12, overflow: 'hidden' }}>
          {fees.map((fee, index) => (
            <TouchableOpacity
              key={fee.id}
              onPress={() => openEditModal(fee)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 14,
                borderBottomWidth: index < fees.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
              }}
            >
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: colors.primary + '20',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
                <Ionicons 
                  name={
                    fee.fee_type === 'registration' ? 'document-text' :
                    fee.fee_type === 'uniform' ? 'shirt' :
                    fee.fee_type.startsWith('monthly') ? 'calendar' :
                    fee.fee_type === 'tournament' ? 'trophy' :
                    'cash'
                  } 
                  size={18} 
                  color={colors.primary} 
                />
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '500', color: colors.text }}>
                  {fee.fee_name}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                  {fee.due_date ? `Due: ${formatDate(fee.due_date)}` : 'No due date'}
                </Text>
              </View>
              
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginRight: 8 }}>
                ${fee.amount}
              </Text>
              
              <TouchableOpacity
                onPress={() => handleDelete(fee)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={18} color="#FF3B30" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        }}>
          <View style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            paddingBottom: Platform.OS === 'ios' ? 40 : 24,
            maxHeight: '85%',
          }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}>
              <TouchableOpacity onPress={() => { setShowAddModal(false); resetForm(); }}>
                <Text style={{ fontSize: 16, color: colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>
                {editingFee ? 'Edit Fee' : 'Add Fee'}
              </Text>
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary }}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Quick Templates (only for new fees) */}
            {!editingFee && (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 10 }}>
                  Quick Add
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {FEE_TEMPLATES.slice(0, 4).map(template => (
                    <TouchableOpacity
                      key={template.fee_type}
                      onPress={() => selectTemplate(template)}
                      style={{
                        backgroundColor: feeType === template.fee_type ? colors.primary : colors.background,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{
                        fontSize: 13,
                        fontWeight: '500',
                        color: feeType === template.fee_type ? '#000' : colors.text,
                      }}>
                        {template.fee_name.split(' - ')[0]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Fee Name */}
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
              Fee Name
            </Text>
            <TextInput
              value={feeName}
              onChangeText={setFeeName}
              placeholder="e.g. Registration Fee"
              placeholderTextColor={colors.textSecondary}
              style={{
                backgroundColor: colors.background,
                borderRadius: 10,
                padding: 14,
                fontSize: 16,
                color: colors.text,
                marginBottom: 16,
              }}
            />

            {/* Amount */}
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
              Amount
            </Text>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.background,
              borderRadius: 10,
              marginBottom: 16,
            }}>
              <Text style={{ fontSize: 18, color: colors.textSecondary, paddingLeft: 14 }}>$</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                style={{
                  flex: 1,
                  padding: 14,
                  fontSize: 16,
                  color: colors.text,
                }}
              />
            </View>

            {/* Due Date */}
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
              Due Date (Optional)
            </Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.background,
                borderRadius: 10,
                padding: 14,
                marginBottom: 16,
              }}
            >
              <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
              <Text style={{
                flex: 1,
                fontSize: 16,
                color: dueDate ? colors.text : colors.textSecondary,
                marginLeft: 10,
              }}>
                {dueDate ? formatDate(dueDate.toISOString().split('T')[0]) : 'Select due date'}
              </Text>
              {dueDate && (
                <TouchableOpacity onPress={() => setDueDate(null)}>
                  <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {/* Date Picker */}
            {showDatePicker && (
              <DateTimePicker
                value={dueDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selectedDate) {
                    setDueDate(selectedDate);
                  }
                }}
              />
            )}

            {/* iOS Date Picker Done Button */}
            {Platform.OS === 'ios' && showDatePicker && (
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: 10,
                  padding: 14,
                  alignItems: 'center',
                  marginTop: 10,
                }}
              >
                <Text style={{ color: '#000', fontWeight: '600' }}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
