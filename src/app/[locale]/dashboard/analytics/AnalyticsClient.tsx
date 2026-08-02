'use client';

import { BarChart3, Users, MessageCircle, ExternalLink, Link } from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';

export default function AnalyticsClient({ business, viewsBySource, totalViews, totalConversations }: { business: any, viewsBySource: Record<string, number>, totalViews: number, totalConversations: number }) {
  const sources = Object.entries(viewsBySource)
    .sort((a, b) => b[1] - a[1]) // Sort by highest view count
    .map(([source, count]) => ({ source, count }));

  return (
    <DashboardShell business={business} active="analytics">
      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-['Inter']">
        <div className="mb-8">
          <h1 className="text-xl font-[800] tracking-[-0.02em] text-[#14231F] flex items-center gap-2">
            <BarChart3 className="w-5 h-5" /> Analiz
          </h1>
          <p className="text-sm text-[#4B5A55]">{business.name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Total Views Card */}
          <div className="bg-white border border-[rgba(20,35,31,0.10)] rounded-[20px] p-6 flex flex-col">
            <div className="w-12 h-12 bg-[#FFEDE9] text-[#FF6A5C] rounded-full flex items-center justify-center mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="text-[#8A8880] text-sm font-semibold font-mono tracking-wide uppercase mb-1">Toplam Görüntülenme</h2>
            <p className="text-4xl font-[800] font-['Bricolage_Grotesque'] text-[#14231F]">{totalViews}</p>
          </div>

          {/* Total Conversations Card */}
          <div className="bg-white border border-[rgba(20,35,31,0.10)] rounded-[20px] p-6 flex flex-col">
            <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="w-6 h-6" />
            </div>
            <h2 className="text-[#8A8880] text-sm font-semibold font-mono tracking-wide uppercase mb-1">Saule ile Konuşma</h2>
            <p className="text-4xl font-[800] font-['Bricolage_Grotesque'] text-[#14231F]">{totalConversations}</p>
          </div>
        </div>

        {/* Traffic Sources */}
        <div className="bg-white border border-[rgba(20,35,31,0.10)] rounded-[20px] overflow-hidden">
          <div className="px-6 py-5 border-b border-[rgba(20,35,31,0.10)] flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-[#4B5A55]" />
            <h3 className="text-lg font-[800] font-['Bricolage_Grotesque'] text-[#14231F]">Kanal Analizi (Kaynaklar)</h3>
          </div>
          
          <div className="p-6">
            {sources.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[#8A8880] text-sm">Henüz veri bulunmuyor.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sources.map((item, index) => {
                  const percentage = totalViews > 0 ? Math.round((item.count / totalViews) * 100) : 0;
                  return (
                    <div key={item.source} className="flex flex-col gap-2">
                      <div className="flex justify-between items-end text-sm">
                        <span className="font-semibold text-[#14231F] capitalize flex items-center gap-2">
                          {item.source === 'instagram' ? <Link className="w-3.5 h-3.5 text-pink-500" /> : <ExternalLink className="w-3.5 h-3.5 text-[#8A8880]" />}
                          {item.source}
                        </span>
                        <span className="text-[#4B5A55] font-mono">{item.count} ziyaretçi</span>
                      </div>
                      <div className="w-full bg-[#F4F2ED] rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="bg-[#FF6A5C] h-2.5 rounded-full transition-all duration-1000 ease-out" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </DashboardShell>
  );
}
