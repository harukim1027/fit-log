/**
 * @file store/nlLogStore.ts
 * @description NL 빠른 기록 / 수동 입력 전역 상태.
 *
 * 백엔드 코어(addNamedExercisesToSession)에 대응하는 클라이언트 진입로.
 * 저장 직후 workoutStore.fetchSessions()로 "오늘 운동" 목록을 갱신해 즉시 반영한다.
 *
 * Undo는 서버 토큰/만료 개념이 없으므로, undoIds 배열을 들고 있다가
 * 배너가 떠 있는 5초 동안만 노출(클라이언트측 만료)한다.
 */
import { create } from 'zustand';
import apiClient from '../lib/apiClient';
import { useWorkoutStore } from './workoutStore';
import { logger } from '../lib/logger';
import {
  NLQuickResult,
  NamedExercisePayload,
  SavedExerciseDto,
  UnmatchedExercise,
} from '../types/exercise';

/** 배너 노출 시간 = Undo 가능 시간 (ms) */
export const UNDO_WINDOW_MS = 5000;

interface NLLogStore {
  loading: boolean;
  // 마지막 저장 결과 (배너 표시용). null이면 배너 숨김.
  sessionId: string | null;
  saved: SavedExerciseDto[];
  unmatched: UnmatchedExercise[];
  undoIds: string[];
  resultAt: number | null; // 저장 시각 (배너 자동 숨김 기준)

  /** 자연어 → 즉시 저장. needs_clarification이면 저장 없이 질문 반환. */
  quickLog: (text: string) => Promise<NLQuickResult>;
  /** 수동/unmatched 매칭 저장. sessionId 있으면 그 세션에 누적. */
  addManual: (
    exercises: NamedExercisePayload[],
    sessionId?: string,
  ) => Promise<SavedExerciseDto[]>;
  /** 방금 저장 되돌리기 */
  undo: () => Promise<void>;
  clearResult: () => void;
}

export const useNLLogStore = create<NLLogStore>((set, get) => ({
  loading: false,
  sessionId: null,
  saved: [],
  unmatched: [],
  undoIds: [],
  resultAt: null,

  quickLog: async (text) => {
    set({ loading: true });
    try {
      const res = await apiClient.post<NLQuickResult>('/workout-logs/quick', {
        text,
      });
      const data = res.data;
      if (data.status === 'saved') {
        set({
          sessionId: data.sessionId ?? null,
          saved: data.saved ?? [],
          unmatched: data.unmatched ?? [],
          undoIds: data.undoIds ?? [],
          resultAt: Date.now(),
        });
        // 저장된 오늘 세션을 히스토리에 즉시 반영
        useWorkoutStore.getState().fetchSessions();
      }
      return data;
    } catch (e) {
      logger.error(
        'NL 빠른 기록 실패',
        e instanceof Error ? e : new Error(String(e)),
      );
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  addManual: async (exercises, sessionId) => {
    const res = await apiClient.post<{
      saved?: SavedExerciseDto[];
      sessionId?: string;
      undoIds?: string[];
    }>('/workout-logs/manual', { exercises, sessionId: sessionId ?? undefined });
    const saved = res.data.saved ?? [];
    // 수동 저장도 배너로 되돌리기 제공 + 오늘 목록 갱신
    set({
      sessionId: res.data.sessionId ?? sessionId ?? null,
      saved,
      unmatched: [],
      undoIds: res.data.undoIds ?? [],
      resultAt: Date.now(),
    });
    useWorkoutStore.getState().fetchSessions();
    return saved;
  },

  undo: async () => {
    const ids = get().undoIds;
    if (!ids.length) {
      get().clearResult();
      return;
    }
    try {
      await apiClient.post('/workout-logs/undo', { ids });
      useWorkoutStore.getState().fetchSessions();
    } catch (e) {
      logger.error(
        'NL 되돌리기 실패',
        e instanceof Error ? e : new Error(String(e)),
      );
    } finally {
      get().clearResult();
    }
  },

  clearResult: () =>
    set({
      sessionId: null,
      saved: [],
      unmatched: [],
      undoIds: [],
      resultAt: null,
    }),
}));
