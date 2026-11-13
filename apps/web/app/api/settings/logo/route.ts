import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/require-user';
import { jsonError } from '@/lib/api/responses';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

const MAX_FILE_SIZE = 1024 * 1024; // 1 MB

export async function POST(req: NextRequest) {
  const auth = await requireUser('admin');
  if (!auth.ok) return auth.response;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return jsonError(400, 'invalid_argument', 'FormData inválido');
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return jsonError(400, 'invalid_argument', 'Se requiere el archivo de imagen en el campo "file"');
  }

  const ext = ALLOWED_MIME_TYPES[file.type];
  if (!ext) {
    return jsonError(
      400,
      'invalid_argument',
      'Tipo de archivo no permitido (formatos válidos: PNG, JPEG, WebP, SVG)'
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return jsonError(413, 'payload_too_large', 'El archivo no debe superar 1 MB');
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const objectPath = `logo/${Date.now()}.${ext}`;

  // Get previous logo path to clean it up
  const { data: currentSettings } = await supabaseAdmin
    .from('app_settings')
    .select('logo_path')
    .eq('id', 1)
    .single();

  const oldLogoPath = currentSettings?.logo_path;

  // Upload new logo to branding bucket
  const { error: uploadError } = await supabaseAdmin.storage
    .from('branding')
    .upload(objectPath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return jsonError(500, 'internal_error', uploadError.message);
  }

  // Update app_settings
  const { error: updateError } = await supabaseAdmin
    .from('app_settings')
    .update({ logo_path: objectPath })
    .eq('id', 1);

  if (updateError) {
    return jsonError(500, 'internal_error', updateError.message);
  }

  // Delete previous logo if it existed
  if (oldLogoPath && oldLogoPath !== objectPath) {
    await supabaseAdmin.storage
      .from('branding')
      .remove([oldLogoPath]);
  }

  const { data: urlData } = supabaseAdmin.storage
    .from('branding')
    .getPublicUrl(objectPath);

  return NextResponse.json({
    logo_path: objectPath,
    logo_url: urlData?.publicUrl ?? null,
  });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUser('admin');
  if (!auth.ok) return auth.response;

  const { data: currentSettings } = await supabaseAdmin
    .from('app_settings')
    .select('logo_path')
    .eq('id', 1)
    .single();

  const oldLogoPath = currentSettings?.logo_path;

  if (oldLogoPath) {
    await supabaseAdmin.storage
      .from('branding')
      .remove([oldLogoPath]);
  }

  const { error: updateError } = await supabaseAdmin
    .from('app_settings')
    .update({ logo_path: null })
    .eq('id', 1);

  if (updateError) {
    return jsonError(500, 'internal_error', updateError.message);
  }

  return NextResponse.json({
    ok: true,
    logo_path: null,
    logo_url: null,
  });
}
