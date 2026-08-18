import { useState } from 'react';

export const storageKeys = {
  votes: 'civic-feed:votes',
  saved: 'civic-feed:saved',
  followed: 'civic-feed:followed',
  reminders: 'civic-feed:reminders',
  reposted: 'civic-feed:reposted',
  userPosts: 'civic-feed:user-posts',
  localComments: 'civic-feed:local-comments',
  sourceReports: 'civic-feed:source-reports',
  onboardingDismissed: 'civic-feed:onboarding-dismissed'
};

export function readStoredValue(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStoredValue(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local storage can be unavailable in private or restricted browser contexts.
  }
}

export function removeStoredValues(keys = Object.values(storageKeys)) {
  keys.forEach((key) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // In-memory state can still be reset even when localStorage is unavailable.
    }
  });
}

export function useStoredState(key, fallback) {
  const [value, setValue] = useState(() => readStoredValue(key, fallback));

  function setStoredValue(updater) {
    setValue((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      writeStoredValue(key, next);
      return next;
    });
  }

  return [value, setStoredValue];
}

export function useStoredSet(key, fallback) {
  const [value, setValue] = useState(() => new Set(readStoredValue(key, fallback)));

  function setStoredValue(updater) {
    setValue((current) => {
      const nextValue = typeof updater === 'function' ? updater(new Set(current)) : updater;
      const next = nextValue instanceof Set ? nextValue : new Set(nextValue);
      writeStoredValue(key, Array.from(next));
      return next;
    });
  }

  return [value, setStoredValue];
}
