import { useRestDayStore } from '../../store/restDayStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../lib/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({ data: { dates: [] } }),
    post: jest.fn().mockResolvedValue({ data: { dates: [] } }),
    delete: jest.fn().mockResolvedValue({ data: { dates: [] } }),
  },
  setUnauthorizedHandler: jest.fn(),
}));

describe('restDayStore', () => {
  beforeEach(() => {
    useRestDayStore.setState({ restDays: [], loaded: true });
    jest.clearAllMocks();
  });

  it('fetchRestDays는 서버의 dates 배열을 상태에 반영한다', async () => {
    const apiClient = require('../../lib/apiClient').default;
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { dates: ['2026-06-10', '2026-06-12'] },
    });

    await useRestDayStore.getState().fetchRestDays();

    expect(useRestDayStore.getState().restDays).toEqual([
      '2026-06-10',
      '2026-06-12',
    ]);
  });

  // 낙관적 업데이트: 서버 응답을 기다리지 않고 즉시 로컬에 반영되어야 한다.
  it('toggleRestDay는 지정 시 즉시 추가하고 POST를 호출한다', async () => {
    const apiClient = require('../../lib/apiClient').default;

    await useRestDayStore.getState().toggleRestDay('2026-06-14');

    expect(useRestDayStore.getState().restDays).toContain('2026-06-14');
    expect(apiClient.post).toHaveBeenCalledWith('/rest-days', {
      date: '2026-06-14',
    });
  });

  it('toggleRestDay는 이미 지정된 날이면 해제하고 DELETE를 호출한다', async () => {
    const apiClient = require('../../lib/apiClient').default;
    useRestDayStore.setState({ restDays: ['2026-06-14'], loaded: true });

    await useRestDayStore.getState().toggleRestDay('2026-06-14');

    expect(useRestDayStore.getState().restDays).not.toContain('2026-06-14');
    expect(apiClient.delete).toHaveBeenCalledWith('/rest-days/2026-06-14');
  });

  // 서버 실패 시 fetchRestDays로 롤백되어야 한다.
  it('toggleRestDay 서버 실패 시 서버 상태로 롤백한다', async () => {
    const apiClient = require('../../lib/apiClient').default;
    (apiClient.post as jest.Mock).mockRejectedValueOnce(new Error('network'));
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { dates: [] } });

    await useRestDayStore.getState().toggleRestDay('2026-06-14');

    expect(apiClient.get).toHaveBeenCalled();
    expect(useRestDayStore.getState().restDays).toEqual([]);
  });
});
