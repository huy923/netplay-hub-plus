import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding database...");

    // Clear existing data
    await prisma.invoice.deleteMany();
    await prisma.menuItem.deleteMany();
    await prisma.machine.deleteMany();
    await prisma.user.deleteMany();

    // Create Machines
    const machines = await Promise.all([
        prisma.machine.create({
            data: {
                name: "Máy 01",
                area: "Thường",
                status: "in_use",
                customer: "Khách vãng lai",
                startedAt: new Date(),
                remaining: "01:25",
                pricePerHour: 8000,
            },
        }),
        prisma.machine.create({
            data: {
                name: "Máy 02",
                area: "Thường",
                status: "idle",
                pricePerHour: 8000,
            },
        }),
        prisma.machine.create({
            data: {
                name: "Máy 03",
                area: "Thường",
                status: "in_use",
                customer: "Nguyễn Văn A",
                startedAt: new Date(),
                remaining: "00:12",
                pricePerHour: 8000,
            },
        }),
        prisma.machine.create({
            data: {
                name: "Máy 04",
                area: "Thường",
                status: "maintenance",
                pricePerHour: 8000,
            },
        }),
        prisma.machine.create({
            data: {
                name: "VIP 01",
                area: "VIP",
                status: "in_use",
                customer: "Trần Minh",
                startedAt: new Date(),
                remaining: "02:40",
                pricePerHour: 15000,
            },
        }),
        prisma.machine.create({
            data: {
                name: "VIP 02",
                area: "VIP",
                status: "idle",
                pricePerHour: 15000,
            },
        }),
        prisma.machine.create({
            data: {
                name: "VIP 03",
                area: "VIP",
                status: "in_use",
                customer: "Lê Hoa",
                startedAt: new Date(),
                remaining: "00:45",
                pricePerHour: 15000,
            },
        }),
        prisma.machine.create({
            data: {
                name: "PS5 01",
                area: "PS5",
                status: "in_use",
                customer: "Phạm Đức",
                startedAt: new Date(),
                remaining: "01:00",
                pricePerHour: 20000,
            },
        }),
        prisma.machine.create({
            data: {
                name: "PS5 02",
                area: "PS5",
                status: "idle",
                pricePerHour: 20000,
            },
        }),
        prisma.machine.create({
            data: {
                name: "Máy 05",
                area: "Thường",
                status: "in_use",
                customer: "Khách vãng lai",
                startedAt: new Date(),
                remaining: "00:30",
                pricePerHour: 8000,
            },
        }),
        prisma.machine.create({
            data: {
                name: "Máy 06",
                area: "Thường",
                status: "idle",
                pricePerHour: 8000,
            },
        }),
        prisma.machine.create({
            data: {
                name: "Máy 07",
                area: "Thường",
                status: "idle",
                pricePerHour: 8000,
            },
        }),
    ]);

    console.log(`✅ Created ${machines.length} machines`);

    // Create Menu Items
    const menuItems = await Promise.all([
        prisma.menuItem.create({
            data: { name: "Pepsi lon", category: "Đồ uống", price: 12000, emoji: "🥤" },
        }),
        prisma.menuItem.create({
            data: { name: "Sting dâu", category: "Đồ uống", price: 12000, emoji: "🧃" },
        }),
        prisma.menuItem.create({
            data: { name: "Redbull", category: "Đồ uống", price: 15000, emoji: "🪫" },
        }),
        prisma.menuItem.create({
            data: { name: "Mì tôm trứng", category: "Ăn vặt", price: 25000, emoji: "🍜" },
        }),
        prisma.menuItem.create({
            data: { name: "Xúc xích", category: "Ăn vặt", price: 15000, emoji: "🌭" },
        }),
        prisma.menuItem.create({
            data: { name: "Khoai tây chiên", category: "Ăn vặt", price: 25000, emoji: "🍟" },
        }),
        prisma.menuItem.create({
            data: { name: "Combo Game Thủ", category: "Combo", price: 55000, emoji: "🎮" },
        }),
        prisma.menuItem.create({
            data: { name: "Combo Đêm Khuya", category: "Combo", price: 70000, emoji: "🌙" },
        }),
    ]);

    console.log(`✅ Created ${menuItems.length} menu items`);

    // Create Invoices
    const invoices = await Promise.all([
        prisma.invoice.create({
            data: {
                id: "HD0241",
                machine: "Máy 03",
                customer: "Nguyễn Văn A",
                amount: 48000,
                method: "QR",
                status: "Đã thanh toán",
                time: "14:20",
            },
        }),
        prisma.invoice.create({
            data: {
                id: "HD0240",
                machine: "VIP 01",
                customer: "Trần Minh",
                amount: 95000,
                method: "Tiền mặt",
                status: "Đã thanh toán",
                time: "13:55",
            },
        }),
        prisma.invoice.create({
            data: {
                id: "HD0239",
                machine: "PS5 01",
                customer: "Phạm Đức",
                amount: 60000,
                method: "Ví điện tử",
                status: "Chờ",
                time: "13:40",
            },
        }),
        prisma.invoice.create({
            data: {
                id: "HD0238",
                machine: "Máy 01",
                customer: "Khách vãng lai",
                amount: 32000,
                method: "Tiền mặt",
                status: "Đã thanh toán",
                time: "13:20",
            },
        }),
        prisma.invoice.create({
            data: {
                id: "HD0237",
                machine: "VIP 03",
                customer: "Lê Hoa",
                amount: 120000,
                method: "QR",
                status: "Đã thanh toán",
                time: "13:05",
            },
        }),
    ]);

    console.log(`✅ Created ${invoices.length} invoices`);

    // Create Users
    const users = await Promise.all([
        prisma.user.create({
            data: {
                username: "admin",
                password: "admin123", // In production, hash this!
                role: "admin",
            },
        }),
        prisma.user.create({
            data: {
                username: "cashier",
                password: "cashier123", // In production, hash this!
                role: "cashier",
            },
        }),
    ]);

    console.log(`✅ Created ${users.length} users`);

    console.log("🌱 Database seeded successfully!");
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
