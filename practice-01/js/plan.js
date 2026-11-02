"use strict";

const totalTasks = 14;
const completedTasks = 4;
const dailyLimit = 4;

// Здесь разместите своё решение.
const isValidTotal =
  Number.isInteger(totalTasks) &&
  totalTasks >= 0 &&
  totalTasks <= 1000;

const isValidCompleted =
  Number.isInteger(completedTasks) &&
  completedTasks >= 0 &&
  completedTasks <= totalTasks;

// Проверка dailyLimit
const isValidLimit =
  Number.isInteger(dailyLimit) &&
  dailyLimit >= 1 &&
  dailyLimit <= 1000;

if (!isValidTotal) {
  console.log("Ошибка: totalTasks должно быть целым числом от 0 до 1000.");
} else if (!isValidCompleted) {
  console.log("Ошибка: completedTasks должно быть целым числом от 0 до totalTasks.");
} else if (!isValidLimit) {
  console.log("Ошибка: dailyLimit должно быть целым числом от 1 до 1000.");
} else {
  let remaining = totalTasks - completedTasks;

  if (remaining === 0) {
    console.log("Все задачи уже выполнены.");
    console.log("Потребуется дней: 0");
  } else {
    console.log(`Осталось задач: ${remaining}`);

    let day = 0;

    while (remaining > 0) {
      day += 1;
      const tasksToday = Math.min(dailyLimit, remaining);
      remaining -= tasksToday;
      console.log(`День ${day}: выполнено ${tasksToday}, осталось ${remaining}`);
    }

    console.log(`Потребуется дней: ${day}`);
  }
}