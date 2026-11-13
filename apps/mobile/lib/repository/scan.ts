import { supabase } from '@/lib/supabase/client';
import { uuidv4 } from '@/lib/uuid';
import type { FindLineResult, ScanResult, Stage, ScanKind } from '@/types/rpc';

export async function findLineByCode(orderId: number, code: string): Promise<FindLineResult> {
  const { data, error } = await supabase.rpc('api_find_line_by_code', {
    p_order_id: orderId,
    p_code: code,
  });

  if (error) {
    throw error;
  }

  return data as unknown as FindLineResult;
}

export async function scanLine(p: {
  lineId: number;
  stage: Stage;
  kind: ScanKind;
  delta: 1 | -1;
  code?: string;
}): Promise<ScanResult> {
  const { data, error } = await supabase.rpc('api_scan', {
    p_order_line_id: p.lineId,
    p_stage: p.stage,
    p_kind: p.kind,
    p_delta: p.delta,
    p_client_event_id: uuidv4(),
    p_code: p.code,
  });

  if (error) {
    throw error;
  }

  return data as unknown as ScanResult;
}

export async function completeOrder(orderId: number, stage: Stage): Promise<void> {
  const fn = stage === 'picking' ? 'api_complete_picking' : 'api_complete_dispatch';
  const { error } = await supabase.rpc(fn, {
    p_order_id: orderId,
  });

  if (error) {
    throw error;
  }
}
