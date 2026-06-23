import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const SESSION_KEY = '@puzzle_app_session_id';

// Generate or retrieve session ID
export const getSessionId = async (): Promise<string> => {
  try {
    let sessionId = await AsyncStorage.getItem(SESSION_KEY);
    
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      await AsyncStorage.setItem(SESSION_KEY, sessionId);
    }
    
    return sessionId;
  } catch {
    return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
};

// Track analytics event
export const trackEvent = async (
  eventType: string,
  eventData: Record<string, any> = {}
): Promise<void> => {
  try {
    const sessionId = await getSessionId();
    
    await fetch(`${BACKEND_URL}/api/analytics/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_type: eventType,
        event_data: {
          ...eventData,
          timestamp: new Date().toISOString(),
        },
        session_id: sessionId,
        device_type: Platform.OS,
      }),
    });
  } catch {
    // Fail silently - backend may not be running
  }
};

// Helper functions for common events
export const Analytics = {
  // App lifecycle
  appOpened: () => trackEvent('app_opened'),
  sessionStart: () => trackEvent('session_start'),
  sessionEnd: (duration: number) => trackEvent('session_end', { duration_seconds: duration }),

  // Puzzle gameplay
  puzzleStarted: (puzzleId: string, difficulty: string, pieces: number) =>
    trackEvent('puzzle_started', { puzzle_id: puzzleId, difficulty, pieces }),
  
  puzzleCompleted: (puzzleId: string, difficulty: string, timeSeconds: number, moves: number, score: number) =>
    trackEvent('puzzle_completed', { 
      puzzle_id: puzzleId, 
      difficulty, 
      time_seconds: timeSeconds, 
      moves, 
      score 
    }),
  
  puzzleAbandoned: (puzzleId: string, difficulty: string, timeSpent: number) =>
    trackEvent('puzzle_abandoned', { puzzle_id: puzzleId, difficulty, time_spent_seconds: timeSpent }),

  // Feature usage
  hintUsed: (puzzleId: string, difficulty: string) =>
    trackEvent('hint_used', { puzzle_id: puzzleId, difficulty }),
  
  pieceSwapped: (puzzleId: string, difficulty: string) =>
    trackEvent('piece_swapped', { puzzle_id: puzzleId, difficulty }),
  
  difficultySelected: (difficulty: string, pieces: number) =>
    trackEvent('difficulty_selected', { difficulty, pieces }),

  // Admin actions
  puzzleUploaded: (imageSize: number) =>
    trackEvent('puzzle_uploaded', { image_size_bytes: imageSize }),
  
  puzzleDeleted: (puzzleId: string) =>
    trackEvent('puzzle_deleted', { puzzle_id: puzzleId }),

  // UI interactions
  scoreboardViewed: (puzzleId: string, difficulty: string) =>
    trackEvent('scoreboard_viewed', { puzzle_id: puzzleId, difficulty }),
  
  navigationAction: (from: string, to: string) =>
    trackEvent('navigation', { from_screen: from, to_screen: to }),
};
