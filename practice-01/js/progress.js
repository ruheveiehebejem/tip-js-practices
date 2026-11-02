"use strict";

const totalTasks = 14;
const completedTasks = 4;

// Здесь разместите своё решение.
const isValidTotal =
  Number.isInteger(totalTasks) &&
  totalTasks >= 0 &&
  totalTasks <= 1000;

const isValidCompleted =
  Number.isInteger(completedTasks) &&
  completedTasks >= 0 &&
  completedTasks <= totalTasks;

if (!isValidTotal) {
  console.log("Ошибка: totalTasks должно быть целым числом от 0 до 1000.");
} else if (!isValidCompleted) {
  console.log("Ошибка: completedTasks должно быть целым числом от 0 до totalTasks.");
} else if (totalTasks === 0 && completedTasks === 0) {
  console.log("Задач пока нет.");
} else {
  const remainingTasks = totalTasks - completedTasks;
  const percentage = (completedTasks / totalTasks) * 100;

  let status;
  if (completedTasks === 0) {
    status = "Не начато";
  } else if (completedTasks === totalTasks) {
    status = "Завершено";
  } else {
    status = "В работе";
  }

  console.log(`Всего задач: ${totalTasks}`);
  console.log(`Выполнено: ${completedTasks}`);
  console.log(`Осталось: ${remainingTasks}`);
  console.log(`Прогресс: ${percentage.toFixed(1)}%`);
  console.log(`Статус: ${status}`);
}