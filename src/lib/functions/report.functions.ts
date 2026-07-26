import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma.server";
import { requireAdmin } from "@/lib/auth.server";

export const getSalesReport = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const invoices = await prisma.invoice.findMany({ orderBy: { createdAt: "asc" } });
  const totalRevenue = invoices.reduce((s, i) => s + i.amount, 0);
  const totalInvoices = invoices.length;
  const map = new Map<string, { revenue: number; count: number }>();
  for (const inv of invoices) {
    const key = `${inv.createdAt.getFullYear()}-${String(inv.createdAt.getMonth() + 1).padStart(2, "0")}`;
    const g = map.get(key) ?? { revenue: 0, count: 0 };
    g.revenue += inv.amount;
    g.count += 1;
    map.set(key, g);
  }
  const monthly = Array.from(map, ([month, data]) => ({ month, ...data })).sort((a, b) =>
    a.month.localeCompare(b.month),
  );
  const totalHours = Math.round(totalRevenue / 10000);
  return { totalRevenue, totalInvoices, totalHours, monthly } as const;
});

export const getDailyReport = createServerFn({ method: "GET" })
  .inputValidator(z.object({ days: z.number().int().default(30) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const since = new Date();
    since.setDate(since.getDate() - data.days);
    const invoices = await prisma.invoice.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
    });
    const map = new Map<string, { revenue: number; count: number }>();
    for (const inv of invoices) {
      const key = inv.createdAt.toISOString().split("T")[0];
      const g = map.get(key) ?? { revenue: 0, count: 0 };
      g.revenue += inv.amount;
      g.count += 1;
      map.set(key, g);
    }
    return Array.from(map, ([date, d]) => ({ date, ...d })).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  });

export const getMenuReport = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const invoices = await prisma.invoice.findMany({
    where: { items: { some: {} } },
    include: { items: true },
  });
  const itemMap = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const inv of invoices) {
    for (const item of inv.items) {
      const g = itemMap.get(item.name) ?? { name: item.name, qty: 0, revenue: 0 };
      g.qty += item.qty;
      g.revenue += item.price * item.qty;
      itemMap.set(item.name, g);
    }
  }
  return Array.from(itemMap.values()).sort((a, b) => b.qty - a.qty);
});

export const getCustomerReport = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const customers = await prisma.customer.findMany({ orderBy: { total: "desc" } });
  return customers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    visits: c.visits,
    total: c.total,
    tier: c.tier,
    points: c.points,
  }));
});

export const getEmployeeReport = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return prisma.auditLog.groupBy({ by: ["username"], _count: { id: true } });
});

export const getMachineHoursReport = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const sessions = await prisma.machineSession.findMany({ orderBy: { startedAt: "asc" } });
  const totalHours = sessions.reduce((s, sess) => s + sess.hoursUsed, 0);
  const totalRevenue = sessions.reduce((s, sess) => s + sess.amount, 0);
  const map = new Map<string, { hours: number; revenue: number; count: number }>();
  for (const sess of sessions) {
    const g = map.get(sess.machineName) ?? { hours: 0, revenue: 0, count: 0 };
    g.hours += sess.hoursUsed;
    g.revenue += sess.amount;
    g.count += 1;
    map.set(sess.machineName, g);
  }
  return {
    totalHours: Math.round(totalHours * 100) / 100,
    totalRevenue,
    totalSessions: sessions.length,
    byMachine: Array.from(map, ([machine, d]) => ({ machine, ...d })).sort(
      (a, b) => b.hours - a.hours,
    ),
  };
});

export const getDashboardAnalytics = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();

  const invoices = await prisma.invoice.findMany({
    include: { items: true },
  });
  const sessions = await prisma.machineSession.findMany();
  const machines = await prisma.machine.findMany();

  /* --- revenue breakdown (pie chart) --- */
  const machineRevenue = sessions.reduce((s, sess) => s + sess.amount, 0);
  let menuRevenue = 0;
  let keyboardRevenue = 0;
  for (const inv of invoices) {
    for (const item of inv.items) {
      if (item.type === "menu") menuRevenue += item.price * item.qty;
      else if (item.type === "keyboard") keyboardRevenue += item.price * item.qty;
    }
  }

  /* --- comparison: this month vs last month --- */
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const thisMonthInvs = await prisma.invoice.findMany({
    where: { createdAt: { gte: thisMonthStart } },
  });
  const lastMonthInvs = await prisma.invoice.findMany({
    where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
  });
  const thisMonthRev = thisMonthInvs.reduce((s, i) => s + i.amount, 0);
  const lastMonthRev = lastMonthInvs.reduce((s, i) => s + i.amount, 0);

  /* --- prediction: linear regression on monthly data --- */
  const allInvs = await prisma.invoice.findMany({ orderBy: { createdAt: "asc" } });
  const monthMap = new Map<string, number>();
  for (const inv of allInvs) {
    const key = `${inv.createdAt.getFullYear()}-${String(inv.createdAt.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, (monthMap.get(key) ?? 0) + inv.amount);
  }
  const monthlyArr = Array.from(monthMap, ([month, revenue]) => ({ month, revenue })).sort((a, b) =>
    a.month.localeCompare(b.month),
  );

  let predictedNext: number | null = null;
  if (monthlyArr.length >= 2) {
    const n = monthlyArr.length;
    const xMean = (n - 1) / 2;
    const yMean = monthlyArr.reduce((s, d) => s + d.revenue, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (monthlyArr[i]!.revenue - yMean);
      den += (i - xMean) * (i - xMean);
    }
    const slope = den !== 0 ? num / den : 0;
    const intercept = yMean - slope * xMean;
    predictedNext = Math.max(0, Math.round(slope * n + intercept));
  }

  /* --- machine usage --- */
  const inUse = machines.filter((m) => m.status === "in_use").length;
  const idle = machines.filter((m) => m.status === "idle").length;
  const maintenance = machines.filter((m) => m.status === "maintenance").length;

  /* --- daily revenue this month --- */
  const dailyInvs = await prisma.invoice.findMany({
    where: { createdAt: { gte: thisMonthStart } },
    orderBy: { createdAt: "asc" },
  });
  const dailyMap = new Map<string, number>();
  for (const inv of dailyInvs) {
    const key = inv.createdAt.toISOString().split("T")[0];
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + inv.amount);
  }
  const dailyRevenue = Array.from(dailyMap, ([date, revenue]) => ({ date, revenue })).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  return {
    revenueBreakdown: { machine: machineRevenue, menu: menuRevenue, keyboard: keyboardRevenue },
    comparison: {
      thisMonth: thisMonthRev,
      lastMonth: lastMonthRev,
      change: thisMonthRev - lastMonthRev,
      changePercent:
        lastMonthRev > 0 ? Math.round(((thisMonthRev - lastMonthRev) / lastMonthRev) * 100) : 0,
    },
    prediction: { nextMonth: predictedNext },
    machineUsage: { inUse, idle, maintenance, total: machines.length },
    dailyRevenue,
    monthly: monthlyArr,
  };
});
