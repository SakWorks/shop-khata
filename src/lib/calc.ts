export type CashBreakdownItem = {
  label: string;
  amount: number;
};

export type ShopDay = {
  id: string;
  date: string;
  opening_time: string | null;
  opening_amount: number | null;
  closing_time: string | null;
  closing_amount: number | null;
  opening_breakdown?: CashBreakdownItem[] | null;
  closing_breakdown?: CashBreakdownItem[] | null;
};

export type ShopExpense = {
  id: string;
  day_id: string;
  description: string;
  amount: number;
  time: string | null;
};

export type SavingsEntry = {
  id: string;
  date: string;
  profit: number;
  percentage: number;
  amount: number;
};

export type KameetiEntry = {
  id: string;
  entry_date: string;
  amount: number;
  note: string | null;
};

export type DayCalc = {
  hasOpening: boolean;
  hasClosing: boolean;
  opening: number;
  closing: number;
  expenses: number;
  gross: number;
  profit: number;
};

export function calcDay(day: ShopDay | null | undefined, expenses: ShopExpense[]): DayCalc {
  const hasOpening = day?.opening_amount !== null && day?.opening_amount !== undefined;
  const hasClosing = day?.closing_amount !== null && day?.closing_amount !== undefined;
  const opening = Number(day?.opening_amount ?? 0);
  const closing = Number(day?.closing_amount ?? 0);
  const expTotal = expenses.reduce((a, e) => a + Number(e.amount || 0), 0);

  let gross = 0;
  let profit = 0;
  if (hasOpening && hasClosing) {
    profit = closing - opening;
    gross = profit + expTotal;
  }

  return { hasOpening, hasClosing, opening, closing, expenses: expTotal, gross, profit };
}

export function pkr(n: number): string {
  const rounded = Math.round(n || 0);
  const neg = rounded < 0;
  return (neg ? "-Rs " : "Rs ") + Math.abs(rounded).toLocaleString("en-US");
}

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function currentMonthKey(): string {
  return todayKey().slice(0, 7);
}

export function monthKeyOf(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function prevMonthKey(mKey: string): string {
  const d = new Date(mKey + "-01T00:00:00");
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function fmtDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function monthLabel(mKey: string): string {
  const d = new Date(mKey + "-01T00:00:00");
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function sumBreakdown(items: CashBreakdownItem[]): number {
  return items.reduce((a, i) => a + (Number(i.amount) || 0), 0);
}

export function last10Days(): string[] {
  return lastNDays(10);
}

export function lastNDays(n: number): string[] {
  const arr: string[] = [];
  const base = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    arr.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`);
  }
  return arr;
}