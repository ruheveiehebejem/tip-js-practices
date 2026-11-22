
import { demoTasks, variantNumber, variantTasks } from "./data.js";

import {
  createTask,
  findTaskById,
  getPendingTasks,
  getTaskTitles,
  getTaskStats,
  addTask,
  setTaskCompleted,
  renameTask,
  removeTask
} from "./task-service.js";

function showStats(tasks, name) {
  const { total, completed, pending, progress } = getTaskStats(tasks);

  console.log("\n" + name);
  console.log("Всего задач:", total);
  console.log("Выполнено:", completed);
  console.log("Осталось:", pending);

  if (total === 0) {
    console.log("Задач пока нет");
  } else {
    console.log("Прогресс:", progress.toFixed(1) + "%");
  }
}

function showResult(result) {
  if (result.ok) {
    return result.tasks;
  }

  console.log("Ошибка:", result.error);
  return null;
}

// ОБЩИЙ СЦЕНАРИЙ

console.log("================================");
console.log("ОБЩИЙ СЦЕНАРИЙ");
console.log("================================");

let currentTasks = demoTasks;

console.log("\nИсходные задачи:");
console.table(currentTasks);

console.log("Названия задач:");
console.log(getTaskTitles(currentTasks));

console.log("Невыполненные задачи:");
console.table(getPendingTasks(currentTasks));

console.log("Поиск задачи с ID 4:");
console.log(findTaskById(currentTasks, 4));

showStats(currentTasks, "Исходная статистика");

// Добавление задачи

let result = addTask(
  currentTasks,
  20,
  "Добавить проверку",
  "high"
);

let nextTasks = showResult(result);

if (nextTasks !== null) {
  currentTasks = nextTasks;
}

showStats(currentTasks, "После добавления задачи");

// Изменение статуса

result = setTaskCompleted(currentTasks, 4, true);
nextTasks = showResult(result);

if (nextTasks !== null) {
  currentTasks = nextTasks;
}

showStats(currentTasks, "После выполнения задачи");

// Переименование

result = renameTask(
  currentTasks,
  10,
  "Подготовить инструкцию запуска"
);

nextTasks = showResult(result);

if (nextTasks !== null) {
  currentTasks = nextTasks;
}

showStats(currentTasks, "После переименования");

// Удаление

result = removeTask(currentTasks, 7);
nextTasks = showResult(result);

if (nextTasks !== null) {
  currentTasks = nextTasks;
}

showStats(currentTasks, "После удаления");

console.log("\nИтоговые задачи:");
console.table(currentTasks);

console.log("Итоговые ID:", currentTasks.map(task => task.id));

// Проверка ошибки

console.log("\nПроверка повторного добавления:");

result = addTask(
  currentTasks,
  20,
  "Повторная задача",
  "high"
);

showResult(result);

// Проверка исходных данных

console.log("\nИсходный demoTasks не изменился:");
console.table(demoTasks);

// ИНДИВИДУАЛЬНЫЙ ВАРИАНТ

console.log("\n================================");
console.log("ИНДИВИДУАЛЬНЫЙ ВАРИАНТ " + variantNumber);
console.log("Оформление технической документации");
console.log("================================");

let myTasks = variantTasks;

console.log("\nИсходные задачи варианта:");
console.table(myTasks);

showStats(myTasks, "Начальная статистика варианта");

// Добавление задачи ID 80

result = addTask(
  myTasks,
  80,
  "Подготовить итоговую документацию",
  "low"
);

nextTasks = showResult(result);

if (nextTasks !== null) {
  myTasks = nextTasks;
}

showStats(myTasks, "После добавления ID 80");

// Изменение статуса ID 11

result = setTaskCompleted(myTasks, 11, true);
nextTasks = showResult(result);

if (nextTasks !== null) {
  myTasks = nextTasks;
}

showStats(myTasks, "После изменения статуса ID 11");

// Переименование ID 23

result = renameTask(
  myTasks,
  23,
  "Описать структуру технической документации"
);

nextTasks = showResult(result);

if (nextTasks !== null) {
  myTasks = nextTasks;
}

showStats(myTasks, "После переименования ID 23");

// Удаление ID 37

result = removeTask(myTasks, 37);
nextTasks = showResult(result);

if (nextTasks !== null) {
  myTasks = nextTasks;
}

showStats(myTasks, "После удаления ID 37");

// Повторное добавление ID 80

console.log("\nПроверка повторного добавления ID 80:");

result = addTask(
  myTasks,
  80,
  "Повторная документация",
  "low"
);

showResult(result);

// Итог

console.log("\nИтоговые задачи варианта:");
console.table(myTasks);

console.log("Итоговые ID:", myTasks.map(task => task.id));

showStats(myTasks, "Итоговая статистика варианта");

console.log("\nИсходный variantTasks не изменился:");
console.table(variantTasks);
