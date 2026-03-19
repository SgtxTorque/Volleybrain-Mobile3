/**
 * Volunteer Assignment — 3-step flow for coaches/admins.
 * Steps: Select Event -> Assign Roles -> Confirm & Notify
 *
 * Uses: event_volunteers, schedule_events, profiles tables.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { checkRoleAchievements } from '@/lib/achievement-engine';
import { useAuth } from '@/lib/auth';
import { displayTextStyle, radii, shadows, spacing } from '@/lib/design-tokens';
import { usePermissions } from '@/lib/permissions-context';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { FONTS } from '@/theme/fonts';

// ============================================================================
// TYPES
// ============================================================================

type ScheduleEvent = {
  id: string;
  title: string;
  event_date: string;
  event_type: string;
  team_id: string;
};

type ParentProfile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
};

type RoleDefinition = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  capacity: number;
};

type Assignee = {
  profileId: string;
  name: string;
};

type Assignments = Record<string, Assignee[]>;

// ============================================================================
// CONSTANTS
// ============================================================================

const STEP_LABELS = ['Select Event', 'Assign Roles', 'Confirm'];

const VOLUNTEER_ROLES: RoleDefinition[] = [
  { key: 'scorekeeper', label: 'Scorekeeper', icon: 'clipboard-outline', capacity: 1 },
  { key: 'line_judge', label: 'Line Judge', icon: 'eye-outline', capacity: 2 },
  { key: 'snack_parent', label: 'Snack Parent', icon: 'fast-food-outline', capacity: 1 },
];

// ============================================================================
// HELPERS
// ============================================================================

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === now.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

const eventTypeColor = (type: string, colors: any): string => {
  switch (type) {
    case 'game':
      return colors.danger;
    case 'practice':
      return colors.success;
    case 'tournament':
      return colors.warning;
    default:
      return colors.info;
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function VolunteerAssignmentScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { workingSeason } = useSeason();
  const router = useRouter();
  // ─── Role Guard ────────────────────────────────
  const { isAdmin, isCoach, isTeamManager, loading: permLoading } = usePermissions();

  if (permLoading) return null;

  if (!isAdmin && !isCoach && !isTeamManager) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors?.background || '#F6F8FB', justifyContent: 'center', alignItems: 'center', gap: 12, padding: 20 }}>
        <Ionicons name="lock-closed-outline" size={48} color={colors?.textMuted || '#999'} />
        <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 18, color: colors?.text || '#10284C' }}>Access Restricted</Text>
        <Text style={{ fontFamily: FONTS.bodyMedium, fontSize: 14, color: colors?.textMuted || '#999', textAlign: 'center' }}>
          Staff permissions required.
        </Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={{ marginTop: 8 }}>
          <Text style={{ fontFamily: FONTS.bodySemiBold, color: '#4BB9EC', fontSize: 15 }}>Go Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  // ─── End Role Guard ────────────────────────────

  const s = createStyles(colors);

  // ── Core state ──
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Step 1: Event selection ──
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);

  // ── Step 2: Role assignment ──
  const [assignments, setAssignments] = useState<Assignments>({});
  const [parents, setParents] = useState<ParentProfile[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [existingVolunteers, setExistingVolunteers] = useState<
    { id: string; profile_id: string; role: string }[]
  >([]);

  // ── Step 3: Confirmation ──
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadEvents = useCallback(async () => {
    if (!workingSeason?.id || !user?.id) {
      setLoading(false);
      return;
    }

    try {
      // Get teams the user is associated with
      const { data: staffData } = await supabase
        .from('team_staff')
        .select('team_id')
        .eq('user_id', user.id);

      const teamIds = (staffData || []).map((s) => s.team_id);

      if (teamIds.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('schedule_events')
        .select('id, title, event_date, event_type, team_id')
        .eq('season_id', workingSeason.id)
        .in('team_id', teamIds)
        .gte('event_date', today)
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents((data || []) as ScheduleEvent[]);
    } catch (err) {
      if (__DEV__) console.error('[VolunteerAssignment] loadEvents:', err);
      Alert.alert('Error', 'Failed to load events.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [workingSeason?.id, user?.id]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadEvents();
  }, [loadEvents]);

  // Load parents and existing assignments when entering Step 2
  const loadParentsAndAssignments = useCallback(async () => {
    if (!selectedEvent) return;
    setLoadingParents(true);

    try {
      const [parentsResult, volunteersResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('role', 'parent')
          .order('full_name'),
        supabase
          .from('event_volunteers')
          .select('id, profile_id, role')
          .eq('event_id', selectedEvent.id),
      ]);

      const parentsList = (parentsResult.data || []) as ParentProfile[];
      setParents(parentsList);

      const existingVols = (volunteersResult.data || []) as {
        id: string;
        profile_id: string;
        role: string;
      }[];
      setExistingVolunteers(existingVols);

      // Pre-populate assignments from existing volunteers
      const preAssignments: Assignments = {};
      for (const role of VOLUNTEER_ROLES) {
        const roleVols = existingVols.filter((v) => v.role === role.key);
        preAssignments[role.key] = roleVols
          .map((v) => {
            const parent = parentsList.find((p) => p.id === v.profile_id);
            return parent
              ? { profileId: parent.id, name: parent.full_name || 'Unknown' }
              : null;
          })
          .filter(Boolean) as Assignee[];
      }
      setAssignments(preAssignments);
    } catch (err) {
      if (__DEV__) console.error('[VolunteerAssignment] loadParents:', err);
    } finally {
      setLoadingParents(false);
    }
  }, [selectedEvent]);

  // ============================================================================
  // STEP NAVIGATION
  // ============================================================================

  const goNext = () => {
    if (currentStep === 0) {
      if (!selectedEvent) {
        Alert.alert('Select Event', 'Please select an event to continue.');
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentStep(1);
      loadParentsAndAssignments();
      return;
    }
    if (currentStep === 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentStep(2);
      return;
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setExpandedRole(null);
    } else {
      router.back();
    }
  };

  // ============================================================================
  // STEP 2: ASSIGNMENT ACTIONS
  // ============================================================================

  const assignParent = (roleKey: string, parent: ParentProfile) => {
    const roleDef = VOLUNTEER_ROLES.find((r) => r.key === roleKey);
    if (!roleDef) return;

    const current = assignments[roleKey] || [];
    if (current.length >= roleDef.capacity) {
      Alert.alert('Role Full', `${roleDef.label} already has ${roleDef.capacity} volunteer(s).`);
      return;
    }
    if (current.some((a) => a.profileId === parent.id)) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAssignments((prev) => ({
      ...prev,
      [roleKey]: [...(prev[roleKey] || []), { profileId: parent.id, name: parent.full_name || 'Unknown' }],
    }));
  };

  const removeAssignee = (roleKey: string, profileId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAssignments((prev) => ({
      ...prev,
      [roleKey]: (prev[roleKey] || []).filter((a) => a.profileId !== profileId),
    }));
  };

  const toggleRoleExpand = (roleKey: string) => {
    setExpandedRole(expandedRole === roleKey ? null : roleKey);
  };

  // Available parents for a role (not already assigned to this role)
  const getAvailableParents = (roleKey: string): ParentProfile[] => {
    const assigned = assignments[roleKey] || [];
    const assignedIds = new Set(assigned.map((a) => a.profileId));
    return parents.filter((p) => !assignedIds.has(p.id));
  };

  // ============================================================================
  // STEP 3: SUBMIT
  // ============================================================================

  const totalAssigned = useMemo(() => {
    return Object.values(assignments).reduce((sum, arr) => sum + arr.length, 0);
  }, [assignments]);

  const handleSubmit = async () => {
    if (!selectedEvent || !user?.id) return;
    setSubmitting(true);

    try {
      // Delete existing volunteers for this event
      if (existingVolunteers.length > 0) {
        const existingIds = existingVolunteers.map((v) => v.id);
        await supabase.from('event_volunteers').delete().in('id', existingIds);
      }

      // Insert new assignments
      const records: {
        event_id: string;
        profile_id: string;
        role: string;
        position: string;
        signed_up_at: string;
      }[] = [];

      for (const role of VOLUNTEER_ROLES) {
        const roleAssignees = assignments[role.key] || [];
        for (const assignee of roleAssignees) {
          records.push({
            event_id: selectedEvent.id,
            profile_id: assignee.profileId,
            role: role.key,
            position: role.label,
            signed_up_at: new Date().toISOString(),
          });
        }
      }

      if (records.length > 0) {
        const { error } = await supabase.from('event_volunteers').insert(records);
        if (error) throw error;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Check parent achievements after volunteer assignment
      if (user?.id) {
        checkRoleAchievements(user.id, 'parent', workingSeason?.id).catch(() => {});
      }

      setConfirmed(true);
    } catch (err: any) {
      if (__DEV__) console.error('[VolunteerAssignment] submit:', err);
      Alert.alert('Error', err.message || 'Failed to save assignments.');
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================================
  // RENDER: STEP INDICATOR
  // ============================================================================

  const renderStepIndicator = () => (
    <View style={s.stepIndicator}>
      {STEP_LABELS.map((label, i) => {
        const isActive = i === currentStep;
        const isDone = i < currentStep;

        return (
          <React.Fragment key={label}>
            {i > 0 && (
              <View style={[s.stepLine, isDone && { backgroundColor: colors.success }]} />
            )}
            <View style={s.stepItem}>
              <View
                style={[
                  s.stepDot,
                  isDone && { backgroundColor: colors.success },
                  isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
              >
                {isDone ? (
                  <Ionicons name="checkmark" size={12} color={colors.background} />
                ) : (
                  <Text
                    style={[
                      s.stepDotText,
                      isActive && { color: colors.background },
                    ]}
                  >
                    {i + 1}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  s.stepLabel,
                  isActive && { color: colors.text, fontFamily: FONTS.bodyBold },
                  isDone && { color: colors.success },
                ]}
              >
                {label}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );

  // ============================================================================
  // RENDER: STEP 1 — SELECT EVENT
  // ============================================================================

  const renderStep1 = () => {
    if (loading) {
      return (
        <View style={s.centeredWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (events.length === 0) {
      return (
        <View style={s.emptyWrap}>
          <Image
            source={require('@/assets/images/mascot/Meet-Lynx.png')}
            style={s.emptyMascot}
            resizeMode="contain"
          />
          <Text style={s.emptyTitle}>No Upcoming Events</Text>
          <Text style={s.emptySubtext}>
            There are no upcoming events to assign volunteers for.
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.eventListContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item }) => {
          const isSelected = selectedEvent?.id === item.id;
          const badgeColor = eventTypeColor(item.event_type, colors);

          return (
            <TouchableOpacity
              style={[
                s.eventCard,
                isSelected && { borderColor: colors.primary, borderWidth: 2 },
              ]}
              onPress={() => setSelectedEvent(item)}
              activeOpacity={0.7}
            >
              <View style={s.eventCardRow}>
                <View style={s.eventCardLeft}>
                  <Text style={s.eventTitle} numberOfLines={1}>
                    {item.title || 'Untitled Event'}
                  </Text>
                  <View style={s.eventMetaRow}>
                    <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                    <Text style={s.eventDate}>{formatDate(item.event_date)}</Text>
                  </View>
                </View>
                <View style={s.eventCardRight}>
                  <View style={[s.typeBadge, { backgroundColor: badgeColor + '20' }]}>
                    <Text style={[s.typeBadgeText, { color: badgeColor }]}>
                      {item.event_type?.toUpperCase() || 'EVENT'}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    );
  };

  // ============================================================================
  // RENDER: STEP 2 — ASSIGN ROLES
  // ============================================================================

  const renderStep2 = () => {
    if (loadingParents) {
      return (
        <View style={s.centeredWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Loading volunteers...</Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={s.roleScroll}
        contentContainerStyle={s.roleScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Selected event summary */}
        {selectedEvent && (
          <View style={s.eventSummaryCard}>
            <Ionicons name="calendar" size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={s.eventSummaryTitle}>{selectedEvent.title || 'Untitled Event'}</Text>
              <Text style={s.eventSummaryDate}>{formatDate(selectedEvent.event_date)}</Text>
            </View>
          </View>
        )}

        {/* Role Cards */}
        {VOLUNTEER_ROLES.map((role) => {
          const assigned = assignments[role.key] || [];
          const isExpanded = expandedRole === role.key;
          const isFull = assigned.length >= role.capacity;
          const available = getAvailableParents(role.key);

          return (
            <View key={role.key} style={s.roleCard}>
              {/* Role header */}
              <TouchableOpacity
                style={s.roleHeader}
                onPress={() => toggleRoleExpand(role.key)}
                activeOpacity={0.7}
              >
                <View style={s.roleHeaderLeft}>
                  <View style={[s.roleIconWrap, { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons name={role.icon} size={20} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={s.roleName}>{role.label}</Text>
                    <Text style={[s.roleCount, isFull && { color: colors.success }]}>
                      {assigned.length}/{role.capacity} assigned
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>

              {/* Assigned list */}
              {assigned.length > 0 && (
                <View style={s.assignedList}>
                  {assigned.map((a) => (
                    <View key={a.profileId} style={s.assignedRow}>
                      <View style={s.assignedAvatar}>
                        <Ionicons name="person" size={14} color={colors.primary} />
                      </View>
                      <Text style={s.assignedName} numberOfLines={1}>
                        {a.name}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeAssignee(role.key, a.profileId)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close-circle" size={20} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Expandable parent picker */}
              {isExpanded && !isFull && (
                <View style={s.parentPicker}>
                  <Text style={s.pickerTitle}>Select a parent:</Text>
                  {available.length === 0 ? (
                    <Text style={s.pickerEmpty}>No available parents</Text>
                  ) : (
                    available.map((parent) => (
                      <TouchableOpacity
                        key={parent.id}
                        style={s.parentRow}
                        onPress={() => assignParent(role.key, parent)}
                        activeOpacity={0.7}
                      >
                        {parent.avatar_url ? (
                          <Image source={{ uri: parent.avatar_url }} style={s.parentAvatar} />
                        ) : (
                          <View style={s.parentAvatarPlaceholder}>
                            <Ionicons name="person" size={16} color={colors.textMuted} />
                          </View>
                        )}
                        <Text style={s.parentName} numberOfLines={1}>
                          {parent.full_name || 'Unknown'}
                        </Text>
                        <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}

              {isExpanded && isFull && (
                <View style={s.parentPicker}>
                  <View style={s.fullBanner}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={[s.fullBannerText, { color: colors.success }]}>
                      All spots filled!
                    </Text>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    );
  };

  // ============================================================================
  // RENDER: STEP 3 — CONFIRM & NOTIFY
  // ============================================================================

  const renderStep3 = () => {
    if (confirmed) {
      return (
        <View style={s.confirmationWrap}>
          <Image
            source={require('@/assets/images/mascot/celebrate.png')}
            style={s.celebrateMascot}
            resizeMode="contain"
          />
          <Text style={s.confirmationTitle}>Volunteers Assigned!</Text>
          <Text style={s.confirmationSubtext}>
            {totalAssigned} volunteer{totalAssigned !== 1 ? 's' : ''} assigned to{' '}
            {selectedEvent?.title || 'the event'}.
          </Text>
          <TouchableOpacity
            style={s.doneBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={s.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView
        style={s.roleScroll}
        contentContainerStyle={s.roleScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Event header */}
        {selectedEvent && (
          <View style={s.eventSummaryCard}>
            <Ionicons name="calendar" size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={s.eventSummaryTitle}>{selectedEvent.title || 'Untitled Event'}</Text>
              <Text style={s.eventSummaryDate}>{formatDate(selectedEvent.event_date)}</Text>
            </View>
          </View>
        )}

        {/* Assignment preview */}
        <Text style={s.sectionTitle}>ASSIGNMENT PREVIEW</Text>

        {VOLUNTEER_ROLES.map((role) => {
          const assigned = assignments[role.key] || [];
          return (
            <View key={role.key} style={s.previewCard}>
              <View style={s.previewHeader}>
                <View style={[s.roleIconWrap, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name={role.icon} size={18} color={colors.primary} />
                </View>
                <Text style={s.previewRoleName}>{role.label}</Text>
                <Text
                  style={[
                    s.previewCount,
                    assigned.length > 0 ? { color: colors.success } : { color: colors.textMuted },
                  ]}
                >
                  {assigned.length}/{role.capacity}
                </Text>
              </View>
              {assigned.length > 0 ? (
                assigned.map((a) => (
                  <View key={a.profileId} style={s.previewAssignee}>
                    <Ionicons name="person-circle-outline" size={18} color={colors.textSecondary} />
                    <Text style={s.previewAssigneeName}>{a.name}</Text>
                  </View>
                ))
              ) : (
                <Text style={s.previewEmpty}>No volunteer assigned</Text>
              )}
            </View>
          );
        })}

        {/* Summary counts */}
        <View style={s.summaryCard}>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Total Volunteers</Text>
            <Text style={s.summaryValue}>{totalAssigned}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Roles Filled</Text>
            <Text style={s.summaryValue}>
              {VOLUNTEER_ROLES.filter((r) => (assignments[r.key] || []).length > 0).length}/
              {VOLUNTEER_ROLES.length}
            </Text>
          </View>
        </View>

        {/* Send Notifications button */}
        <TouchableOpacity
          style={[s.submitBtn, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.7}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <>
              <Ionicons name="notifications-outline" size={20} color={colors.background} />
              <Text style={s.submitBtnText}>Send Notifications</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={goBack} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Volunteer Assignment</Text>
        <View style={s.backBtn} />
      </View>

      {/* Step Indicator */}
      {!confirmed && renderStepIndicator()}

      {/* Step Content */}
      <View style={{ flex: 1 }}>
        {currentStep === 0 && renderStep1()}
        {currentStep === 1 && renderStep2()}
        {currentStep === 2 && renderStep3()}
      </View>

      {/* Bottom Navigation (steps 0 and 1 only, not on confirmation) */}
      {!confirmed && currentStep < 2 && (
        <View style={s.bottomNav}>
          {currentStep > 0 ? (
            <TouchableOpacity style={s.bottomBackBtn} onPress={goBack} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={18} color={colors.textSecondary} />
              <Text style={s.bottomBackText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}
          <TouchableOpacity style={s.bottomNextBtn} onPress={goNext} activeOpacity={0.7}>
            <Text style={s.bottomNextText}>Next</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.background} />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },

    // ── Header ──
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.screenPadding,
      paddingVertical: 14,
    },
    backBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      ...displayTextStyle,
      fontSize: 26,
      color: colors.text,
    },

    // ── Step Indicator ──
    stepIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingVertical: 16,
      gap: 0,
    },
    stepLine: {
      flex: 1,
      height: 2,
      backgroundColor: colors.border,
      marginHorizontal: 4,
    },
    stepItem: {
      alignItems: 'center',
      gap: 4,
    },
    stepDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.bgSecondary,
      borderWidth: 2,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    stepDotText: {
      fontSize: 12,
      fontFamily: FONTS.bodyBold,
      color: colors.textMuted,
    },
    stepLabel: {
      fontSize: 10,
      fontFamily: FONTS.bodySemiBold,
      color: colors.textMuted,
      letterSpacing: 0.5,
    },

    // ── Loading & Empty ──
    centeredWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    loadingText: {
      fontSize: 14,
      fontFamily: FONTS.bodySemiBold,
      color: colors.textMuted,
    },
    emptyWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    emptyMascot: {
      width: 140,
      height: 140,
      marginBottom: 16,
    },
    emptyTitle: {
      ...displayTextStyle,
      fontSize: 22,
      color: colors.text,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      fontFamily: FONTS.bodySemiBold,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },

    // ── Step 1: Event List ──
    eventListContent: {
      paddingHorizontal: spacing.screenPadding,
      paddingBottom: 20,
    },
    eventCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: radii.card,
      padding: 16,
      marginBottom: 10,
      ...shadows.card,
    },
    eventCardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    eventCardLeft: {
      flex: 1,
      marginRight: 12,
    },
    eventTitle: {
      fontSize: 16,
      fontFamily: FONTS.bodyBold,
      color: colors.text,
      marginBottom: 4,
    },
    eventMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    eventDate: {
      fontSize: 13,
      fontFamily: FONTS.bodySemiBold,
      color: colors.textMuted,
    },
    eventCardRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    typeBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    typeBadgeText: {
      fontSize: 10,
      fontFamily: FONTS.bodyExtraBold,
      letterSpacing: 0.8,
    },

    // ── Step 2: Roles ──
    roleScroll: {
      flex: 1,
    },
    roleScrollContent: {
      paddingHorizontal: spacing.screenPadding,
      paddingBottom: 40,
    },
    eventSummaryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.primary + '12',
      borderRadius: 12,
      padding: 14,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.primary + '30',
    },
    eventSummaryTitle: {
      fontSize: 15,
      fontFamily: FONTS.bodyBold,
      color: colors.text,
    },
    eventSummaryDate: {
      fontSize: 13,
      fontFamily: FONTS.bodySemiBold,
      color: colors.textMuted,
      marginTop: 2,
    },
    roleCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: radii.card,
      marginBottom: 12,
      overflow: 'hidden',
      ...shadows.card,
    },
    roleHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    roleHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    roleIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    roleName: {
      fontSize: 16,
      fontFamily: FONTS.bodyBold,
      color: colors.text,
    },
    roleCount: {
      fontSize: 13,
      fontFamily: FONTS.bodySemiBold,
      color: colors.textMuted,
      marginTop: 2,
    },

    // ── Assigned list ──
    assignedList: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 8,
    },
    assignedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.success + '12',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.success + '25',
    },
    assignedAvatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
    },
    assignedName: {
      flex: 1,
      fontSize: 14,
      fontFamily: FONTS.bodySemiBold,
      color: colors.text,
    },

    // ── Parent picker ──
    parentPicker: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      borderTopWidth: 1,
      borderTopColor: colors.glassBorder,
      paddingTop: 12,
    },
    pickerTitle: {
      fontSize: 12,
      fontFamily: FONTS.bodyBold,
      color: colors.textMuted,
      marginBottom: 10,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.8,
    },
    pickerEmpty: {
      fontSize: 13,
      fontFamily: FONTS.bodySemiBold,
      color: colors.textMuted,
      textAlign: 'center',
      paddingVertical: 12,
    },
    parentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.glassBorder,
    },
    parentAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    parentAvatarPlaceholder: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.bgSecondary,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    parentName: {
      flex: 1,
      fontSize: 14,
      fontFamily: FONTS.bodySemiBold,
      color: colors.text,
    },
    fullBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 10,
    },
    fullBannerText: {
      fontSize: 14,
      fontFamily: FONTS.bodyBold,
    },

    // ── Step 3: Preview ──
    sectionTitle: {
      fontSize: 13,
      fontFamily: FONTS.bodyBold,
      color: colors.textMuted,
      marginBottom: 12,
      marginTop: 8,
      textTransform: 'uppercase' as const,
      letterSpacing: 1.2,
    },
    previewCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: radii.card,
      padding: 16,
      marginBottom: 10,
      ...shadows.card,
    },
    previewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
    },
    previewRoleName: {
      flex: 1,
      fontSize: 15,
      fontFamily: FONTS.bodyBold,
      color: colors.text,
    },
    previewCount: {
      fontSize: 13,
      fontFamily: FONTS.bodyExtraBold,
    },
    previewAssignee: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 6,
      marginLeft: 50,
    },
    previewAssigneeName: {
      fontSize: 14,
      fontFamily: FONTS.bodySemiBold,
      color: colors.textSecondary,
    },
    previewEmpty: {
      fontSize: 13,
      fontFamily: FONTS.bodySemiBold,
      color: colors.textMuted,
      fontStyle: 'italic',
      marginLeft: 50,
      paddingVertical: 4,
    },
    summaryCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: radii.card,
      padding: 16,
      marginTop: 8,
      marginBottom: 20,
      gap: 12,
      ...shadows.card,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    summaryLabel: {
      fontSize: 14,
      fontFamily: FONTS.bodySemiBold,
      color: colors.textSecondary,
    },
    summaryValue: {
      fontSize: 16,
      fontFamily: FONTS.bodyExtraBold,
      color: colors.text,
    },
    submitBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: colors.primary,
      borderRadius: radii.card,
      paddingVertical: 16,
      marginBottom: 16,
      ...shadows.card,
    },
    submitBtnText: {
      fontSize: 17,
      fontFamily: FONTS.bodyExtraBold,
      color: colors.background,
    },

    // ── Confirmation ──
    confirmationWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    celebrateMascot: {
      width: 160,
      height: 160,
      marginBottom: 20,
    },
    confirmationTitle: {
      ...displayTextStyle,
      fontSize: 28,
      color: colors.text,
      marginBottom: 12,
    },
    confirmationSubtext: {
      fontSize: 15,
      fontFamily: FONTS.bodySemiBold,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 32,
    },
    doneBtn: {
      backgroundColor: colors.success,
      borderRadius: radii.card,
      paddingVertical: 16,
      paddingHorizontal: 48,
      ...shadows.card,
    },
    doneBtnText: {
      fontSize: 17,
      fontFamily: FONTS.bodyExtraBold,
      color: colors.background,
    },

    // ── Bottom Navigation ──
    bottomNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.screenPadding,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.glassBorder,
      backgroundColor: colors.glassCard,
    },
    bottomBackBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: colors.bgSecondary,
    },
    bottomBackText: {
      fontSize: 15,
      fontFamily: FONTS.bodySemiBold,
      color: colors.textSecondary,
    },
    bottomNextBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    bottomNextText: {
      fontSize: 15,
      fontFamily: FONTS.bodyBold,
      color: colors.background,
    },
  });
