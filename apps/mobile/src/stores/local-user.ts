import { useAuthStore } from './authStore';

export const LOCAL_USER_ID = '00000000-0000-4000-8000-000000000001';

export function getCurrentUserId(): string {
  return useAuthStore.getState().user?.id ?? LOCAL_USER_ID;
}
