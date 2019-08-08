import * as React from 'react';
import axios from 'axios';
import ReactDOM from 'react-dom';
import { useAxiosRequest, useAxiosRequestRender } from './useAxiosRequest';

// Simulate slower network
axios.interceptors.response.use(
  response =>
    new Promise(resolve => {
      setTimeout(() => {
        resolve(response);
      }, 1000);
    }),
  error => Promise.reject(error)
);

const Child = () => {
  const [visible, setVisible] = React.useState(false);

  const close = React.useCallback(() => {
    setVisible(false);
  }, [setVisible]);

  const { isFetching, data, error, update } = useAxiosRequest<{
    login: string;
  }>(null, {
    onSuccess: close,
    onError: close,
  });

  console.log('Child render');
  React.useEffect(() => {
    console.log('Child commit');
  });

  return (
    <div>
      <p>login: {data ? data.login : error ? error.message : 'Not fetched'}</p>
      <p>
        <button onClick={() => setVisible(!visible)}>Toggle modal</button>
      </p>
      {visible && (
        <div
          style={{
            opacity: isFetching ? 0.4 : 1,
            display: 'inline-block',
            border: '1px solid black',
            padding: 15,
          }}
        >
          <h3>Modal</h3>
          <p>Some random text</p>
          <button
            onClick={() => {
              update(`https://api.github.com/users/Turanchoks`);
            }}
            disabled={isFetching}
          >
            {isFetching ? 'Loading' : 'Send Request'}
          </button>
        </div>
      )}
    </div>
  );
};

const CacheTestChild = ({ config }: { config: string | null }) => {
  const children = useAxiosRequestRender<any>({
    config,
    options: {
      cache: true,
    },
    render: ({ data, config }) => {
      if (config == null) {
        return <h3>Nothing yet</h3>;
      }

      return <pre>{data.login}</pre>;
    },
    renderLoading: () => {
      return <h3>Loading</h3>;
    },
    renderError: () => {
      return (
        <h3
          style={{
            color: 'red',
          }}
        >
          Error
        </h3>
      );
    },
  });

  // https://github.com/Microsoft/TypeScript/issues/30108
  return <React.Fragment>{children}</React.Fragment>;
};

const CacheTest = () => {
  const [config, setConfig] = React.useState<string | null>(null);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const onClick = () => {
    if (inputRef.current) {
      setConfig(inputRef.current.value);
    }
  };

  return (
    <div>
      <h3>Current config: {config == null ? 'null' : config}</h3>
      <input ref={inputRef} />
      <button onClick={onClick}>Go!</button>
      <CacheTestChild config={config} />
      <CacheTestChild config={config} />
      <CacheTestChild config={config} />
    </div>
  );
};

function App() {
  const [username, setUsername] = React.useState('Turanchoks');
  const [url, setConfig] = React.useState<any>(null);

  const { isFetching, error, data, update } = useAxiosRequest<{
    login: string;
  }>(url);

  return (
    <div>
      <p>
        {username} login is:{' '}
        {isFetching
          ? 'Loading'
          : error
          ? error.message
          : data == null
          ? 'None'
          : data.login}
      </p>
      <input
        value={username}
        onChange={e => setUsername(e.currentTarget.value)}
      />
      <br />
      <button
        onClick={() => {
          update(`https://api.github.com/users/${username}`);
        }}
      >
        Update config Manually
      </button>
      <button
        onClick={() => {
          setConfig(`https://api.github.com/users/${username}`);
        }}
      >
        Update config outside
      </button>

      <hr />

      <Child />
      <hr />

      <CacheTest />
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
