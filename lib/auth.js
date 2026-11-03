import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
const COOKIE='agritrack_session';
function sessionSecret(){
  const secret=process.env.JWT_SECRET;
  if(!secret || secret.length<32) throw new Error('JWT_SECRET must be set to a random value of at least 32 characters.');
  return secret;
}
export function signSession(user){ return jwt.sign({id:user.id,name:user.full_name,email:user.email,role:user.role_name},sessionSecret(),{expiresIn:'12h'}); }
export function setSession(token){ cookies().set(COOKIE,token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:60*60*12}); }
export function clearSession(){ cookies().set(COOKIE,'',{httpOnly:true,path:'/',maxAge:0}); }
export function getSession(){ const token=cookies().get(COOKIE)?.value; if(!token) return null; try{return jwt.verify(token,sessionSecret());}catch{return null;} }
export function requireRole(session, roles=[]){ if(!session) throw new Error('UNAUTHORIZED'); if(roles.length && !roles.includes(session.role)) throw new Error('FORBIDDEN'); return session; }
