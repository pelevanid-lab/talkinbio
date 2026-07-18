import { requireAdmin } from '@/utils/adminAuth';
import AdminLayout from '@/components/AdminLayout';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { estimateCostUsd } from '@/utils/modelPricing';

type BusinessCost = {
  businessId: string;
  businessName: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
  hasUnknownModel: boolean;
};

export default async function AdminAnalyticsPage() {
  await requireAdmin();

  // Fetch recent conversations with business name
  const { data: conversations } = await supabaseAdmin
    .from('conversations')
    .select(`
      id,
      visitor_session_id,
      created_at,
      businesses ( name )
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  // Faz 1.6: Landing demosu raporlaması
  const demoBusinessId = process.env.TALKINBIO_BUSINESS_ID;
  let demoStats: { conversationCount: number; messageCount: number; requestCount: number; conversionRate: number } | null = null;
  if (demoBusinessId) {
    const [{ data: demoConversations }, { count: requestCount }] = await Promise.all([
      supabaseAdmin.from('conversations').select('id').eq('business_id', demoBusinessId).eq('is_preview', false),
      supabaseAdmin.from('onboarding_requests').select('id', { count: 'exact', head: true }).eq('source', 'saule'),
    ]);
    const conversationIds = (demoConversations || []).map(c => c.id);
    const { count: messageCount } = conversationIds.length > 0
      ? await supabaseAdmin.from('messages').select('id', { count: 'exact', head: true }).in('conversation_id', conversationIds)
      : { count: 0 };
    const conversationCount = conversationIds.length;
    demoStats = {
      conversationCount,
      messageCount: messageCount || 0,
      requestCount: requestCount || 0,
      conversionRate: conversationCount > 0 ? Math.round(((requestCount || 0) / conversationCount) * 100) : 0,
    };
  }

  // Faz 4.2: maliyet panosu — içinde bulunulan takvim ayı, işletme bazında gruplanmış.
  const startOfMonthUtc = new Date();
  startOfMonthUtc.setUTCDate(1);
  startOfMonthUtc.setUTCHours(0, 0, 0, 0);

  const { data: usageRows } = await supabaseAdmin
    .from('usage_events')
    .select('business_id, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, businesses ( name )')
    .gte('created_at', startOfMonthUtc.toISOString());

  const costByBusiness = new Map<string, BusinessCost>();
  for (const row of (usageRows || []) as any[]) {
    const existing = costByBusiness.get(row.business_id) || {
      businessId: row.business_id,
      businessName: row.businesses?.name || 'Bilinmeyen işletme',
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      costUsd: 0,
      hasUnknownModel: false,
    };
    existing.inputTokens += row.input_tokens || 0;
    existing.outputTokens += row.output_tokens || 0;
    existing.cacheReadTokens += row.cache_read_tokens || 0;
    existing.cacheWriteTokens += row.cache_write_tokens || 0;
    const rowCost = estimateCostUsd(row.model, {
      inputTokens: row.input_tokens || 0,
      outputTokens: row.output_tokens || 0,
      cacheReadTokens: row.cache_read_tokens || 0,
      cacheWriteTokens: row.cache_write_tokens || 0,
    });
    if (rowCost === null) existing.hasUnknownModel = true;
    else existing.costUsd += rowCost;
    costByBusiness.set(row.business_id, existing);
  }
  const costRows = Array.from(costByBusiness.values()).sort((a, b) => b.costUsd - a.costUsd);

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Sistem Analitiği</h1>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Maliyet (Bu Ay)</h2>
          <p className="text-sm text-slate-500 mt-1">
            Tahmini $ maliyet — fiyatlar dolara sabit olduğu için ₺ dönüşümü gösterilmiyor (Faz 4.3 fiyatlama kararı).
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="p-4 font-medium">İşletme</th>
                <th className="p-4 font-medium text-right">Girdi Token</th>
                <th className="p-4 font-medium text-right">Çıktı Token</th>
                <th className="p-4 font-medium text-right">Cache Okuma</th>
                <th className="p-4 font-medium text-right">Cache Yazma</th>
                <th className="p-4 font-medium text-right">Tahmini Maliyet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {costRows.map((row) => (
                <tr key={row.businessId} className="hover:bg-slate-50">
                  <td className="p-4 text-slate-900">{row.businessName}</td>
                  <td className="p-4 text-right text-slate-600">{row.inputTokens.toLocaleString('tr-TR')}</td>
                  <td className="p-4 text-right text-slate-600">{row.outputTokens.toLocaleString('tr-TR')}</td>
                  <td className="p-4 text-right text-slate-600">{row.cacheReadTokens.toLocaleString('tr-TR')}</td>
                  <td className="p-4 text-right text-slate-600">{row.cacheWriteTokens.toLocaleString('tr-TR')}</td>
                  <td className="p-4 text-right font-medium text-slate-900">
                    ${row.costUsd.toFixed(3)}{row.hasUnknownModel ? ' (kısmi tahmin)' : ''}
                  </td>
                </tr>
              ))}
              {costRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">Bu ay için kullanım kaydı yok.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {demoStats && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Landing Demo</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100">
            <div className="p-6 text-center">
              <p className="text-2xl font-bold text-slate-900">{demoStats.conversationCount}</p>
              <p className="text-sm text-slate-500 mt-1">Konuşma</p>
            </div>
            <div className="p-6 text-center">
              <p className="text-2xl font-bold text-slate-900">{demoStats.messageCount}</p>
              <p className="text-sm text-slate-500 mt-1">Mesaj</p>
            </div>
            <div className="p-6 text-center">
              <p className="text-2xl font-bold text-slate-900">{demoStats.requestCount}</p>
              <p className="text-sm text-slate-500 mt-1">Saule Kaynaklı Erişim Talebi</p>
            </div>
            <div className="p-6 text-center">
              <p className="text-2xl font-bold text-slate-900">%{demoStats.conversionRate}</p>
              <p className="text-sm text-slate-500 mt-1">Dönüşüm (Konuşma → Talep)</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Son Görüşmeler (Platform Geneli)</h2>
        </div>
        
        <div className="divide-y divide-slate-100">
          {conversations?.map((conv: any) => (
            <div key={conv.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
              <div>
                <p className="font-medium text-slate-900">Ziyaretçi: {conv.visitor_session_id.substring(0,8)}...</p>
                <p className="text-sm text-slate-500">İşletme: {conv.businesses?.name}</p>
              </div>
              <div className="text-right text-sm text-slate-500">
                {new Date(conv.created_at).toLocaleString('tr-TR')}
              </div>
            </div>
          ))}
          {(!conversations || conversations.length === 0) && (
            <div className="p-8 text-center text-slate-500">Kayıtlı görüşme bulunamadı.</div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
