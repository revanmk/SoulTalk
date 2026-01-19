import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { COUNTRIES } from '../constants';

const Login: React.FC = () => {
  const { login, signup, isLoading } = useAuth();
  const [isLoginView, setIsLoginView] = useState(true);
  
  // Login Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Signup Additional Fields
  const [name, setName] = useState('');
  const [country, setCountry] = useState(COUNTRIES[0].name);
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyNumber, setEmergencyNumber] = useState('');
  const [profilePic, setProfilePic] = useState<string | undefined>(undefined);
  
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { // 500KB limit
        setError('Image size too large. Max 500KB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    if (!isLoginView) {
      if (!name || !country || !emergencyName || !emergencyNumber) {
        setError('Please fill in all required profile fields');
        return;
      }
    }

    let success = false;
    if (isLoginView) {
      success = await login(email, password);
    } else {
      success = await signup(email, password, name, country, emergencyName, emergencyNumber, profilePic);
    }

    if (!success) {
      setError(isLoginView ? 'Invalid email or password' : 'User already exists');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 md:p-10 border border-slate-100 my-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg shadow-indigo-200 overflow-hidden">
             {profilePic ? <img src={profilePic} alt="Profile" className="w-full h-full object-cover" /> : 'ST'}
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            {isLoginView ? 'Welcome Back' : 'Join SoulTalk'}
          </h1>
          <p className="text-slate-500">Your safe space to talk, feel, and heal.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Extended Fields for Signup */}
          {!isLoginView && (
            <div className="space-y-4 animate-pop-in">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="What should we call you?"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Profile Picture (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-slate-50 focus:bg-white"
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Used to provide local helpline numbers.</p>
              </div>

              <div className="bg-rose-50 p-3 rounded-xl border border-rose-100">
                <p className="text-xs font-semibold text-rose-700 mb-2">Emergency Contact</p>
                <div className="space-y-3">
                   <input
                    type="text"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder="Contact Name (e.g. Mom, Best Friend)"
                    className="w-full px-3 py-2 rounded-lg border border-rose-200 focus:border-rose-500 outline-none text-sm"
                  />
                  <input
                    type="tel"
                    value={emergencyNumber}
                    onChange={(e) => setEmergencyNumber(e.target.value)}
                    placeholder="Contact Phone Number"
                    className="w-full px-3 py-2 rounded-lg border border-rose-200 focus:border-rose-500 outline-none text-sm"
                  />
                </div>
                <p className="text-[10px] text-rose-500 mt-2">We will notify this person only if a severe crisis is detected.</p>
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-slate-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-slate-50 focus:bg-white"
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100 text-center">
              {error}
            </div>
          )}

          <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 text-xs text-amber-800 leading-relaxed">
            <span className="font-bold block mb-1">Safety Notice:</span>
            I am an AI assistant. I cannot provide medical advice. 
            Conversations may be monitored for safety purposes.
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-xl transform hover:-translate-y-0.5 flex justify-center items-center"
          >
            {isLoading ? (
               <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
               isLoginView ? 'Log In' : 'Join Now'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLoginView(!isLoginView);
              setError('');
            }}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            {isLoginView ? "Don't have an account? Sign up" : "Already have an account? Log in"}
          </button>
        </div>

        <div className="mt-8 text-center text-xs text-slate-400">
          <p>By continuing, you agree to our Terms of Service.</p>
          <p className="mt-1">In crisis? Call 988 (US) or 111 (UK).</p>
        </div>
      </div>
    </div>
  );
};

export default Login;