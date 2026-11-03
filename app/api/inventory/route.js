import { query } from '@/lib/db';
import { getSession, requireRole } from '@/lib/auth';
import { jsonError } from '@/lib/http';

export async function GET() {
  try {
    requireRole(getSession(), ['admin', 'farmer', 'distributor']);
    const rows = await query(
      `SELECT i.inventory_id,c.crop_name,c.variety,w.warehouse_name,w.location AS warehouse_location,
              i.quantity_kg,i.unit_price,i.reorder_level_kg,i.last_updated,
              CASE WHEN i.quantity_kg<=i.reorder_level_kg THEN 'REORDER' ELSE 'AVAILABLE' END AS stock_status
       FROM inventory i
       JOIN crops c ON c.crop_id=i.crop_id
       JOIN warehouses w ON w.warehouse_id=i.warehouse_id
       ORDER BY i.quantity_kg DESC,c.crop_name`,
    );
    return Response.json({ rows });
  } catch (error) {
    return jsonError(error);
  }
}
