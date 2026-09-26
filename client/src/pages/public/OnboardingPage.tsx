import { useState } from 'react';
import { useAuth } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, ShoppingBag, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import Logo from '../../components/Logo';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

type HRERole = 'SEEKER' | 'PROVIDER' | 'BOTH';

interface FormData {
  businessName: string;
  businessType: string;
  location: string;
  contactPhone: string;
}

export default function OnboardingPage() {
  const { isSignedIn, getToken } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<HRERole | null>(null);
  const [formData, setFormData] = useState<FormData>({
    businessName: '',
    businessType: '',
    location: '',
    contactPhone: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  if (!isSignedIn) {
    navigate('/login');
    return null;
  }

  const handleRoleSelect = (role: HRERole) => {
    setSelectedRole(role);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRole) {
      toast.error('Please select your role');
      return;
    }

    if (!formData.businessName || !formData.businessType || !formData.location) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const token = await getToken();
      const response = await axios.post(
        `${API_BASE}/auth/onboarding`,
        {
          hreRole: selectedRole,
          ...formData,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success('Onboarding completed successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Onboarding error:', error);
      toast.error(error.response?.data?.error || 'Onboarding failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-slate-200">
        <div className="container-wide py-4">
          <Logo />
        </div>
      </div>

      {/* Main Content */}
      <div className="container-wide py-12">
        <div className="max-w-2xl mx-auto">
          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-slate-900 mb-3">
              Welcome to HRE
            </h1>
            <p className="text-lg text-slate-600">
              Let's set up your profile to get started
            </p>
          </div>

          {/* Role Selection */}
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">
              How will you use HRE?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Seeker Option */}
              <button
                onClick={() => handleRoleSelect('SEEKER')}
                className={`p-6 rounded-xl border-2 transition-all text-left ${
                  selectedRole === 'SEEKER'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <ShoppingBag className={`mb-3 ${selectedRole === 'SEEKER' ? 'text-blue-600' : 'text-slate-400'}`} size={24} />
                <h3 className="font-semibold text-slate-900 mb-2">I'm Looking for Resources</h3>
                <p className="text-sm text-slate-600">
                  Browse and book resources from verified providers
                </p>
                {selectedRole === 'SEEKER' && (
                  <CheckCircle2 className="mt-3 text-blue-600" size={20} />
                )}
              </button>

              {/* Provider Option */}
              <button
                onClick={() => handleRoleSelect('PROVIDER')}
                className={`p-6 rounded-xl border-2 transition-all text-left ${
                  selectedRole === 'PROVIDER'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <Building2 className={`mb-3 ${selectedRole === 'PROVIDER' ? 'text-blue-600' : 'text-slate-400'}`} size={24} />
                <h3 className="font-semibold text-slate-900 mb-2">I Provide Resources</h3>
                <p className="text-sm text-slate-600">
                  List your resources and connect with buyers
                </p>
                {selectedRole === 'PROVIDER' && (
                  <CheckCircle2 className="mt-3 text-blue-600" size={20} />
                )}
              </button>

              {/* Both Option */}
              <button
                onClick={() => handleRoleSelect('BOTH')}
                className={`p-6 rounded-xl border-2 transition-all text-left ${
                  selectedRole === 'BOTH'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <CheckCircle2 className={`mb-3 ${selectedRole === 'BOTH' ? 'text-blue-600' : 'text-slate-400'}`} size={24} />
                <h3 className="font-semibold text-slate-900 mb-2">Both</h3>
                <p className="text-sm text-slate-600">
                  Do both - buy and sell resources
                </p>
                {selectedRole === 'BOTH' && (
                  <CheckCircle2 className="mt-3 text-blue-600" size={20} />
                )}
              </button>
            </div>
          </div>

          {/* Business Information Form */}
          {selectedRole && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  placeholder="Enter your business name"
                  className="input-field w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Business Type *
                </label>
                <select
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleInputChange}
                  className="input-field w-full"
                  required
                >
                  <option value="">Select a business type</option>
                  <option value="Hotel">Hotel</option>
                  <option value="Restaurant">Restaurant</option>
                  <option value="Event Venue">Event Venue</option>
                  <option value="Catering">Catering</option>
                  <option value="Travel">Travel</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Enter your city/region"
                  className="input-field w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleInputChange}
                  placeholder="Enter your contact phone"
                  className="input-field w-full"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? 'Setting up...' : 'Complete Onboarding'}
                {!isLoading && <ArrowRight size={18} />}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
