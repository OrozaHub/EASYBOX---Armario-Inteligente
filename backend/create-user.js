import fetch from 'node-fetch'; // No need actually, we can use global fetch in Node 18+

async function registrarProvider() {
  try {
    const res = await fetch('http://localhost:3000/api/auth/register-provider', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@easybox.com.br',
        password: 'admin',
        name: 'Isael Administrador'
      })
    });
    const data = await res.json();
    console.log(data);
  } catch(e) {
    console.error(e);
  }
}

registrarProvider();
