export function jsonError(error){
  const message=error?.message||'Unexpected server error';
  if(message==='UNAUTHORIZED') return Response.json({error:'Sign in to continue.'},{status:401});
  if(message==='FORBIDDEN') return Response.json({error:'This account does not have permission for that action.'},{status:403});
  if(['ER_SIGNAL_EXCEPTION','ER_CHECK_CONSTRAINT_VIOLATED','ER_NO_REFERENCED_ROW_2'].includes(error?.code)){
    return Response.json({error:error.sqlMessage||'The requested data violates a database rule.'},{status:400});
  }
  console.error('AgriTrack API error:',error);
  const detail=process.env.NODE_ENV==='development'?message:'Unexpected server error.';
  return Response.json({error:detail},{status:500});
}
