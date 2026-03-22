/**
 * AdminLynxGreetings — Dynamic context-aware greeting system for admin.
 * Same waterfall pattern as parent LynxGreetings but tailored for admin context.
 */

type GreetingContext = {
  name: string;
  overdueCount: number;
  queueLength: number;
  paymentPct: number;
  hasGameToday: boolean;
};

/** Pick a deterministic daily index so the greeting doesn't flicker */
function dailyIndex(options: number): number {
  return Math.floor(Date.now() / 86400000) % options;
}

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export function getAdminGreeting(ctx: GreetingContext): string {
  const { name, overdueCount, queueLength, paymentPct, hasGameToday } = ctx;

  // 1. Overdue items
  if (overdueCount > 0) {
    const msgs = [
      `You've got ${overdueCount} item${overdueCount > 1 ? 's' : ''} to knock out, ${name}. Let's go`,
      `${overdueCount} thing${overdueCount > 1 ? 's' : ''} waiting on you, ${name}. Let's clear the deck`,
    ];
    return msgs[dailyIndex(msgs.length)];
  }

  // 2. All clear
  if (queueLength === 0) {
    const msgs = [
      `All clear, ${name}! Your org is humming`,
      `Nothing pending, ${name}. Sit back and watch it run`,
    ];
    return msgs[dailyIndex(msgs.length)];
  }

  // 3. Game day
  if (hasGameToday) {
    return `Game day across the org, ${name}! Let's get it`;
  }

  // 4. Payment collection strong
  if (paymentPct > 80) {
    return `${paymentPct}% collected, ${name}. Money's flowing`;
  }

  // 5. Time-of-day fallbacks
  const tod = getTimeOfDay();
  if (tod === 'morning') {
    return `Morning, ${name}! Here's your org at a glance`;
  }
  if (tod === 'afternoon') {
    return `Hey ${name}! Let's check on the operation`;
  }
  return `Evening report, ${name}. Here's where things stand`;
}
