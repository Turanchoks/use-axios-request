import * as React from 'react';
import Axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import buildURL from 'axios/lib/helpers/buildURL';

const Cache = new Map();

// if (process.env.NODE_ENV === 'development') {
//   window.__axiosRequestCache = Cache;
// }

type ConfigType = AxiosRequestConfig | string;

export function useAxiosRequestEffect({
  config,
  cb,
  errorCb,
  polls,
}: {
  config: ConfigType | null;
  cb: (data: AxiosResponse['data']) => void;
  errorCb: (error: AxiosError) => void;
  polls: number;
}) {
  React.useEffect(() => {
    if (config) {
      const source = Axios.CancelToken.source();
      const axiosConfig: ConfigType = {
        cancelToken: source.token,
      };

      if (typeof config === 'string') {
        axiosConfig.url = config;
        axiosConfig.method = 'GET';
      } else {
        Object.assign(axiosConfig, config);
      }

      Axios(axiosConfig)
        .then(response => {
          cb(response.data);
        })
        .catch(error => {
          if (Axios.isCancel(error)) {
            return;
          }
          errorCb(error);
        });

      return source.cancel;
    }
  }, [config, cb, errorCb, polls]);
}

type State<D> = {
  config: ConfigType;
  data: D;
  prevConfig: ConfigType;
  isFetching: boolean;
  error: Error | null;
  polls: number;
};

function init<D>({
  config,
  cache,
  data,
  prevConfig,
}: {
  config: ConfigType;
  cache: boolean;
  data: D;
  prevConfig: ConfigType;
}): State<D> {
  const sendRequest = !!config;
  const cacheKey = sendRequest && cache ? getCacheKeyFromConfig(config) : null;
  const hasCache = cacheKey && Cache.has(cacheKey);

  return {
    data: hasCache ? Cache.get(cacheKey) : data,
    isFetching: sendRequest && !hasCache,
    config,
    error: null,
    polls: 0,
    prevConfig,
  };
}

type Action<D> =
  | {
      type: 'manually set config';
      payload: {
        config: ConfigType;
        cache: boolean;
      };
    }
  | {
      type: 'config changed';
      payload: {
        config: ConfigType;
        cache: boolean;
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
      const { config, cache } = action.payload;

      if (config === state.config) {
        return state;
      }

      return init({
        config,
        cache,
        prevConfig: state.prevConfig,
        data: state.data,
      });
    }
    case 'config changed': {
      const { config, cache } = action.payload;

      if (config === state.prevConfig) {
        return state;
      }

      return init({
        config,
        cache,
        prevConfig: config,
        data: state.data,
      });
    }
    case 'poll':
      return {
        ...state,
        isFetching: true,
        error: null,
        polls: state.polls + 1,
      };
    case 'fetched':
      return {
        ...state,
        data: action.payload,
        isFetching: false,
        error: null,
      };
    case 'error':
      return {
        ...state,
        isFetching: false,
        error: action.payload,
      };
    default:
      return state;
  }
}

const getCacheKeyFromConfig = (config: ConfigType) => {
  return typeof config === 'string'
    ? config
    : buildURL(config.url, config.params);
};

type UseAxiosRequestConfigType = ConfigType & {
  pollInterval?: number;
  cache?: boolean;
};

export function useAxiosRequest<D>(config: UseAxiosRequestConfigType = {}) {
  const { pollInterval = 0, cache = false } = config;

  const initialValue = {
    config,
    cache,
    data: null,
    prevConfig: config,
  };

  const [state, dispatch] = React.useReducer(
    reducer,
    initialValue,
    // FIX ME
    init as (iv: typeof initialValue) => State<D>
  );

  const updateConfig = React.useCallback(
    (config: ConfigType) => {
      dispatch({
        type: 'config changed',
        payload: { config, cache },
      });
    },
    [dispatch, cache]
  );

  const updateConfigManual = React.useCallback(
    (config: ConfigType) => {
      dispatch({
        type: 'manually set config',
        payload: { config, cache },
      });
    },
    [dispatch, cache]
  );

  const onSuccess = React.useCallback(
    (data: D) => {
      dispatch({
        type: 'fetched',
        payload: data,
      });
    },
    [dispatch]
  );

  const onError = React.useCallback(
    (error: AxiosError) => {
      dispatch({
        type: 'error',
        payload: error,
      });
    },
    [dispatch]
  );

  const poll = React.useCallback(() => {
    dispatch({
      type: 'poll',
    });
  }, [dispatch]);

  if (state.prevConfig !== config) {
    console.log(state.prevConfig, config);
    updateConfig(config);
  }

  React.useEffect(() => {
    if (pollInterval > 0 && !state.isFetching) {
      const timeoutId = setTimeout(poll, pollInterval);
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [state.isFetching, pollInterval, poll]);

  React.useEffect(() => {
    if (cache && state.config && !state.isFetching) {
      Cache.set(getCacheKeyFromConfig(state.config), state.data);
    }
  }, [state.data, state.isFetching, state.config, cache]);

  useAxiosRequestEffect({
    config: state.isFetching ? (state.config as ConfigType) : null,
    cb: onSuccess,
    errorCb: onError,
    polls: state.polls,
  });

  return {
    state: state as State<D>,
    refresh: poll,
    update: updateConfigManual,
  };
}

export function useAxiosRequestRender({
  config,
  render,
  renderLoading,
  renderError,
}: {
  config: UseAxiosRequestConfigType;
  render: (axiosConfig: ReturnType<typeof useAxiosRequest>) => React.ReactNode;
  renderLoading: (
    axiosConfig: ReturnType<typeof useAxiosRequest>
  ) => React.ReactNode;
  renderError: (
    axiosConfig: ReturnType<typeof useAxiosRequest>
  ) => React.ReactNode;
}) {
  const axiosRequest = useAxiosRequest(config);

  if (axiosRequest.state.isFetching && axiosRequest.state.polls === 0) {
    return renderLoading(axiosRequest);
  }

  if (axiosRequest.state.error) {
    return renderError(axiosRequest);
  }

  return render(axiosRequest);
}
