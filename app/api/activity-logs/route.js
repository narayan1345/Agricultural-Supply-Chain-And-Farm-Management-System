import { getMongoCollection } from '@/lib/mongo';
import { getSession, requireRole } from '@/lib/auth';
import { jsonError } from '@/lib/http';
import { ObjectId } from 'mongodb';

function validObjectId(value) {
  return typeof value === 'string' && ObjectId.isValid(value);
}

export async function GET() {
  try {
    const session = requireRole(getSession(), ['admin', 'farmer', 'distributor']);
    const collection = await getMongoCollection();
    const filter = session.role === 'admin' ? {} : { actor_id: session.id };
    const rows = await collection.find(filter).sort({ created_at: -1 }).limit(50).toArray();
    return Response.json({
      rows: rows.map((row) => ({
        ...row,
        _id: row._id.toString(),
        created_at: row.created_at?.toISOString(),
        updated_at: row.updated_at?.toISOString(),
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    const session = requireRole(getSession(), ['admin', 'farmer', 'distributor']);
    const body = await request.json();
    const eventType = String(body.event_type || 'FIELD_NOTE').trim();
    const description = String(body.description || '').trim();
    const metadata = body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
      ? body.metadata
      : {};

    if (!eventType || !description) {
      return Response.json({ error: 'Enter an event type and description.' }, { status: 400 });
    }

    const collection = await getMongoCollection();
    const result = await collection.insertOne({
      event_type: eventType,
      actor_id: session.id,
      actor_email: session.email,
      description,
      metadata,
      created_at: new Date(),
    });
    return Response.json({ ok: true, id: result.insertedId.toString() }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request) {
  try {
    requireRole(getSession(), ['admin']);
    const body = await request.json();
    const description = String(body.description || '').trim();
    if (!validObjectId(body.id) || !description) {
      return Response.json({ error: 'A valid log id and description are required.' }, { status: 400 });
    }
    const collection = await getMongoCollection();
    const result = await collection.updateOne(
      { _id: new ObjectId(body.id) },
      { $set: { description, updated_at: new Date() } },
    );
    return Response.json({ modified: result.modifiedCount });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request) {
  try {
    requireRole(getSession(), ['admin']);
    const body = await request.json();
    if (!validObjectId(body.id)) {
      return Response.json({ error: 'A valid log id is required.' }, { status: 400 });
    }
    const collection = await getMongoCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(body.id) });
    return Response.json({ deleted: result.deletedCount });
  } catch (error) {
    return jsonError(error);
  }
}
