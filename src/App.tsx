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
  X
} from 'lucide-react';
import { analyzeFoodImage, analyzeTextQuery, analyzeRecipe, fileToGenerativePart, generateMealNoteSuggestion } from './services/geminiService';
import { FoodItem, LoggedMeal, UserProfile, AppView, PersonalNote, DailyHistory } from './types';

// --- Constants ---
const DEFAULT_PROFILE: UserProfile = {
  name: '',
  dailyCalorieGoal: 2000,
  weight: 0,
  height: 0, // Set to 0 so placeholders are visible
  isOnboarded: false,
};

const NAV_ITEMS = [
  { id: AppView.DASHBOARD, icon: Home, label: 'Home' },
  { id: AppView.SEARCH, icon: Search, label: 'Search' },
  { id: AppView.SCANNER, icon: Camera, label: 'Scan', isAction: true },
  { id: AppView.RECIPE, icon: ChefHat, label: 'Recipes' },
  { id: AppView.NOTES, icon: NotebookPen, label: 'Notes' },
];

// --- Extracted Components ---

const DeleteConfirmationModal = ({ 
  itemType, 
  onConfirm, 
  onCancel 
}: { 
  itemType: string, 
  onConfirm: () => void, 
  onCancel: () => void 
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in pb-[env(safe-area-inset-bottom)]">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative overflow-hidden animate-slide-up">
        {/* Background Ambient Light */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-100 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none opacity-50" />
        
        <div className="flex flex-col items-center text-center relative z-10">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-5 shadow-sm border border-red-100">
            <Trash2 className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-display font-bold text-slate-900 mb-2">Delete {itemType}?</h3>
          <p className="text-slate-500 mb-6 leading-relaxed">
            This will permanently remove this {itemType.toLowerCase()} from your logs. <span className="text-slate-800 font-medium">CalorieAI</span> will update your analytics immediately.
          </p>
          <div className="flex gap-3 w-full">
            <button 
              onClick={onCancel} 
              className="flex-1 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={onConfirm} 
              className="flex-1 py-3.5 bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-200 hover:bg-red-600 transition-colors active:scale-95"
            >
              Delete
            </button>
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const isEmailValid = email.trim().length > 0;
    const isPasswordValid = password.length >= 8 && password.length <= 15;

    const newErrors = {
      email: !isEmailValid,
      password: !isPasswordValid
    };
    
    setErrors(newErrors);

    if (!newErrors.email && !newErrors.password) {
      onSignIn(email, password);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (errors.email) setErrors({ ...errors, email: false });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (errors.password) setErrors({ ...errors, password: false });
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 relative flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-emerald-300 rounded-full blur-[80px] opacity-20" />
        <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-orange-300 rounded-full blur-[80px] opacity-20" />
      </div>

      <div className="w-full max-w-md relative z-10 flex flex-col gap-6">
        <div className="glass-panel w-full p-8 rounded-3xl shadow-xl bg-white/80 backdrop-blur-lg border border-white/20">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-emerald-200">
              <Flame className="text-white w-8 h-8" fill="currentColor" />
            </div>
            <h1 className="text-3xl font-display font-bold text-slate-800">CalorieAI</h1>
            <p className="text-slate-500 mt-2">Log it. Track it. Crush it.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div>
              <label className={`block text-sm font-medium mb-1 ${errors.email ? 'text-red-500' : 'text-slate-700'}`}>
                Email
              </label>
              <div className="relative">
                <Mail className={`absolute left-3 top-3 w-5 h-5 z-10 ${errors.email ? 'text-red-500' : 'text-slate-500'}`} />
                <input 
                  type="email" 
                  className={`w-full pl-10 pr-4 py-3 bg-white text-black placeholder-gray-400 rounded-xl border outline-none transition-all ${
                    errors.email 
                      ? 'border-red-500 ring-1 ring-red-500 focus:ring-red-500' 
                      : 'border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
                  }`}
                  placeholder="e.g. hello@example.com"
                  value={email}
                  onChange={handleEmailChange}
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">Please enter your email address</p>}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${errors.password ? 'text-red-500' : 'text-slate-700'}`}>
                Password
              </label>
              <div className="relative">
                <Lock className={`absolute left-3 top-3 w-5 h-5 z-10 ${errors.password ? 'text-red-500' : 'text-slate-500'}`} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  className={`w-full pl-10 pr-12 py-3 bg-white text-black placeholder-gray-400 rounded-xl border outline-none transition-all ${
                    errors.password
                      ? 'border-red-500 ring-1 ring-red-500 focus:ring-red-500' 
                      : 'border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
                  }`}
                  placeholder="8-15 characters"
                  value={password}
                  onChange={handlePasswordChange}
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
        <div className="glass-panel w-full p-8 rounded-3xl shadow-xl bg-white/80 backdrop-blur-lg border border-white/20">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-display font-bold text-slate-800">Create Account</h1>
            <p className="text-slate-500 mt-1">Start your journey today.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className={`block text-xs font-medium mb-1 ${errors.name ? 'text-red-500' : 'text-slate-700'}`}>Full Name</label>
              <input 
                type="text" 
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
  const [weight, setWeight] = useState(userProfile.weight || '');
  const [height, setHeight] = useState(userProfile.height || '');
  const [goal, setGoal] = useState(userProfile.dailyCalorieGoal || 2000);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserProfile(prev => ({
      ...prev,
      weight: Number(weight),
      height: Number(height),
      dailyCalorieGoal: Number(goal),
      isOnboarded: true
    }));
    onComplete();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
       <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl">
          <h2 className="text-2xl font-bold mb-6 text-slate-800">Let's set your goals</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Current Weight (kg)</label>
               <input type="number" required value={weight} onChange={e => setWeight(e.target.value)} className="w-full border rounded-xl p-3" />
            </div>
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Height (cm)</label>
               <input type="number" required value={height} onChange={e => setHeight(e.target.value)} className="w-full border rounded-xl p-3" />
            </div>
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Daily Calorie Goal</label>
               <input type="number" required value={goal} onChange={e => setGoal(e.target.value)} className="w-full border rounded-xl p-3" />
            </div>
            <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold mt-4 hover:bg-emerald-700">Get Started</button>
          </form>
       </div>
    </div>
  );
};

const DashboardView = ({ 
  userProfile, 
  meals,
  onViewChange,
  onDeleteMeal
}: { 
  userProfile: UserProfile, 
  meals: LoggedMeal[],
  onViewChange: (view: AppView) => void,
  onDeleteMeal: (id: string) => void
}) => {
  const todayCalories = meals.reduce((sum, meal) => sum + meal.item.calories, 0);
  const remaining = Math.max(0, userProfile.dailyCalorieGoal - todayCalories);
  const percent = Math.min(100, Math.round((todayCalories / userProfile.dailyCalorieGoal) * 100));

  return (
    <div className="p-6 pb-24">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Hello, {userProfile.name}</h2>
          <p className="text-slate-500 text-sm">Today's Progress</p>
        </div>
        <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
          <User className="w-5 h-5 text-slate-600" />
        </div>
      </div>

      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-lg mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 rounded-full blur-[50px] opacity-30 pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center">
            <div className="w-32 h-32 rounded-full border-8 border-slate-700 flex items-center justify-center relative">
               <div className="absolute inset-0 rounded-full border-8 border-emerald-500 border-t-transparent transform -rotate-45" style={{
                  clipPath: `polygon(0 0, 100% 0, 100% ${percent}%, 0 ${percent}%)` // simplistic visualizations
               }}></div>
               <div className="text-center">
                 <span className="text-2xl font-bold">{remaining}</span>
                 <p className="text-xs text-slate-400">kcal left</p>
               </div>
            </div>
            <div className="mt-4 flex gap-8">
               <div className="text-center">
                 <p className="text-lg font-bold">{todayCalories}</p>
                 <p className="text-xs text-slate-400">Eaten</p>
               </div>
               <div className="text-center">
                 <p className="text-lg font-bold">{userProfile.dailyCalorieGoal}</p>
                 <p className="text-xs text-slate-400">Goal</p>
               </div>
            </div>
        </div>
      </div>

      <h3 className="font-bold text-lg mb-4 text-slate-800">Recent Meals</h3>
      {meals.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
           <p className="text-slate-500 mb-2">No meals logged yet today.</p>
           <button onClick={() => onViewChange(AppView.SCANNER)} className="text-emerald-600 font-medium">Scan a meal</button>
        </div>
      ) : (
        <div className="space-y-3">
          {meals.map((meal) => (
             <div key={meal.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 group">
                {meal.imageUri ? (
                  <img src={meal.imageUri} alt={meal.item.name} className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-orange-500">
                    <ChefHat className="w-6 h-6" />
                  </div>
                )}
                <div className="flex-1">
                   <h4 className="font-bold text-slate-800">{meal.item.name}</h4>
                   <p className="text-xs text-slate-500">{meal.item.portionSize} • {new Date(meal.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
                <div className="text-right flex items-center gap-3">
                   <div>
                     <span className="font-bold text-emerald-600">{meal.item.calories}</span>
                     <p className="text-xs text-slate-400">kcal</p>
                   </div>
                   <button 
                     onClick={() => onDeleteMeal(meal.id)}
                     className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
             </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Generic component for Analysis result display
const AnalysisResult = ({ item, onLog, onCancel }: { item: FoodItem, onLog: () => void, onCancel: () => void }) => (
  <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-y-auto">
     <div className="relative h-64 bg-slate-100">
        {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />}
        <button onClick={onCancel} className="absolute top-4 left-4 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-md">
           <X className="w-6 h-6" />
        </button>
     </div>
     <div className="p-6 flex-1 bg-white -mt-6 rounded-t-3xl relative">
        <div className="flex justify-between items-start mb-2">
           <div>
              <h2 className="text-2xl font-bold text-slate-900">{item.name}</h2>
              <p className="text-slate-500">{item.portionSize} • {item.calories} kcal</p>
           </div>
           <div className={`px-3 py-1 rounded-full text-xs font-bold ${item.confidence === 'High' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {item.confidence} Confidence
           </div>
        </div>
        
        <p className="text-slate-600 text-sm mb-6">{item.description}</p>
        
        <div className="grid grid-cols-3 gap-4 mb-8">
           <div className="bg-slate-50 p-3 rounded-xl text-center">
              <span className="block font-bold text-lg text-slate-800">{item.macros.protein}g</span>
              <span className="text-xs text-slate-500">Protein</span>
           </div>
           <div className="bg-slate-50 p-3 rounded-xl text-center">
              <span className="block font-bold text-lg text-slate-800">{item.macros.carbs}g</span>
              <span className="text-xs text-slate-500">Carbs</span>
           </div>
           <div className="bg-slate-50 p-3 rounded-xl text-center">
              <span className="block font-bold text-lg text-slate-800">{item.macros.fat}g</span>
              <span className="text-xs text-slate-500">Fat</span>
           </div>
        </div>

        {item.sourceUrls && item.sourceUrls.length > 0 && (
           <div className="mb-6">
             <h4 className="text-sm font-bold text-slate-800 mb-2">Sources</h4>
             <ul className="space-y-1">
               {item.sourceUrls.map((s, i) => (
                 <li key={i}><a href={s.url} target="_blank" rel="noreferrer" className="text-emerald-600 text-sm hover:underline flex items-center gap-1"><LinkIcon className="w-3 h-3"/> {s.title}</a></li>
               ))}
             </ul>
           </div>
        )}

        <button onClick={onLog} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2">
           <Plus className="w-5 h-5" /> Log Food
        </button>
     </div>
  </div>
);

const ScannerView = ({ onLogFood }: { onLogFood: (item: FoodItem, img?: string) => void }) => {
   const fileInputRef = useRef<HTMLInputElement>(null);
   const [analyzing, setAnalyzing] = useState(false);
   const [result, setResult] = useState<FoodItem | null>(null);
   const [preview, setPreview] = useState<string | null>(null);

   const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
         const file = e.target.files[0];
         setAnalyzing(true);
         try {
            const base64 = await fileToGenerativePart(file);
            setPreview(`data:image/jpeg;base64,${base64}`); // Just for preview
            const data = await analyzeFoodImage(base64);
            setResult(data);
         } catch (err) {
            alert("Failed to analyze image. Please try again.");
         } finally {
            setAnalyzing(false);
         }
      }
   };

   if (result) {
      return <AnalysisResult item={result} onLog={() => onLogFood(result, preview || undefined)} onCancel={() => { setResult(null); setPreview(null); }} />;
   }

   return (
      <div className="p-6 h-full flex flex-col justify-center items-center text-center">
         <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
            <Camera className="w-10 h-10" />
         </div>
         <h2 className="text-2xl font-bold text-slate-800 mb-2">Scan Your Meal</h2>
         <p className="text-slate-500 mb-8 max-w-xs mx-auto">Take a photo of your food to instantly get calorie and macro estimates.</p>
         
         <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFile} />
         
         <button 
           disabled={analyzing}
           onClick={() => fileInputRef.current?.click()} 
           className="w-full max-w-xs bg-slate-900 text-white py-4 rounded-xl font-bold shadow-xl flex items-center justify-center gap-2"
         >
            {analyzing ? <Loader2 className="animate-spin" /> : <><ImageIcon className="w-5 h-5" /> Upload Photo</>}
         </button>
      </div>
   );
};

const SearchView = ({ onLogFood }: { onLogFood: (item: FoodItem) => void }) => {
   const [query, setQuery] = useState('');
   const [loading, setLoading] = useState(false);
   const [result, setResult] = useState<FoodItem | null>(null);

   const handleSearch = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!query.trim()) return;
      setLoading(true);
      try {
         const data = await analyzeTextQuery(query);
         setResult(data);
      } catch(err) {
         alert("Search failed.");
      } finally {
         setLoading(false);
      }
   };

   if (result) return <AnalysisResult item={result} onLog={() => onLogFood(result)} onCancel={() => setResult(null)} />;

   return (
      <div className="p-6">
         <h2 className="text-2xl font-bold mb-6">Search Food</h2>
         <form onSubmit={handleSearch} className="relative">
            <input 
              type="text" 
              className="w-full bg-slate-100 border-none rounded-xl py-4 pl-12 pr-4 font-medium outline-none focus:ring-2 focus:ring-emerald-500" 
              placeholder="e.g. 2 slices of pepperoni pizza"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <Search className="absolute left-4 top-4 text-slate-400 w-6 h-6" />
            <button type="submit" disabled={loading} className="absolute right-3 top-3 bg-slate-900 text-white p-1.5 rounded-lg disabled:opacity-50">
               {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
            </button>
         </form>
         
         <div className="mt-8">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Popular searches</h3>
            <div className="flex flex-wrap gap-2">
               {['Banana', 'Oatmeal', 'Grilled Chicken Salad', 'Avocado Toast', 'Pasta Carbonara'].map(item => (
                  <button key={item} onClick={() => { setQuery(item); }} className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-600">
                     {item}
                  </button>
               ))}
            </div>
         </div>
      </div>
   );
};

const RecipeView = ({ onLogFood }: { onLogFood: (item: FoodItem) => void }) => {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<FoodItem | null>(null);
 
    const handleAnalyze = async (e: React.FormEvent) => {
       e.preventDefault();
       if(!query.trim()) return;
       setLoading(true);
       try {
          const data = await analyzeRecipe(query);
          setResult(data);
       } catch(err) {
          alert("Recipe analysis failed.");
       } finally {
          setLoading(false);
       }
    };
 
    if (result) return <AnalysisResult item={result} onLog={() => onLogFood(result)} onCancel={() => setResult(null)} />;

    return (
       <div className="p-6">
          <h2 className="text-2xl font-bold mb-2">Recipe Analyzer</h2>
          <p className="text-slate-500 mb-6 text-sm">Paste a recipe URL or ingredients list to get per-serving nutrition.</p>
          <form onSubmit={handleAnalyze}>
             <textarea 
               className="w-full bg-slate-100 border-none rounded-xl p-4 min-h-[150px] font-medium outline-none focus:ring-2 focus:ring-emerald-500 mb-4" 
               placeholder="Paste URL or text here..."
               value={query}
               onChange={e => setQuery(e.target.value)}
             />
             <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2">
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Analyze Recipe'}
             </button>
          </form>
       </div>
    );
 };

const NotesView = ({ notes, onDeleteNote }: { notes: PersonalNote[], onDeleteNote: (id: string) => void }) => (
   <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">My Notes</h2>
      {notes.length === 0 ? (
         <div className="text-center text-slate-400 py-10">No notes yet.</div>
      ) : (
         <div className="space-y-4">
            {notes.map(note => (
               <div key={note.id} className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-yellow-900 shadow-sm relative group">
                  <p className="italic">"{note.content}"</p>
                  <span className="text-xs text-yellow-600 block mt-2 opacity-75">{note.timestamp.toLocaleDateString()}</span>
                  <button 
                     onClick={() => onDeleteNote(note.id)}
                     className="absolute top-2 right-2 p-2 text-yellow-600 hover:text-red-500 hover:bg-yellow-100 rounded-lg transition-colors"
                  >
                     <Trash2 className="w-4 h-4" />
                  </button>
               </div>
            ))}
         </div>
      )}
   </div>
);

// --- Main App ---

const App = () => {
  const [activeView, setActiveView] = useState<AppView>(AppView.SIGN_IN);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [meals, setMeals] = useState<LoggedMeal[]>([]);
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'Meal' | 'Note', id: string } | null>(null);

  // Auth Handlers (Mock)
  const handleSignIn = () => { setIsLoading(true); setTimeout(() => { setIsLoading(false); setActiveView(userProfile.isOnboarded ? AppView.DASHBOARD : AppView.ONBOARDING); }, 1000); };
  const handleSignUp = (data: any) => { setIsLoading(true); setTimeout(() => { setUserProfile({...userProfile, name: data.name}); setIsLoading(false); setActiveView(AppView.SIGN_IN); }, 1000); };

  const handleLogFood = async (item: FoodItem, imageUri?: string) => {
     const newMeal: LoggedMeal = {
        id: Date.now().toString(),
        timestamp: new Date(),
        item,
        imageUri
     };
     setMeals(prev => [newMeal, ...prev]);
     
     // Generate note
     const noteText = await generateMealNoteSuggestion(item);
     if (noteText) {
        setNotes(prev => [{ id: Date.now().toString(), content: noteText, timestamp: new Date() }, ...prev]);
     }
     
     setActiveView(AppView.DASHBOARD);
  };

  const executeDelete = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'Meal') {
      setMeals(prev => prev.filter(item => item.id !== itemToDelete.id));
    } else if (itemToDelete.type === 'Note') {
      setNotes(prev => notes.filter(n => n.id !== itemToDelete.id));
    }
    setItemToDelete(null);
  };

  const renderContent = () => {
    switch (activeView) {
      case AppView.SIGN_IN: return <SignInView onSignIn={handleSignIn} onNavigateToSignUp={() => setActiveView(AppView.SIGN_UP)} isLoading={isLoading} />;
      case AppView.SIGN_UP: return <SignUpView onSignUp={handleSignUp} onNavigateToSignIn={() => setActiveView(AppView.SIGN_IN)} isLoading={isLoading} />;
      case AppView.ONBOARDING: return <OnboardingView userProfile={userProfile} setUserProfile={setUserProfile} onComplete={() => setActiveView(AppView.DASHBOARD)} />;
      case AppView.DASHBOARD: return <DashboardView userProfile={userProfile} meals={meals} onViewChange={setActiveView} onDeleteMeal={(id) => setItemToDelete({ type: 'Meal', id })} />;
      case AppView.SCANNER: return <ScannerView onLogFood={handleLogFood} />;
      case AppView.SEARCH: return <SearchView onLogFood={handleLogFood} />;
      case AppView.RECIPE: return <RecipeView onLogFood={handleLogFood} />;
      case AppView.NOTES: return <NotesView notes={notes} onDeleteNote={(id) => setItemToDelete({ type: 'Note', id })} />;
      default: return <DashboardView userProfile={userProfile} meals={meals} onViewChange={setActiveView} onDeleteMeal={(id) => setItemToDelete({ type: 'Meal', id })} />;
    }
  };

  // If in auth/onboarding flow, full screen
  if ([AppView.SIGN_IN, AppView.SIGN_UP, AppView.ONBOARDING].includes(activeView)) {
     return renderContent();
  }

  // Main App Layout
  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 relative shadow-2xl overflow-hidden flex flex-col">
       <div className="flex-1 overflow-y-auto">
          {renderContent()}
       </div>
       
       {itemToDelete && (
         <DeleteConfirmationModal 
           itemType={itemToDelete.type} 
           onConfirm={executeDelete} 
           onCancel={() => setItemToDelete(null)} 
         />
       )}
       
       {/* Bottom Navigation */}
       <div className="bg-white border-t border-slate-100 p-4 pb-6 flex justify-between items-center px-6 sticky bottom-0 z-40">
          {NAV_ITEMS.map((item) => (
             <button 
               key={item.id} 
               onClick={() => setActiveView(item.id)}
               className={`flex flex-col items-center gap-1 transition-colors ${activeView === item.id ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
             >
                {item.isAction ? (
                   <div className="w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-lg shadow-slate-300 -mt-8 border-4 border-slate-50">
                      <item.icon className="w-6 h-6" />
                   </div>
                ) : (
                   <item.icon className="w-6 h-6" strokeWidth={activeView === item.id ? 2.5 : 2} />
                )}
                <span className="text-[10px] font-medium">{item.label}</span>
             </button>
          ))}
       </div>
    </div>
  );
};

export default App;