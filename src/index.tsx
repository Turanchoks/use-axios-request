import * as React from 'react';
import ReactDOM from 'react-dom';
import { useAxiosRequest } from './useAxiosRequest';

function App() {
  const [username, setUsername] = React.useState('Turanchoks');
  const [url, setConfig] = React.useState<any>(null);

  const { state, update } = useAxiosRequest<{
    login: string;
  }>(url);

  return (
    <div className="App">
      <p>
        {username} id is:{' '}
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
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
