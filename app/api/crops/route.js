import { query } from '@/lib/db';
import { getSession, requireRole } from '@/lib/auth';
import { jsonError } from '@/lib/http';

const cropListSql = `SELECT c.crop_id,c.crop_name,c.variety,c.season,c.expected_yield_kg,
                            f.farm_name,u.full_name AS farmer_name
                     FROM crops c
                     JOIN farms f ON f.farm_id=c.farm_id
                     JOIN users u ON u.user_id=f.owner_id`;

export async function GET() {
  try {
    const session = requireRole(getSession(), ['admin', 'farmer', 'distributor']);
    const rows = session.role === 'farmer'
      ? await query(`${cropListSql} WHERE f.owner_id=? ORDER BY c.crop_id`, [session.id])
      : await query(`${cropListSql} ORDER BY c.crop_id`);
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
    const cropName = String(body.crop_name || '').trim();
    const expectedYield = body.expected_yield_kg === '' ? 0 : Number(body.expected_yield_kg || 0);

    if (!Number.isInteger(farmId) || farmId < 1 || !cropName || !Number.isFinite(expectedYield) || expectedYield < 0) {
      return Response.json({ error: 'Choose a farm and enter a crop name.' }, { status: 400 });
    }
    if (session.role !== 'admin') {
      const ownedFarm = await query(
        'SELECT farm_id FROM farms WHERE farm_id=? AND owner_id=?',
        [farmId, session.id],
      );
      if (!ownedFarm.length) throw new Error('FORBIDDEN');
    }

    const result = await query(
      'INSERT INTO crops(farm_id,crop_name,variety,season,expected_yield_kg) VALUES(?,?,?,?,?)',
      [farmId, cropName, String(body.variety || '').trim() || null, String(body.season || '').trim() || null, expectedYield],
    );
    return Response.json({ crop_id: result.insertId, ok: true }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
