
import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Search, 
  Home, 
  User, 
  Plus, 
  ArrowRight,
  Loader2,
  Flame,
  Sparkles,
  ChefHat,
  Link as LinkIcon,
  FileText,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  Image as ImageIcon,
  Trophy,
  NotebookPen,
  Trash2,
  Calendar,
  Settings,
  ChevronLeft,
  Shield,
  LogOut,
  Share2,
  CheckCircle2,
  X,
  Wand2,
  MessageSquare,
  ScanFace,
  Bell
} from 'lucide-react';
import { analyzeFoodImage, analyzeTextQuery, analyzeRecipe, fileToGenerativePart, generateMealNoteSuggestion, generateDailyInsight } from './services/geminiService';
import { FoodItem, LoggedMeal, UserProfile, AppView, PersonalNote, AppNotification } from './types';

// --- Constants ---
const DEFAULT_PROFILE: UserProfile = {
  name: '',
  dailyCalorieGoal: 2000,
  weight: 0,
  height: 0, 
  isOnboarded: false,
  isAiSuggestionsEnabled: true,
};

const NAV_ITEMS = [
  { id: AppView.DASHBOARD, icon: Home, label: 'Home' },
  { id: AppView.SEARCH, icon: Search, label: 'Search' },
  { id: AppView.SCANNER, icon: Camera, label: 'Scan', isAction: true },
  { id: AppView.RECIPE, icon: ChefHat, label: 'Recipes' },
  { id: AppView.NOTES, icon: NotebookPen, label: 'Notes' },
];

// --- Utilities ---

// Robust Biometric Registration
const registerBiometric = async (email: string, name: string): Promise<boolean> => {
  if (!window.PublicKeyCredential) return false;
  
  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    const userId = new Uint8Array(16);
    window.crypto.getRandomValues(userId);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "CalorieAI" },
        user: {
          id: userId,
          name: email || "user",
          displayName: name || "User",
        },
        pubKeyCredParams: [{alg: -7, type: "public-key"}, {alg: -257, type: "public-key"}],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
        timeout: 60000,
        attestation: "none"
      }
    });
    return !!credential;
  } catch (error) {
    console.error("Biometric registration error:", error);
    return false;
  }
};

// Robust Biometric Auth
const authenticateBiometric = async (): Promise<boolean> => {
  if (!window.PublicKeyCredential) return false;
  
  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        userVerification: "required",
        timeout: 60000,
      }
    });
    return !!assertion;
  } catch (error) {
    console.debug("Biometric auth error/cancelled:", error);
    return false;
  }
};

const checkBiometricAvailability = async (): Promise<boolean> => {
  if (!window.PublicKeyCredential) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
};

// --- Components ---

const NotificationModal = ({ 
  notifications, 
  onClose, 
  onMarkRead,
  onClearAll
}: { 
  notifications: AppNotification[], 
  onClose: () => void,
  onMarkRead: (id: string) => void,
  onClearAll: () => void
}) => {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end sm:justify-center items-center bg-slate-900/50 backdrop-blur-sm animate-fade-in sm:p-6">
      <div 
        className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-600" fill="currentColor" />
            <h3 className="text-lg font-bold text-slate-900">Notifications</h3>
            {notifications.filter(n => !n.isRead).length > 0 && (
               <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                 {notifications.filter(n => !n.isRead).length} new
               </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
            <X className="w-4 h-4 text-slate-600"/>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
               <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
               <p className="text-sm">No notifications yet.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div 
                key={notif.id} 
                onClick={() => onMarkRead(notif.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                  notif.isRead 
                    ? 'bg-white border-slate-100 opacity-70' 
                    : 'bg-white border-emerald-100 shadow-sm ring-1 ring-emerald-50'
                }`}
              >
                {!notif.isRead && <div className="absolute top-4 right-4 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                <div className="flex items-start gap-3">
                   <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      notif.type === 'insight' ? 'bg-purple-100 text-purple-600' :
                      notif.type === 'update' ? 'bg-blue-100 text-blue-600' :
                      notif.type === 'alert' ? 'bg-red-100 text-red-600' :
                      'bg-emerald-100 text-emerald-600'
                   }`}>
                      {notif.type === 'insight' ? <Sparkles className="w-4 h-4" /> :
                       notif.type === 'update' ? <Wand2 className="w-4 h-4" /> :
                       notif.type === 'alert' ? <AlertCircle className="w-4 h-4" /> :
                       <Bell className="w-4 h-4" />}
                   </div>
                   <div>
                      <h4 className={`text-sm font-bold mb-1 ${notif.isRead ? 'text-slate-600' : 'text-slate-900'}`}>{notif.title}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">{notif.message}</p>
                      <p className="text-[10px] text-slate-400 mt-2">{new Date(notif.timestamp).toLocaleDateString()} • {new Date(notif.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                   </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {notifications.length > 0 && (
          <div className="p-4 bg-white border-t border-slate-100">
             <button onClick={onClearAll} className="w-full py-3 text-sm font-medium text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
               Clear All Notifications
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

const BiometricSetupModal = ({ 
  userProfile, 
  onSuccess, 
  onClose 
}: { 
  userProfile: UserProfile, 
  onSuccess: () => void, 
  onClose: () => void 
}) => {
  const [step, setStep] = useState<'analyzing' | 'prompt' | 'success' | 'error'>('analyzing');

  useEffect(() => {
    // Phase 1: AI Analysis Simulation
    const timer = setTimeout(() => {
      setStep('prompt');
      startRegistration();
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const startRegistration = async () => {
    const success = await registerBiometric(userProfile.email || 'user', userProfile.name);
    if (success) {
      setStep('success');
      setTimeout(onSuccess, 1500);
    } else {
      setStep('error');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
        
        {step === 'analyzing' && (
          <>
            <div className="w-24 h-24 relative mb-6">
              <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-20"></div>
              <div className="absolute inset-0 border-4 border-emerald-500/30 rounded-full animate-[spin_3s_linear_infinite]"></div>
              <div className="absolute inset-2 bg-emerald-50 rounded-full flex items-center justify-center">
                <ShieldCheck className="w-10 h-10 text-emerald-600 animate-pulse" />
              </div>
            </div>
            <h3 className="text-xl font-display font-bold text-slate-900 mb-2">AI Security Check</h3>
            <p className="text-slate-500">Scanning device capabilities...</p>
          </>
        )}

        {step === 'prompt' && (
          <>
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 animate-pulse-fast">
              <ScanFace className="w-12 h-12 text-slate-900" />
            </div>
            <h3 className="text-xl font-display font-bold text-slate-900 mb-2">Enable Biometrics</h3>
            <p className="text-slate-500">Please verify to secure your account.</p>
          </>
        )}

        {step === 'success' && (
          <>
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 animate-slide-up">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <h3 className="text-xl font-display font-bold text-slate-900 mb-2">Secured!</h3>
            <p className="text-slate-500">Face ID / Touch ID enabled.</p>
          </>
        )}

        {step === 'error' && (
          <>
            <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            <h3 className="text-xl font-display font-bold text-slate-900 mb-2">Setup Failed</h3>
            <p className="text-slate-500 mb-6">We couldn't verify your biometrics.</p>
            <button onClick={onClose} className="py-3 px-8 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200">Close</button>
          </>
        )}
      </div>
    </div>
  );
};

const AuthNoticeModal = ({ message, onDismiss, onSwitchToSignUp }: { message: string, onDismiss: () => void, onSwitchToSignUp: () => void }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in pb-[env(safe-area-inset-bottom)]">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative overflow-hidden animate-slide-up">
        <div className="flex flex-col items-center text-center relative z-10">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-5 shadow-sm border border-red-100">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-display font-bold text-slate-900 mb-2">Account Not Found</h3>
          <p className="text-slate-500 mb-6 leading-relaxed">{message}</p>
          <div className="flex flex-col gap-3 w-full">
            <button onClick={onSwitchToSignUp} className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-200 active:scale-95 transition-all">
              Create Account
            </button>
             <button onClick={onDismiss} className="w-full py-3.5 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors">
              Try Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MealNoteModal = ({ meal, onSave, onClose }: { meal: LoggedMeal, onSave: (id: string, note: string) => void, onClose: () => void }) => {
  const [note, setNote] = useState(meal.note || '');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in pb-[env(safe-area-inset-bottom)]">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative overflow-hidden animate-slide-up">
        <div className="flex justify-between items-center mb-4">
           <h3 className="text-lg font-bold text-slate-900">Add Note</h3>
           <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X className="w-4 h-4 text-slate-600"/></button>
        </div>
        <p className="text-sm text-slate-500 mb-4">How did you feel about {meal.item.name}?</p>
        <textarea 
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none mb-4"
          placeholder="e.g. Delicious and filling..."
        />
        <button onClick={() => onSave(meal.id, note)} className="w-full py-3.5 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 active:scale-95 transition-all">
          Save Note
        </button>
      </div>
    </div>
  );
};

const DeleteConfirmationModal = ({ itemType, onConfirm, onCancel }: { itemType: string, onConfirm: () => void, onCancel: () => void }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in pb-[env(safe-area-inset-bottom)]">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative overflow-hidden animate-slide-up">
        <div className="flex flex-col items-center text-center relative z-10">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-5 shadow-sm border border-red-100">
            <Trash2 className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-display font-bold text-slate-900 mb-2">Delete {itemType}?</h3>
          <p className="text-slate-500 mb-6 leading-relaxed">This action cannot be undone.</p>
          <div className="flex gap-3 w-full">
            <button onClick={onCancel} className="flex-1 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
            <button onClick={onConfirm} className="flex-1 py-3.5 bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-200 hover:bg-red-600 transition-colors active:scale-95">Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SignInView = ({ 
  onSignIn, 
  onNavigateToSignUp,
  isLoading 
}: { 
  onSignIn: (email: string, password: string) => void, 
  onNavigateToSignUp: () => void,
  isLoading: boolean 
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ email: false, password: false });
  const [cachedUser, setCachedUser] = useState<{name: string, email: string} | null>(null);
  const [viewMode, setViewMode] = useState<'loading' | 'biometric' | 'form'>('loading');

  // Intelligent User Detection
  useEffect(() => {
    const checkCachedUser = async () => {
      const lastEmail = localStorage.getItem('calorieai_last_email');
      if (lastEmail) {
        try {
          const db = JSON.parse(localStorage.getItem('calorieai_users_db') || '{}');
          const user = db[lastEmail]?.profile;
          // Verify if this specific user has biometric enabled
          if (user && user.isBiometricEnabled) {
            setCachedUser({ name: user.name, email: lastEmail });
            setViewMode('biometric');
            return;
          }
        } catch (e) {
          console.error("Failed to load cached user", e);
        }
      }
      setViewMode('form');
    };
    checkCachedUser();
  }, []);

  const handleBiometricLogin = async () => {
    if (cachedUser) {
      const success = await authenticateBiometric();
      if (success) {
        onSignIn(cachedUser.email, 'BIOMETRIC_BYPASS');
      } else {
        // Fallback or feedback could go here
        alert("Authentication failed or cancelled.");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isEmailValid = email.trim().length > 0;
    const isPasswordValid = password.length >= 8 && password.length <= 15;
    const newErrors = { email: !isEmailValid, password: !isPasswordValid };
    setErrors(newErrors);

    if (!newErrors.email && !newErrors.password) {
      onSignIn(email, password);
    }
  };

  const handleSwitchAccount = () => {
    localStorage.removeItem('calorieai_last_email');
    setCachedUser(null);
    setViewMode('form');
    setEmail('');
    setPassword('');
  };

  if (viewMode === 'biometric' && cachedUser) {
    return (
      <div className="min-h-screen w-full bg-slate-50 relative flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-emerald-300 rounded-full blur-[80px] opacity-20" />
          <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-orange-300 rounded-full blur-[80px] opacity-20" />
        </div>
        
        <div className="w-full max-w-md relative z-10 flex flex-col gap-6 animate-fade-in">
           <div className="glass-panel w-full p-10 rounded-3xl shadow-xl flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-slate-800 to-slate-900 rounded-full flex items-center justify-center mb-6 shadow-xl border-4 border-white">
                <span className="text-3xl font-display font-bold text-white">{cachedUser.name.charAt(0)}</span>
              </div>
              <h2 className="text-2xl font-display font-bold text-slate-900 mb-1">Welcome back, {cachedUser.name.split(' ')[0]}</h2>
              <p className="text-slate-500 mb-8">Ready to crush your goals?</p>

              <button 
                onClick={handleBiometricLogin}
                className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3 mb-4"
              >
                <ScanFace className="w-5 h-5" /> Unlock with Face ID
              </button>

              <button 
                onClick={() => setViewMode('form')}
                className="text-sm font-medium text-slate-500 hover:text-slate-800 py-2"
              >
                Use Password Instead
              </button>
           </div>
           <p className="text-center text-slate-500 text-sm">
             Not {cachedUser.name.split(' ')[0]}? <button onClick={handleSwitchAccount} className="text-emerald-600 font-bold hover:underline">Switch Account</button>
           </p>
        </div>
      </div>
    );
  }

  // Standard Form View
  return (
    <div className="min-h-screen w-full bg-slate-50 relative flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-emerald-300 rounded-full blur-[80px] opacity-20" />
        <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-orange-300 rounded-full blur-[80px] opacity-20" />
      </div>

      <div className="w-full max-w-md relative z-10 flex flex-col gap-6 animate-fade-in">
        <div className="glass-panel w-full p-8 rounded-3xl shadow-xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-emerald-200">
              <Flame className="text-white w-8 h-8" fill="currentColor" />
            </div>
            <h1 className="text-3xl font-display font-bold text-slate-800">CalorieAI</h1>
            <p className="text-slate-500 mt-2">Log it. Track it. Crush it.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div>
              <label className={`block text-sm font-medium mb-1 ${errors.email ? 'text-red-500' : 'text-slate-700'}`}>Email</label>
              <div className="relative">
                <Mail className={`absolute left-3 top-3 w-5 h-5 z-10 ${errors.email ? 'text-red-500' : 'text-slate-500'}`} />
                <input 
                  type="email" 
                  className={`w-full pl-10 pr-4 py-3 bg-white text-black placeholder-gray-400 rounded-xl border outline-none transition-all ${
                    errors.email ? 'border-red-500 ring-1 ring-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-2 focus:ring-emerald-500'
                  }`}
                  placeholder="e.g. hello@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if(errors.email) setErrors({...errors, email: false}); }}
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">Please enter your email address</p>}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${errors.password ? 'text-red-500' : 'text-slate-700'}`}>Password</label>
              <div className="relative">
                <Lock className={`absolute left-3 top-3 w-5 h-5 z-10 ${errors.password ? 'text-red-500' : 'text-slate-500'}`} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  className={`w-full pl-10 pr-12 py-3 bg-white text-black placeholder-gray-400 rounded-xl border outline-none transition-all ${
                    errors.password ? 'border-red-500 ring-1 ring-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-2 focus:ring-emerald-500'
                  }`}
                  placeholder="8-15 characters"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if(errors.password) setErrors({...errors, password: false}); }}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-700 z-10"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">Password must be 8-15 characters</p>}
            </div>
            
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-slate-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Sign In'}
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-3 justify-center text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Your data is encrypted and private.</span>
            </div>
          </div>
        </div>
        
        <p className="text-center text-slate-500 text-sm pb-4">
          Don't have an account? <button onClick={onNavigateToSignUp} className="text-emerald-600 font-bold hover:underline p-2">Sign Up</button>
        </p>
      </div>
    </div>
  );
};

const SignUpView = ({ 
  onSignUp, 
  onNavigateToSignIn, 
  isLoading 
}: { 
  onSignUp: (data: any) => void, 
  onNavigateToSignIn: () => void, 
  isLoading: boolean 
}) => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ name: false, email: false, password: false, confirmPassword: false });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const isNameValid = formData.name.trim().length > 0;
    const isEmailValid = formData.email.trim().length > 0;
    const isPasswordValid = formData.password.length >= 8 && formData.password.length <= 15;
    const isConfirmValid = formData.password === formData.confirmPassword;

    const newErrors = {
      name: !isNameValid,
      email: !isEmailValid,
      password: !isPasswordValid,
      confirmPassword: !isConfirmValid
    };
    
    setErrors(newErrors);

    if (!newErrors.name && !newErrors.email && !newErrors.password && !newErrors.confirmPassword) {
      onSignUp(formData);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field as keyof typeof errors]) {
      setErrors({ ...errors, [field]: false });
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 relative flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-emerald-300 rounded-full blur-[80px] opacity-20" />
        <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-orange-300 rounded-full blur-[80px] opacity-20" />
      </div>

      <div className="w-full max-w-md relative z-10 flex flex-col gap-6">
        <div className="glass-panel w-full p-8 rounded-3xl shadow-xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-display font-bold text-slate-800">Create Account</h1>
            <p className="text-slate-500 mt-1">Start your journey today.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate autoComplete="off">
            <div>
              <label className={`block text-xs font-medium mb-1 ${errors.name ? 'text-red-500' : 'text-slate-700'}`}>Full Name</label>
              <input 
                type="text" 
                autoComplete="off"
                className={`w-full px-4 py-3 bg-white text-black rounded-xl border outline-none transition-all ${
                  errors.name ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300 focus:ring-2 focus:ring-emerald-500'
                }`}
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Alex Smith"
              />
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1 ${errors.email ? 'text-red-500' : 'text-slate-700'}`}>Email</label>
              <input 
                type="email" 
                autoComplete="new-email"
                className={`w-full px-4 py-3 bg-white text-black rounded-xl border outline-none transition-all ${
                  errors.email ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300 focus:ring-2 focus:ring-emerald-500'
                }`}
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="e.g. alex@example.com"
              />
            </div>
            
            <div>
              <label className={`block text-xs font-medium mb-1 ${errors.password ? 'text-red-500' : 'text-slate-700'}`}>Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  autoComplete="new-password"
                  className={`w-full px-4 py-3 bg-white text-black rounded-xl border outline-none transition-all ${
                    errors.password ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300 focus:ring-2 focus:ring-emerald-500'
                  }`}
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="8-15 characters"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">Must be 8-15 characters</p>}
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1 ${errors.confirmPassword ? 'text-red-500' : 'text-slate-700'}`}>Confirm Password</label>
              <input 
                type="password" 
                autoComplete="new-password"
                className={`w-full px-4 py-3 bg-white text-black rounded-xl border outline-none transition-all ${
                  errors.confirmPassword ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300 focus:ring-2 focus:ring-emerald-500'
                }`}
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                placeholder="Re-enter password"
              />
               {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">Passwords do not match</p>}
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-slate-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Create Account'}
            </button>
          </form>
        </div>
        
        <p className="text-center text-slate-500 text-sm pb-4">
          Already have an account? <button onClick={onNavigateToSignIn} className="text-emerald-600 font-bold hover:underline p-2">Sign In</button>
        </p>
      </div>
    </div>
  );
};

const OnboardingView = ({ 
  userProfile, 
  setUserProfile, 
  onComplete 
}: { 
  userProfile: UserProfile, 
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>, 
  onComplete: () => void 
}) => {
  const [errors, setErrors] = useState({ name: false, height: false, weight: false });

  const handleContinue = () => {
    const newErrors = {
      name: !userProfile.name.trim(),
      height: !userProfile.height || userProfile.height <= 0,
      weight: !userProfile.weight || userProfile.weight <= 0
    };
    setErrors(newErrors);
    if (!newErrors.name && !newErrors.height && !newErrors.weight) {
      onComplete();
    }
  };

  const handleInputChange = (field: keyof UserProfile, value: string | number) => {
    setUserProfile({ ...userProfile, [field]: value });
    if (errors[field as keyof typeof errors]) {
      setErrors({ ...errors, [field]: false });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white p-6">
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        <div className="mb-8">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="text-emerald-600 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-display font-bold text-slate-800">Let's verify your details</h2>
          <p className="text-slate-500 mt-2">We'll personalize your daily goals.</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className={`text-sm font-medium ${errors.name ? 'text-red-500' : 'text-slate-700'}`}>Display Name</label>
            <input 
              type="text" 
              className={`mt-1 w-full p-4 bg-slate-50 rounded-2xl border transition-all outline-none ${
                errors.name 
                  ? 'border-red-500 ring-1 ring-red-500' 
                  : 'border-transparent focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500'
              }`}
              placeholder="e.g. Alex"
              value={userProfile.name}
              onChange={e => handleInputChange('name', e.target.value)}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Name is required</p>}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className={`text-sm font-medium ${errors.height ? 'text-red-500' : 'text-slate-700'}`}>Height (cm)</label>
              <input 
                type="number" 
                className={`mt-1 w-full p-4 bg-slate-50 rounded-2xl border transition-all outline-none ${
                  errors.height
                    ? 'border-red-500 ring-1 ring-red-500' 
                    : 'border-transparent focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500'
                }`}
                placeholder="e.g. 175"
                value={userProfile.height || ''}
                onChange={e => handleInputChange('height', Number(e.target.value))}
              />
              {errors.height && <p className="text-red-500 text-xs mt-1">Required</p>}
            </div>
             <div>
              <label className={`text-sm font-medium ${errors.weight ? 'text-red-500' : 'text-slate-700'}`}>Weight (kg)</label>
              <input 
                type="number" 
                className={`mt-1 w-full p-4 bg-slate-50 rounded-2xl border transition-all outline-none ${
                  errors.weight
                    ? 'border-red-500 ring-1 ring-red-500' 
                    : 'border-transparent focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500'
                }`}
                placeholder="e.g. 70"
                value={userProfile.weight || ''}
                onChange={e => handleInputChange('weight', Number(e.target.value))}
              />
              {errors.weight && <p className="text-red-500 text-xs mt-1">Required</p>}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Daily Calorie Goal</label>
            <div className="mt-1 relative">
              <input 
                type="range" 
                min="1200" 
                max="4000" 
                step="50"
                className="w-full accent-emerald-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                value={userProfile.dailyCalorieGoal}
                onChange={e => handleInputChange('dailyCalorieGoal', Number(e.target.value))}
              />
              <div className="mt-2 text-center font-bold text-emerald-600 text-lg">
                {userProfile.dailyCalorieGoal} <span className="text-sm font-normal text-slate-500">kcal</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto max-w-md mx-auto w-full">
        <button 
          onClick={handleContinue}
          className="w-full bg-slate-900 text-white py-4 rounded-2xl font-semibold shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          Get Started <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

const NoteSuggestionModal = ({ suggestion, onSave, onDismiss }: { suggestion: string, onSave: (text: string) => void, onDismiss: () => void }) => {
  const [text, setText] = useState(suggestion);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] bg-black/20 backdrop-blur-[2px] animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl p-5 shadow-2xl animate-slide-up border border-emerald-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-100 rounded-full blur-2xl -mr-10 -mt-10 opacity-50" />
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-emerald-500" />
          <h3 className="font-bold text-slate-800">AI Suggestion for your Notes</h3>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none resize-none mb-4 font-medium"
          rows={3}
        />
        <div className="flex gap-3">
          <button onClick={onDismiss} className="flex-1 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">Skip</button>
          <button onClick={() => onSave(text)} className="flex-1 py-2.5 text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200">Save Note</button>
        </div>
      </div>
    </div>
  )
};

const ResultCard = ({ result, onSave, onDiscard, imageUri }: { result: FoodItem, onSave: () => void, onDiscard: () => void, imageUri?: string | null }) => {
  const displayImage = imageUri || result.imageUrl;
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 pb-[env(safe-area-inset-bottom)]">
      <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-slide-up mb-4 sm:mb-0">
        {displayImage && (
          <div className="h-48 w-full bg-slate-100 relative">
            <img src={displayImage} alt="Analyzed food" className="w-full h-full object-cover" 
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=No+Image'; }} />
            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-emerald-700 shadow-sm flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> AI Analysis
            </div>
          </div>
        )}
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-2xl font-display font-bold text-slate-900">{result.name}</h3>
              <p className="text-slate-500 text-sm">{result.portionSize} • {result.calories} kcal</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${result.confidence === 'High' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>{result.confidence} Confidence</div>
          </div>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed bg-slate-50 p-3 rounded-xl">{result.description}</p>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-orange-50 p-3 rounded-2xl text-center"><div className="text-xs text-orange-600 font-medium mb-1">Protein</div><div className="text-xl font-bold text-slate-900">{result.macros.protein}g</div></div>
            <div className="bg-blue-50 p-3 rounded-2xl text-center"><div className="text-xs text-blue-600 font-medium mb-1">Carbs</div><div className="text-xl font-bold text-slate-900">{result.macros.carbs}g</div></div>
            <div className="bg-yellow-50 p-3 rounded-2xl text-center"><div className="text-xs text-yellow-600 font-medium mb-1">Fat</div><div className="text-xl font-bold text-slate-900">{result.macros.fat}g</div></div>
          </div>
          <div className="flex gap-3">
            <button onClick={onDiscard} className="flex-1 py-3 rounded-xl border border-slate-200 font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={onSave} className="flex-[2] py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-[0.98]">Log Meal</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardView = ({ 
  userProfile, 
  dailyLog, 
  onSettingsClick,
  onScanClick,
  onSearchClick,
  onResetDay,
  onDeleteMeal,
  onEditNote,
  notifications,
  onOpenNotifications
}: {
  userProfile: UserProfile,
  dailyLog: LoggedMeal[],
  onSettingsClick: () => void,
  onScanClick: () => void,
  onSearchClick: () => void,
  onResetDay: () => void,
  onDeleteMeal: (id: string) => void,
  onEditNote: (meal: LoggedMeal) => void,
  notifications: AppNotification[],
  onOpenNotifications: () => void
}) => {
  const [showGoalReached, setShowGoalReached] = useState(false);
  const [hasDismissedGoal, setHasDismissedGoal] = useState(false);
  const totalCalories = dailyLog.reduce((sum, meal) => sum + meal.item.calories, 0);
  const totalProtein = dailyLog.reduce((sum, meal) => sum + meal.item.macros.protein, 0);
  const totalCarbs = dailyLog.reduce((sum, meal) => sum + meal.item.macros.carbs, 0);
  const totalFat = dailyLog.reduce((sum, meal) => sum + meal.item.macros.fat, 0);
  const progress = Math.min((totalCalories / userProfile.dailyCalorieGoal) * 100, 100);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    if (dailyLog.length === 0) { setHasDismissedGoal(false); setShowGoalReached(false); } 
    else if (totalCalories >= userProfile.dailyCalorieGoal && !hasDismissedGoal) { setShowGoalReached(true); }
  }, [totalCalories, userProfile.dailyCalorieGoal, dailyLog.length, hasDismissedGoal]);

  const handleShare = async (meal: LoggedMeal) => {
    const text = `I just tracked ${meal.item.name} (${meal.item.calories} kcal) on CalorieAI!`;
    if (navigator.share) { try { await navigator.share({ title: 'My Meal', text }); } catch (err) {} } 
    else { navigator.clipboard.writeText(text); alert('Meal details copied!'); }
  };

  return (
    <div className="pb-32 pt-8 px-8 relative min-h-screen">
      <header className="flex justify-between items-center mb-10 pt-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900">Hello, {userProfile.name || 'Friend'}</h1>
          <p className="text-slate-500 text-sm">Let's hit your goals today.</p>
        </div>
        <div className="flex items-center gap-3">
          <div onClick={onOpenNotifications} className="relative w-10 h-10 bg-white border border-slate-100 rounded-full flex items-center justify-center shadow-sm cursor-pointer hover:bg-slate-50">
             <Bell className="w-5 h-5 text-slate-600" />
             {unreadCount > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />}
          </div>
          <div onClick={onSettingsClick} className="w-10 h-10 bg-white border border-slate-100 rounded-full flex items-center justify-center shadow-sm cursor-pointer hover:bg-slate-50">
            <Settings className="w-5 h-5 text-slate-600" />
          </div>
        </div>
      </header>

      <div className="glass-panel w-full p-8 rounded-3xl shadow-lg mb-10 relative overflow-hidden">
        <div className="flex items-center justify-between mb-2"><span className="text-sm font-medium text-slate-600 flex items-center gap-1"><Flame className="w-4 h-4 text-orange-500" fill="currentColor" /> Calories</span><span className="text-sm font-bold text-slate-900">{totalCalories} / {userProfile.dailyCalorieGoal}</span></div>
        <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden mb-6"><div className={`h-full rounded-full transition-all duration-1000 ease-out ${totalCalories > userProfile.dailyCalorieGoal ? 'bg-orange-500' : 'bg-gradient-to-r from-emerald-400 to-emerald-600'}`} style={{ width: `${progress}%` }} /></div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center"><div className="text-xs text-slate-400 mb-1">Protein</div><div className="font-bold text-slate-800">{totalProtein}g</div><div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden"><div className="h-full bg-orange-400 w-[60%] rounded-full"/></div></div>
          <div className="text-center"><div className="text-xs text-slate-400 mb-1">Carbs</div><div className="font-bold text-slate-800">{totalCarbs}g</div><div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden"><div className="h-full bg-blue-400 w-[45%] rounded-full"/></div></div>
          <div className="text-center"><div className="text-xs text-slate-400 mb-1">Fat</div><div className="font-bold text-slate-800">{totalFat}g</div><div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden"><div className="h-full bg-yellow-400 w-[30%] rounded-full"/></div></div>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-center mb-6"><h3 className="font-display font-bold text-lg text-slate-900">Today's Meals</h3><button onClick={onSearchClick} className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full hover:bg-emerald-100 hover:text-emerald-700 transition-colors flex items-center gap-1"><Plus className="w-3 h-3" /> Type</button></div>
        {dailyLog.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-slate-100 border-dashed">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3"><Plus className="w-6 h-6 text-slate-400" /></div>
            <p className="text-slate-500 text-sm mb-4">No meals logged yet.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={onScanClick} className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-xl shadow-lg shadow-slate-200 active:scale-95 transition-all flex items-center gap-2"><Camera className="w-4 h-4" /> Scan</button>
              <button onClick={onSearchClick} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 active:scale-95 transition-all flex items-center gap-2"><Search className="w-4 h-4" /> Type</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {dailyLog.map((log) => (
              <div key={log.id} className="group bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 animate-fade-in hover:shadow-md transition-shadow">
                <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 relative">
                  {log.imageUri || log.item.imageUrl ? <img src={log.imageUri || log.item.imageUrl} className="w-full h-full object-cover" alt={log.item.name} onError={(e) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Food'} /> : <div className="w-full h-full flex items-center justify-center"><ChefHat className="text-slate-300 w-8 h-8" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-800 text-base truncate pr-2">{log.item.name}</h4>
                  <div className="text-sm text-slate-500 flex items-center gap-2">
                    <span className="font-medium text-slate-700">{log.item.calories} kcal</span>
                    <span className="text-slate-300">•</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase()}</span>
                    {log.note && <span className="bg-emerald-50 text-emerald-600 p-1 rounded-md"><MessageSquare className="w-3 h-3" /></span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => onEditNote(log)} className={`p-2 rounded-xl transition-all active:scale-95 ${log.note ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`} title="Add Note">
                    <NotebookPen className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleShare(log)} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all active:scale-95"><Share2 className="w-5 h-5" /></button>
                  <button onClick={() => onDeleteMeal(log.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95"><Trash2 className="w-5 h-5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showGoalReached && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in pb-[env(safe-area-inset-bottom)]">
          <div className="bg-white w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-yellow-50 to-transparent -z-10" />
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-yellow-200/50"><Trophy className="w-10 h-10 text-yellow-600" fill="currentColor" /></div>
            <h2 className="text-2xl font-display font-bold text-slate-900 mb-2">Goal Crushed! 🔥</h2>
            <p className="text-slate-500 mb-8 leading-relaxed">You've hit your daily calorie target. Great work staying consistent!</p>
            <div className="space-y-3">
              <button onClick={() => { setShowGoalReached(false); onResetDay(); }} className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-200 active:scale-95 transition-all">Start New Day</button>
              <button onClick={() => { setShowGoalReached(false); setHasDismissedGoal(true); }} className="w-full py-3.5 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors">View Today's Log</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ScannerView = ({ onImageAnalyze, isAnalyzing }: { onImageAnalyze: (file: File) => void, isAnalyzing: boolean }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let currentStream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        currentStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setStream(currentStream);
        if (videoRef.current) videoRef.current.srcObject = currentStream;
      } catch (err) {}
    };
    startCamera();
    return () => { if (currentStream) currentStream.getTracks().forEach(track => track.stop()); };
  }, []);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => { if (blob) onImageAnalyze(new File([blob], "capture.jpg", { type: "image/jpeg" })); }, 'image/jpeg', 0.8);
      }
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 pb-24">
      <div className="w-full max-w-sm aspect-[3/4] bg-slate-900 rounded-[3rem] relative overflow-hidden shadow-2xl border-4 border-slate-800">
        <canvas ref={canvasRef} className="hidden" />
        <video ref={videoRef} className={`w-full h-full object-cover ${!stream ? 'opacity-0' : 'opacity-100'}`} autoPlay muted playsInline />
        {!stream && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-8 h-8 text-slate-500 animate-spin" /></div>}
        
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6 pointer-events-none">
          <div className="w-64 h-64 border-2 border-white/30 rounded-[2rem] relative mb-8 flex items-center justify-center">
             <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl -mt-1 -ml-1"></div>
             <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl -mt-1 -mr-1"></div>
             <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl -mb-1 -ml-1"></div>
             <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-500 rounded-br-xl -mb-1 -mr-1"></div>
             {isAnalyzing && <div className="absolute inset-0 bg-emerald-500/10 animate-pulse-fast rounded-[2rem] flex items-center justify-center backdrop-blur-sm"><Loader2 className="w-12 h-12 text-white animate-spin" /></div>}
          </div>
          <p className="text-white/80 text-center text-sm mb-8 font-medium drop-shadow-md">Point at any food to instantly<br/>calculate calories & macros</p>
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                onImageAnalyze(e.target.files[0]);
                e.target.value = ''; // Reset input to allow re-selection of the same file
              }
            }} 
          />
          <div className="flex items-center gap-6 pointer-events-auto">
            <button onClick={() => fileInputRef.current?.click()} disabled={isAnalyzing} className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"><ImageIcon className="w-6 h-6 text-white" /></button>
            <button onClick={stream ? handleCapture : () => fileInputRef.current?.click()} disabled={isAnalyzing} className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.3)] active:scale-90 transition-transform"><div className="w-16 h-16 bg-white border-4 border-slate-900 rounded-full flex items-center justify-center">{isAnalyzing ? <Loader2 className="w-8 h-8 text-slate-900 animate-spin" /> : <Camera className="w-8 h-8 text-slate-900" />}</div></button>
            <div className="w-12 h-12" />
          </div>
        </div>
      </div>
    </div>
  );
};

const SearchView = ({ onSearch, isAnalyzing }: { onSearch: (q: string) => void, isAnalyzing: boolean }) => {
  const [query, setQuery] = useState('');
  return (
    <div className="p-8 pb-32 min-h-screen">
      <h2 className="text-2xl font-display font-bold mb-8">Search Food</h2>
      <form onSubmit={(e) => { e.preventDefault(); if(query.trim()) onSearch(query); }} className="relative mb-10">
        <Search className="absolute left-4 top-5 text-slate-400 w-6 h-6" />
        <input type="text" className="w-full pl-14 pr-4 py-5 bg-white rounded-2xl shadow-sm border-none focus:ring-2 focus:ring-emerald-500 text-lg placeholder:text-slate-400" placeholder="e.g. Avocado Toast" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button type="submit" disabled={!query.trim() || isAnalyzing} className="absolute right-3 top-3 bg-slate-900 text-white p-2.5 rounded-xl disabled:opacity-50">{isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}</button>
      </form>
      <div className="space-y-5">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Popular Searches</h3>
        {['Grilled Chicken Salad', 'Oatmeal with Berries', 'Double Cheeseburger', 'Salmon Fillet', 'Greek Yogurt Parfait', 'Pepperoni Pizza Slice', 'Protein Smoothie', 'Caesar Salad', 'Spaghetti Bolognese'].map((item) => (
          <button key={item} onClick={() => { setQuery(item); onSearch(item); }} className="block w-full text-left p-5 bg-white rounded-2xl hover:bg-slate-50 transition-colors text-slate-700 font-medium text-lg">{item}</button>
        ))}
      </div>
    </div>
  );
};

const RecipeView = ({ onAnalyze, isAnalyzing }: { onAnalyze: (input: string) => void, isAnalyzing: boolean }) => {
  const [activeTab, setActiveTab] = useState<'url' | 'manual'>('url');
  const [input, setInput] = useState('');
  return (
    <div className="p-8 pb-32 min-h-screen">
      <h2 className="text-2xl font-display font-bold mb-8">Import Recipe</h2>
      <div className="flex p-1.5 bg-slate-200 rounded-xl mb-8">
        <button onClick={() => setActiveTab('url')} className={`flex-1 py-3.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'url' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>Web Link</button>
        <button onClick={() => setActiveTab('manual')} className={`flex-1 py-3.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'manual' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>Manual Text</button>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if(input.trim()) onAnalyze(input); }} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-3">{activeTab === 'url' ? 'Paste Recipe URL' : 'Paste Ingredients & Instructions'}</label>
          {activeTab === 'url' ? (
            <div className="relative"><LinkIcon className="absolute left-4 top-4 text-slate-400 w-5 h-5" /><input type="url" value={input} onChange={(e) => setInput(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 text-base" placeholder="https://cooking.com/recipe..." /></div>
          ) : (
            <div className="relative"><FileText className="absolute left-4 top-4 text-slate-400 w-5 h-5" /><textarea rows={6} value={input} onChange={(e) => setInput(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 text-base" placeholder="1 cup rice, 200g chicken..." /></div>
          )}
        </div>
        <button type="submit" disabled={!input.trim() || isAnalyzing} className="w-full bg-slate-900 text-white py-5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors disabled:opacity-70 text-lg">{isAnalyzing ? <Loader2 className="animate-spin" /> : 'Analyze Recipe'}</button>
      </form>
    </div>
  );
};

const NotesView = ({ notes, onAddNote, onDeleteNote }: { notes: PersonalNote[], onAddNote: (content: string) => void, onDeleteNote: (id: string) => void }) => {
  const [newNote, setNewNote] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  return (
    <div className="p-8 pb-32 min-h-screen">
      <div className="flex items-center justify-between mb-8"><div><h2 className="text-2xl font-display font-bold text-slate-900">My Food Notes</h2><p className="text-slate-500 text-sm mt-1">Meal plans & ideas.</p></div><div className="bg-slate-100 px-4 py-2 rounded-full text-sm font-bold text-slate-600">{notes.length}</div></div>
      <form onSubmit={(e) => { e.preventDefault(); if(newNote.trim()) { onAddNote(newNote); setNewNote(''); setIsFocused(false); } }} className="mb-10">
        <div className={`bg-white rounded-3xl shadow-sm border transition-all duration-300 overflow-hidden ${isFocused ? 'ring-2 ring-emerald-500 border-transparent shadow-md' : 'border-slate-200'}`}>
          <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} onFocus={() => setIsFocused(true)} onBlur={() => !newNote.trim() && setIsFocused(false)} placeholder="What would you like to eat this week?" className="w-full p-6 outline-none resize-none bg-white text-black placeholder:text-gray-400 min-h-[160px] text-lg" />
          <div className="px-6 pb-6 flex justify-end"><button type="submit" disabled={!newNote.trim()} onMouseDown={(e) => e.preventDefault()} className="bg-black text-white px-6 py-3 rounded-xl font-medium text-sm hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center gap-2"><Plus className="w-4 h-4" /> Save Note</button></div>
        </div>
      </form>
      <div className="space-y-6">
        {notes.length === 0 ? (
          <div className="text-center py-16"><div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6"><NotebookPen className="w-10 h-10 text-slate-300" /></div><p className="text-slate-400 font-medium text-lg">No notes yet.</p></div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 animate-fade-in relative group">
              <div className="flex items-start justify-between mb-4"><div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg"><Calendar className="w-3 h-3" />{note.timestamp.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div><button onClick={() => onDeleteNote(note.id)} className="p-3 -mr-2 text-slate-300 hover:text-red-600 active:text-red-600 hover:bg-red-50 active:bg-red-50 rounded-full transition-all"><Trash2 className="w-5 h-5" /></button></div>
              <p className="text-black whitespace-pre-wrap leading-relaxed text-lg">{note.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const SettingsView = ({ userProfile, setUserProfile, onBack, onLogout, onResetData }: { userProfile: UserProfile, setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>, onBack: () => void, onLogout: () => void, onResetData: () => void }) => {
  const [supportsBiometric, setSupportsBiometric] = useState(false);
  const [showBiometricSetup, setShowBiometricSetup] = useState(false);

  useEffect(() => {
     checkBiometricAvailability().then(setSupportsBiometric);
  }, []);

  const handleToggleBiometric = async (enabled: boolean) => {
    if (enabled) {
      setShowBiometricSetup(true);
    } else {
      // Critical: Disable biometrics in local state AND database immediately
      const updatedProfile = {...userProfile, isBiometricEnabled: false};
      setUserProfile(updatedProfile);
      // Force update to DB manually here to ensure sync if useEffect hasn't run yet
      if (userProfile.email) {
        try {
          const db = JSON.parse(localStorage.getItem('calorieai_users_db') || '{}');
          if (db[userProfile.email]) {
            db[userProfile.email].profile = updatedProfile;
            localStorage.setItem('calorieai_users_db', JSON.stringify(db));
          }
        } catch (e) { console.error("Failed to sync biometric setting", e); }
      }
    }
  };

  const handleBiometricSuccess = () => {
    const updatedProfile = {...userProfile, isBiometricEnabled: true};
    setUserProfile(updatedProfile);
    setShowBiometricSetup(false);
    
    // Critical: Save enabled state to DB immediately so it persists on logout
    if (userProfile.email) {
        try {
          const db = JSON.parse(localStorage.getItem('calorieai_users_db') || '{}');
          if (db[userProfile.email]) {
            db[userProfile.email].profile = updatedProfile;
            localStorage.setItem('calorieai_users_db', JSON.stringify(db));
          }
        } catch (e) { console.error("Failed to sync biometric setting", e); }
      }
  };

  return (
    <div className="p-6 pb-32 min-h-screen bg-slate-50">
      {showBiometricSetup && (
        <BiometricSetupModal 
          userProfile={userProfile} 
          onSuccess={handleBiometricSuccess} 
          onClose={() => setShowBiometricSetup(false)} 
        />
      )}

      <div className="flex items-center justify-between mb-8"><div className="flex items-center gap-4"><button onClick={onBack} className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 active:scale-95 transition-transform"><ChevronLeft className="w-5 h-5 text-slate-600" /></button><h2 className="text-2xl font-display font-bold text-slate-900">Settings</h2></div>{userProfile.email && <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full animate-fade-in"><CheckCircle2 className="w-3 h-3" /> Auto-saving</div>}</div>
      <div className="space-y-6">
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><User className="w-4 h-4" /> Profile</h3>
          <div className="space-y-4">
            <div><label className="text-xs font-medium text-slate-500 mb-1 block">Display Name</label><input type="text" value={userProfile.name} onChange={(e) => setUserProfile({...userProfile, name: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 font-medium" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-medium text-slate-500 mb-1 block">Height (cm)</label><input type="number" value={userProfile.height} onChange={(e) => setUserProfile({...userProfile, height: Number(e.target.value)})} className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 font-medium" /></div>
              <div><label className="text-xs font-medium text-slate-500 mb-1 block">Weight (kg)</label><input type="number" value={userProfile.weight} onChange={(e) => setUserProfile({...userProfile, weight: Number(e.target.value)})} className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 font-medium" /></div>
            </div>
            <div><label className="text-xs font-medium text-slate-500 mb-1 block">Daily Goal ({userProfile.dailyCalorieGoal} kcal)</label><input type="range" min="1200" max="4000" step="50" value={userProfile.dailyCalorieGoal} onChange={(e) => setUserProfile({...userProfile, dailyCalorieGoal: Number(e.target.value)})} className="w-full accent-emerald-500 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer" /></div>
            {userProfile.email && <div className="pt-2 border-t border-slate-100 mt-2"><label className="text-xs font-medium text-slate-400 mb-1 block">Signed in as</label><div className="text-sm text-slate-700 font-medium flex items-center gap-2"><Mail className="w-3 h-3" /> {userProfile.email}</div></div>}
          </div>
        </section>

        {/* AI Preferences Section */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Preferences</h3>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-900 font-medium">AI Note Suggestions</div>
              <div className="text-xs text-slate-500">Get prompted to reflect after meals</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={userProfile.isAiSuggestionsEnabled !== false} 
                onChange={(e) => setUserProfile({...userProfile, isAiSuggestionsEnabled: e.target.checked})} 
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </section>

        {supportsBiometric && (
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Security</h3>
             <div className="flex items-center justify-between">
                <div>
                   <div className="text-slate-900 font-medium">Biometric Unlock</div>
                   <div className="text-xs text-slate-500">Use Face ID or Touch ID to sign in</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                   <input 
                     type="checkbox" 
                     className="sr-only peer" 
                     checked={!!userProfile.isBiometricEnabled} 
                     onChange={(e) => handleToggleBiometric(e.target.checked)} 
                   />
                   <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
             </div>
          </section>
        )}

        <section className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200/20 rounded-full blur-3xl -mr-10 -mt-10" />
          <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-wider mb-4 flex items-center gap-2"><Shield className="w-4 h-4" /> AI Responsibility</h3>
          <div className="space-y-3 text-sm text-emerald-900/80 leading-relaxed"><p><strong className="text-emerald-900">Not Medical Advice:</strong> CalorieAI uses advanced AI to estimate nutritional content. While we strive for accuracy, these are estimates and should not be used for medical purposes.</p><p><strong className="text-emerald-900">Privacy First:</strong> Your photos and queries are processed to provide nutrition data. We do not sell your personal data.</p><p>Always consult a qualified healthcare professional regarding your diet and health conditions.</p></div>
        </section>
        <section className="space-y-3">
          <button onClick={onResetData} className="w-full p-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between text-slate-600 hover:bg-slate-50 transition-colors"><span className="flex items-center gap-3 font-medium"><Trash2 className="w-5 h-5 text-slate-400" /> Clear History</span></button>
          <button onClick={onLogout} className="w-full p-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between text-red-600 hover:bg-red-50 transition-colors"><span className="flex items-center gap-3 font-medium"><LogOut className="w-5 h-5" /> Sign Out</span></button>
        </section>
        <div className="text-center text-xs text-slate-400 pt-4">CalorieAI v1.1.0</div>
      </div>
    </div>
  );
};

// --- Main App Component ---

const App = () => {
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('calorieai_user');
      return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
    }
    return DEFAULT_PROFILE;
  });

  const [dailyLog, setDailyLog] = useState<LoggedMeal[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('calorieai_logs');
      if (saved) {
        try {
          return JSON.parse(saved).map((log: any) => ({ ...log, timestamp: new Date(log.timestamp) }));
        } catch (e) { return []; }
      }
    }
    return [];
  });

  const [notes, setNotes] = useState<PersonalNote[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('calorieai_notes');
      if (saved) {
        try {
          return JSON.parse(saved).map((note: any) => ({ ...note, timestamp: new Date(note.timestamp) }));
        } catch (e) { return []; }
      }
    }
    return [];
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('calorieai_notifications');
      if (saved) {
        try {
          return JSON.parse(saved).map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) }));
        } catch (e) { return []; }
      }
    }
    return [];
  });

  const [view, setView] = useState<AppView>(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('calorieai_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed.isOnboarded) return AppView.DASHBOARD;
        if (parsed.name) return AppView.ONBOARDING;
      }
    }
    return AppView.SIGN_IN;
  });

  const [currentResult, setCurrentResult] = useState<FoodItem | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [editingMeal, setEditingMeal] = useState<LoggedMeal | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'Meal' | 'Note' | 'History', id?: string } | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => { localStorage.setItem('calorieai_user', JSON.stringify(userProfile)); }, [userProfile]);
  useEffect(() => { localStorage.setItem('calorieai_logs', JSON.stringify(dailyLog)); }, [dailyLog]);
  useEffect(() => { localStorage.setItem('calorieai_notes', JSON.stringify(notes)); }, [notes]);
  useEffect(() => { localStorage.setItem('calorieai_notifications', JSON.stringify(notifications)); }, [notifications]);

  // Sync to "Cloud" DB (LocalStorage Simulation)
  useEffect(() => {
    if (userProfile.email) {
      const dbString = localStorage.getItem('calorieai_users_db');
      const db = dbString ? JSON.parse(dbString) : {};
      db[userProfile.email] = { profile: userProfile, logs: dailyLog, notes: notes, notifications: notifications };
      localStorage.setItem('calorieai_users_db', JSON.stringify(db));
    }
  }, [userProfile, dailyLog, notes, notifications]);

  // Initial App Update / System Notifications Logic
  useEffect(() => {
    const checkSystemNotifications = () => {
       // 1. App Update Notification (Hardcoded for simulation)
       const updateId = 'update-v1.1.0';
       const hasUpdate = notifications.some(n => n.id === updateId);
       if (!hasUpdate) {
         addNotification({
           id: updateId,
           title: 'App Updated to v1.1.0',
           message: 'We added a new Notifications Center! Check back here for AI insights and daily tips.',
           type: 'update',
           timestamp: new Date(),
           isRead: false
         });
       }
    };
    checkSystemNotifications();
  }, []);

  const addNotification = (notif: AppNotification) => {
    setNotifications(prev => [notif, ...prev]);
  };

  const generateDailyTip = async (profile: UserProfile) => {
    const today = new Date().toDateString();
    const hasTipToday = notifications.some(n => n.type === 'insight' && new Date(n.timestamp).toDateString() === today);
    
    if (!hasTipToday) {
      // Show loading placeholder or silent update
      const insight = await generateDailyInsight(profile);
      addNotification({
        id: `insight-${Date.now()}`,
        title: insight.title,
        message: insight.message,
        type: 'insight',
        timestamp: new Date(),
        isRead: false
      });
    }
  };

  const handleSignIn = (email: string, password?: string) => {
    setIsLoadingAuth(true);
    setTimeout(() => {
      const dbString = localStorage.getItem('calorieai_users_db');
      const db = dbString ? JSON.parse(dbString) : {};
      if (db[email]) {
        setIsLoadingAuth(false);
        const userData = db[email];
        // Restore complex objects (Dates)
        const restoredLogs = userData.logs.map((log: any) => ({ ...log, timestamp: new Date(log.timestamp) }));
        const restoredNotes = userData.notes.map((note: any) => ({ ...note, timestamp: new Date(note.timestamp) }));
        const restoredNotifs = (userData.notifications || []).map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) }));
        
        setUserProfile(userData.profile);
        setDailyLog(restoredLogs);
        setNotes(restoredNotes);
        setNotifications(restoredNotifs);
        
        // IMPORTANT: Remember this user for next session
        localStorage.setItem('calorieai_last_email', email);

        if (userData.profile.isOnboarded) {
          setView(AppView.DASHBOARD);
          // Trigger AI Insight on login
          generateDailyTip(userData.profile);
        } else {
          setView(AppView.ONBOARDING);
        }
      } else {
        setIsLoadingAuth(false);
        setAuthNotice("I don't recognize this email address. Please sign up to create your personal nutrition profile!");
      }
    }, 1000);
  };
  
  const handleSignUp = (data: any) => {
    setIsLoadingAuth(true);
    setTimeout(() => {
      setIsLoadingAuth(false);
      const dbString = localStorage.getItem('calorieai_users_db');
      const db = dbString ? JSON.parse(dbString) : {};
      if (db[data.email]) { alert("Account already exists. Please sign in."); return; }
      
      const newProfile = { ...DEFAULT_PROFILE, name: data.name, email: data.email };
      setUserProfile(newProfile);
      setDailyLog([]);
      setNotes([]);
      setNotifications([]);
      
      db[data.email] = { profile: newProfile, logs: [], notes: [], notifications: [] };
      localStorage.setItem('calorieai_users_db', JSON.stringify(db));
      localStorage.setItem('calorieai_last_email', data.email);
      
      setView(AppView.ONBOARDING);
    }, 1000);
  };

  const handleOnboardingComplete = () => { setUserProfile({ ...userProfile, isOnboarded: true }); setView(AppView.DASHBOARD); };
  
  const handleLogout = () => { 
     // We do NOT remove 'calorieai_last_email' here to allow "Remember Me" functionality
     localStorage.removeItem('calorieai_user'); 
     localStorage.removeItem('calorieai_logs'); 
     localStorage.removeItem('calorieai_notes'); 
     localStorage.removeItem('calorieai_notifications');
     setUserProfile(DEFAULT_PROFILE); 
     setDailyLog([]); 
     setNotes([]); 
     setNotifications([]);
     setView(AppView.SIGN_IN); 
  };
  
  const handleImageAnalysis = async (file: File) => {
    setIsAnalyzing(true);
    setCapturedImage(URL.createObjectURL(file));
    try {
      const base64 = await fileToGenerativePart(file);
      const result = await analyzeFoodImage(base64);
      setCurrentResult(result);
    } catch (error) { alert("Failed to analyze image. Please try again."); } finally { setIsAnalyzing(false); }
  };

  const handleTextSearch = async (query: string) => {
    setIsAnalyzing(true);
    setCapturedImage(null);
    try { const result = await analyzeTextQuery(query); setCurrentResult(result); } catch (error) { alert("Search failed. Try a different query."); } finally { setIsAnalyzing(false); }
  };

  const handleRecipeAnalysis = async (input: string) => {
    setIsAnalyzing(true);
    setCapturedImage(null);
    try { const result = await analyzeRecipe(input); setCurrentResult(result); } catch (error) { alert("Recipe analysis failed."); } finally { setIsAnalyzing(false); }
  };

  const saveMeal = async () => {
    if (currentResult) {
      const newLog = { id: Date.now().toString(), timestamp: new Date(), item: currentResult, imageUri: capturedImage || undefined };
      setDailyLog([newLog, ...dailyLog]);
      const itemForAI = currentResult;
      
      // Add notification for success
      addNotification({
        id: `log-${Date.now()}`,
        title: 'Meal Logged',
        message: `Successfully tracked ${itemForAI.name} (${itemForAI.calories} kcal).`,
        type: 'system',
        timestamp: new Date(),
        isRead: false
      });

      setCurrentResult(null);
      setCapturedImage(null);
      setView(AppView.DASHBOARD);
      
      // Only generate suggestion if enabled (defaults to true if undefined)
      if (userProfile.isAiSuggestionsEnabled !== false) {
        try { const suggestion = await generateMealNoteSuggestion(itemForAI); if (suggestion) setAiSuggestion(suggestion); } catch (e) { console.error(e); }
      }
    }
  };
  
  const handleAddNote = (content: string) => { 
    const newNote: PersonalNote = { id: Date.now().toString(), content, timestamp: new Date() }; 
    setNotes([newNote, ...notes]); 
    addNotification({
      id: `note-${Date.now()}`,
      title: 'Note Added',
      message: 'Your personal reflection has been saved.',
      type: 'system',
      timestamp: new Date(),
      isRead: false
    });
  };

  const handleUpdateMealNote = (id: string, note: string) => {
    setDailyLog(prev => prev.map(m => m.id === id ? { ...m, note } : m));
    setEditingMeal(null);
  };

  const executeDelete = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'Meal' && itemToDelete.id) {
      setDailyLog(prev => prev.filter(item => item.id !== itemToDelete.id));
    } else if (itemToDelete.type === 'Note' && itemToDelete.id) {
      setNotes(prev => notes.filter(n => n.id !== itemToDelete.id));
    } else if (itemToDelete.type === 'History') {
      setDailyLog([]);
      setNotes([]);
      setNotifications([]);
    }
    setItemToDelete(null);
  };

  const handleMarkNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };
  
  const handleClearNotifications = () => {
    setNotifications([]);
  };

  const renderView = () => {
    switch (view) {
      case AppView.SIGN_IN: return <SignInView onSignIn={handleSignIn} onNavigateToSignUp={() => setView(AppView.SIGN_UP)} isLoading={isLoadingAuth} />;
      case AppView.SIGN_UP: return <SignUpView onSignUp={handleSignUp} onNavigateToSignIn={() => setView(AppView.SIGN_UP)} isLoading={isLoadingAuth} />;
      case AppView.ONBOARDING: return <OnboardingView userProfile={userProfile} setUserProfile={setUserProfile} onComplete={handleOnboardingComplete} />;
      case AppView.DASHBOARD: return <DashboardView 
        userProfile={userProfile} 
        dailyLog={dailyLog} 
        onSettingsClick={() => setView(AppView.SETTINGS)} 
        onScanClick={() => setView(AppView.SCANNER)} 
        onSearchClick={() => setView(AppView.SEARCH)} 
        onResetDay={() => setDailyLog([])} 
        onDeleteMeal={(id) => setItemToDelete({ type: 'Meal', id })} 
        onEditNote={setEditingMeal}
        notifications={notifications}
        onOpenNotifications={() => setShowNotifications(true)}
      />;
      case AppView.SETTINGS: return <SettingsView userProfile={userProfile} setUserProfile={setUserProfile} onBack={() => setView(AppView.DASHBOARD)} onLogout={handleLogout} onResetData={() => setItemToDelete({ type: 'History' })} />;
      case AppView.SCANNER: return <ScannerView onImageAnalyze={handleImageAnalysis} isAnalyzing={isAnalyzing} />;
      case AppView.SEARCH: return <SearchView onSearch={handleTextSearch} isAnalyzing={isAnalyzing} />;
      case AppView.RECIPE: return <RecipeView onAnalyze={handleRecipeAnalysis} isAnalyzing={isAnalyzing} />;
      case AppView.NOTES: return <NotesView notes={notes} onAddNote={handleAddNote} onDeleteNote={(id) => setItemToDelete({ type: 'Note', id })} />;
      default: return null;
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 relative shadow-2xl overflow-hidden pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      {renderView()}

      {currentResult && <ResultCard result={currentResult} onSave={saveMeal} onDiscard={() => { setCurrentResult(null); setCapturedImage(null); }} imageUri={capturedImage} />}
      {aiSuggestion && <NoteSuggestionModal suggestion={aiSuggestion} onSave={(text) => { handleAddNote(text); setAiSuggestion(null); }} onDismiss={() => setAiSuggestion(null)} />}
      {authNotice && <AuthNoticeModal message={authNotice} onDismiss={() => setAuthNotice(null)} onSwitchToSignUp={() => { setAuthNotice(null); setView(AppView.SIGN_UP); }} />}
      {editingMeal && <MealNoteModal meal={editingMeal} onSave={handleUpdateMealNote} onClose={() => setEditingMeal(null)} />}
      {showNotifications && <NotificationModal 
        notifications={notifications} 
        onClose={() => setShowNotifications(false)} 
        onMarkRead={handleMarkNotificationRead}
        onClearAll={handleClearNotifications}
      />}
      
      {itemToDelete && (
        <DeleteConfirmationModal 
          itemType={itemToDelete.type} 
          onConfirm={executeDelete} 
          onCancel={() => setItemToDelete(null)} 
        />
      )}

      {view !== AppView.SIGN_IN && view !== AppView.SIGN_UP && view !== AppView.ONBOARDING && view !== AppView.SETTINGS && (
        <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-slate-100 flex justify-around items-center px-2 py-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] z-40">
          {NAV_ITEMS.map((item) => {
            const isActive = view === item.id;
            return (
              <button key={item.id} onClick={() => setView(item.id)} className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all duration-300 ${isActive ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'} ${item.isAction ? 'mb-8' : ''}`}>
                {item.isAction ? (
                  <div className="w-14 h-14 bg-slate-900 rounded-full flex items-center justify-center shadow-lg shadow-slate-300 transform transition-transform active:scale-90"><item.icon className="w-6 h-6 text-white" /></div>
                ) : (
                  <><item.icon className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`} strokeWidth={isActive ? 2.5 : 2} /><span className="text-[10px] font-medium">{item.label}</span></>
                )}
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
};

export default App;
