import { query } from '@/lib/db';
import { getSession, requireRole } from '@/lib/auth';
import { jsonError } from '@/lib/http';

export async function GET() {
  try {
    const session = requireRole(getSession());
    let metrics;
    let recentOrders = [];

    if (session.role === 'admin') {
      const [farms, crops, inventory, openOrders] = await Promise.all([
        query('SELECT COUNT(*) AS n FROM farms WHERE is_active=1'),
        query('SELECT COUNT(*) AS n FROM crops'),
        query('SELECT COUNT(*) AS n FROM inventory'),
        query("SELECT COUNT(*) AS n FROM orders WHERE status IN ('pending','confirmed','processing')"),
      ]);
      recentOrders = await query(
        `SELECT o.order_id,u.full_name AS buyer_name,o.order_date,o.status,o.total_amount
         FROM orders o JOIN users u ON u.user_id=o.buyer_id
         ORDER BY o.order_date DESC LIMIT 6`,
      );
      metrics = [
        { label: 'Active farms', value: farms[0].n },
        { label: 'Crop varieties', value: crops[0].n },
        { label: 'Inventory items', value: inventory[0].n },
        { label: 'Open orders', value: openOrders[0].n },
      ];
    } else if (session.role === 'farmer') {
      const [farms, crops, harvests, harvestTotal] = await Promise.all([
        query('SELECT COUNT(*) AS n FROM farms WHERE owner_id=? AND is_active=1', [session.id]),
        query('SELECT COUNT(*) AS n FROM crops c JOIN farms f ON f.farm_id=c.farm_id WHERE f.owner_id=?', [session.id]),
        query('SELECT COUNT(*) AS n FROM harvests h JOIN farms f ON f.farm_id=h.farm_id WHERE f.owner_id=?', [session.id]),
        query('SELECT COALESCE(SUM(h.quantity_kg),0) AS kg FROM harvests h JOIN farms f ON f.farm_id=h.farm_id WHERE f.owner_id=?', [session.id]),
      ]);
      metrics = [
        { label: 'Your active farms', value: farms[0].n },
        { label: 'Your crops', value: crops[0].n },
        { label: 'Harvest records', value: harvests[0].n },
        { label: 'Harvested kilograms', value: harvestTotal[0].kg },
      ];
    } else {
      const [inventory, openOrders, totalOrders, amount] = await Promise.all([
        query('SELECT COUNT(*) AS n FROM inventory WHERE quantity_kg>0'),
        query("SELECT COUNT(*) AS n FROM orders WHERE buyer_id=? AND status IN ('pending','confirmed','processing')", [session.id]),
        query('SELECT COUNT(*) AS n FROM orders WHERE buyer_id=?', [session.id]),
        query('SELECT COALESCE(SUM(total_amount),0) AS amount FROM orders WHERE buyer_id=?', [session.id]),
      ]);
      recentOrders = await query(
        `SELECT order_id,order_date,status,total_amount
         FROM orders WHERE buyer_id=? ORDER BY order_date DESC LIMIT 6`,
        [session.id],
      );
      metrics = [
        { label: 'Available inventory items', value: inventory[0].n },
        { label: 'Your open orders', value: openOrders[0].n },
        { label: 'Orders placed', value: totalOrders[0].n },
        { label: 'Order value', value: amount[0].amount },
      ];
    }

    return Response.json({ metrics, recentOrders });
  } catch (error) {
    return jsonError(error);
  }
}
