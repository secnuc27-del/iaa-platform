const SUPABASE_URL = 'https://ykmyoaaojauetfgrmauq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrbXlvYWFvamF1ZXRmZ3JtYXVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NTE5OTgsImV4cCI6MjA5MTQyNzk5OH0.1hGCoaow-CTC-U2p4Z8qSZuzKSwE5CEKZROwc3AmCv0';

async function test() {
  console.log("Iniciando teste de tabelas do Supabase...");
  
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  };

  try {
    // 1. Perfis de prestadores
    const pRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?profile_type=eq.provider`, { headers });
    const profiles = await pRes.json();
    console.log(`\n--- PROFILES (provider) (${profiles.length}):`);
    profiles.forEach(p => console.log(`- ${p.full_name} (${p.id})`));

    // 2. Publicações
    const pubRes = await fetch(`${SUPABASE_URL}/rest/v1/publications`, { headers });
    const pubs = await pubRes.json();
    console.log(`\n--- PUBLICATIONS (${pubs.length}):`);
    pubs.forEach(p => console.log(`- ${p.title} [type: ${p.type}]`));

    // 3. Vagas
    const jobRes = await fetch(`${SUPABASE_URL}/rest/v1/jobs`, { headers });
    const jobs = await jobRes.json();
    console.log(`\n--- JOBS (${jobs.length}):`);
    jobs.forEach(j => console.log(`- ${j.title}`));

    // 4. Classificados
    const clRes = await fetch(`${SUPABASE_URL}/rest/v1/classifieds`, { headers });
    const cls = await clRes.json();
    console.log(`\n--- CLASSIFIEDS (${cls.length}):`);
    cls.forEach(c => console.log(`- ${c.title}`));

  } catch (err) {
    console.error("Erro no teste:", err);
  }
}

test();
