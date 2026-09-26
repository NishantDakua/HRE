import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/react';
import { authApi } from '../services/api';

export function useHREUser() {
  const { isSignedIn } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['hre-user'],
    queryFn: () => authApi.getCurrentUser().then(res => res.data.user),
    enabled: isSignedIn,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    user: data,
    isLoading,
    isOnboarded: data?.onboardingComplete ?? false,
    error,
  };
}
