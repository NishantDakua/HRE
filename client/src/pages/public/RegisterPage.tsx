import { SignUp } from '@clerk/react';
import Logo from '../../components/Logo';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <Logo inverted={false} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Create Account</h1>
          <p className="mt-2 text-slate-600">Join HRE - The Hospitality Marketplace</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm ring-1 ring-slate-200 p-6">
          <SignUp
            afterSignUpUrl="/onboarding"
            signInUrl="/login"
          />
        </div>
      </div>
    </div>
  );
}
