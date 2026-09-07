/**
 * apiClient 가 스토어를 import 하지 않고 콜백으로 상태를 받는 구조를 지킨다.
 *
 * 이 두 동작은 운동 중 401 을 실제로 만들어야 재현되는데 시뮬레이터에서
 * 만들기 어렵다. 인터셉터의 rejected 핸들러를 직접 불러 확인한다.
 */
import apiClient, {
  ApiError,
  setUnauthorizedHandler,
  setDeferAuthRefreshCheck,
  setTokenRefreshedHandler,
} from '../../lib/apiClient';

jest.mock('../../lib/secureStorage', () => ({
  secureStorage: {
    getToken: jest.fn().mockResolvedValue('old-token'),
    setToken: jest.fn().mockResolvedValue(undefined),
    removeToken: jest.fn().mockResolvedValue(undefined),
  },
}));

/** 인터셉터의 에러 핸들러 (axios 내부 핸들러 배열에서 꺼낸다) */
const rejectedHandler = () =>
  (apiClient.interceptors.response as any).handlers[0].rejected;

const make401 = () => ({
  response: { status: 401, data: {} },
  config: { url: '/workout', headers: {} as Record<string, string> },
  message: 'Request failed',
});

describe('apiClient — 스토어 의존을 콜백으로 역전', () => {
  beforeEach(() => {
    // apiClient 는 실패한 요청을 console.error 로 남긴다. 의도한 실패라 가린다.
    jest.spyOn(console, 'error').mockImplementation(() => {});
    setUnauthorizedHandler(() => {});
    setDeferAuthRefreshCheck(() => false);
    setTokenRefreshedHandler(() => {});
    jest.restoreAllMocks();
  });

  it('운동 세션 중이면 401 갱신을 미룬다 — refresh 를 부르지 않는다', async () => {
    const post = jest.spyOn(apiClient, 'post');
    setDeferAuthRefreshCheck(() => true); // 진행 중인 세션이 있다

    await expect(rejectedHandler()(make401())).rejects.toBeInstanceOf(ApiError);
    expect(post).not.toHaveBeenCalled(); // /auth/refresh 로 가지 않았다
  });

  it('세션이 없으면 갱신하고 새 토큰을 콜백으로 알린다', async () => {
    jest
      .spyOn(apiClient, 'post')
      .mockResolvedValue({ data: { access_token: 'new-token' } } as any);
    // 갱신 후 원 요청 재시도는 여기서 관심사가 아니다
    const retry = jest.fn().mockResolvedValue({ data: 'ok' });
    (apiClient as any).request = retry;

    const onRefreshed = jest.fn();
    setTokenRefreshedHandler(onRefreshed);

    await rejectedHandler()(make401()).catch(() => {});

    expect(onRefreshed).toHaveBeenCalledWith('new-token');
  });

  it('콜백이 등록되지 않아도 안전하다 — 미등록 = 미루지 않음', async () => {
    setDeferAuthRefreshCheck(undefined as any);
    const post = jest
      .spyOn(apiClient, 'post')
      .mockRejectedValue(new Error('refresh 실패'));

    await expect(rejectedHandler()(make401())).rejects.toBeInstanceOf(ApiError);
    // 미루지 않았으므로 갱신을 시도했다
    expect(post).toHaveBeenCalled();
  });

  it('401 이 아닌 응답은 그대로 ApiError 로 넘긴다', async () => {
    const e = { response: { status: 404, data: {} }, config: { url: '/x' }, message: 'nf' };
    await expect(rejectedHandler()(e)).rejects.toMatchObject({ status: 404 });
  });
});
