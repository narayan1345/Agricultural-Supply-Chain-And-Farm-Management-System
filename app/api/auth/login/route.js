import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { setSession, signSession } from '@/lib/auth';
import { jsonError } from '@/lib/http';

export async function POST(request) {
  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!email || !password) {
      return Response.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const users = await query(
      `SELECT u.user_id AS id,u.full_name,u.email,u.password_hash,r.role_name
       FROM users u JOIN roles r ON r.role_id=u.role_id
       WHERE u.email=? AND u.is_active=1`,
      [email],
    );
    if (!users.length || !(await bcrypt.compare(password, users[0].password_hash))) {
      return Response.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const user = users[0];
    setSession(signSession(user));
    return Response.json({
      user: { id: user.id, name: user.full_name, email: user.email, role: user.role_name },
    });
  } catch (error) {
    return jsonError(error);
  }
}
