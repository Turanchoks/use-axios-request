import { useAxiosRequest } from "./useAxiosRequest";
import { renderHook, cleanup } from "react-hooks-testing-library";

afterEach(cleanup);

const initialConfig = {
  url: "https://github.com",
  method: "GET"
};

const newConfig = {
  url: "https://google.com",
  method: "GET"
};

const errorConfig = {
  error: true
};

describe("useAxiosRequest", () => {
  it("does nothing without init config", () => {
    const { result } = renderHook(useAxiosRequest);
    expect(result.current.state).toEqual({
      data: null,
      isFetching: false,
      config: undefined,
      error: null,
      requestId: 1,
      prevConfig: undefined
    });
  });
  it("sets initial Config", async () => {
    const { result } = renderHook(config => useAxiosRequest(config), {
      initialProps: initialConfig
    });
    expect(result.current.state.config).toEqual(initialConfig);
  });
  it("changes isFetching flag", async () => {
    const { result, waitForNextUpdate } = renderHook(
      config => useAxiosRequest(config),
      {
        initialProps: initialConfig
      }
    );
    expect(result.current.state.isFetching).toBe(true);
    await waitForNextUpdate();
    expect(result.current.state.isFetching).toBe(false);
  });
  it("return response in data object", async () => {
    const { result, waitForNextUpdate } = renderHook(
      config => useAxiosRequest(config),
      {
        initialProps: initialConfig
      }
    );
    await waitForNextUpdate();
    expect(result.current.state.data.response).toBe("response");
    result.current.refresh();
  });
  it("updates requestId on refresh()", async () => {
    const { result, waitForNextUpdate } = renderHook(
      config => useAxiosRequest(config),
      {
        initialProps: initialConfig
      }
    );
    await waitForNextUpdate();
    expect(result.current.state.requestId).toBe(1);
    result.current.refresh();
    expect(result.current.state.requestId).toBe(2);
    result.current.refresh();
    expect(result.current.state.requestId).toBe(3);
  });
  it("updates config manually with update()", async () => {
    const { result } = renderHook(() => useAxiosRequest(initialConfig));
    expect(result.current.state.prevConfig).toEqual(initialConfig);
    expect(result.current.state.config).toEqual(initialConfig);
    result.current.update(newConfig);
    expect(result.current.state.prevConfig).toEqual(initialConfig);
    expect(result.current.state.config).toEqual(newConfig);
  });
  it("updates config on rerender", async () => {
    const { result, rerender } = renderHook(config => useAxiosRequest(config), {
      initialProps: initialConfig
    });

    expect(result.current.state.config).toEqual(initialConfig);
    rerender(newConfig);
    expect(result.current.state.config).toEqual(newConfig);
  });
  it("returns erorrs", async () => {
    const { result, waitForNextUpdate } = renderHook(
      config => useAxiosRequest(config),
      {
        initialProps: errorConfig
      }
    );
    await waitForNextUpdate();
    expect(result.current.state.error).toBeInstanceOf(Error);
    expect(result.current.state.error.message).toBe("Error message");
  });
});
