const Axios = jest.fn(config => {
  if (config.error) {
    return Promise.reject(new Error("Error message"));
  }
  return Promise.resolve({
    data: {
      response: "response"
    }
  });
});
Axios.CancelToken = {
  source: () => ({
    token: null
  })
};
Axios.isCancel = () => false;
export default Axios;
