import { notificationService } from "./notificationService";

export type SupportCategory = "account" | "search" | "gps" | "restaurant" | "other";
export type SupportStatus = "open" | "in_progress" | "resolved";
export type SupportPriority = "low" | "normal" | "high";

export interface SupportTicket {
  id: string;
  userId?: string;
  category: SupportCategory;
  subject: string;
  message: string;
  status: SupportStatus;
  priority: SupportPriority;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateSupportTicketInput {
  category: SupportCategory;
  subject: string;
  message: string;
  priority?: SupportPriority;
}

const SUPPORT_TICKETS_KEY = "wanderbite_support_tickets";
export const SUPPORT_TICKETS_UPDATED_EVENT = "wanderbite:support-tickets-updated";

function getStorageUserId(userId?: string | null): string {
  return userId || "guest";
}

function readTicketMap(): Record<string, SupportTicket[]> {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(SUPPORT_TICKETS_KEY);
    return raw ? JSON.parse(raw) as Record<string, SupportTicket[]> : {};
  } catch {
    return {};
  }
}

function writeTicketMap(data: Record<string, SupportTicket[]>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SUPPORT_TICKETS_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent(SUPPORT_TICKETS_UPDATED_EVENT));
}

function sortNewestFirst(items: SupportTicket[]) {
  return [...items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ticket_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export const supportService = {
  async getTickets(userId?: string | null): Promise<SupportTicket[]> {
    const key = getStorageUserId(userId);
    const data = readTicketMap();
    return sortNewestFirst(data[key] || []);
  },

  async getTicketById(userId: string | null | undefined, ticketId: string): Promise<SupportTicket | null> {
    const tickets = await supportService.getTickets(userId);
    return tickets.find((ticket) => ticket.id === ticketId) || null;
  },

  async createTicket(
    userId: string | null | undefined,
    input: CreateSupportTicketInput,
  ): Promise<SupportTicket> {
    const key = getStorageUserId(userId);
    const data = readTicketMap();
    const now = new Date().toISOString();
    const ticket: SupportTicket = {
      id: createId(),
      userId: key,
      category: input.category,
      subject: input.subject.trim(),
      message: input.message.trim(),
      status: "open",
      priority: input.priority || "normal",
      createdAt: now,
      updatedAt: now,
    };

    data[key] = [ticket, ...(data[key] || [])].slice(0, 50);
    writeTicketMap(data);

    await notificationService.addNotification(key, {
      type: "support",
      title: "Yeu cau ho tro da duoc ghi nhan",
      message: `Ticket "${ticket.subject}" dang o trang thai moi.`,
      actionUrl: "/support",
      metadata: { ticketId: ticket.id, status: ticket.status },
    });

    return ticket;
  },

  async updateTicketStatus(
    userId: string | null | undefined,
    ticketId: string,
    status: SupportStatus,
  ): Promise<SupportTicket | null> {
    const key = getStorageUserId(userId);
    const data = readTicketMap();
    let updatedTicket: SupportTicket | null = null;
    const now = new Date().toISOString();

    data[key] = (data[key] || []).map((ticket) => {
      if (ticket.id !== ticketId) return ticket;
      updatedTicket = { ...ticket, status, updatedAt: now };
      return updatedTicket;
    });

    writeTicketMap(data);
    return updatedTicket;
  },
};
