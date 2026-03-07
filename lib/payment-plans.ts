/**
 * payment-plans.ts - Service layer for installment-based payment plans.
 *
 * Tables: payment_plans, payment_installments (must exist in Supabase).
 * See CC-MOBILE-PARITY-SPRINT-B.md Phase 1 for DDL.
 */
import { supabase } from '@/lib/supabase';

// =============================================================================
// TYPES
// =============================================================================

export type PaymentPlan = {
  id: string;
  season_id: string;
  organization_id: string;
  name: string;
  description: string | null;
  total_amount: number;
  installment_count: number;
  installment_amount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type PaymentInstallment = {
  id: string;
  payment_plan_id: string;
  player_id: string;
  parent_id: string | null;
  installment_number: number;
  amount: number;
  due_date: string;
  paid: boolean;
  paid_at: string | null;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
};

export type CreatePlanInput = {
  season_id: string;
  organization_id: string;
  name: string;
  description?: string;
  total_amount: number;
  installment_count: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  is_default?: boolean;
};

// =============================================================================
// SERVICE FUNCTIONS
// =============================================================================

/**
 * Fetch all payment plans for a given season.
 */
export async function getPlansForSeason(seasonId: string): Promise<PaymentPlan[]> {
  const { data, error } = await supabase
    .from('payment_plans')
    .select('*')
    .eq('season_id', seasonId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as PaymentPlan[];
}

/**
 * Fetch all installments for a parent (across all players).
 */
export async function getInstallmentsForParent(parentId: string): Promise<PaymentInstallment[]> {
  const { data, error } = await supabase
    .from('payment_installments')
    .select('*')
    .eq('parent_id', parentId)
    .order('due_date', { ascending: true });

  if (error) throw error;
  return (data || []) as PaymentInstallment[];
}

/**
 * Fetch installments for a specific player.
 */
export async function getInstallmentsForPlayer(playerId: string): Promise<PaymentInstallment[]> {
  const { data, error } = await supabase
    .from('payment_installments')
    .select('*')
    .eq('player_id', playerId)
    .order('due_date', { ascending: true });

  if (error) throw error;
  return (data || []) as PaymentInstallment[];
}

/**
 * Admin creates a new payment plan.
 */
export async function createPlan(input: CreatePlanInput): Promise<PaymentPlan> {
  const installment_amount = +(input.total_amount / input.installment_count).toFixed(2);

  const { data, error } = await supabase
    .from('payment_plans')
    .insert({
      season_id: input.season_id,
      organization_id: input.organization_id,
      name: input.name,
      description: input.description || null,
      total_amount: input.total_amount,
      installment_count: input.installment_count,
      installment_amount,
      frequency: input.frequency,
      is_default: input.is_default || false,
    })
    .select()
    .single();

  if (error) throw error;
  return data as PaymentPlan;
}

/**
 * Generate installment records for a player based on a plan and start date.
 * Returns the created installment rows.
 */
export async function generateInstallments(
  planId: string,
  playerId: string,
  parentId: string | null,
  startDate: Date,
): Promise<PaymentInstallment[]> {
  // Fetch the plan to get frequency, count, amount
  const { data: plan, error: planError } = await supabase
    .from('payment_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (planError) throw planError;
  if (!plan) throw new Error('Payment plan not found');

  const records: Omit<PaymentInstallment, 'id' | 'created_at'>[] = [];

  for (let i = 0; i < plan.installment_count; i++) {
    const dueDate = new Date(startDate);

    switch (plan.frequency) {
      case 'weekly':
        dueDate.setDate(dueDate.getDate() + i * 7);
        break;
      case 'biweekly':
        dueDate.setDate(dueDate.getDate() + i * 14);
        break;
      case 'monthly':
      default:
        dueDate.setMonth(dueDate.getMonth() + i);
        break;
    }

    // Last installment absorbs any rounding remainder
    const isLast = i === plan.installment_count - 1;
    const amount = isLast
      ? +(plan.total_amount - plan.installment_amount * (plan.installment_count - 1)).toFixed(2)
      : +plan.installment_amount;

    records.push({
      payment_plan_id: planId,
      player_id: playerId,
      parent_id: parentId,
      installment_number: i + 1,
      amount,
      due_date: dueDate.toISOString().split('T')[0],
      paid: false,
      paid_at: null,
      payment_method: null,
      notes: null,
    });
  }

  const { data, error } = await supabase
    .from('payment_installments')
    .insert(records)
    .select();

  if (error) throw error;
  return (data || []) as PaymentInstallment[];
}

/**
 * Mark an installment as paid.
 */
export async function markInstallmentPaid(
  installmentId: string,
  method?: string,
  notes?: string,
): Promise<void> {
  const { error } = await supabase
    .from('payment_installments')
    .update({
      paid: true,
      paid_at: new Date().toISOString(),
      payment_method: method || null,
      notes: notes || null,
    })
    .eq('id', installmentId);

  if (error) throw error;
}

/**
 * Get all overdue (unpaid, past due date) installments for an organization.
 */
export async function getOverdueInstallments(orgId: string): Promise<
  (PaymentInstallment & { plan_name: string; player_name?: string })[]
> {
  const today = new Date().toISOString().split('T')[0];

  // Get all plans for the org to get plan IDs
  const { data: plans, error: planError } = await supabase
    .from('payment_plans')
    .select('id, name')
    .eq('organization_id', orgId);

  if (planError) throw planError;
  if (!plans || plans.length === 0) return [];

  const planIds = plans.map(p => p.id);
  const planNameMap = new Map(plans.map(p => [p.id, p.name]));

  const { data: installments, error } = await supabase
    .from('payment_installments')
    .select('*')
    .in('payment_plan_id', planIds)
    .eq('paid', false)
    .lt('due_date', today)
    .order('due_date', { ascending: true });

  if (error) throw error;

  // Batch-fetch player names
  const playerIds = [...new Set((installments || []).map(i => i.player_id))];
  let playerNameMap = new Map<string, string>();
  if (playerIds.length > 0) {
    const { data: players } = await supabase
      .from('players')
      .select('id, first_name, last_name')
      .in('id', playerIds);
    (players || []).forEach(p => {
      playerNameMap.set(p.id, `${p.first_name} ${p.last_name}`);
    });
  }

  return (installments || []).map(inst => ({
    ...inst,
    plan_name: planNameMap.get(inst.payment_plan_id) || 'Unknown Plan',
    player_name: playerNameMap.get(inst.player_id),
  }));
}
