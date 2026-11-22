
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

// Формирование URL с query-параметрами.
export function buildUrl(baseUrl, path, query = {}) {
  if (typeof baseUrl !== "string" || typeof path !== "string") {
    throw new TypeError("baseUrl и path должны быть строками.");
  }

  const base = baseUrl.replace(/\/+$/, "");
  const cleanPath = path.replace(/^\/+/, "");
  const url = new URL(`${base}/${cleanPath}`);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url.href;
}

// Создание общего HTTP-клиента.
export function createApiClient({
  baseUrl,
  fetchFn = globalThis.fetch,
  timeoutMs = 3000,
} = {}) {
  let parsedBaseUrl;

  try {
    parsedBaseUrl = new URL(baseUrl);
  } catch {
    throw new TypeError("Необходимо указать корректный абсолютный baseUrl.");
  }

  if (!["http:", "https:"].includes(parsedBaseUrl.protocol)) {
    throw new TypeError("Поддерживаются только HTTP и HTTPS.");
  }

  if (parsedBaseUrl.search || parsedBaseUrl.hash) {
    throw new TypeError("baseUrl не должен содержать query или hash.");
  }

  if (typeof fetchFn !== "function") {
    throw new TypeError("fetchFn должен быть функцией.");
  }

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError("timeoutMs должен быть положительным числом.");
  }

  async function requestJson(path, options = {}) {
    const {
      method = "GET",
      query = {},
      body,
      signal: externalSignal,
      timeoutMs: requestTimeout = timeoutMs,
    } = options;

    const normalizedMethod = String(method).toUpperCase();
    const allowedMethods = ["GET", "POST", "PATCH", "DELETE"];

    if (!allowedMethods.includes(normalizedMethod)) {
      throw new TypeError(`Метод ${normalizedMethod} не поддерживается.`);
    }

    if (normalizedMethod === "GET" && body !== undefined) {
      throw new TypeError("GET-запрос не должен содержать body.");
    }

    if (!Number.isFinite(requestTimeout) || requestTimeout <= 0) {
      throw new TypeError("timeoutMs должен быть положительным числом.");
    }

    if (
      externalSignal !== undefined
      && !(externalSignal instanceof AbortSignal)
    ) {
      throw new TypeError("signal должен быть экземпляром AbortSignal.");
    }

    const url = buildUrl(baseUrl, path, query);
    const headers = new Headers();

    headers.set("Accept", "application/json");

    const requestOptions = {
      method: normalizedMethod,
      headers,
    };

    if (body !== undefined) {
      headers.set("Content-Type", "application/json");
      requestOptions.body = JSON.stringify(body);
    }

    const controller = new AbortController();

    requestOptions.signal = controller.signal;

    let timedOut = false;
    let externallyAborted = false;

    const abortFromExternal = () => {
      externallyAborted = true;
      controller.abort(externalSignal?.reason);
    };

    if (externalSignal?.aborted) {
      abortFromExternal();
    } else {
      externalSignal?.addEventListener("abort", abortFromExternal, {
        once: true,
      });
    }

    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, requestTimeout);

    try {
      const response = await fetchFn(url, requestOptions);

      // HTTP-ошибку проверяем до Content-Type.
      if (!response.ok) {
        let payload = null;

        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        const errorData = payload?.error;

        throw new ApiError(
          errorData?.message ?? `Ошибка HTTP ${response.status}.`,
          {
            kind: "http",
            status: response.status,
            code: errorData?.code ?? null,
            details: errorData?.details ?? null,
            url,
          },
        );
      }

      // DELETE возвращает 204 без тела.
      if (response.status === 204) {
        return null;
      }

      const contentType = response.headers.get("Content-Type") ?? "";

      if (!/application\/(?:[\w.+-]*\+)?json(?:\s*;|$)/i.test(contentType)) {
        throw new ApiError(
          "Сервер вернул ответ с неподдерживаемым Content-Type.",
          {
            kind: "invalid-response",
            status: response.status,
            url,
          },
        );
      }

      try {
        return await response.json();
      } catch (error) {
        throw new ApiError(
          "Сервер вернул некорректный JSON.",
          {
            kind: "invalid-response",
            status: response.status,
            url,
            cause: error,
          },
        );
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (timedOut) {
        throw new ApiError(
          "Время ожидания ответа сервера истекло.",
          {
            kind: "timeout",
            url,
            cause: error,
          },
        );
      }

      if (externallyAborted || externalSignal?.aborted) {
        throw new ApiError(
          "Запрос был отменён.",
          {
            kind: "aborted",
            url,
            cause: error,
          },
        );
      }

      throw new ApiError(
        "Не удалось выполнить сетевой запрос.",
        {
          kind: "network",
          url,
          cause: error,
        },
      );
    } finally {
      clearTimeout(timer);
      externalSignal?.removeEventListener("abort", abortFromExternal);
    }
  }

  return {
    requestJson,
  };
}
