
export class ApiError extends Error {
  constructor(message, {
    kind,
    status = null,
    code = null,
    details = null,
    url = null,
    cause,
  } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.details = details;
    this.url = url;
  }
}

export function buildUrl(baseUrl, path, query = {}) {
  const base = String(baseUrl).replace(/\/+$/, "");
  const cleanPath = String(path).replace(/^\/+/, "");
  const url = new URL(`${base}/${cleanPath}`);

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

export function createApiClient({
  baseUrl,
  fetchFn = globalThis.fetch,
  timeoutMs = 2000,
} = {}) {
  if (typeof baseUrl !== "string" || !baseUrl.trim()) {
    throw new TypeError("Необходимо указать baseUrl.");
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    throw new TypeError("baseUrl должен быть корректным URL.");
  }

  if (
    !["http:", "https:"].includes(parsedUrl.protocol)
    || parsedUrl.search
    || parsedUrl.hash
  ) {
    throw new TypeError("Недопустимый baseUrl.");
  }

  if (typeof fetchFn !== "function") {
    throw new TypeError("fetchFn должен быть функцией.");
  }

  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError("timeoutMs должен быть положительным целым числом.");
  }

  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

  async function requestJson(path, {
    query = {},
    signal,
    timeoutMs: requestTimeoutMs = timeoutMs,
  } = {}) {
    if (!Number.isSafeInteger(requestTimeoutMs) || requestTimeoutMs <= 0) {
      throw new TypeError("timeoutMs должен быть положительным целым числом.");
    }

    const url = buildUrl(normalizedBaseUrl, path, query);
    const controller = new AbortController();

    let timedOut = false;
    let externallyAborted = false;

    const onAbort = () => {
      externallyAborted = true;
      controller.abort(signal.reason);
    };

    if (signal) {
      if (signal.aborted) {
        externallyAborted = true;
        controller.abort(signal.reason);
      } else {
        signal.addEventListener("abort", onAbort, { once: true });
      }
    }

    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, requestTimeoutMs);

    try {
      if (externallyAborted) {
        throw new ApiError("Запрос отменён.", {
          kind: "aborted",
          url,
        });
      }

      let response;

      try {
        response = await fetchFn(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
      } catch (error) {
        if (timedOut) {
          throw new ApiError("Превышено время ожидания запроса.", {
            kind: "timeout",
            url,
            cause: error,
          });
        }

        if (externallyAborted || signal?.aborted) {
          throw new ApiError("Запрос отменён.", {
            kind: "aborted",
            url,
            cause: error,
          });
        }

        throw new ApiError("Сетевая ошибка при выполнении запроса.", {
          kind: "network",
          url,
          cause: error,
        });
      }

      if (
        !response
        || typeof response.ok !== "boolean"
        || typeof response.status !== "number"
        || !response.headers
      ) {
        throw new ApiError("Получен некорректный HTTP-ответ.", {
          kind: "invalid-response",
          url,
        });
      }

      const contentType = response.headers.get("content-type") ?? "";
      const isJson = contentType.toLowerCase().includes("application/json");

      if (!response.ok) {
        let payload = null;

        if (isJson) {
          try {
            payload = await response.json();
          } catch {
            payload = null;
          }
        }

        const apiError = payload?.error;

        throw new ApiError(
          typeof apiError?.message === "string"
            ? apiError.message
            : `Ошибка HTTP ${response.status}.`,
          {
            kind: "http",
            status: response.status,
            code: apiError?.code ?? null,
            details: apiError?.details ?? null,
            url,
          },
        );
      }

      if (response.status === 204) {
        return null;
      }

      if (!isJson) {
        throw new ApiError("Сервер вернул ответ не в формате JSON.", {
          kind: "invalid-response",
          url,
        });
      }

      try {
        return await response.json();
      } catch (error) {
        throw new ApiError("Не удалось разобрать JSON-ответ.", {
          kind: "invalid-response",
          url,
          cause: error,
        });
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError("Некорректный ответ сервера.", {
        kind: "invalid-response",
        url,
        cause: error,
      });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  }

  return { requestJson };
}
