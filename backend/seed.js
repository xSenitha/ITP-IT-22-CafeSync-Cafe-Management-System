/**
 * CafeSync Sri Lankan Seed Script
 * Seeds: 1 admin + 1 staff + 1 test customer + 7 extra customers
 *        10 Sri Lankan menu items (with images)
 *        10 tables, 10 reservations, 10 orders + order items
 */
require('dotenv').config();
const { sequelize } = require('./config/db');

// Load models (order matters — deps first)
const User          = require('./common/user_management/models/User');
const MenuItem      = require('./menu_inventory_management/models/MenuItem');
const Stock         = require('./menu_inventory_management/models/Stock');
const Table         = require('./table_reservation_management/models/Table');
const Reservation   = require('./table_reservation_management/models/Reservation');
const Order         = require('./order_management/models/Order');
const OrderItem     = require('./order_management/models/OrderItem');

async function seed() {
    await sequelize.authenticate();
    console.log('✅ DB connected');
    await sequelize.sync({ alter: true });
    console.log('✅ Models synced\n');

    // ─────────────────────────────────────────────
    // 1. USERS — plaintext passwords, bcrypt hook handles hashing
    // ─────────────────────────────────────────────
    console.log('🌱 Seeding users…');

    // Delete existing test accounts so they get re-created with correct hash
    await User.destroy({ where: { email: ['admin@cafesync.lk','staff@cafesync.lk','customer@cafesync.lk'] } });

    const usersData = [
        { firstName: 'Admin', lastName: 'Silva', email: 'admin@cafesync.lk', password: 'Admin@123', phone: '+94112345678', role: 'admin' },
        { firstName: 'Kamal', lastName: 'Perera', email: 'staff@cafesync.lk', password: 'Staff@123', phone: '+94771234567', role: 'staff' },
        // TEST customer — all features accessible
        { firstName: 'Nimali', lastName: 'Fernando', email: 'customer@cafesync.lk', password: 'Customer@123', phone: '+94712345678', role: 'customer' },
        { firstName: 'Ashan', lastName: 'Wickramasinghe', email: 'ashan@example.lk', password: 'Pass@1234', phone: '+94771111111', role: 'customer' },
        { firstName: 'Dilini', lastName: 'Jayasuriya', email: 'dilini@example.lk', password: 'Pass@1234', phone: '+94772222222', role: 'customer' },
        { firstName: 'Roshan', lastName: 'Mendis', email: 'roshan@example.lk', password: 'Pass@1234', phone: '+94773333333', role: 'customer' },
        { firstName: 'Priyanka', lastName: 'Gunaratne', email: 'priyanka@example.lk', password: 'Pass@1234', phone: '+94774444444', role: 'customer' },
        { firstName: 'Chamara', lastName: 'Bandara', email: 'chamara@example.lk', password: 'Pass@1234', phone: '+94775555555', role: 'customer' },
        { firstName: 'Sanduni', lastName: 'Rathnayake', email: 'sanduni@example.lk', password: 'Pass@1234', phone: '+94776666666', role: 'customer' },
        { firstName: 'Tharaka', lastName: 'Kumara', email: 'tharaka@example.lk', password: 'Pass@1234', phone: '+94777777777', role: 'customer' },
    ];
    const users = [];
    for (const u of usersData) {
        const [user, created] = await User.findOrCreate({ where: { email: u.email }, defaults: u });
        users.push(user);
        console.log(`  ${created ? '✓ Created' : '→ Exists '} ${u.role}: ${u.email}`);
    }
    const testCustomer = users[2]; // Nimali Fernando — customer@cafesync.lk

    // ─────────────────────────────────────────────
    // 2. MENU ITEMS (Sri Lankan)
    // ─────────────────────────────────────────────
    console.log('\n🌱 Seeding menu items…');
    const menuData = [
        { name: 'Kottu Roti', description: 'Sri Lankan street-food classic — chopped roti stir-fried with vegetables, egg, and aromatic spices.', category: 'main_course', price: 650.00, image: '/uploads/kottu_roti.jpg', preparationTime: 15, isAvailable: true },
        { name: 'Egg Hoppers', description: 'Crispy bowl-shaped rice flour hoppers with a soft egg inside, served with coconut sambol.', category: 'main_course', price: 350.00, image: '/uploads/egg_hoppers.jpg', preparationTime: 12, isAvailable: true },
        { name: 'Lamprais', description: 'Dutch-Burgher heritage — rice and curries baked in banana leaf with frikkadel meatball.', category: 'special', price: 950.00, image: '/uploads/lamprais.jpg', preparationTime: 25, isAvailable: true },
        { name: 'Rice & Curry', description: 'Traditional Sri Lankan rice served with dhal, coconut sambol, fish curry, and papadum.', category: 'main_course', price: 750.00, image: '/uploads/rice_curry.jpg', preparationTime: 10, isAvailable: true },
        { name: 'Pol Roti', description: 'Homemade coconut flatbread served with pol sambol and dhal curry — a Sri Lankan breakfast staple.', category: 'appetizer', price: 280.00, image: '/uploads/pol_roti.jpg', preparationTime: 8, isAvailable: true },
        { name: 'Watalappan', description: 'Luscious Sri Lankan jaggery custard steamed with coconut milk, spiced with cardamom and cashews.', category: 'dessert', price: 420.00, image: '/uploads/watalappan.jpg', preparationTime: 5, isAvailable: true },
        { name: 'King Coconut (Thambili)', description: 'Fresh orange king coconut — a natural isotonic drink harvested in Sri Lanka.', category: 'beverage', price: 200.00, image: '/uploads/king_coconut.jpg', preparationTime: 2, isAvailable: true },
        { name: 'Ceylon Black Tea', description: 'World-renowned Ceylon tea brewed strong, served with milk or plain. The pride of Sri Lanka.', category: 'beverage', price: 180.00, image: null, preparationTime: 3, isAvailable: true },
        { name: 'String Hoppers (Indi Appa)', description: 'Steamed rice-flour noodle nests served with coconut milk gravy and pol sambol.', category: 'main_course', price: 380.00, image: null, preparationTime: 10, isAvailable: true },
        { name: 'Coconut Roti Pudding', description: 'Sri Lankan bread pudding made with leftover roti and sweetened coconut milk — a cozy dessert.', category: 'dessert', price: 320.00, image: null, preparationTime: 6, isAvailable: true },
    ];
    const menuItems = [];
    for (const m of menuData) {
        const [item, created] = await MenuItem.findOrCreate({ where: { name: m.name }, defaults: m });
        menuItems.push(item);
        console.log(`  ${created ? '✓ Created' : '→ Exists '} ${m.name}`);
    }

    // ─────────────────────────────────────────────
    // 3. STOCK (for each menu item)
    // ─────────────────────────────────────────────
    try {
        console.log('\n🌱 Seeding stock ingredients…');
        const stockItems = [
            { ingredientName: 'Roti Flour', category: 'grain', quantity: 50, unit: 'kg', minimumStock: 10, unitPrice: 120, supplier: 'Ceylon Flour Mills', status: 'in_stock' },
            { ingredientName: 'Coconut Milk', category: 'other', quantity: 80, unit: 'l', minimumStock: 15, unitPrice: 85, supplier: 'Cargills Ceylon', status: 'in_stock' },
            { ingredientName: 'Jaggery', category: 'other', quantity: 20, unit: 'kg', minimumStock: 5, unitPrice: 350, supplier: 'Keells Super', status: 'in_stock' },
            { ingredientName: 'Fresh Eggs', category: 'other', quantity: 300, unit: 'pieces', minimumStock: 50, unitPrice: 22, supplier: 'Lanka Eggs Ltd', status: 'in_stock' },
            { ingredientName: 'Ceylon Tea Leaves', category: 'beverage', quantity: 30, unit: 'kg', minimumStock: 8, unitPrice: 1200, supplier: 'Dilmah Exports', status: 'in_stock' },
            { ingredientName: 'Rice (Samba)', category: 'grain', quantity: 100, unit: 'kg', minimumStock: 20, unitPrice: 220, supplier: 'Araliya Food', status: 'in_stock' },
            { ingredientName: 'Dried Fish', category: 'meat', quantity: 15, unit: 'kg', minimumStock: 5, unitPrice: 1800, supplier: 'Negombo Fish Market', status: 'in_stock' },
            { ingredientName: 'Cashews', category: 'other', quantity: 8, unit: 'kg', minimumStock: 3, unitPrice: 2500, supplier: 'Lanka Cashew Corp', status: 'low_stock' },
            { ingredientName: 'Cardamom', category: 'spice', quantity: 2, unit: 'kg', minimumStock: 1, unitPrice: 3500, supplier: 'Spice Island Lanka', status: 'in_stock' },
            { ingredientName: 'King Coconut', category: 'fruit', quantity: 200, unit: 'pieces', minimumStock: 30, unitPrice: 60, supplier: 'Local Farmers Matale', status: 'in_stock' },
        ];
        for (const s of stockItems) {
            const [, created] = await Stock.findOrCreate({ where: { ingredientName: s.ingredientName }, defaults: s });
            if (created) console.log(`  ✓ Stock: ${s.ingredientName}`);
        }
    } catch (e) { console.log('  ⚠ Stock seeding skipped:', e.message.split('\n')[0]); }

    // ─────────────────────────────────────────────
    // 4. TABLES
    // ─────────────────────────────────────────────
    console.log('\n🌱 Seeding tables…');
    const tableConfigs = [
        { tableNumber: 1, seatingCapacity: 2, location: 'indoor',   status: 'available', description: 'Cozy window seat for two' },
        { tableNumber: 2, seatingCapacity: 4, location: 'indoor',   status: 'available', description: 'Central family table' },
        { tableNumber: 3, seatingCapacity: 4, location: 'outdoor',  status: 'available', description: 'Garden terrace table' },
        { tableNumber: 4, seatingCapacity: 6, location: 'vip',      status: 'available', description: 'Private VIP booth' },
        { tableNumber: 5, seatingCapacity: 2, location: 'balcony',  status: 'available', description: 'Balcony romantic table' },
        { tableNumber: 6, seatingCapacity: 4, location: 'indoor',   status: 'available', description: 'Near the coffee bar' },
        { tableNumber: 7, seatingCapacity: 8, location: 'vip',      status: 'available', description: 'Large group VIP room' },
        { tableNumber: 8, seatingCapacity: 2, location: 'outdoor',  status: 'available', description: 'Street-view outdoor seat' },
        { tableNumber: 9, seatingCapacity: 4, location: 'balcony',  status: 'available', description: 'Main balcony table' },
        { tableNumber: 10, seatingCapacity: 6, location: 'indoor',  status: 'available', description: 'Corner indoor booth' },
    ];
    const tables = [];
    for (const t of tableConfigs) {
        const [table, created] = await Table.findOrCreate({ where: { tableNumber: t.tableNumber }, defaults: t });
        tables.push(table);
        console.log(`  ${created ? '✓ Created' : '→ Exists '} Table #${t.tableNumber} (${t.location})`);
    }

    // ─────────────────────────────────────────────
    // 5. RESERVATIONS
    // ─────────────────────────────────────────────
    console.log('\n🌱 Seeding reservations…');
    const sriLankanNames = [
        ['Nimali Fernando', '+94712345678', 'nimali@example.lk'],
        ['Ashan Wickramasinghe', '+94771111111', 'ashan@example.lk'],
        ['Dilini Jayasuriya', '+94772222222', 'dilini@example.lk'],
        ['Roshan Mendis', '+94773333333', 'roshan@example.lk'],
        ['Priyanka Gunaratne', '+94774444444', 'priyanka@example.lk'],
        ['Chamara Bandara', '+94775555555', 'chamara@example.lk'],
        ['Sanduni Rathnayake', '+94776666666', 'sanduni@example.lk'],
        ['Tharaka Kumara', '+94777777777', 'tharaka@example.lk'],
        ['Malsha Dissanayake', '+94778888888', 'malsha@example.lk'],
        ['Saman Liyanage', '+94779999999', 'saman@example.lk'],
    ];
    const times = ['12:00:00','12:30:00','13:00:00','14:00:00','18:00:00','18:30:00','19:00:00','19:30:00','20:00:00','20:30:00'];
    const statuses = ['confirmed','confirmed','confirmed','pending','confirmed','cancelled','confirmed','pending','confirmed','completed'];
    const specialReqs = [
        'Please arrange flowers for anniversary',
        'Vegetarian meals only',
        'Baby high chair required',
        'Gluten-free options needed',
        'Birthday cake decoration please',
        null,
        'Wheelchair accessible table please',
        'Quiet corner preferred',
        'Business meeting setup',
        null,
    ];
    const today = new Date();
    const reservations = [];
    for (let i = 0; i < 10; i++) {
        const resDate = new Date(today);
        resDate.setDate(today.getDate() + i - 2);
        const resNum = `RES-2026-${String(1000 + i).padStart(4, '0')}`;
        const [res, created] = await Reservation.findOrCreate({
            where: { reservationNumber: resNum },
            defaults: {
                reservationNumber: resNum,
                tableId: tables[i].id,
                customerName: sriLankanNames[i][0],
                customerPhone: sriLankanNames[i][1],
                customerEmail: sriLankanNames[i][2],
                partySize: [2,4,3,2,5,4,2,6,3,4][i],
                reservationDate: resDate.toISOString().split('T')[0],
                reservationTime: times[i],
                duration: 90,
                status: statuses[i],
                specialRequests: specialReqs[i],
            }
        });
        reservations.push(res);
        console.log(`  ${created ? '✓ Created' : '→ Exists '} ${resNum} — ${sriLankanNames[i][0]}`);
    }

    // ─────────────────────────────────────────────
    // 6. ORDERS + ORDER ITEMS
    // ─────────────────────────────────────────────
    console.log('\n🌱 Seeding orders…');
    const orderStatuses = ['completed','completed','completed','preparing','pending','completed','ready','completed','cancelled','completed'];
    const orderTypes = ['dine-in','takeaway','dine-in','online','dine-in','takeaway','dine-in','online','dine-in','takeaway'];
    const orderMenuPairs = [
        [0,6], [1,7], [3,4], [2], [5,9], [0,1,7], [8,4], [3,6], [5], [1,2,7]
    ];

    for (let i = 0; i < 10; i++) {
        const ordNum = `ORD-2026-${String(2000 + i).padStart(4, '0')}`;
        const items = orderMenuPairs[i].map(j => menuItems[j]);
        const totalQtys = items.map(() => Math.floor(Math.random() * 2) + 1);
        const totalAmt = items.reduce((s, item, idx) => s + parseFloat(item.price) * totalQtys[idx], 0);

        const [order, created] = await Order.findOrCreate({
            where: { orderNumber: ordNum },
            defaults: {
                orderNumber: ordNum,
                customerId: testCustomer.id,
                customerName: sriLankanNames[i % sriLankanNames.length][0],
                orderType: orderTypes[i],
                status: orderStatuses[i],
                tableNumber: orderTypes[i] === 'dine-in' ? (i % 10) + 1 : null,
                totalAmount: totalAmt.toFixed(2),
                notes: i % 3 === 0 ? 'Extra spicy please' : null,
            }
        });

        if (created) {
            for (let j = 0; j < items.length; j++) {
                await OrderItem.create({
                    orderId: order.id,
                    menuItemId: items[j].id,
                    itemName: items[j].name,
                    quantity: totalQtys[j],
                    unitPrice: items[j].price,
                    totalPrice: (parseFloat(items[j].price) * totalQtys[j]).toFixed(2),
                });
            }
        }
        console.log(`  ${created ? '✓ Created' : '→ Exists '} ${ordNum} — ${orderTypes[i]} (LKR ${totalAmt.toFixed(2)})`);
    }

    // ─────────────────────────────────────────────
    // SUMMARY
    // ─────────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SEEDING COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('🔐 LOGIN CREDENTIALS:');
    console.log('');
    console.log('  👤 TEST CUSTOMER (all customer features):');
    console.log('     Email   : customer@cafesync.lk');
    console.log('     Password: Customer@123');
    console.log('');
    console.log('  🛡️  ADMIN:');
    console.log('     Email   : admin@cafesync.lk');
    console.log('     Password: Admin@123');
    console.log('');
    console.log('  👔 STAFF:');
    console.log('     Email   : staff@cafesync.lk');
    console.log('     Password: Staff@123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await sequelize.close();
}

seed().catch(err => {
    console.error('❌ Seed failed:', err.message);
    console.error(err);
    process.exit(1);
});
