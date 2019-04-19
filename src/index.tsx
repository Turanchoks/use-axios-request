import * as React from 'react';
import axios from 'axios';
import ReactDOM from 'react-dom';
import { useAxiosRequest } from './useAxiosRequest';

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

  const {
    state: { isFetching, data, error },
    update,
  } = useAxiosRequest<{
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

function App() {
  const [username, setUsername] = React.useState('Turanchoks');
  const [url, setConfig] = React.useState<any>(null);

  const { state, update } = useAxiosRequest<{
    login: string;
  }>(url);

  return (
    <div>
      <p>
        {username} login is:{' '}
        {state.isFetching
          ? 'Loading'
          : state.error
          ? state.error.message
          : state.data == null
          ? 'None'
          : state.data.login}
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
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
