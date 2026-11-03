import { query } from '@/lib/db';
import { getSession, requireRole } from '@/lib/auth';
import { jsonError } from '@/lib/http';

export async function GET() {
  try {
    const session = requireRole(getSession(), ['admin', 'distributor']);
    const sql = `SELECT o.order_id,u.full_name AS buyer_name,o.order_date,o.status,o.total_amount
                 FROM orders o JOIN users u ON u.user_id=o.buyer_id`;
    const rows = session.role === 'admin'
      ? await query(`${sql} ORDER BY o.order_date DESC`)
      : await query(`${sql} WHERE o.buyer_id=? ORDER BY o.order_date DESC`, [session.id]);
    return Response.json({ rows });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    const session = requireRole(getSession(), ['admin', 'distributor']);
    const body = await request.json();
    const inventoryId = Number(body.inventory_id);
    const quantity = Number(body.quantity_kg);
    const address = String(body.delivery_address || '').trim();

    if (!Number.isInteger(inventoryId) || inventoryId < 1) {
      return Response.json({ error: 'Choose a valid inventory item.' }, { status: 400 });
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return Response.json({ error: 'Order quantity must be greater than zero.' }, { status: 400 });
    }
    if (!address || address.length > 255) {
      return Response.json({ error: 'Enter a delivery address of 1 to 255 characters.' }, { status: 400 });
    }

    await query('CALL sp_create_order(?,?,?,?)', [session.id, inventoryId, quantity, address]);
    return Response.json({ ok: true, message: 'Order created and inventory updated.' }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
