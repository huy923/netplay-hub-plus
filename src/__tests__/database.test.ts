import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { check } from "./helpers/check";

const prisma = new PrismaClient();

afterAll(async () => {
  await prisma.$disconnect();
});

describe("database — connection", () => {
  it("kết nối SQLite thành công", async () => {
    const result = await prisma.$queryRaw`SELECT 1 as ok`;
    await check("SELECT 1 trả về kết quả", () => {
      expect(Number((result as { ok: bigint }[])[0].ok)).toBe(1);
    });
  });
});

describe("database — seed data integrity", () => {
  it("machines", async () => {
    const count = await prisma.machine.count();
    await check("có 12 máy seed sẵn", () => {
      expect(count).toBe(12);
    });
    const areas = await prisma.machine.findMany({ select: { area: true }, distinct: ["area"] });
    await check("có 3 khu vực: Thường, VIP, PS5", () => {
      expect(areas.map((a) => a.area).sort()).toEqual(["PS5", "Thường", "VIP"]);
    });
    const inUse = await prisma.machine.count({ where: { status: "in_use" } });
    await check("có máy đang sử dụng (status = in_use)", () => {
      expect(inUse).toBeGreaterThan(0);
    });
    const idle = await prisma.machine.count({ where: { status: "idle" } });
    await check("có máy trống (status = idle)", () => {
      expect(idle).toBeGreaterThan(0);
    });
  });

  it("menu items", async () => {
    const count = await prisma.menuItem.count();
    await check("có menu items seed sẵn", () => {
      expect(count).toBeGreaterThan(0);
    });
    const pepsi = await prisma.menuItem.findUnique({ where: { name: "Pepsi lon" } });
    await check("Pepsi lon tồn tại với giá 12000", () => {
      expect(pepsi).not.toBeNull();
      expect(pepsi!.price).toBe(12000);
    });
    const redbull = await prisma.menuItem.findUnique({ where: { name: "Redbull" } });
    await check("Redbull tồn tại với stock = 0 (hết hàng)", () => {
      expect(redbull).not.toBeNull();
      expect(redbull!.stock).toBe(0);
    });
  });

  it("users", async () => {
    const admin = await prisma.user.findUnique({ where: { username: "admin" } });
    await check("user admin tồn tại", () => {
      expect(admin).not.toBeNull();
      expect(admin!.role).toBe("admin");
    });
  });

  it("combos", async () => {
    const count = await prisma.combo.count();
    await check("có combos seed sẵn", () => {
      expect(count).toBeGreaterThan(0);
    });
    const withItems = await prisma.combo.findFirst({ include: { items: true } });
    await check("combo có ít nhất 1 ComboItem liên kết MenuItem", () => {
      expect(withItems).not.toBeNull();
      expect(withItems!.items.length).toBeGreaterThan(0);
      expect(withItems!.items[0].menuItemId).toBeTruthy();
    });
  });

  it("customers", async () => {
    const count = await prisma.customer.count();
    await check("có customers seed sẵn", () => {
      expect(count).toBeGreaterThan(0);
    });
    const vip = await prisma.customer.findFirst({ where: { tier: "VIP" } });
    await check("có customer VIP", () => {
      expect(vip).not.toBeNull();
    });
  });
});

describe("database — Machine CRUD + constraints", () => {
  let testMachineId: string;

  it("tạo máy mới", async () => {
    const machine = await prisma.machine.create({
      data: { name: "TEST_MACH_001", area: "Test", pricePerHour: 5000 },
    });
    testMachineId = machine.id;
    await check("machine mới có id + name đúng", () => {
      expect(machine.id).toBeTruthy();
      expect(machine.name).toBe("TEST_MACH_001");
    });
    await check("status mặc định = idle", () => {
      expect(machine.status).toBe("idle");
    });
    await check("pricePerHour đúng", () => {
      expect(machine.pricePerHour).toBe(5000);
    });
    await check("timestamps auto-generated", () => {
      expect(machine.createdAt).toBeInstanceOf(Date);
      expect(machine.updatedAt).toBeInstanceOf(Date);
    });
  });

  it("unique constraint trên machine.name", async () => {
    await expect(
      prisma.machine.create({
        data: { name: "TEST_MACH_001", area: "Test", pricePerHour: 5000 },
      }),
    ).rejects.toThrow();
    await check("tạo máy trùng tên → ném lỗi unique", () => {
      expect(true).toBe(true);
    });
  });

  it("cập nhật máy", async () => {
    const updated = await prisma.machine.update({
      where: { id: testMachineId },
      data: { status: "in_use", customer: "Khách test", ip: "192.168.1.100" },
    });
    await check("cập nhật status + customer + ip", () => {
      expect(updated.status).toBe("in_use");
      expect(updated.customer).toBe("Khách test");
      expect(updated.ip).toBe("192.168.1.100");
    });
  });

  it("xóa máy test (cascade sessions)", async () => {
    await prisma.machine.delete({ where: { id: testMachineId } });
    const found = await prisma.machine.findUnique({ where: { id: testMachineId } });
    await check("sau khi xóa → không tìm thấy", () => {
      expect(found).toBeNull();
    });
  });
});

describe("database — MenuItem CRUD + constraints", () => {
  let testItemId: string;

  it("tạo menu item mới", async () => {
    const item = await prisma.menuItem.create({
      data: { name: "TEST_FOOD_001", category: "Test", price: 25000, stock: 10 },
    });
    testItemId = item.id;
    await check("menu item có id + fields đúng", () => {
      expect(item.id).toBeTruthy();
      expect(item.name).toBe("TEST_FOOD_001");
      expect(item.price).toBe(25000);
      expect(item.stock).toBe(10);
    });
    await check("cost mặc định = 0", () => {
      expect(item.cost).toBe(0);
    });
    await check("lowStockThreshold mặc định = 5", () => {
      expect(item.lowStockThreshold).toBe(5);
    });
  });

  it("unique constraint trên menu item name", async () => {
    await expect(
      prisma.menuItem.create({
        data: { name: "TEST_FOOD_001", category: "Test", price: 10000 },
      }),
    ).rejects.toThrow();
    await check("tạo trùng tên → ném lỗi unique", () => {
      expect(true).toBe(true);
    });
  });

  it("cập nhật stock", async () => {
    const updated = await prisma.menuItem.update({
      where: { id: testItemId },
      data: { stock: { decrement: 3 } },
    });
    await check("stock giảm từ 10 → 7", () => {
      expect(updated.stock).toBe(7);
    });
  });

  it("xóa menu item", async () => {
    await prisma.menuItem.delete({ where: { id: testItemId } });
    await check("sau khi xóa → không tìm thấy", async () => {
      const found = await prisma.menuItem.findUnique({ where: { id: testItemId } });
      expect(found).toBeNull();
    });
  });
});

describe("database — Invoice + InvoiceItem relation + cascade", () => {
  let invoiceId: string;

  it("tạo invoice + invoiceItems", async () => {
    const invoice = await prisma.invoice.create({
      data: {
        machine: "TEST_INV_MACHINE",
        customer: "Khách test",
        amount: 50000,
        method: "CASH",
        status: "Chờ xử lý",
        time: "10:00",
        items: {
          create: [
            { name: "Pepsi lon", price: 12000, qty: 2, type: "menu" },
            { name: "Khoai tây chiên", price: 25000, qty: 1, type: "menu" },
          ],
        },
      },
      include: { items: true },
    });
    invoiceId = invoice.id;
    await check("invoice có id + amount đúng", () => {
      expect(invoice.id).toBeTruthy();
      expect(invoice.amount).toBe(50000);
      expect(invoice.status).toBe("Chờ xử lý");
    });
    await check("invoice có 2 items liên kết", () => {
      expect(invoice.items.length).toBe(2);
      expect(invoice.items.map((i) => i.name).sort()).toEqual(["Khoai tây chiên", "Pepsi lon"]);
    });
    await check("invoice items có invoiceId đúng", () => {
      expect(invoice.items.every((i) => i.invoiceId === invoiceId)).toBe(true);
    });
  });

  it("tìm invoice theo machine + status", async () => {
    const invoices = await prisma.invoice.findMany({
      where: { machine: "TEST_INV_MACHINE", status: "Chờ xử lý" },
      include: { items: true },
    });
    await check("tìm thấy invoice test", () => {
      expect(invoices.length).toBe(1);
      expect(invoices[0].items.length).toBe(2);
    });
  });

  it("cascade delete: xóa invoice → xóa invoiceItems", async () => {
    const itemsBefore = await prisma.invoiceItem.count({ where: { invoiceId } });
    await prisma.invoice.delete({ where: { id: invoiceId } });
    const itemsAfter = await prisma.invoiceItem.count({ where: { invoiceId } });
    await check("trước khi xóa: có 2 items", () => {
      expect(itemsBefore).toBe(2);
    });
    await check("sau khi xóa invoice: items bị xóa theo (cascade)", () => {
      expect(itemsAfter).toBe(0);
    });
  });
});

describe("database — Invoice status lifecycle", () => {
  it("chuyển trạng thái đơn hàng", async () => {
    const invoice = await prisma.invoice.create({
      data: {
        machine: "TEST_STATUS",
        customer: "",
        amount: 15000,
        method: "CASH",
        status: "Chờ xử lý",
        time: "11:00",
        items: { create: [{ name: "Sting dâu", price: 12000, qty: 1, type: "menu" }] },
      },
    });
    const statuses = ["Đang chuẩn bị", "Đã giao", "Đã gộp", "Đã thanh toán"];
    for (const s of statuses) {
      const updated = await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: s },
      });
      await check(`status "${s}" cập nhật đúng`, () => {
        expect(updated.status).toBe(s);
      });
    }
    await prisma.invoice.delete({ where: { id: invoice.id } });
  });
});

describe("database — Discount CRUD", () => {
  let discountId: string;

  it("tạo discount code", async () => {
    const d = await prisma.discount.create({
      data: {
        code: "TEST10PCT",
        name: "Giảm 10%",
        type: "percent",
        value: 10,
        minAmount: 50000,
        maxUses: 100,
        active: true,
      },
    });
    discountId = d.id;
    await check("discount có id + code đúng", () => {
      expect(d.id).toBeTruthy();
      expect(d.code).toBe("TEST10PCT");
    });
    await check("usedCount mặc định = 0", () => {
      expect(d.usedCount).toBe(0);
    });
  });

  it("unique constraint trên discount code", async () => {
    await expect(
      prisma.discount.create({
        data: { code: "TEST10PCT", name: "Dup", type: "percent", value: 5 },
      }),
    ).rejects.toThrow();
    await check("tạo trùng code → ném lỗi unique", () => {
      expect(true).toBe(true);
    });
  });

  it("liên kết discount với invoice", async () => {
    const invoice = await prisma.invoice.create({
      data: {
        machine: "TEST_DISC",
        customer: "",
        amount: 100000,
        method: "CASH",
        status: "Chờ",
        time: "12:00",
        discountId,
        discountAmount: 10000,
        items: { create: [{ name: "Pepsi lon", price: 12000, qty: 1, type: "menu" }] },
      },
    });
    const withDiscount = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: { discount: true },
    });
    await check("invoice có discountId + discount relation", () => {
      expect(withDiscount!.discountId).toBe(discountId);
      expect(withDiscount!.discount!.code).toBe("TEST10PCT");
      expect(withDiscount!.discountAmount).toBe(10000);
    });
    await prisma.invoice.delete({ where: { id: invoice.id } });
  });

  it("xóa discount", async () => {
    await prisma.discount.delete({ where: { id: discountId } });
    await check("sau khi xóa → không tìm thấy", async () => {
      const found = await prisma.discount.findUnique({ where: { id: discountId } });
      expect(found).toBeNull();
    });
  });
});

describe("database — Customer + LoyaltyTransaction", () => {
  let customerId: string;

  it("tạo customer mới", async () => {
    const c = await prisma.customer.create({
      data: {
        name: "Test Customer",
        phone: "0999000001",
        password: "hashed123",
        tier: "Thường",
        visits: 1,
        total: 50000,
      },
    });
    customerId = c.id;
    await check("customer có id + phone đúng", () => {
      expect(c.id).toBeTruthy();
      expect(c.phone).toBe("0999000001");
    });
    await check("points mặc định = 0", () => {
      expect(c.points).toBe(0);
    });
  });

  it("unique constraint trên customer phone", async () => {
    await expect(
      prisma.customer.create({
        data: { name: "Dup", phone: "0999000001", password: "x" },
      }),
    ).rejects.toThrow();
    await check("tạo trùng phone → ném lỗi unique", () => {
      expect(true).toBe(true);
    });
  });

  it("thêm loyalty transaction + relation", async () => {
    const tx = await prisma.loyaltyTransaction.create({
      data: {
        customerId,
        points: 100,
        type: "earn",
        reference: "Thanh toán đơn #123",
      },
    });
    await check("loyalty transaction có points + type", () => {
      expect(tx.points).toBe(100);
      expect(tx.type).toBe("earn");
    });
    const customerWithTx = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { loyaltyTransactions: true },
    });
    await check("customer có 1 loyalty transaction liên kết", () => {
      expect(customerWithTx!.loyaltyTransactions.length).toBe(1);
      expect(customerWithTx!.loyaltyTransactions[0].points).toBe(100);
    });
  });

  it("cascade delete: xóa customer → xóa loyalty transactions", async () => {
    await prisma.customer.delete({ where: { id: customerId } });
    const txs = await prisma.loyaltyTransaction.findMany({ where: { customerId } });
    await check("sau khi xóa customer: loyalty transactions bị xóa", () => {
      expect(txs.length).toBe(0);
    });
  });
});

describe("database — Payment + Refund relation", () => {
  let paymentId: string;
  let invoiceId: string;

  it("tạo payment liên kết invoice", async () => {
    const inv = await prisma.invoice.create({
      data: {
        machine: "TEST_PAY",
        customer: "",
        amount: 25000,
        method: "QR",
        status: "Chờ",
        time: "13:00",
        items: { create: [{ name: "Bạc xỉu", price: 20000, qty: 1, type: "menu" }] },
      },
    });
    invoiceId = inv.id;

    const payment = await prisma.payment.create({
      data: {
        invoiceId: inv.id,
        amount: 25000,
        method: "qr",
        status: "completed",
        bankCode: "VCB",
        accountNo: "123456",
      },
    });
    paymentId = payment.id;
    await check("payment có invoiceId + amount + method", () => {
      expect(payment.invoiceId).toBe(invoiceId);
      expect(payment.amount).toBe(25000);
      expect(payment.method).toBe("qr");
    });
    await check("payment status mặc định ban đầu = completed (đã set)", () => {
      expect(payment.status).toBe("completed");
    });
  });

  it("tạo refund linked payment", async () => {
    const refund = await prisma.refund.create({
      data: {
        paymentId,
        invoiceId,
        amount: 5000,
        reason: "Khách hủy một phần",
        processedBy: "admin",
      },
    });
    await check("refund có amount + reason đúng", () => {
      expect(refund.amount).toBe(5000);
      expect(refund.reason).toBe("Khách hủy một phần");
    });
    await check("refund status mặc định = completed", () => {
      expect(refund.status).toBe("completed");
    });
    await check("refund linked payment", async () => {
      const withPayment = await prisma.refund.findUnique({
        where: { id: refund.id },
        include: { payment: true },
      });
      expect(withPayment!.payment.amount).toBe(25000);
    });
  });

  it("cascade: xóa payment → xóa refunds", async () => {
    await prisma.payment.delete({ where: { id: paymentId } });
    const refunds = await prisma.refund.findMany({ where: { paymentId } });
    await check("sau khi xóa payment: refunds bị xóa", () => {
      expect(refunds.length).toBe(0);
    });
    await prisma.invoice.delete({ where: { id: invoiceId } });
  });
});

describe("database — Setting CRUD", () => {
  it("upsert setting", async () => {
    const s1 = await prisma.setting.upsert({
      where: { key: "TEST_SETTING" },
      update: { value: "value2" },
      create: { key: "TEST_SETTING", value: "value1", category: "test" },
    });
    await check("setting tạo mới đúng value", () => {
      expect(s1.value).toBe("value1");
    });
    const s2 = await prisma.setting.upsert({
      where: { key: "TEST_SETTING" },
      update: { value: "value2" },
      create: { key: "TEST_SETTING", value: "value1", category: "test" },
    });
    await check("upsert lần 2 → update value", () => {
      expect(s2.value).toBe("value2");
    });
    await prisma.setting.delete({ where: { key: "TEST_SETTING" } });
  });
});

describe("database — AuditLog", () => {
  it("tạo audit log", async () => {
    const log = await prisma.auditLog.create({
      data: {
        userId: "test-user",
        username: "test_admin",
        action: "LOGIN",
        target: "admin",
        ip: "127.0.0.1",
      },
    });
    await check("audit log có action + username đúng", () => {
      expect(log.action).toBe("LOGIN");
      expect(log.username).toBe("test_admin");
      expect(log.ip).toBe("127.0.0.1");
    });
    await check("audit log createdAt auto-generated", () => {
      expect(log.createdAt).toBeInstanceOf(Date);
    });
    await prisma.auditLog.delete({ where: { id: log.id } });
  });
});

describe("database — raw query + model count", () => {
  it("đếm tổng số bản ghi mỗi model chính", async () => {
    const [machines, menus, users, combos, customers] = await Promise.all([
      prisma.machine.count(),
      prisma.menuItem.count(),
      prisma.user.count(),
      prisma.combo.count(),
      prisma.customer.count(),
    ]);
    await check("machines > 0", () => {
      expect(machines).toBeGreaterThan(0);
    });
    await check("menuItems > 0", () => {
      expect(menus).toBeGreaterThan(0);
    });
    await check("users > 0", () => {
      expect(users).toBeGreaterThan(0);
    });
    await check("combos > 0", () => {
      expect(combos).toBeGreaterThan(0);
    });
    await check("customers > 0", () => {
      expect(customers).toBeGreaterThan(0);
    });
  });
});
