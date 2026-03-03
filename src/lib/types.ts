export interface Service {
  id: number;
  name: string;
  slug: string;
  category: string | null;
  hasAutoFetch: boolean | null;
  createdAt: Date | null;
}

export interface Entity {
  id: number;
  name: string;
  slug: string;
  color: string | null;
  createdAt: Date | null;
}

export interface ServiceAccount {
  id: number;
  serviceId: number;
  serviceName: string;
  serviceSlug: string;
  entityId: number | null;
  entityName: string | null;
  label: string;
  fetcherSlug: string | null;
  color: string | null;
  hasAutoFetch: boolean | null;
  createdAt: Date | null;
}

export interface PaymentCard {
  id: number;
  label: string;
  last4: string | null;
  brand: string | null;
  isDefault: boolean | null;
  createdAt: Date | null;
}

export interface CostRecord {
  id: number;
  accountId: number;
  accountLabel: string;
  accountColor: string | null;
  serviceName: string;
  serviceSlug: string;
  entityName: string | null;
  year: number;
  month: number;
  amount: number;
  currency: string | null;
  source: string | null;
  paymentStatus: string | null;
  cardId: number | null;
  cardLabel: string | null;
  cardLast4: string | null;
  notes: string | null;
  fetcherSlug: string | null;
  hasAutoFetch: boolean | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export type PaymentStatus = "paid" | "pending" | "overdue";

export const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { label: string; color: string }> = {
  paid: { label: "Paid", color: "bg-green-100 text-green-800" },
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-800" },
};

export interface DashboardData {
  year: number;
  accounts: ServiceAccount[];
  entities: Entity[];
  costMap: Record<number, Record<number, { amount: number; source: string; paymentStatus: string }>>;
  summary: {
    currentMonthTotal: number;
    yearTotal: number;
    monthOverMonthChange: number;
    currentMonth: number;
    paidTotal: number;
    pendingTotal: number;
    overdueTotal: number;
  };
}

export const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
