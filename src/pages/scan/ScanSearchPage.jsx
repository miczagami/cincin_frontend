import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Loader2 } from 'lucide-react';
import { ScreenHeader } from '../../components/ui';
import useScanStore from '../../context/scanStore';

export default function ScanSearchPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { search, searchResults, isSearching, searchQuery } = useScanStore();
  const [query, setQuery] = useState(searchQuery || '');

  useEffect(() => {
    const timer = setTimeout(() => { if (query.length >= 2) search(query); }, 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  const handleSelect = (bottle) => {
    useScanStore.setState({ scanResult: { topCandidate: bottle, candidates: [bottle] } });
    navigate('/scan/confirm');
  };

  return (
    <div className="min-h-dvh bg-cin-black px-5 pt-3 pb-10 animate-fade-in">
      <ScreenHeader title={t('scan.searchBottle')} back={t('common.back')} onBack={() => navigate('/scan')} />
      <div className="mt-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cin-muted" />
          <input className="cin-input pl-10 pr-10" placeholder="Search by name, producer, or vintage…" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
          {isSearching && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cin-cyan animate-spin" />}
        </div>
        <div className="mt-2">
          {searchResults.map((bottle, i) => (
            <button key={bottle.id || i} onClick={() => handleSelect(bottle)} className="w-full text-left px-3.5 py-3 border-b border-cin-border hover:bg-cin-card/50 transition-colors">
              <div className="text-sm text-cin-white font-body">{bottle.name || bottle.productName}</div>
              {(bottle.producer || bottle.vintage) && <div className="text-xs text-cin-muted font-body mt-0.5">{[bottle.producer, bottle.vintage, bottle.category].filter(Boolean).join(' · ')}</div>}
            </button>
          ))}
          {query.length >= 2 && !isSearching && searchResults.length === 0 && (
            <div className="text-center py-8"><p className="text-sm text-cin-muted font-body">No bottles found for "{query}"</p></div>
          )}
          {query.length < 2 && <div className="text-center py-8"><span className="text-3xl">🔍</span><p className="text-sm text-cin-muted font-body mt-3">Type at least 2 characters to search</p></div>}
        </div>
      </div>
    </div>
  );
}
