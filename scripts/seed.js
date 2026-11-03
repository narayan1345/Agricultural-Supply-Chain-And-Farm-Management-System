require('dotenv').config({ path: '.env.local' });

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function main() {
  const db = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'agritrack_db',
  });

  try {
    const [roles] = await db.query('SELECT role_id,role_name FROM roles');
    const roleIds = Object.fromEntries(roles.map((role) => [role.role_name, role.role_id]));
    for (const requiredRole of ['admin', 'farmer', 'distributor']) {
      if (!roleIds[requiredRole]) {
        throw new Error(`Role '${requiredRole}' is missing. Run database/schema.sql first.`);
      }
    }

    const users = [
      { name: 'System Administrator', email: 'admin@agritrack.local', password: 'Admin@123', role: 'admin' },
      { name: 'Ananya Rao', email: 'farmer@agritrack.local', password: 'Farmer@123', role: 'farmer' },
      { name: 'Kiran Mehta', email: 'buyer@agritrack.local', password: 'Buyer@123', role: 'distributor' },
    ];

    for (const user of users) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      await db.query(
        `INSERT INTO users(role_id,full_name,email,password_hash,phone)
         VALUES(?,?,?,?,?)
         ON DUPLICATE KEY UPDATE role_id=VALUES(role_id),full_name=VALUES(full_name),password_hash=VALUES(password_hash)`,
        [roleIds[user.role], user.name, user.email, passwordHash, '9876500000'],
      );
    }

    const [[farmer]] = await db.query("SELECT user_id FROM users WHERE email='farmer@agritrack.local'");
    await db.query(
      `INSERT INTO farms(owner_id,farm_name,location,land_area_acres,soil_type)
       SELECT ?, 'Sunrise Organic Farm','Mandya, Karnataka',12.5,'Red soil'
       WHERE NOT EXISTS(SELECT 1 FROM farms WHERE owner_id=? AND farm_name='Sunrise Organic Farm')`,
      [farmer.user_id, farmer.user_id],
    );
    const [[farm]] = await db.query(
      "SELECT farm_id FROM farms WHERE owner_id=? AND farm_name='Sunrise Organic Farm' ORDER BY farm_id LIMIT 1",
      [farmer.user_id],
    );

    const cropExamples = [
      ['Tomato', 'Arka Rakshak', 'Kharif', 2500],
      ['Ragi', 'GPU-28', 'Rabi', 1800],
      ['Paddy', 'IR-64', 'Kharif', 4000],
    ];
    for (const crop of cropExamples) {
      await db.query(
        `INSERT INTO crops(farm_id,crop_name,variety,season,expected_yield_kg)
         SELECT ?,?,?,?,?
         WHERE NOT EXISTS(SELECT 1 FROM crops WHERE farm_id=? AND crop_name=?)`,
        [farm.farm_id, ...crop, farm.farm_id, crop[0]],
      );
    }

    await db.query(
      `INSERT INTO warehouses(warehouse_name,location,capacity_kg,manager_name)
       SELECT 'Mysuru Central Warehouse','Mysuru, Karnataka',50000,'Suresh'
       WHERE NOT EXISTS(SELECT 1 FROM warehouses WHERE warehouse_name='Mysuru Central Warehouse')`,
    );
    const [[warehouse]] = await db.query(
      "SELECT warehouse_id FROM warehouses WHERE warehouse_name='Mysuru Central Warehouse' ORDER BY warehouse_id LIMIT 1",
    );
    const [crops] = await db.query(
      'SELECT crop_id,crop_name FROM crops WHERE farm_id=? ORDER BY crop_id',
      [farm.farm_id],
    );
    const prices = { Tomato: 80, Ragi: 40, Paddy: 35 };

    for (let index = 0; index < crops.length; index += 1) {
      const crop = crops[index];
      await db.query(
        `INSERT INTO harvests(farm_id,crop_id,harvest_date,quantity_kg,quality_grade)
         SELECT ?,?,DATE_SUB(CURDATE(),INTERVAL ? DAY),?, 'A'
         WHERE NOT EXISTS(SELECT 1 FROM harvests WHERE farm_id=? AND crop_id=?)`,
        [farm.farm_id, crop.crop_id, 10 + index * 5, 500 + index * 250, farm.farm_id, crop.crop_id],
      );
      await db.query(
        `INSERT INTO inventory(crop_id,warehouse_id,quantity_kg,unit_price,reorder_level_kg)
         VALUES(?,?,?,?,100)
         ON DUPLICATE KEY UPDATE quantity_kg=VALUES(quantity_kg),unit_price=VALUES(unit_price)`,
        [crop.crop_id, warehouse.warehouse_id, 400 + index * 150, prices[crop.crop_name] || 45],
      );
    }

    console.log('Seed complete. Demo logins:');
    console.log('  admin@agritrack.local / Admin@123');
    console.log('  farmer@agritrack.local / Farmer@123');
    console.log('  buyer@agritrack.local / Buyer@123');
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error('MySQL seed failed:', error.message);
  process.exitCode = 1;
});
