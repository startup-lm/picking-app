import { supabaseAdmin } from '../supabase/admin';

export async function updateOrderFile(orderId: number, filename: string, fileUrl: string) {
  const { error } = await supabaseAdmin
    .from('orders')
    .update({ filename, file_url: fileUrl })
    .eq('id', orderId);

  if (error) throw error;
}
