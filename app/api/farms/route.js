import { query } from '@/lib/db';
import { getSession, requireRole } from '@/lib/auth';
import { jsonError } from '@/lib/http';

const farmListSql = `SELECT f.farm_id,f.farm_name,u.full_name AS owner_name,
                           f.location,f.land_area_acres,f.soil_type
                    FROM farms f JOIN users u ON u.user_id=f.owner_id`;

export async function GET() {
  try {
    const session = requireRole(getSession(), ['admin', 'farmer']);
    const rows = session.role === 'admin'
      ? await query(`${farmListSql} ORDER BY f.farm_id`)
      : await query(`${farmListSql} WHERE f.owner_id=? ORDER BY f.farm_id`, [session.id]);
    return Response.json({ rows });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    const session = requireRole(getSession(), ['admin', 'farmer']);
    const body = await request.json();
    const farmName = String(body.farm_name || '').trim();
    const location = String(body.location || '').trim();
    const area = Number(body.land_area_acres);

    if (!farmName || !location || !Number.isFinite(area) || area <= 0) {
      return Response.json(
        { error: 'Farm name, location, and a positive land area are required.' },
        { status: 400 },
      );
    }

    const result = await query(
      'INSERT INTO farms(owner_id,farm_name,location,land_area_acres,soil_type) VALUES(?,?,?,?,?)',
      [session.id, farmName, location, area, String(body.soil_type || '').trim() || null],
    );
    return Response.json({ farm_id: result.insertId, ok: true }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
