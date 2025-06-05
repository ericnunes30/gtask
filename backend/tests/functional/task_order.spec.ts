import { test } from '@japa/runner'
import Task from '#models/task'

const baseTask = {
  title: 'Task',
  description: 'desc',
  priority: 'media',
  status: 'a_fazer',
  start_date: new Date('2025-05-10T00:00:00Z'),
  due_date: new Date('2025-05-11T00:00:00Z'),
  project_id: 1,
}

test.group('Task order', (group) => {
  group.each.setup(async () => {
    await Task.truncate(true)
  })

  test('index retorna tarefas ordenadas por status e order', async ({ client, assert }) => {
    await Task.create({ ...baseTask, title: 'T1', order: 20 })
    await Task.create({ ...baseTask, title: 'T2', order: 10 })

    const res = await client.get('/task')
    res.assertStatus(200)
    const orders = res.body().map((t: any) => t.order)
    assert.deepEqual(orders, [10, 20])
  })

  test('atualizar apenas order reordena resultados', async ({ client, assert }) => {
    const t1 = await Task.create({ ...baseTask, title: 'T1', order: 20 })
    await Task.create({ ...baseTask, title: 'T2', order: 10 })

    await client.patch(`/task/${t1.id}`).json({ order: 5 }).assertStatus(200)

    const res = await client.get('/task')
    res.assertStatus(200)
    const orders = res.body().map((t: any) => t.order)
    assert.deepEqual(orders, [5, 10])
  })
})
