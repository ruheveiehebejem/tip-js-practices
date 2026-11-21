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

function validateBaseUrl(baseUrl) {
  if (typeof baseUrl !== "string" || baseUrl.trim() === "") {
    throw new TypeError("Необходимо указать абсолютный baseUrl.");
  }
  let url;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new TypeError("baseUrl должен быть абсолютным HTTP(S)-адресом.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new TypeError("baseUrl должен быть HTTP(S)-адресом без query и hash.");
  }
  return url;
}

function validatePath(path) {
  if (
    typeof path !== "string" ||
    path.trim() === "" ||
    path.includes("?") ||
    path.includes("#") ||
    path.startsWith("//")
  ) {
    throw new TypeError("path должен быть непустым путём без query и hash.");
  }
}

export function buildUrl(baseUrl, path, query = {}) {
  const base = validateBaseUrl(baseUrl);
  validatePath(path);

  if (
    query === null ||
    typeof query !== "object" ||
    Array.isArray(query) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(query))
  ) {
    throw new TypeError("query должен быть обычным объектом.");
  }

  const prefix = base.toString().replace(/\/+$/, "");
  const cleanPath = path.replace(/^\/+/, "");
  const url = new URL(prefix + "/" + cleanPath);

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.append(key, String(value));
  }
  url.search = params.toString();
  return url.toString();
}

export function createApiClient({
  baseUrl,
  fetchFn = globalThis.fetch,
  timeoutMs = 2000,
} = {}) {
  validateBaseUrl(baseUrl);
  if (typeof fetchFn !== "function") {
    throw new TypeError("fetchFn должен быть функцией.");
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError("timeoutMs должен быть положительным целым числом.");
  }

  async function requestJson(path, {
    query = {},
    signal,
    timeoutMs: requestTimeout = timeoutMs,
  } = {}) {
    if (!Number.isSafeInteger(requestTimeout) || requestTimeout <= 0) {
      throw new TypeError("timeoutMs должен быть положительным целым числом.");
    }
    if (
      signal !== undefined &&
      (signal === null ||
        typeof signal.aborted !== "boolean" ||
        typeof signal.addEventListener !== "function")
    ) {
      throw new TypeError("signal должен быть AbortSignal.");
    }

    const url = buildUrl(baseUrl, path, query);
    const controller = new AbortController();
    let timedOut = false;
    let externallyAborted = Boolean(signal?.aborted);

    const onExternalAbort = () => {
      externallyAborted = true;
      controller.abort(signal.reason);
    };

    if (signal) {
      if (signal.aborted) {
        onExternalAbort();
      } else {
        signal.addEventListener("abort", onExternalAbort, { once: true });
      }
    }

    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort(new Error("Время ожидания запроса истекло."));
    }, requestTimeout);

    try {
      let response;
      try {
        response = await fetchFn(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
      } catch (cause) {
        if (timedOut) {
          throw new ApiError("Время ожидания запроса истекло.", {
            kind: "timeout",
            url,
            cause,
          });
        }
        if (externallyAborted || signal?.aborted) {
          throw new ApiError("Запрос был отменён.", {
            kind: "aborted",
            url,
            cause,
          });
        }
        throw new ApiError("Не удалось связаться с сервером.", {
          kind: "network",
          url,
          cause,
        });
      }

      if (typeof Response === "undefined" || !(response instanceof Response)) {
        throw new ApiError("Сервер вернул объект, который не является Response.", {
          kind: "invalid-response",
          url,
        });
      }

      if (!response.ok) {
        let payload = null;
        const contentType = response.headers.get("content-type") ?? "";
        if (/application\/(?:[\w.+-]+\+)?json\b/i.test(contentType)) {
          try {
            payload = await response.json();
          } catch {
            payload = null;
          }
        }
        const apiError = payload?.error;
        throw new ApiError(
          typeof apiError?.message === "string" && apiError.message.trim()
            ? apiError.message
            : `HTTP ${response.status}: запрос завершился ошибкой.`,
          {
            kind: "http",
            status: response.status,
            code: typeof apiError?.code === "string" ? apiError.code : null,
            details: apiError?.details ?? null,
            url,
          },
        );
      }

      if (response.status === 204) return null;

      const contentType = response.headers.get("content-type") ?? "";
      if (!/application\/(?:[\w.+-]+\+)?json\b/i.test(contentType)) {
        throw new ApiError("Успешный ответ сервера не содержит JSON.", {
          kind: "invalid-response",
          status: response.status,
          url,
        });
      }

      try {
        return await response.json();
      } catch (cause) {
        throw new ApiError("Не удалось разобрать JSON в ответе сервера.", {
          kind: "invalid-response",
          status: response.status,
          url,
          cause,
        });
      }
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onExternalAbort);
    }
  }

  return { requestJson };
}
