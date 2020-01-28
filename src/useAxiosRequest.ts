import { useReducer, useEffect, useCallback, ReactNode, useMemo } from 'react';
import * as ReactDOM from 'react-dom';
import Axios, {
  AxiosRequestConfig,
  AxiosError,
  AxiosResponse,
  AxiosPromise,
} from 'axios';
import buildURL from 'axios/lib/helpers/buildURL';

export const Cache = new Map<string, AxiosResponse['data']>();
export const CacheRequests = new Map<string, AxiosPromise>();

// if (process.env.NODE_ENV === 'development') {
//   window.__axiosRequestCache = Cache;
//   window.__axiosRequestRequestsCache = CacheRequests;
// }

type ConfigType = AxiosRequestConfig | string;
type NullableConfigType = ConfigType | null | void;

type State<D> = {
  config: NullableConfigType;
  data: D;
  prevConfig: NullableConfigType;
  isFetching: boolean;
  error: Error | null;
  requestId: number;
};

function init<D>({
  config,
  cacheKey,
  data,
  prevConfig,
  cachePolicy,
}: {
  config: NullableConfigType;
  cacheKey: string | null;
  data: D;
  prevConfig: NullableConfigType;
  cachePolicy: CachePolicy;
}): State<D> {
  const hasCache = typeof cacheKey === 'string' && Cache.has(cacheKey);

  return {
    data: cacheKey && hasCache ? Cache.get(cacheKey) : data,
    isFetching:
      config != null &&
      (!hasCache || (hasCache && cachePolicy === CachePolicy.CacheAndNetwork)),
    config,
    error: null,
    requestId: 1,
    prevConfig,
  };
}

type Action<D> =
  | {
      type: 'manually set config';
      payload: {
        config: NullableConfigType;
        cacheKey: string | null;
        cachePolicy: CachePolicy;
      };
    }
  | {
      type: 'config changed';
      payload: {
        config: NullableConfigType;
        cacheKey: string | null;
        cachePolicy: CachePolicy;
      };
    }
  | {
      type: 'poll';
    }
  | {
      type: 'fetched';
      payload: D;
    }
  | {
      type: 'error';
      payload: AxiosError;
    };

function reducer<D>(state: State<D>, action: Action<D>): State<D> {
  switch (action.type) {
    case 'manually set config': {
      const { config, cacheKey, cachePolicy } = action.payload;

      if (config === state.config) {
        return state;
      }

      return init({
        config,
        cacheKey,
        prevConfig: state.prevConfig,
        data: state.data,
        cachePolicy,
      });
    }
    case 'config changed': {
      const { config, cacheKey, cachePolicy } = action.payload;

      if (config === state.prevConfig) {
        return state;
      }

      return init({
        config,
        cacheKey,
        prevConfig: config,
        data: state.data,
        cachePolicy,
      });
    }
    case 'poll':
      return {
        config: state.config,
        data: state.data,
        prevConfig: state.prevConfig,

        isFetching: true,
        error: null,
        requestId: state.requestId + 1,
      };
    case 'fetched':
      return {
        config: state.config,
        prevConfig: state.prevConfig,
        requestId: state.requestId,

        data: action.payload,
        isFetching: false,
        error: null,
      };
    case 'error':
      return {
        config: state.config,
        prevConfig: state.prevConfig,
        requestId: state.requestId,
        data: state.data,

        isFetching: false,
        error: action.payload,
      };
    default:
      return state;
  }
}

export enum CachePolicy {
  NoCache = 'no-cache',
  CacheFirst = 'cache-first',
  CacheAndNetwork = 'cache-and-network',
}

type UseAxiosRequestOptionsType<D> = {
  pollInterval?: number;
  cache?: CachePolicy;
  onSuccess?: (data: D) => void;
  onError?: (error: AxiosError) => void;
};

type UseAxiosRequestReturnType<D> = {
  isFetching: boolean;
  requestId: number;
  data: D | void;
  error: Error | null;
  refresh: () => void;
  update: (config: ConfigType) => void;
  config: NullableConfigType;
};

function getCacheKey(axiosConfig: ConfigType) {
  return typeof axiosConfig === 'string'
    ? axiosConfig
    : (buildURL(axiosConfig.url, axiosConfig.params) as string);
}

function sendRequest<D>(
  config: ConfigType,
  cb?: (data: D) => void,
  errorCb?: (error: AxiosError) => void
) {
  const source = Axios.CancelToken.source();
  const axiosConfig: AxiosRequestConfig = {
    cancelToken: source.token,
  };

  if (typeof config === 'string') {
    axiosConfig.url = config;
    axiosConfig.method = 'GET';
  } else {
    Object.assign(axiosConfig, config);
  }

  const cacheKey = getCacheKey(config);

  let request;

  if (cacheKey) {
    const maybeRequest = CacheRequests.get(cacheKey);

    if (maybeRequest) {
      request = maybeRequest;
    } else {
      request = Axios(axiosConfig);
      CacheRequests.set(cacheKey, request);
    }
  } else {
    request = Axios(axiosConfig);
  }

  return {
    request: request
      .then(({ data }) => {
        if (cb) {
          cb(data);
        }
        if (cacheKey) {
          Cache.set(cacheKey, data);
        }
      })
      .catch(error => {
        if (Axios.isCancel(error)) {
          return;
        }
        if (errorCb) {
          errorCb(error);
        }
      })
      .then(() => {
        if (cacheKey) {
          CacheRequests.delete(cacheKey);
        }
      }),
    cancel: source.cancel,
  };
}

export function warmupCache(axiosConfig: ConfigType) {
  const cacheKey = getCacheKey(axiosConfig);

  if (!Cache.has(cacheKey)) {
    sendRequest(axiosConfig);
  }
}

export function useAxiosRequest<D>(
  axiosConfig: ConfigType | null | void,
  {
    cache = CachePolicy.NoCache,
    pollInterval = 0,
    onSuccess,
    onError,
  }: UseAxiosRequestOptionsType<D> = {}
): UseAxiosRequestReturnType<D> {
  const cacheKey = useMemo(() => {
    if (axiosConfig && cache !== CachePolicy.NoCache) {
      return typeof axiosConfig === 'string'
        ? axiosConfig
        : (buildURL(axiosConfig.url, axiosConfig.params) as string);
    }

    return null;
  }, [axiosConfig, cache]);

  const initialValue = {
    config: axiosConfig,
    cacheKey,
    data: undefined,
    prevConfig: axiosConfig,
  };

  const [state, dispatch] = useReducer(
    reducer,
    initialValue,
    // FIX ME
    init as (iv: typeof initialValue) => State<D>
  );

  const updateConfig = useCallback(
    (config: NullableConfigType) => {
      dispatch({
        type: 'config changed',
        payload: { config, cacheKey, cachePolicy: cache },
      });
    },
    [dispatch, cacheKey]
  );

  const dispatchManullySetConfig = useCallback(
    (config: ConfigType) => {
      dispatch({
        type: 'manually set config',
        payload: { config, cacheKey, cachePolicy: cache },
      });
    },
    [dispatch, cacheKey]
  );

  const dispatchFetched = useCallback(
    (data: D) => {
      dispatch({
        type: 'fetched',
        payload: data,
      });
    },
    [dispatch]
  );

  const dispatchError = useCallback(
    (error: AxiosError) => {
      dispatch({
        type: 'error',
        payload: error,
      });
    },
    [dispatch]
  );

  const dispatchPoll = useCallback(() => {
    dispatch({
      type: 'poll',
    });
  }, [dispatch]);

  const cb = useCallback(
    (data: D) => {
      if (typeof onSuccess === 'function') {
        ReactDOM.unstable_batchedUpdates(() => {
          dispatchFetched(data);
          onSuccess(data);
        });
      } else {
        dispatchFetched(data);
      }
    },
    [dispatchFetched, onSuccess]
  );

  const errorCb = useCallback(
    (error: AxiosError) => {
      if (typeof onError === 'function') {
        ReactDOM.unstable_batchedUpdates(() => {
          dispatchError(error);
          onError(error);
        });
      } else {
        dispatchError(error);
      }
    },
    [dispatchError, onError]
  );

  if (state.prevConfig !== axiosConfig) {
    updateConfig(axiosConfig);
  }

  useEffect(() => {
    if (pollInterval > 0 && !state.isFetching) {
      const timeoutId = setTimeout(dispatchPoll, pollInterval);
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [state.isFetching, pollInterval, dispatchPoll]);

  useEffect(() => {
    if (state.config && state.isFetching) {
      return sendRequest<D>(state.config, cb, errorCb).cancel;
    }
  }, [state.config, state.isFetching, cb, errorCb, state.requestId, cacheKey]);

  return {
    isFetching: state.isFetching,
    requestId: state.requestId,
    data: state.data as D,
    error: state.error,
    refresh: dispatchPoll,
    update: dispatchManullySetConfig,
    config: state.config,
  };
}

export function useAxiosRequestRender<D>({
  config,
  options,
  render,
  renderLoading,
  renderError,
}: {
  config: NullableConfigType;
  render: (axiosConfigReturn: UseAxiosRequestReturnType<D>) => ReactNode;
  renderLoading: (axiosConfigReturn: UseAxiosRequestReturnType<D>) => ReactNode;
  renderError: (axiosConfigReturn: UseAxiosRequestReturnType<D>) => ReactNode;
  options?: UseAxiosRequestOptionsType<D>;
}) {
  const axiosRequest = useAxiosRequest<D>(config, options);

  if (axiosRequest.isFetching && axiosRequest.requestId === 1) {
    return renderLoading(axiosRequest);
  }

  if (axiosRequest.error) {
    return renderError(axiosRequest);
  }

  return render(axiosRequest);
}
