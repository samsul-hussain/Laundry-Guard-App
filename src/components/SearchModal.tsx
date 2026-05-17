import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, MapPin, Loader2, Navigation, Globe } from 'lucide-react';
import { LocationResult } from '../services/api';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (loc: LocationResult) => void;
  onUseLiveLocation: () => void;
  isSearching: boolean;
  results: LocationResult[];
  query: string;
  setQuery: (q: string) => void;
  error: string | null;
}

export default function SearchModal({
  isOpen,
  onClose,
  onSelect,
  onUseLiveLocation,
  isSearching,
  results,
  query,
  setQuery,
  error
}: SearchModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[80] flex flex-col pt-[8vh]"
        >
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="bg-white rounded-t-[2.5rem] flex-1 px-8 pt-10 shadow-2xl overflow-hidden flex flex-col safe-area-inset-bottom"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-display font-bold text-slate-900">Search City</h2>
                <p className="text-slate-500 text-sm font-medium">Find weather anywhere</p>
              </div>
              <button 
                onClick={onClose} 
                className="p-3 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                id="close-search-modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                autoFocus
                type="text"
                placeholder="Search city name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-slate-900 font-medium focus:ring-4 focus:ring-blue-100 focus:bg-white outline-none transition-all"
                id="search-input"
              />
              {isSearching && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                </div>
              )}
            </div>

            <button
              onClick={() => {
                onUseLiveLocation();
                onClose();
              }}
              className="w-full bg-blue-50 text-blue-600 font-bold py-4 rounded-2xl border border-blue-100 mb-6 flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors active:scale-95"
              id="use-live-location-btn"
            >
              <Navigation className="w-5 h-5" />
              Use Current Location
            </button>

            <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm font-medium text-center">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                {results.length > 0 ? (
                  results.map((loc, i) => (
                    <button
                      key={i}
                      onClick={() => onSelect(loc)}
                      className="w-full p-4 bg-white border border-slate-100 rounded-2xl text-left flex items-center justify-between group hover:border-blue-200 transition-all active:scale-95"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{loc.name}</div>
                          <div className="text-xs text-slate-500 font-medium">
                            {loc.admin1 ? `${loc.admin1}, ` : ''}{loc.country}
                          </div>
                        </div>
                      </div>
                      <div className="text-[10px] bg-slate-50 text-slate-400 font-bold px-2 py-1 rounded-full uppercase tracking-tighter">
                        {loc.country_code || '??'}
                      </div>
                    </button>
                  ))
                ) : (
                  query.length >= 2 && !isSearching && (
                    <div className="text-center py-10">
                      <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Globe className="w-8 h-8 text-slate-200" />
                      </div>
                      <p className="text-slate-400 font-medium text-sm">No cities found matching "{query}"</p>
                    </div>
                  )
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
