import { motion, AnimatePresence } from 'motion/react';
import { X, Bell, Mail, Sliders, Save, Info, BellOff, MailQuestion, Navigation, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

export interface AppSettings {
  pushNotifications: boolean;
  rainThreshold: number;
  emailNotifications: boolean;
  emailAddress: string;
  enhancedLocation: boolean;
  enableAI: boolean;
}

export default function SettingsModal({ isOpen, onClose, settings, onSave }: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[70] flex flex-col pt-[12vh]"
        >
          <motion.div 
            initial={{ y: 50, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: 50, opacity: 0 }}
            className="bg-white rounded-t-[2.5rem] flex-1 px-8 pt-10 shadow-2xl safe-area-inset-bottom"
          >
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-display font-bold text-slate-900">App Settings</h2>
                <p className="text-slate-500 text-sm font-medium">Personalize your alerts</p>
              </div>
              <button onClick={onClose} className="p-3 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-8 overflow-y-auto max-h-[65vh] pb-24 no-scrollbar">
              {/* Gemini AI Core */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 fill-indigo-100 dark:fill-none" /> Gemini Intelligent Analysis
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex justify-between items-center group transition-all hover:bg-white hover:border-blue-100 hover:shadow-sm">
                  <div>
                    <div className="font-bold text-slate-900">AI-Powered Drying Estimates</div>
                    <div className="text-xs text-slate-500">De-prioritizes heuristic fallback in favor of advanced cognitive weather insight models</div>
                  </div>
                  <button 
                    onClick={() => setLocalSettings(p => ({ ...p, enableAI: !p.enableAI }))}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${localSettings.enableAI ? 'bg-blue-600' : 'bg-slate-200'}`}
                  >
                    <span 
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${localSettings.enableAI ? 'translate-x-6' : 'translate-x-1'}`} 
                    />
                  </button>
                </div>
              </div>

              {/* Enhanced Precision */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
                  <Navigation className="w-3.5 h-3.5" /> GPS precision
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex justify-between items-center group transition-all hover:bg-white hover:border-blue-100 hover:shadow-sm">
                  <div>
                    <div className="font-bold text-slate-900">Hyper-Local Accuracy</div>
                    <div className="text-xs text-slate-500">Enhanced background tracking</div>
                  </div>
                  <button 
                    onClick={() => setLocalSettings(p => ({ ...p, enhancedLocation: !p.enhancedLocation }))}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${localSettings.enhancedLocation ? 'bg-blue-600' : 'bg-slate-200'}`}
                  >
                    <span 
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${localSettings.enhancedLocation ? 'translate-x-6' : 'translate-x-1'}`} 
                    />
                  </button>
                </div>
              </div>

              {/* Push Notifications */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
                  <Bell className="w-3.5 h-3.5" /> Push Alerts
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex justify-between items-center group transition-all hover:bg-white hover:border-blue-100 hover:shadow-sm">
                  <div>
                    <div className="font-bold text-slate-900">Live Rain Alerts</div>
                    <div className="text-xs text-slate-500">Enable desktop/mobile pings</div>
                  </div>
                  <button 
                    onClick={() => setLocalSettings(p => ({ ...p, pushNotifications: !p.pushNotifications }))}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${localSettings.pushNotifications ? 'bg-blue-600' : 'bg-slate-200'}`}
                  >
                    <span 
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${localSettings.pushNotifications ? 'translate-x-6' : 'translate-x-1'}`} 
                    />
                  </button>
                </div>
              </div>

              {/* Rain Threshold */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
                  <Sliders className="w-3.5 h-3.5" /> Sensitivity
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-bold text-slate-900">Alert Threshold</div>
                      <div className="text-xs text-slate-500">Probability to trigger alerts</div>
                    </div>
                    <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-bold text-sm border border-blue-100">
                      {localSettings.rainThreshold}%
                    </div>
                  </div>
                  <input 
                    type="range" min="5" max="95" step="5"
                    value={localSettings.rainThreshold}
                    onChange={(e) => setLocalSettings(p => ({ ...p, rainThreshold: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <span>Conservative (5%)</span>
                    <span>Relaxed (95%)</span>
                  </div>
                </div>
              </div>

              {/* Email Alerts */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
                  <Mail className="w-3.5 h-3.5" /> Email Notifications
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4 transition-all hover:bg-white hover:border-blue-100 hover:shadow-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-bold text-slate-900">Email Updates</div>
                      <div className="text-xs text-slate-500">Critical weather summaries</div>
                    </div>
                    <button 
                      onClick={() => setLocalSettings(p => ({ ...p, emailNotifications: !p.emailNotifications }))}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${localSettings.emailNotifications ? 'bg-blue-600' : 'bg-slate-200'}`}
                    >
                      <span 
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${localSettings.emailNotifications ? 'translate-x-6' : 'translate-x-1'}`} 
                      />
                    </button>
                  </div>
                  
                  {localSettings.emailNotifications && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: 'auto' }}
                      className="pt-2"
                    >
                      <input 
                        type="email" 
                        value={localSettings.emailAddress}
                        onChange={(e) => setLocalSettings(p => ({ ...p, emailAddress: e.target.value }))}
                        placeholder="Enter your email..."
                        className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                      />
                    </motion.div>
                  )}
                </div>
              </div>
              
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex gap-3">
                 <Info className="w-5 h-5 text-blue-400 shrink-0" />
                 <p className="text-[11px] text-blue-600 leading-relaxed font-medium">
                   Settings are saved locally to your device. Email alerts require a connected backend (coming soon).
                 </p>
              </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-100 max-w-md mx-auto">
              <button 
                onClick={handleSave}
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Save Preferences
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
