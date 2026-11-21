import express from "express";
import { ApiError } from "./errors.js";

export function createJsonBody(limitBytes = 16 * 1024) {
  if (!Number.isSafeInteger(limitBytes) || limitBytes < 1024 || limitBytes > 1048576) {
    throw new TypeError("Лимит JSON-тела должен быть от 1024 до 1048576 байт.");
  }

  const parse = express.json({
    limit: limitBytes,
    strict: false,
    inflate: false,
    verify(req, res, buffer) {
      req.jsonBodyBytes = buffer.length;
    },
  });

  return [
    (req, res, next) => {
      if (!/^application\\/json(?:\\s*;|$)/i.test(req.headers["content-type"] ?? "")) {
        return next(new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Нужен Content-Type application/json."));
      }
      next();
    },
    parse,
    (req, res, next) => {
      if (!req.jsonBodyBytes) {
        return next(new ApiError(400, "INVALID_JSON", "Пустое тело запроса."));
      }
      next();
    },
  ];
}

export const jsonBody = createJsonBody();
