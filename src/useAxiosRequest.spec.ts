import Axios from 'axios';
import { renderHook, act } from '@testing-library/react-hooks';
import {
  useAxiosRequest,
  Cache,
  CacheRequests,
  warmupCache,
  CachePolicy,
} from './useAxiosRequest';

afterEach(() => {
  jest.clearAllMocks();
  Cache.clear();
  CacheRequests.clear();
});

const initialConfig = {
  url: 'https://github.com',
  method: 'GET',
};

const newConfig = {
  url: 'https://google.com',
  method: 'GET',
};

// const longConfig = {
//   url: 'https://long.com',
//   method: 'GET',
//   delay: 100,
// };

const errorConfig = {
  error: true,
};

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

describe('useAxiosRequest', () => {
  it('does nothing without init config', () => {
    const { result } = renderHook(useAxiosRequest);
    expect(result.current.data).toEqual(undefined);
    expect(result.current.isFetching).toEqual(false);
    expect(result.current.error).toEqual(null);
    expect(result.current.requestId).toEqual(1);
  });

  it('changes isFetching flag', async () => {
    const { result, waitForNextUpdate } = renderHook(useAxiosRequest, {
      initialProps: initialConfig,
    });
    expect(result.current.isFetching).toBe(true);
    await waitForNextUpdate();
    expect(result.current.isFetching).toBe(false);
  });

  it('returns response in data object', async () => {
    const { result, waitForNextUpdate } = renderHook(useAxiosRequest, {
      initialProps: initialConfig,
    });
    await waitForNextUpdate();
    expect(result.current.data).toBe(initialConfig.url);
  });

  it('sends request with the same config on refresh()', async () => {
    const { result, waitForNextUpdate } = renderHook(useAxiosRequest, {
      initialProps: initialConfig,
    });
    expect(result.current.requestId).toBe(1);
    expect(result.current.isFetching).toBe(true);

    await waitForNextUpdate();

    act(() => {
      result.current.refresh();
    });

    expect(result.current.requestId).toBe(2);
    expect(result.current.isFetching).toBe(true);

    await waitForNextUpdate();

    expect(Axios).toHaveBeenCalledTimes(2);
  });

  it('updates config manually with update()', async () => {
    const { result, waitForNextUpdate } = renderHook(useAxiosRequest, {
      initialProps: initialConfig,
    });

    await waitForNextUpdate();
    expect(result.current.data).toEqual(initialConfig.url);

    act(() => {
      result.current.update(newConfig);
    });

    await waitForNextUpdate();
    expect(result.current.data).toEqual(newConfig.url);

    expect(Axios).toHaveBeenCalledTimes(2);
  });

  it('updates config on rerender', async () => {
    const { result, rerender, waitForNextUpdate } = renderHook(
      useAxiosRequest,
      {
        initialProps: initialConfig,
      }
    );

    expect(result.current.isFetching).toBe(true);
    expect(result.current.requestId).toBe(1);

    await waitForNextUpdate();

    expect(result.current.data).toEqual(initialConfig.url);
    expect(result.current.isFetching).toBe(false);

    rerender(newConfig);

    expect(result.current.isFetching).toBe(true);
    expect(result.current.requestId).toBe(1);

    await waitForNextUpdate();

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBe(newConfig.url);
  });

  it('returns errors', async () => {
    const { result, waitForNextUpdate } = renderHook(useAxiosRequest, {
      initialProps: errorConfig,
    });

    await waitForNextUpdate();
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error.message).toBe('Error message');
  });

  it('recovers from error', async () => {
    const { result, waitForNextUpdate, rerender } = renderHook(
      useAxiosRequest,
      {
        initialProps: errorConfig,
      }
    );

    await waitForNextUpdate();
    rerender(initialConfig);

    await waitForNextUpdate();
    expect(result.current.error).toBe(null);
    expect(result.current.data).toBe(initialConfig.url);
  });

  it('calls onSuccess callback', async () => {
    const onSuccess = jest.fn();
    const { waitForNextUpdate } = renderHook(
      config =>
        useAxiosRequest(config, {
          onSuccess,
        }),
      {
        initialProps: initialConfig,
      }
    );

    await waitForNextUpdate();
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith(initialConfig.url);
  });

  [
    { policy: CachePolicy.CacheFirst, calledTimes: 2 },
    { policy: CachePolicy.CacheAndNetwork, calledTimes: 3 },
  ].forEach(({ policy, calledTimes }) => {
    it(`returns data from cache if cache is ${policy} and make the proper number of requests`, async () => {
      const { rerender, waitForNextUpdate } = renderHook(
        config => useAxiosRequest(config, { cache: policy }),
        {
          initialProps: initialConfig,
        }
      );

      await waitForNextUpdate();
      rerender(newConfig);

      await waitForNextUpdate();
      rerender(initialConfig);

      expect(Axios).toHaveBeenCalledTimes(calledTimes);
    });
  });

  [CachePolicy.CacheFirst, CachePolicy.CacheAndNetwork].forEach(policy => {
    it(`reuses pending request if cache is ${policy}`, async () => {
      const hook1 = renderHook(
        config => useAxiosRequest(config, { cache: policy }),
        {
          initialProps: initialConfig,
        }
      );

      const hook2 = renderHook(
        config => useAxiosRequest(config, { cache: policy }),
        {
          initialProps: initialConfig,
        }
      );

      await hook1.waitForNextUpdate();
      await wait(0);

      expect(Axios).toHaveBeenCalledTimes(1);
    });
  });

  it('reuses cache if it has been warmed up', async () => {
    warmupCache(initialConfig);

    expect(Axios).toHaveBeenCalledTimes(1);
    await Axios.mock.results[0].value;

    renderHook(
      config => useAxiosRequest(config, { cache: CachePolicy.CacheFirst }),
      {
        initialProps: initialConfig,
      }
    );

    expect(Axios).toHaveBeenCalledTimes(1);
  });

  it('reuses pending request if cache is warming up', () => {
    warmupCache(initialConfig);

    expect(Axios).toHaveBeenCalledTimes(1);

    renderHook(
      config => useAxiosRequest(config, { cache: CachePolicy.CacheFirst }),
      {
        initialProps: initialConfig,
      }
    );

    expect(Axios).toHaveBeenCalledTimes(1);
  });

  ['mounted', 'unmounted'].forEach(v => {
    const isUnmounted = v === 'unmounted';
    it(`${isUnmounted ? 'not ' : ''}call cb if component is ${v}`, async () => {
      const wrapper = ({ children }) => children;
      const onSuccess = jest.fn();
      const { unmount } = await renderHook(
        config =>
          useAxiosRequest(config, { onSuccess, cache: CachePolicy.CacheFirst }),
        {
          initialProps: { ...initialConfig, delay: 10 },
          wrapper,
        }
      );

      await wait(0);
      if (isUnmounted) {
        unmount();
      }
      await wait(20);

      expect(onSuccess).toHaveBeenCalledTimes(isUnmounted ? 0 : 1);
    });
  });
});
