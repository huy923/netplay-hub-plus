import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma.server";
import { broadcast } from "@/lib/sse-events.server";
import { requireAdmin, requireKioskOrAdmin } from "@/lib/auth.server";
import { getDecryptedSettings } from "./_shared";
import { formatVND } from "@/lib/format";

export const getBankSettings = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const map = await getDecryptedSettings();
  return {
    bankName: map.bank_name ?? "Vietcombank",
    accountNo: map.bank_account_no ?? "1234567890",
    accountHolder: map.bank_account_holder ?? "CYBERNET",
    qrPrefix: map.qr_prefix ?? "NAPMAY",
  };
});

export const getPublicBankSettings = createServerFn({ method: "GET" }).handler(async () => {
  const map = await getDecryptedSettings();
  return {
    bankName: map.bank_name ?? "Vietcombank",
    accountNo: map.bank_account_no ?? "1234567890",
    accountHolder: map.bank_account_holder ?? "CYBERNET",
    qrPrefix: map.qr_prefix ?? "NAPMAY",
  };
});

export const findPendingPayment = createServerFn({ method: "GET" })
  .inputValidator(z.object({ machine: z.string() }))
  .handler(async ({ data }) => {
    const invoice = await prisma.invoice.findFirst({
      where: { machine: data.machine, status: "Chờ" },
      orderBy: { createdAt: "desc" },
      include: {
        payments: { where: { status: "pending" }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (invoice && invoice.payments.length > 0) {
      return { paymentId: invoice.payments[0].id, invoiceId: invoice.id, amount: invoice.amount };
    }
    return null;
  });

export const createPayment = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      invoiceId: z.string().optional(),
      amount: z.number().int().min(1000),
      method: z.string().default("qr"),
      customer: z.string().optional(),
      machine: z.string().optional(),
      transferNote: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const auth = await requireKioskOrAdmin();
    if (auth.kind === "machine") {
      if (!data.machine) throw new Error("Thiếu tên máy");
      const machine = await prisma.machine.findUnique({
        where: { id: auth.machineId },
        select: { name: true },
      });
      if (!machine || machine.name !== data.machine) throw new Error("Unauthorized");
    }
    let invoiceId = data.invoiceId;
    if (!invoiceId && data.amount > 0) {
      const time = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      const inv = await prisma.invoice.create({
        data: {
          machine: data.machine ?? "",
          customer: data.customer ?? "",
          amount: data.amount,
          method: data.method,
          status: "Chờ",
          time,
        },
      });
      invoiceId = inv.id;
    }
    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        amount: data.amount,
        method: data.method,
        status: "pending",
        transferNote: data.transferNote,
      },
    });
    await prisma.transaction.create({
      data: {
        type: "payment_created",
        amount: data.amount,
        referenceId: payment.id,
        description: `${data.method} payment for ${data.machine ?? "N/A"}`,
      },
    });
    broadcast("payment.created", {
      id: payment.id,
      amount: data.amount,
      method: data.method,
      customer: data.customer,
      machine: data.machine,
      status: payment.status,
    });
    if (data.method === "cash" && invoiceId) {
      const time = new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      broadcast("staff.request", {
        invoiceId,
        machine: data.machine,
        amount: data.amount,
        time,
      });
    }
    return { payment, paymentId: payment.id, invoiceId };
  });

export const confirmPayment = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      paymentId: z.string(),
      receivedAmount: z.number().int().min(0),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: data.paymentId } });
      if (!payment) throw new Error("Payment not found");
      if (payment.status !== "pending") throw new Error("Thanh toán đã được xử lý trước đó");

      const diff = data.receivedAmount - payment.amount;
      let status = "success";
      if (diff < 0) status = "partial";
      else if (diff > 0) status = "overpaid";

      const updated = await tx.payment.update({
        where: { id: data.paymentId },
        data: {
          status,
          paidAt: new Date(),
          reference: `THANHTOAN ${data.receivedAmount}`,
        },
      });

      let releasedMachine: string | null = null;
      let releasedMachineId: string | null = null;

      if (payment.invoiceId) {
        const invoice = await tx.invoice.findUnique({
          where: { id: payment.invoiceId },
          select: { machine: true },
        });

        await tx.invoice.update({
          where: { id: payment.invoiceId },
          data: { status: "Đã thanh toán" },
        });

        if (invoice?.machine) {
          const machine = await tx.machine.findFirst({
            where: { name: invoice.machine, status: "in_use" },
          });
          if (machine) {
            await tx.machine.update({
              where: { id: machine.id },
              data: { status: "idle", remaining: null, startedAt: null, customer: null },
            });
            releasedMachine = machine.name;
            releasedMachineId = machine.id;
          }
        }
      }

      await tx.transaction.create({
        data: {
          type: `payment_${status}`,
          amount: data.receivedAmount,
          referenceId: payment.id,
          description: `Confirmed: ${data.receivedAmount} (expected: ${payment.amount}, diff: ${diff})`,
        },
      });

      return { updated, releasedMachine, releasedMachineId };
    });

    if (result.releasedMachineId) broadcast("machine:updated", { id: result.releasedMachineId });
    broadcast("payment.success", {
      id: result.updated.id,
      status: result.updated.status,
      receivedAmount: data.receivedAmount,
      expectedAmount: result.updated.amount,
      diff: data.receivedAmount - result.updated.amount,
      releasedMachine: result.releasedMachine,
    });

    return { ...result.updated, releasedMachine: result.releasedMachine };
  });

export const refundPayment = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      paymentId: z.string(),
      amount: z.number().int().min(1),
      reason: z.string().min(1),
      processedBy: z.string().default("admin"),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: data.paymentId } });
      if (!payment) throw new Error("Payment not found");
      if (payment.status === "refunded") throw new Error("Đã hoàn tiền trước đó");
      if (payment.status === "pending") throw new Error("Thanh toán chưa được xác nhận");
      if (data.amount > payment.amount) throw new Error("Số tiền hoàn vượt quá số đã thu");

      const refund = await tx.refund.create({
        data: {
          paymentId: data.paymentId,
          invoiceId: payment.invoiceId ?? "",
          amount: data.amount,
          reason: data.reason,
          processedBy: data.processedBy,
        },
      });

      if (payment.invoiceId) {
        await tx.invoice.update({
          where: { id: payment.invoiceId },
          data: { refundedAt: new Date(), refundReason: data.reason },
        });
      }

      await tx.payment.update({
        where: { id: data.paymentId },
        data: { status: "refunded" },
      });

      await tx.transaction.create({
        data: {
          type: "refund",
          amount: -data.amount,
          referenceId: refund.id,
          description: `Refund: ${data.amount} - ${data.reason}`,
        },
      });

      return refund;
    });

    broadcast("payment.refund", { id: result.id, amount: data.amount, reason: data.reason });

    return result;
  });

export const listPayments = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const payments = await prisma.payment.findMany({
    include: { invoice: true, refunds: true },
    orderBy: { createdAt: "desc" },
  });
  return payments;
});

export const listTransactions = createServerFn({ method: "GET" })
  .inputValidator(z.object({ limit: z.number().int().default(50) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    return prisma.transaction.findMany({
      orderBy: { createdAt: "desc" },
      take: data.limit,
    });
  });

export const createNotification = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      type: z.string(),
      title: z.string(),
      message: z.string(),
      targetRole: z.string().nullable().optional(),
      metadata: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const auth = await requireKioskOrAdmin();
    if (auth.kind === "machine" && data.type !== "COMBO_ORDER") throw new Error("Unauthorized");
    const notif = await prisma.notification.create({ data });
    broadcast("notification.created", {
      id: notif.id,
      notifType: data.type,
      title: data.title,
      message: data.message,
    });
    return notif;
  });

export const listNotifications = createServerFn({ method: "GET" })
  .inputValidator(z.object({ limit: z.number().int().default(50) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    return prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: data.limit,
    });
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    return prisma.notification.update({ where: { id: data.id }, data: { read: true } });
  });

export const getInvoicePayments = createServerFn({ method: "GET" })
  .inputValidator(z.object({ invoiceId: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    return prisma.payment.findMany({
      where: { invoiceId: data.invoiceId },
      include: { refunds: true },
      orderBy: { createdAt: "desc" },
    });
  });

export const generateQRCode = createServerFn({ method: "GET" })
  .inputValidator(z.object({ amount: z.number().int(), note: z.string().optional() }))
  .handler(async ({ data }) => {
    const map = await getDecryptedSettings();

    const bankName = map.bank_name ?? "Vietcombank";
    const accountNo = map.bank_account_no ?? "1234567890";
    const accountHolder = map.bank_account_holder ?? "CYBERNET";
    const note = data.note ?? `THANHTOAN ${data.amount}`;

    const qrPayload = {
      bankName,
      accountNo,
      accountHolder,
      amount: data.amount,
      note,
    };

    return qrPayload;
  });

export const lookupBankAccount = createServerFn({ method: "POST" })
  .inputValidator(z.object({ bin: z.string(), accountNumber: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { bin, accountNumber } = data;

    const map = await getDecryptedSettings();
    const apiKey = map.vietqr_api_key || "";

    if (!apiKey) {
      return { ok: false, error: "no_api_key" as const, accountName: "" };
    }

    try {
      const res = await fetch("https://api.vietqr.io/v2/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-idx-api-key": apiKey,
        },
        body: JSON.stringify({ bin: Number(bin), accountNumber }),
      });
      const json = await res.json();

      if (json.code === "00" && json.data?.accountName) {
        return { ok: true, error: "" as const, accountName: json.data.accountName as string };
      }
      return { ok: false, error: json.desc || ("invalid" as const), accountName: "" };
    } catch {
      return { ok: false, error: "network_error" as const, accountName: "" };
    }
  });

export const claimInvoice = createServerFn({ method: "POST" })
  .inputValidator(z.object({ invoiceId: z.string(), staffName: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const existing = await prisma.invoice.findUnique({ where: { id: data.invoiceId } });
    if (!existing) return { ok: false, error: "not_found" as const };
    if (existing.assignedTo)
      return { ok: false, error: "already_claimed" as const, assignedTo: existing.assignedTo };

    await prisma.invoice.update({
      where: { id: data.invoiceId },
      data: { assignedTo: data.staffName, assignedAt: new Date(), status: "Đang xử lý" },
    });

    broadcast("invoice.claimed", {
      id: data.invoiceId,
      machine: existing.machine,
      assignedTo: data.staffName,
    });

    await prisma.notification.create({
      data: {
        type: "INVOICE_CLAIMED",
        title: `${data.staffName} đang xử lý`,
        message: `Máy ${existing.machine} — ${formatVND(existing.amount)}`,
        targetRole: "CASHIER",
        metadata: data.invoiceId,
      },
    });
    broadcast("notification.created", {
      notifType: "INVOICE_CLAIMED",
      title: `${data.staffName} đang xử lý`,
      message: `Máy ${existing.machine} — ${formatVND(existing.amount)}`,
    });

    return { ok: true };
  });

export const listStaffRequests = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return prisma.invoice.findMany({
    where: { method: "cash", status: { in: ["Chờ", "Đang xử lý"] } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
});

export const getStaffRequestById = createServerFn({ method: "GET" })
  .inputValidator(z.object({ invoiceId: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    return prisma.invoice.findUnique({ where: { id: data.invoiceId } });
  });
