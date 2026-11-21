import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../../src/app.js';
import { createFakeStore } from '../support/fake-store.js';
import { request, startServer } from '../support/http.js';

test('Вариант 8: PATCH после удаления задачи между проверкой и UPDATE возвращает 404', async () => {
  const store = createFakeStore();
  const originalGetTask = store.getTask.bind(store);
  let lookedUp = false;

  store.getTask = async (id) => {
    const task = await originalGetTask(id);
    if (id === 4 && task) lookedUp = true;
    return task;
  };

  store.updateTask = async (id) => {
    assert.equal(lookedUp, true);
    assert.equal(id, 4);
    // Имитируем удаление строки после requireTask, но до завершения UPDATE.
    return null;
  };

  const running = await startServer(createApp({ store }));
  try {
    const answer = await request(running.origin, '/api/tasks/4', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: false }),
    });

    assert.equal(answer.response.status, 404);
    assert.deepEqual(answer.body.error, {
      code: 'TASK_NOT_FOUND',
      message: 'Задача не найдена.',
      details: { id: 4 },
    });
  } finally {
    await running.close();
  }
});
