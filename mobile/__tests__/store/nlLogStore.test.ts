import { act, renderHook } from '@testing-library/react-native';
import { useNLLogStore } from '../../store/nlLogStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

const mockPost = jest.fn();
jest.mock('../../lib/apiClient', () => ({
  __esModule: true,
  default: { post: (...a: any[]) => mockPost(...a) },
  setUnauthorizedHandler: jest.fn(),
}));

// fetchSessions는 no-op으로 (저장 후 갱신 호출만 확인)
const mockFetchSessions = jest.fn();
jest.mock('../../store/workoutStore', () => ({
  useWorkoutStore: { getState: () => ({ fetchSessions: mockFetchSessions }) },
}));

const post = mockPost;
const fetchSessions = mockFetchSessions;

beforeEach(() => {
  post.mockReset();
  fetchSessions.mockReset();
  useNLLogStore.getState().clearResult();
});

describe('nlLogStore.quickLog', () => {
  it('saved 응답이면 결과/undoIds 저장 + fetchSessions 호출', async () => {
    post.mockResolvedValue({
      data: {
        status: 'saved',
        sessionId: 'sess-1',
        saved: [{ id: 'ex-1', name: '벤치프레스', category: '가슴', setCount: 5, source: 'nl' }],
        unmatched: [],
        undoIds: ['ex-1'],
      },
    });
    const { result } = renderHook(() => useNLLogStore());
    await act(async () => {
      await result.current.quickLog('벤치 60 5x5');
    });
    expect(result.current.saved).toHaveLength(1);
    expect(result.current.undoIds).toEqual(['ex-1']);
    expect(result.current.resultAt).not.toBeNull();
    expect(fetchSessions).toHaveBeenCalled();
  });

  it('needs_clarification이면 결과 저장 안 함', async () => {
    post.mockResolvedValue({ data: { status: 'needs_clarification', question: '뭐 하셨어요?' } });
    const { result } = renderHook(() => useNLLogStore());
    let res: any;
    await act(async () => {
      res = await result.current.quickLog('운동함');
    });
    expect(res.status).toBe('needs_clarification');
    expect(result.current.resultAt).toBeNull();
    expect(fetchSessions).not.toHaveBeenCalled();
  });
});

describe('nlLogStore.undo / addManual', () => {
  it('undo는 undoIds로 삭제 요청 후 결과 클리어', async () => {
    post.mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useNLLogStore());
    act(() => {
      useNLLogStore.setState({ undoIds: ['ex-1', 'ex-2'], resultAt: Date.now() });
    });
    await act(async () => {
      await result.current.undo();
    });
    expect(post).toHaveBeenCalledWith('/workout-logs/undo', { ids: ['ex-1', 'ex-2'] });
    expect(result.current.resultAt).toBeNull();
  });

  it('addManual은 manual 엔드포인트로 저장하고 결과 반영', async () => {
    post.mockResolvedValue({
      data: { sessionId: 'sess-1', saved: [{ id: 'ex-9', name: '스쿼트', category: '하체', setCount: 1, source: 'manual' }], undoIds: ['ex-9'] },
    });
    const { result } = renderHook(() => useNLLogStore());
    let saved: any;
    await act(async () => {
      saved = await result.current.addManual(
        [{ name: '스쿼트', category: '하체', sets: [{ weight: 100, reps: 8, unit: 'kg', completed: true }] }],
        'sess-1',
      );
    });
    expect(post).toHaveBeenCalledWith('/workout-logs/manual', expect.objectContaining({ sessionId: 'sess-1' }));
    expect(saved).toHaveLength(1);
    expect(result.current.undoIds).toEqual(['ex-9']);
    expect(fetchSessions).toHaveBeenCalled();
  });
});
