import { query } from '@/lib/db';
import { getSession, requireRole } from '@/lib/auth';
import { jsonError } from '@/lib/http';

const harvestListSql = `SELECT h.harvest_id,f.farm_name,c.crop_name,h.harvest_date,
                               h.quantity_kg,h.quality_grade,h.notes
                        FROM harvests h
                        JOIN farms f ON f.farm_id=h.farm_id
                        JOIN crops c ON c.crop_id=h.crop_id`;

export async function GET() {
  try {
    const session = requireRole(getSession(), ['admin', 'farmer', 'distributor']);
    const rows = session.role === 'farmer'
      ? await query(`${harvestListSql} WHERE f.owner_id=? ORDER BY h.harvest_date DESC`, [session.id])
      : await query(`${harvestListSql} ORDER BY h.harvest_date DESC`);
    return Response.json({ rows });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    const session = requireRole(getSession(), ['admin', 'farmer']);
    const body = await request.json();
    const farmId = Number(body.farm_id);
    const cropId = Number(body.crop_id);
    const quantity = Number(body.quantity_kg);
    const date = String(body.harvest_date || '');

    if (!Number.isInteger(farmId) || farmId < 1 || !Number.isInteger(cropId) || cropId < 1) {
      return Response.json({ error: 'Choose a valid farm and crop.' }, { status: 400 });
    }
    if (!Number.isFinite(quantity) || quantity <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return Response.json({ error: 'Enter a valid harvest date and a positive quantity.' }, { status: 400 });
    }
    if (session.role !== 'admin') {
      const ownedFarm = await query(
        'SELECT farm_id FROM farms WHERE farm_id=? AND owner_id=?',
        [farmId, session.id],
      );
      if (!ownedFarm.length) throw new Error('FORBIDDEN');
    }

    const result = await query(
      'INSERT INTO harvests(farm_id,crop_id,harvest_date,quantity_kg,quality_grade,notes) VALUES(?,?,?,?,?,?)',
      [farmId, cropId, date, quantity, ['A', 'B', 'C'].includes(body.quality_grade) ? body.quality_grade : 'A', String(body.notes || '').trim() || null],
    );
    return Response.json({ harvest_id: result.insertId, ok: true }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
