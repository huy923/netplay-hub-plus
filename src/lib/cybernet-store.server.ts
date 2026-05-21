import postgres from "postgres";
import { getDefaultCybernetData, type CybernetData, type Customer, type ShopSettings } from "./cybernet-data";
import type { Invoice, Machine, MachineStatus, MenuItem } from "./mock-data";

type DataKey = keyof CybernetData;

const dataKeys: DataKey[] = ["machines", "menu", "invoices", "customers", "settings"];
const memory = globalThis as typeof globalThis & { __cybernetData?: CybernetData; __cybernetSql?: postgres.Sql };

function defaults() {
  return getDefaultCybernetData();
}

async function getSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return undefined;

  if (!memory.__cybernetSql) {
    memory.__cybernetSql = postgres(databaseUrl, {
      max: 1,
      ssl: process.env.DATABASE_SSL === "true" ? "require" : false,
    });
  }

  await memory.__cybernetSql`
    create table if not exists app_data (
      key text primary key,
      value jsonb not null,
      updated_at timestamptz not null default now()
    )
  `;

  const seed = defaults();
  for (const key of dataKeys) {
    await memory.__cybernetSql`
      insert into app_data (key, value)
      values (${key}, ${memory.__cybernetSql.json(seed[key])})
      on conflict (key) do nothing
    `;
  }

  return memory.__cybernetSql;
}

function getMemoryData() {
  if (!memory.__cybernetData) memory.__cybernetData = defaults();
  return memory.__cybernetData;
}

async function saveKey<K extends DataKey>(key: K, value: CybernetData[K]) {
  const sql = await getSql();
  if (!sql) {
    getMemoryData()[key] = value;
    return;
  }

  await sql`
    insert into app_data (key, value, updated_at)
    values (${key}, ${sql.json(value)}, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `;
}

export async function readCybernetData(): Promise<CybernetData> {
  const sql = await getSql();
  if (!sql) return getMemoryData();

  const rows = await sql<{ key: DataKey; value: CybernetData[DataKey] }[]>`
    select key, value from app_data where key in ${sql(dataKeys)}
  `;
  const data = defaults();
  for (const row of rows) {
    (data[row.key] as CybernetData[DataKey]) = row.value;
  }
  return data;
}

function nextId(prefix: string, existing: { id: string }[]) {
  const max = existing.reduce((current, item) => {
    const value = Number(item.id.replace(/\D/g, ""));
    return Number.isFinite(value) ? Math.max(current, value) : current;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

function addHours(remaining: string | undefined, hours: number) {
  const [h = "0", m = "0"] = (remaining ?? "00:00").split(":");
  const total = Number(h) * 60 + Number(m) + hours * 60;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function nowTime() {
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
}

function normalizeNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function mutateCybernetData(action: string, payload: Record<string, unknown> = {}) {
  const data = await readCybernetData();

  if (action === "machine.create") {
    const area = (payload.area as Machine["area"]) || "Thường";
    const machine: Machine = {
      id: String(Date.now()),
      name: String(payload.name || `Máy ${String(data.machines.length + 1).padStart(2, "0")}`),
      area,
      status: (payload.status as MachineStatus) || "idle",
      pricePerHour: normalizeNumber(payload.pricePerHour, area === "VIP" ? data.settings.vipPrice : area === "PS5" ? data.settings.ps5Price : data.settings.standardPrice),
    };
    data.machines = [...data.machines, machine];
    await saveKey("machines", data.machines);
  }

  if (action === "machine.update") {
    data.machines = data.machines.map((machine) =>
      machine.id === payload.id
        ? { ...machine, ...payload, pricePerHour: normalizeNumber(payload.pricePerHour, machine.pricePerHour) } as Machine
        : machine,
    );
    await saveKey("machines", data.machines);
  }

  if (action === "machine.delete") {
    data.machines = data.machines.filter((machine) => machine.id !== payload.id);
    await saveKey("machines", data.machines);
  }

  if (action === "machine.start") {
    data.machines = data.machines.map((machine) =>
      machine.id === payload.id
        ? { ...machine, status: "in_use", customer: String(payload.customer || "Khách vãng lai"), startedAt: nowTime(), remaining: "01:00" }
        : machine,
    );
    await saveKey("machines", data.machines);
  }

  if (action === "machine.end") {
    data.machines = data.machines.map((machine) => {
      if (machine.id !== payload.id) return machine;
      const { customer, startedAt, remaining, ...rest } = machine;
      return { ...rest, status: "idle" };
    });
    await saveKey("machines", data.machines);
  }

  if (action === "machine.extend") {
    data.machines = data.machines.map((machine) =>
      machine.id === payload.id ? { ...machine, remaining: addHours(machine.remaining, normalizeNumber(payload.hours, 1)) } : machine,
    );
    await saveKey("machines", data.machines);
  }

  if (action === "menu.create") {
    const item: MenuItem = {
      id: `m${Date.now()}`,
      name: String(payload.name || "Món mới"),
      category: (payload.category as MenuItem["category"]) || "Đồ uống",
      price: normalizeNumber(payload.price, 10000),
      emoji: String(payload.emoji || "🥤"),
    };
    data.menu = [...data.menu, item];
    await saveKey("menu", data.menu);
  }

  if (action === "menu.update") {
    data.menu = data.menu.map((item) =>
      item.id === payload.id ? { ...item, ...payload, price: normalizeNumber(payload.price, item.price) } as MenuItem : item,
    );
    await saveKey("menu", data.menu);
  }

  if (action === "menu.delete") {
    data.menu = data.menu.filter((item) => item.id !== payload.id);
    await saveKey("menu", data.menu);
  }

  if (action === "customer.create") {
    const customer: Customer = {
      id: nextId("KH", data.customers),
      name: String(payload.name || "Khách mới"),
      phone: String(payload.phone || ""),
      visits: normalizeNumber(payload.visits, 0),
      total: normalizeNumber(payload.total, 0),
      tier: (payload.tier as Customer["tier"]) || "Thường",
    };
    data.customers = [...data.customers, customer];
    await saveKey("customers", data.customers);
  }

  if (action === "customer.update") {
    data.customers = data.customers.map((customer) =>
      customer.id === payload.id
        ? { ...customer, ...payload, visits: normalizeNumber(payload.visits, customer.visits), total: normalizeNumber(payload.total, customer.total) } as Customer
        : customer,
    );
    await saveKey("customers", data.customers);
  }

  if (action === "customer.delete") {
    data.customers = data.customers.filter((customer) => customer.id !== payload.id);
    await saveKey("customers", data.customers);
  }

  if (action === "settings.update") {
    data.settings = { ...data.settings, ...payload } as ShopSettings;
    await saveKey("settings", data.settings);
  }

  if (action === "invoice.create") {
    const invoice: Invoice = {
      id: nextId("HD", data.invoices),
      machine: String(payload.machine || "Máy"),
      customer: String(payload.customer || "Khách vãng lai"),
      amount: normalizeNumber(payload.amount, 0),
      method: (payload.method as Invoice["method"]) || "QR",
      status: "Đã thanh toán",
      time: nowTime(),
    };
    data.invoices = [invoice, ...data.invoices].slice(0, 50);
    await saveKey("invoices", data.invoices);
  }

  return readCybernetData();
}
