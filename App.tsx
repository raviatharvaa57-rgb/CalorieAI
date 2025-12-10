import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Calendar
} from 'lucide-react';
import { analyzeFoodImage, analyzeTextQuery, analyzeRecipe, fileToGenerativePart } from './services/geminiService';
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
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden bg-slate-50">
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-emerald-300 rounded-full blur-[80px] opacity-20" />
      <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-orange-300 rounded-full blur-[80px] opacity-20" />

      <div className="glass-panel w-full max-w-md p-8 rounded-3xl shadow-xl z-10">
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
      
      <p className="mt-8 text-center text-slate-500 text-sm">
        Don't have an account? <button onClick={onNavigateToSignUp} className="text-emerald-600 font-bold hover:underline">Sign Up</button>
      </p>
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
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden bg-slate-50">
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-emerald-300 rounded-full blur-[80px] opacity-20" />
      <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-orange-300 rounded-full blur-[80px] opacity-20" />

      <div className="glass-panel w-full max-w-md p-8 rounded-3xl shadow-xl z-10">
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
      
      <p className="mt-8 text-center text-slate-500 text-sm">
        Already have an account? <button onClick={onNavigateToSignIn} className="text-emerald-600 font-bold hover:underline">Sign In</button>
      </p>
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

const ResultCard = ({ result, onSave, onDiscard, imageUri }: { result: FoodItem, onSave: () => void, onDiscard: () => void, imageUri?: string | null }) => {
  // Use imageUri if available (camera/upload), otherwise fallback to result.imageUrl (fetched from Google), otherwise generic
  const displayImage = imageUri || result.imageUrl;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 pb-[env(safe-area-inset-bottom)]">
      <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-slide-up mb-4 sm:mb-0">
        {displayImage && (
          <div className="h-48 w-full bg-slate-100 relative">
            <img 
              src={displayImage} 
              alt="Analyzed food" 
              className="w-full h-full object-cover" 
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null; // Prevent infinite loop
                target.src = 'https://via.placeholder.com/400x300?text=No+Image';
              }}
            />
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
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
              result.confidence === 'High' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {result.confidence} Confidence
            </div>
          </div>

          <p className="text-slate-600 text-sm mb-6 leading-relaxed bg-slate-50 p-3 rounded-xl">
            {result.description}
          </p>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-orange-50 p-3 rounded-2xl text-center">
              <div className="text-xs text-orange-600 font-medium mb-1">Protein</div>
              <div className="text-xl font-bold text-slate-900">{result.macros.protein}g</div>
            </div>
            <div className="bg-blue-50 p-3 rounded-2xl text-center">
              <div className="text-xs text-blue-600 font-medium mb-1">Carbs</div>
              <div className="text-xl font-bold text-slate-900">{result.macros.carbs}g</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded-2xl text-center">
              <div className="text-xs text-yellow-600 font-medium mb-1">Fat</div>
              <div className="text-xl font-bold text-slate-900">{result.macros.fat}g</div>
            </div>
          </div>

          {result.sourceUrls && result.sourceUrls.length > 0 && (
            <div className="mb-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Sources</h4>
              <div className="flex flex-wrap gap-2">
                {result.sourceUrls.map((source, index) => (
                  <a 
                    key={index} 
                    href={source.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md hover:underline truncate max-w-full"
                  >
                    {source.title}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button 
              onClick={onDiscard}
              className="flex-1 py-3 rounded-xl border border-slate-200 font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={onSave}
              className="flex-[2] py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-[0.98]"
            >
              Log Meal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardView = ({ 
  userProfile, 
  dailyLog, 
  onLogout,
  onScanClick,
  onSearchClick,
  onResetDay,
}: {
  userProfile: UserProfile,
  dailyLog: LoggedMeal[],
  onLogout: () => void,
  onScanClick: () => void,
  onSearchClick: () => void,
  onResetDay: () => void,
}) => {
  const [showGoalReached, setShowGoalReached] = useState(false);
  const [hasDismissedGoal, setHasDismissedGoal] = useState(false);

  const totalCalories = dailyLog.reduce((sum, meal) => sum + meal.item.calories, 0);
  const totalProtein = dailyLog.reduce((sum, meal) => sum + meal.item.macros.protein, 0);
  const totalCarbs = dailyLog.reduce((sum, meal) => sum + meal.item.macros.carbs, 0);
  const totalFat = dailyLog.reduce((sum, meal) => sum + meal.item.macros.fat, 0);
  const progress = Math.min((totalCalories / userProfile.dailyCalorieGoal) * 100, 100);

  useEffect(() => {
    // If the log is empty (reset happened), allow showing the modal again in the future
    if (dailyLog.length === 0) {
      setHasDismissedGoal(false);
      setShowGoalReached(false);
    } 
    // If goal met and not dismissed, show modal
    else if (totalCalories >= userProfile.dailyCalorieGoal && !hasDismissedGoal) {
      setShowGoalReached(true);
    }
  }, [totalCalories, userProfile.dailyCalorieGoal, dailyLog.length, hasDismissedGoal]);

  const handleStartNewDay = () => {
    setShowGoalReached(false);
    onResetDay();
  };

  const handleDismiss = () => {
    setShowGoalReached(false);
    setHasDismissedGoal(true);
  };

  return (
    <div className="pb-32 pt-8 px-8 relative min-h-screen">
      <header className="flex justify-between items-center mb-10 pt-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900">
            Hello, {userProfile.name || 'Friend'}
          </h1>
          <p className="text-slate-500 text-sm">Let's hit your goals today.</p>
        </div>
        <div 
          onClick={onLogout}
          className="w-10 h-10 bg-white border border-slate-100 rounded-full flex items-center justify-center shadow-sm cursor-pointer hover:bg-slate-50"
        >
          <User className="w-5 h-5 text-slate-600" />
        </div>
      </header>

      {/* Main Stats Card */}
      <div className="glass-panel w-full p-8 rounded-3xl shadow-lg mb-10 relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600 flex items-center gap-1">
            <Flame className="w-4 h-4 text-orange-500" fill="currentColor" /> Calories
          </span>
          <span className="text-sm font-bold text-slate-900">{totalCalories} / {userProfile.dailyCalorieGoal}</span>
        </div>
        
        <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden mb-6">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ease-out ${
              totalCalories > userProfile.dailyCalorieGoal ? 'bg-orange-500' : 'bg-gradient-to-r from-emerald-400 to-emerald-600'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-xs text-slate-400 mb-1">Protein</div>
            <div className="font-bold text-slate-800">{totalProtein}g</div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-orange-400 w-[60%] rounded-full"/>
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400 mb-1">Carbs</div>
            <div className="font-bold text-slate-800">{totalCarbs}g</div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
               <div className="h-full bg-blue-400 w-[45%] rounded-full"/>
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400 mb-1">Fat</div>
            <div className="font-bold text-slate-800">{totalFat}g</div>
             <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
               <div className="h-full bg-yellow-400 w-[30%] rounded-full"/>
             </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-display font-bold text-lg text-slate-900">Today's Meals</h3>
          <button 
            onClick={onSearchClick}
            className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full hover:bg-emerald-100 hover:text-emerald-700 transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Type
          </button>
        </div>
        
        {dailyLog.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-slate-100 border-dashed">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Plus className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-500 text-sm mb-4">No meals logged yet.</p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={onScanClick}
                className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-xl shadow-lg shadow-slate-200 active:scale-95 transition-all flex items-center gap-2"
              >
                <Camera className="w-4 h-4" /> Scan
              </button>
              <button 
                onClick={onSearchClick}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 active:scale-95 transition-all flex items-center gap-2"
              >
                <Search className="w-4 h-4" /> Type
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {dailyLog.map((log) => (
              <div key={log.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 animate-fade-in">
                <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
                  {log.imageUri || log.item.imageUrl ? (
                    <img 
                      src={log.imageUri || log.item.imageUrl} 
                      className="w-full h-full object-cover" 
                      alt={log.item.name} 
                      onError={(e) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Food'} 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ChefHat className="text-slate-300 w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800 text-base">{log.item.name}</h4>
                  <div className="text-sm text-slate-500 flex items-center gap-2">
                    <span>{log.item.calories} kcal</span>
                    <span>•</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Goal Reached Overlay */}
      {showGoalReached && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in pb-[env(safe-area-inset-bottom)]">
          <div className="bg-white w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-yellow-50 to-transparent -z-10" />
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-yellow-200/50">
              <Trophy className="w-10 h-10 text-yellow-600" fill="currentColor" />
            </div>
            <h2 className="text-2xl font-display font-bold text-slate-900 mb-2">Goal Crushed! 🔥</h2>
            <p className="text-slate-500 mb-8 leading-relaxed">
              You've hit your daily calorie target. Great work staying consistent!
            </p>
            <div className="space-y-3">
              <button 
                onClick={handleStartNewDay}
                className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-200 active:scale-95 transition-all"
              >
                Start New Day
              </button>
              <button 
                onClick={handleDismiss}
                className="w-full py-3.5 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors"
              >
                View Today's Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ScannerView = ({ 
  onImageAnalyze, 
  isAnalyzing 
}: { 
  onImageAnalyze: (file: File) => void, 
  isAnalyzing: boolean 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let currentStream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        currentStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        setStream(currentStream);
        if (videoRef.current) {
          videoRef.current.srcObject = currentStream;
        }
        setError(null);
      } catch (err) {
        console.error("Camera error:", err);
        setError("Camera access denied or unavailable");
      }
    };

    startCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
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
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
            onImageAnalyze(file);
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageAnalyze(e.target.files[0]);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 pb-24">
      <div className="w-full max-w-sm aspect-[3/4] bg-slate-900 rounded-[3rem] relative overflow-hidden shadow-2xl border-4 border-slate-800">
        <canvas ref={canvasRef} className="hidden" />
        
        <video 
          ref={videoRef}
          className={`w-full h-full object-cover ${!stream ? 'opacity-0' : 'opacity-100'}`} 
          autoPlay 
          muted 
          playsInline
        />
        
        {!stream && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
          </div>
        )}

         {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 p-6 text-center">
             <AlertCircle className="w-12 h-12 text-slate-500 mb-4" />
             <p className="text-slate-400 mb-4">{error}</p>
             <button 
               onClick={() => fileInputRef.current?.click()}
               className="px-6 py-3 bg-slate-800 rounded-xl text-white font-medium"
             >
               Upload Photo
             </button>
          </div>
        )}
        
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6 pointer-events-none">
          <div className="w-64 h-64 border-2 border-white/30 rounded-[2rem] relative mb-8 flex items-center justify-center">
             <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl -mt-1 -ml-1"></div>
             <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl -mt-1 -mr-1"></div>
             <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl -mb-1 -ml-1"></div>
             <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-500 rounded-br-xl -mb-1 -mr-1"></div>
             
             {isAnalyzing && (
               <div className="absolute inset-0 bg-emerald-500/10 animate-pulse-fast rounded-[2rem] flex items-center justify-center backdrop-blur-sm">
                 <Loader2 className="w-12 h-12 text-white animate-spin" />
               </div>
             )}
          </div>

          <p className="text-white/80 text-center text-sm mb-8 font-medium drop-shadow-md">
            Point at any food to instantly<br/>calculate calories & macros
          </p>

          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileChange}
          />

          <div className="flex items-center gap-6 pointer-events-auto">
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing}
              className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <ImageIcon className="w-6 h-6 text-white" />
            </button>

            <button 
              onClick={stream ? handleCapture : () => fileInputRef.current?.click()}
              disabled={isAnalyzing || (!stream && !error)}
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.3)] active:scale-90 transition-transform"
            >
              <div className="w-16 h-16 bg-white border-4 border-slate-900 rounded-full flex items-center justify-center">
                 {isAnalyzing ? <Loader2 className="w-8 h-8 text-slate-900 animate-spin" /> : <Camera className="w-8 h-8 text-slate-900" />}
              </div>
            </button>
            
            <div className="w-12 h-12" />
          </div>
        </div>
      </div>
    </div>
  );
};

const SearchView = ({ 
  onSearch, 
  isAnalyzing 
}: { 
  onSearch: (q: string) => void, 
  isAnalyzing: boolean 
}) => {
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query);
  };

  return (
    <div className="p-8 pb-32 min-h-screen">
      <h2 className="text-2xl font-display font-bold mb-8">Search Food</h2>
      <form onSubmit={handleSearch} className="relative mb-10">
        <Search className="absolute left-4 top-5 text-slate-400 w-6 h-6" />
        <input 
          type="text" 
          className="w-full pl-14 pr-4 py-5 bg-white rounded-2xl shadow-sm border-none focus:ring-2 focus:ring-emerald-500 text-lg placeholder:text-slate-400"
          placeholder="e.g. Avocado Toast"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button 
          type="submit" 
          disabled={!query.trim() || isAnalyzing}
          className="absolute right-3 top-3 bg-slate-900 text-white p-2.5 rounded-xl disabled:opacity-50"
        >
          {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
        </button>
      </form>

      <div className="space-y-5">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Popular Searches</h3>
        {['Grilled Chicken Salad', 'Oatmeal with Berries', 'Double Cheeseburger', 'Salmon Fillet', 'Greek Yogurt Parfait', 'Pepperoni Pizza Slice', 'Protein Smoothie', 'Caesar Salad', 'Spaghetti Bolognese'].map((item) => (
          <button 
            key={item}
            onClick={() => { setQuery(item); onSearch(item); }}
            className="block w-full text-left p-5 bg-white rounded-2xl hover:bg-slate-50 transition-colors text-slate-700 font-medium text-lg"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
};

const RecipeView = ({ 
  onAnalyze, 
  isAnalyzing 
}: { 
  onAnalyze: (input: string) => void, 
  isAnalyzing: boolean 
}) => {
  const [activeTab, setActiveTab] = useState<'url' | 'manual'>('url');
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) onAnalyze(input);
  };

  return (
    <div className="p-8 pb-32 min-h-screen">
      <h2 className="text-2xl font-display font-bold mb-8">Import Recipe</h2>
      
      <div className="flex p-1.5 bg-slate-200 rounded-xl mb-8">
        <button 
          onClick={() => setActiveTab('url')}
          className={`flex-1 py-3.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'url' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
          }`}
        >
          Web Link
        </button>
        <button 
          onClick={() => setActiveTab('manual')}
          className={`flex-1 py-3.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'manual' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
          }`}
        >
          Manual Text
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-3">
            {activeTab === 'url' ? 'Paste Recipe URL' : 'Paste Ingredients & Instructions'}
          </label>
          {activeTab === 'url' ? (
            <div className="relative">
              <LinkIcon className="absolute left-4 top-4 text-slate-400 w-5 h-5" />
              <input 
                type="url"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 text-base"
                placeholder="https://cooking.com/recipe..."
              />
            </div>
          ) : (
            <div className="relative">
              <FileText className="absolute left-4 top-4 text-slate-400 w-5 h-5" />
              <textarea 
                rows={6}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 text-base"
                placeholder="1 cup rice, 200g chicken..."
              />
            </div>
          )}
        </div>

        <button 
          type="submit"
          disabled={!input.trim() || isAnalyzing}
          className="w-full bg-slate-900 text-white py-5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors disabled:opacity-70 text-lg"
        >
          {isAnalyzing ? <Loader2 className="animate-spin" /> : 'Analyze Recipe'}
        </button>
      </form>
    </div>
  );
};

const NotesView = ({ 
  notes, 
  onAddNote,
  onDeleteNote 
}: { 
  notes: PersonalNote[], 
  onAddNote: (content: string) => void, 
  onDeleteNote: (id: string) => void 
}) => {
  const [newNote, setNewNote] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newNote.trim()) {
      onAddNote(newNote);
      setNewNote('');
      setIsFocused(false);
    }
  };

  return (
    <div className="p-8 pb-32 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">My Food Notes</h2>
          <p className="text-slate-500 text-sm mt-1">Meal plans & ideas.</p>
        </div>
        <div className="bg-slate-100 px-4 py-2 rounded-full text-sm font-bold text-slate-600">
          {notes.length}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mb-10">
        <div className={`bg-white rounded-3xl shadow-sm border transition-all duration-300 overflow-hidden ${
          isFocused ? 'ring-2 ring-emerald-500 border-transparent shadow-md' : 'border-slate-200'
        }`}>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => !newNote.trim() && setIsFocused(false)}
            placeholder="What would you like to eat this week?"
            className="w-full p-6 outline-none resize-none bg-white text-black placeholder:text-gray-400 min-h-[160px] text-lg"
          />
          <div className="px-6 pb-6 flex justify-end">
            <button 
              type="submit"
              disabled={!newNote.trim()}
              onMouseDown={(e) => e.preventDefault()}
              className="bg-black text-white px-6 py-3 rounded-xl font-medium text-sm hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Save Note
            </button>
          </div>
        </div>
      </form>

      <div className="space-y-6">
        {notes.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <NotebookPen className="w-10 h-10 text-slate-300" />
            </div>
            <p className="text-slate-400 font-medium text-lg">No notes yet.</p>
            <p className="text-slate-400 text-sm mt-2">Write down your meal plans or cravings.</p>
          </div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 animate-fade-in relative group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
                   <Calendar className="w-3 h-3" />
                   {note.timestamp.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
                <button 
                  onClick={() => onDeleteNote(note.id)}
                  className="p-3 -mr-2 text-slate-300 hover:text-red-600 active:text-red-600 hover:bg-red-50 active:bg-red-50 rounded-full transition-all"
                  aria-label="Delete note"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              <p className="text-black whitespace-pre-wrap leading-relaxed text-lg">
                {note.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  // Initialize state from localStorage
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
          return JSON.parse(saved).map((log: any) => ({
            ...log,
            timestamp: new Date(log.timestamp)
          }));
        } catch (e) {
          console.error("Failed to parse logs", e);
          return [];
        }
      }
    }
    return [];
  });

  const [notes, setNotes] = useState<PersonalNote[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('calorieai_notes');
      if (saved) {
        try {
          return JSON.parse(saved).map((note: any) => ({
            ...note,
            timestamp: new Date(note.timestamp)
          }));
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
        if (parsed.name) return AppView.ONBOARDING; // Mid-onboarding
      }
    }
    return AppView.SIGN_IN;
  });

  const [currentResult, setCurrentResult] = useState<FoodItem | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('calorieai_user', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem('calorieai_logs', JSON.stringify(dailyLog));
  }, [dailyLog]);

  useEffect(() => {
    localStorage.setItem('calorieai_notes', JSON.stringify(notes));
  }, [notes]);

  // Handlers
  const handleSignIn = (email: string, password?: string) => {
    setIsLoadingAuth(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoadingAuth(false);
      // If we already have a profile from local storage but were on sign in screen (unlikely unless manual reset), use it.
      // Otherwise, assume new session.
      if (userProfile.isOnboarded) {
        setView(AppView.DASHBOARD);
      } else {
        setView(AppView.ONBOARDING);
      }
    }, 1500);
  };
  
  const handleSignUp = (data: any) => {
    setIsLoadingAuth(true);
    // Simulate API call for sign up
    setTimeout(() => {
      setIsLoadingAuth(false);
      setUserProfile({ ...DEFAULT_PROFILE, name: data.name });
      setView(AppView.ONBOARDING);
    }, 1500);
  };

  const handleOnboardingComplete = () => {
    setUserProfile({ ...userProfile, isOnboarded: true });
    setView(AppView.DASHBOARD);
  };

  const handleLogout = () => {
    localStorage.removeItem('calorieai_user');
    localStorage.removeItem('calorieai_logs');
    localStorage.removeItem('calorieai_notes');
    
    setUserProfile(DEFAULT_PROFILE);
    setDailyLog([]);
    setNotes([]);
    setView(AppView.SIGN_IN);
  };

  const handleImageAnalysis = async (file: File) => {
    setIsAnalyzing(true);
    setCapturedImage(URL.createObjectURL(file));
    try {
      const base64 = await fileToGenerativePart(file);
      const result = await analyzeFoodImage(base64);
      setCurrentResult(result);
    } catch (error) {
      alert("Failed to analyze image. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTextSearch = async (query: string) => {
    setIsAnalyzing(true);
    setCapturedImage(null);
    try {
      const result = await analyzeTextQuery(query);
      setCurrentResult(result);
    } catch (error) {
      alert("Search failed. Try a different query.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRecipeAnalysis = async (input: string) => {
    setIsAnalyzing(true);
    setCapturedImage(null);
    try {
      const result = await analyzeRecipe(input);
      setCurrentResult(result);
    } catch (error) {
      alert("Recipe analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveMeal = () => {
    if (currentResult) {
      setDailyLog([
        {
          id: Date.now().toString(),
          timestamp: new Date(),
          item: currentResult,
          imageUri: capturedImage || undefined
        },
        ...dailyLog
      ]);
      setCurrentResult(null);
      setCapturedImage(null);
      setView(AppView.DASHBOARD);
    }
  };
  
  const handleResetDay = () => {
    setDailyLog([]);
  };

  const handleAddNote = (content: string) => {
    const newNote: PersonalNote = {
      id: Date.now().toString(),
      content,
      timestamp: new Date()
    };
    setNotes([newNote, ...notes]);
  };

  const handleDeleteNote = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
  };

  // View Routing
  const renderView = () => {
    switch (view) {
      case AppView.SIGN_IN:
        return <SignInView onSignIn={handleSignIn} onNavigateToSignUp={() => setView(AppView.SIGN_UP)} isLoading={isLoadingAuth} />;
      case AppView.SIGN_UP:
        return <SignUpView onSignUp={handleSignUp} onNavigateToSignIn={() => setView(AppView.SIGN_IN)} isLoading={isLoadingAuth} />;
      case AppView.ONBOARDING:
        return <OnboardingView userProfile={userProfile} setUserProfile={setUserProfile} onComplete={handleOnboardingComplete} />;
      case AppView.DASHBOARD:
        return <DashboardView 
          userProfile={userProfile} 
          dailyLog={dailyLog} 
          onLogout={handleLogout} 
          onScanClick={() => setView(AppView.SCANNER)} 
          onSearchClick={() => setView(AppView.SEARCH)}
          onResetDay={handleResetDay}
        />;
      case AppView.SCANNER:
        return <ScannerView onImageAnalyze={handleImageAnalysis} isAnalyzing={isAnalyzing} />;
      case AppView.SEARCH:
        return <SearchView onSearch={handleTextSearch} isAnalyzing={isAnalyzing} />;
      case AppView.RECIPE:
        return <RecipeView onAnalyze={handleRecipeAnalysis} isAnalyzing={isAnalyzing} />;
      case AppView.NOTES:
        return <NotesView notes={notes} onAddNote={handleAddNote} onDeleteNote={handleDeleteNote} />;
      default:
        return <DashboardView 
          userProfile={userProfile} 
          dailyLog={dailyLog} 
          onLogout={handleLogout} 
          onScanClick={() => setView(AppView.SCANNER)} 
          onSearchClick={() => setView(AppView.SEARCH)}
          onResetDay={handleResetDay}
        />;
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 relative shadow-2xl overflow-hidden pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      {renderView()}

      {currentResult && (
        <ResultCard 
          result={currentResult} 
          onSave={saveMeal} 
          onDiscard={() => { setCurrentResult(null); setCapturedImage(null); }}
          imageUri={capturedImage}
        />
      )}

      {/* Bottom Navigation */}
      {view !== AppView.SIGN_IN && view !== AppView.SIGN_UP && view !== AppView.ONBOARDING && (
        <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-slate-100 flex justify-around items-center px-2 py-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] z-40">
          {NAV_ITEMS.map((item) => {
            const isActive = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all duration-300 ${
                  isActive ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
                } ${item.isAction ? 'mb-8' : ''}`}
              >
                {item.isAction ? (
                  <div className="w-14 h-14 bg-slate-900 rounded-full flex items-center justify-center shadow-lg shadow-slate-300 transform transition-transform active:scale-90">
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                ) : (
                  <>
                    <item.icon className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </>
                )}
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}