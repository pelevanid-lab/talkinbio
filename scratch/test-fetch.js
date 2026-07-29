const https = require('https');
const url = 'https://spjylpncgisogfxuiodl.supabase.co/storage/v1/object/public/media/characters/_scene-refs/1785238718146-gfit30.jpg';

https.get(url, (res) => {
  console.log(`Status: ${res.statusCode}`);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Body:', data));
}).on('error', (err) => {
  console.error('Error:', err.message);
});
