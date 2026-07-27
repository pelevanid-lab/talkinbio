import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.log('Missing env variables');
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  const { data: files, error: listError } = await supabase.storage.from('media').list('characters/enes');
  if (listError) {
    console.error('List error:', listError);
    return;
  }
  
  const pngFiles = files.filter(f => f.name.endsWith('.png'));
  console.log(`Found ${pngFiles.length} files in storage.`);
  
  for (const f of pngFiles) {
    const publicUrl = `${url}/storage/v1/object/public/media/characters/enes/${f.name}`;
    
    // Check if it already exists in db
    const { data: existing } = await supabase.from('character_shots').select('id').eq('image_url', publicUrl).single();
    if (existing) {
      console.log(`Skipping ${f.name} (already in DB)`);
      continue;
    }
    
    console.log(`Recovering ${f.name}...`);
    const { error: insertError } = await supabase.from('character_shots').insert({
      character_id: 'enes',
      image_url: publicUrl,
      prompt: 'Recovered image',
      model: 'fal-ai/nano-banana-pro/edit',
      is_canon: false,
    });
    if (insertError) {
      console.error(`Error inserting ${f.name}:`, insertError);
    } else {
      console.log(`Successfully recovered ${f.name}`);
    }
  }
}

main();
