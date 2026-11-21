import { demoTasks, variantNumber, variantTasks } from "./data.js";
import {
  findTaskById,
  getPendingTasks,
  getTaskTitles,
  getTaskStats,
  addTask,
  setTaskCompleted,
  renameTask,
  removeTask,
} from "./task-service.js";

function showState(title, tasks) {
  console.log("\n" + title);
  console.table(tasks);
  console.log("Названия:", getTaskTitles(tasks));
  console.log("Невыполненные задачи:");
  console.table(getPendingTasks(tasks));

  const stats = getTaskStats(tasks);
  console.log(
    `Всего: ${stats.total}; выполнено: ${stats.completed}; осталось: ${stats.pending}`
  );

  if (stats.total === 0) {
    console.log("Задач пока нет");
  } else {
    console.log(`Прогресс: ${stats.progress.toFixed(1)}%`);
  }
}

function applyOperation(currentTasks, result, operationName) {
  if (result.ok) {
    console.log(`Операция «${operationName}» выполнена.`);
    return result.tasks;
  }

  console.log(`Ошибка операции «${operationName}»: ${result.error}`);
  return currentTasks;
}

console.log("========== ОБЩИЙ СЦЕНАРИЙ ПР2 ==========");
const originalDemoTasks = demoTasks.map((task) => ({ ...task }));
let currentTasks = demoTasks;

showState("Исходный общий набор", currentTasks);

currentTasks = applyOperation(
  currentTasks,
  addTask(currentTasks, 20, "Добавить проверку", "high"),
  "добавление задачи"
);
showState("После добавления id 20", currentTasks);

currentTasks = applyOperation(
  currentTasks,
  setTaskCompleted(currentTasks, 4, true),
  "изменение статуса id 4"
);
showState("После выполнения id 4", currentTasks);

currentTasks = applyOperation(
  currentTasks,
  renameTask(currentTasks, 10, "Подготовить инструкцию запуска"),
  "переименование id 10"
);
showState("После переименования id 10", currentTasks);

currentTasks = applyOperation(
  currentTasks,
  removeTask(currentTasks, 7),
  "удаление id 7"
);
showState("После удаления id 7", currentTasks);

const duplicateResult = addTask(currentTasks, 20, "Повторная задача", "low");
currentTasks = applyOperation(currentTasks, duplicateResult, "повторное добавление id 20");
console.log("Исходный demoTasks не изменился:", JSON.stringify(demoTasks) === JSON.stringify(originalDemoTasks));
console.log("Итоговые ID общего набора:", currentTasks.map((task) => task.id));

console.log("\n========== ИНДИВИДУАЛЬНЫЙ ВАРИАНТ ==========");
console.log("Вариант:", variantNumber);
const originalVariantTasks = variantTasks.map((task) => ({ ...task }));
let currentVariantTasks = variantTasks;

showState("Исходный набор варианта 8", currentVariantTasks);

currentVariantTasks = applyOperation(
  currentVariantTasks,
  addTask(currentVariantTasks, 80, "Подготовить итоговую версию технической документации", "low"),
  "добавление задачи id 80"
);
showState("После добавления id 80", currentVariantTasks);

currentVariantTasks = applyOperation(
  currentVariantTasks,
  setTaskCompleted(currentVariantTasks, 11, true),
  "установка completed для id 11"
);
showState("После установки статуса id 11", currentVariantTasks);

currentVariantTasks = applyOperation(
  currentVariantTasks,
  renameTask(currentVariantTasks, 23, "Оформить структуру технической документации"),
  "переименование id 23"
);
showState("После переименования id 23", currentVariantTasks);

currentVariantTasks = applyOperation(
  currentVariantTasks,
  removeTask(currentVariantTasks, 37),
  "удаление id 37"
);
showState("После удаления id 37", currentVariantTasks);

const variantDuplicateResult = addTask(
  currentVariantTasks,
  80,
  "Повторная задача",
  "low"
);
currentVariantTasks = applyOperation(
  currentVariantTasks,
  variantDuplicateResult,
  "повторное добавление id 80"
);

showState("Итоговый набор варианта 8", currentVariantTasks);
console.log("Итоговые ID варианта:", currentVariantTasks.map((task) => task.id));
console.log(
  "Исходный variantTasks не изменился:",
  JSON.stringify(variantTasks) === JSON.stringify(originalVariantTasks)
);
console.log("Задача id 23 найдена:", findTaskById(currentVariantTasks, 23));
