const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:9M7tK2%21LjiK_y6A@db.gzulcagpylsoeelaxdgv.supabase.co:5432/postgres',
});

client.connect()
  .then(() => {
    console.log('✅ Connected via direct IPv6!');
    client.end();
  })
  .catch(err => {
    console.error('❌ Connection error:', err.message);
  });
