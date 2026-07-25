import dataSource from '../src/database/data-source';
import { hashSync } from 'bcrypt';

const PASSWORD_HASH = '$2b$10$d5DOt00sxWcOKiuwikBwIOsz7KGMa6Wn2HYpyqdm.buJf.vk7wPoO';

async function seed() {
  await dataSource.initialize();
  const qr = dataSource.createQueryRunner();
  console.log('🔌 Connected to database');

  // ============================================
  // 1. CLEAN EXISTING PROJECTS AND TASKS
  // ============================================
  console.log('🧹 Cleaning existing projects and tasks...');
  await qr.query('DELETE FROM task_user');
  await qr.query('DELETE FROM occupations_tasks');
  await qr.query('DELETE FROM comments');
  await qr.query('DELETE FROM activity_logs WHERE task_id IS NOT NULL');
  await qr.query('DELETE FROM tasks');
  await qr.query('DELETE FROM projects_users');
  await qr.query('DELETE FROM occupations_projects');
  await qr.query('DELETE FROM projects');
  console.log('✅ Existing projects and tasks cleaned');

  // ============================================
  // 2. SEED ROLES (if not exists)
  // ============================================
  console.log('👤 Ensuring roles exist...');
  const roles = [
    { name: 'ADMIN', description: 'Administrador do sistema' },
    { name: 'MANAGER', description: 'Gerente de projetos' },
    { name: 'USER', description: 'Usuário padrão' },
    { name: 'MEMBER', description: 'Membro da equipe' },
  ];
  for (const r of roles) {
    const existing = await qr.query('SELECT id FROM roles WHERE name = $1', [r.name]);
    if (existing.length === 0) {
      await qr.query(
        `INSERT INTO roles (name, description, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())`,
        [r.name, r.description],
      );
    }
  }
  const roleRows = await qr.query('SELECT id, name FROM roles');
  const roleMap = Object.fromEntries(roleRows.map((r: any) => [r.name, r.id]));
  console.log('✅ Roles ready');

  // ============================================
  // 3. SEED USERS (skip if email already exists)
  // ============================================
  console.log('👥 Seeding users...');
  const usersData = [
    { name: 'Carlos Silva', email: 'carlos@empresa.com', roles: ['MANAGER'] },
    { name: 'Maria Oliveira', email: 'maria@empresa.com', roles: ['USER'] },
    { name: 'João Pereira', email: 'joao@empresa.com', roles: ['USER'] },
    { name: 'Ana Costa', email: 'ana@empresa.com', roles: ['USER'] },
    { name: 'Pedro Santos', email: 'pedro@empresa.com', roles: ['MEMBER'] },
    { name: 'Fernanda Lima', email: 'fernanda@empresa.com', roles: ['MEMBER'] },
    { name: 'Roberto Almeida', email: 'roberto@empresa.com', roles: ['MANAGER'] },
    { name: 'Juliana Martins', email: 'juliana@empresa.com', roles: ['USER'] },
  ];

  const userIds: number[] = [];
  for (const u of usersData) {
    const existing = await qr.query('SELECT id FROM users WHERE email = $1', [u.email]);
    let uid: number;
    if (existing.length > 0) {
      uid = existing[0].id;
    } else {
      const insert = await qr.query(
        `INSERT INTO users (name, email, password, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, true, NOW(), NOW())
         RETURNING id`,
        [u.name, u.email, PASSWORD_HASH],
      );
      uid = insert[0].id;
    }
    userIds.push(uid);

    // Associate roles
    for (const rname of u.roles) {
      const rid = roleMap[rname];
      if (rid) {
        await qr.query(
          `INSERT INTO users_roles (user_id, role_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [uid, rid],
        );
      }
    }
  }

  // Associate ADMIN role to admin@teste.com if exists
  const adminRow = await qr.query('SELECT id FROM users WHERE email = $1', ['admin@teste.com']);
  if (adminRow.length > 0) {
    const adminId = adminRow[0].id;
    const adminRoleId = roleMap['ADMIN'];
    if (adminRoleId) {
      await qr.query(
        `INSERT INTO users_roles (user_id, role_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [adminId, adminRoleId],
      );
    }
    userIds.unshift(adminId);
  }
  console.log('✅ Users seeded');

  // ============================================
  // 4. SEED OCCUPATIONS (teams)
  // ============================================
  console.log('🏢 Seeding occupations...');
  const occupationsData = [
    'Desenvolvimento',
    'Design UX/UI',
    'Marketing Digital',
    'Quality Assurance',
    'DevOps',
    'Suporte Técnico',
    'Product Owner',
    'Scrum Master',
  ];
  const occIds: number[] = [];
  for (const name of occupationsData) {
    const existing = await qr.query('SELECT id FROM occupations WHERE name = $1', [name]);
    let oid: number;
    if (existing.length > 0) {
      oid = existing[0].id;
    } else {
      const insert = await qr.query(
        `INSERT INTO occupations (name, created_at, updated_at)
         VALUES ($1, NOW(), NOW())
         RETURNING id`,
        [name],
      );
      oid = insert[0].id;
    }
    occIds.push(oid);
  }
  console.log('✅ Occupations seeded');

  // Associate users to occupations
  for (let i = 0; i < userIds.length; i++) {
    await qr.query(
      `INSERT INTO users_occupations (user_id, occupation_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userIds[i], occIds[i % occIds.length]],
    );
  }

  // ============================================
  // 5. SEED PROJECTS
  // ============================================
  console.log('📁 Seeding projects...');
  const projectsData = [
    {
      title: 'Sistema de E-commerce',
      desc: 'Plataforma de vendas online com integração de pagamentos, carrinho e gestão de estoque.',
      priority: 'alta',
      start: '2025-01-15',
      end: '2025-06-30',
    },
    {
      title: 'App Mobile de Delivery',
      desc: 'Aplicativo de entrega de comida com rastreamento em tempo real e push notifications.',
      priority: 'urgente',
      start: '2025-02-01',
      end: '2025-05-15',
    },
    {
      title: 'Dashboard de Analytics',
      desc: 'Painel de controle com gráficos interativos, relatórios de performance e exportação.',
      priority: 'media',
      start: '2025-03-10',
      end: '2025-08-20',
    },
    {
      title: 'Portal do Cliente',
      desc: 'Área do cliente com tickets de suporte, FAQ e documentação técnica.',
      priority: 'baixa',
      start: '2025-04-01',
      end: '2025-09-15',
    },
    {
      title: 'Integração APIs Legadas',
      desc: 'Integração com sistemas legados via REST, SOAP e WebSocket para migração de dados.',
      priority: 'alta',
      start: '2025-05-01',
      end: '2025-07-30',
    },
    {
      title: 'Blog Corporativo',
      desc: 'Sistema de blog com CMS personalizado, SEO otimizado e integração com redes sociais.',
      priority: 'media',
      start: '2025-06-01',
      end: '2025-10-31',
    },
    {
      title: 'Infraestrutura Cloud',
      desc: 'Migração de servidores on-premise para AWS/GCP com CI/CD e monitoramento.',
      priority: 'urgente',
      start: '2025-07-01',
      end: '2025-12-15',
    },
    {
      title: 'Sistema de CRM',
      desc: 'Gestão de relacionamento com clientes, pipeline de vendas e automação de emails.',
      priority: 'alta',
      start: '2025-08-01',
      end: '2025-11-30',
    },
  ];

  const projectIds: number[] = [];
  for (const p of projectsData) {
    const insert = await qr.query(
      `INSERT INTO projects (title, description, priority, status, start_date, end_date, created_at, updated_at)
       VALUES ($1, $2, $3::projects_priority_enum, true, $4, $5, NOW(), NOW())
       RETURNING id`,
      [p.title, p.desc, p.priority, p.start, p.end],
    );
    const pid = insert[0].id;
    projectIds.push(pid);

    // Associate random users (2-4 per project)
    const numUsers = 2 + Math.floor(Math.random() * 3);
    const shuffled = [...userIds].sort(() => Math.random() - 0.5);
    for (let i = 0; i < numUsers; i++) {
      await qr.query(
        `INSERT INTO projects_users (project_id, user_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [pid, shuffled[i]],
      );
    }

    // Associate random occupations (1-2 per project)
    const numOcc = 1 + Math.floor(Math.random() * 2);
    const shuffledOcc = [...occIds].sort(() => Math.random() - 0.5);
    for (let i = 0; i < numOcc; i++) {
      await qr.query(
        `INSERT INTO occupations_projects (occupation_id, project_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [shuffledOcc[i], pid],
      );
    }
  }
  console.log('✅ Projects seeded');

  // ============================================
  // 6. SEED TASKS
  // ============================================
  console.log('📝 Seeding tasks...');
  const taskTemplates = [
    { title: 'Definir arquitetura do sistema', status: 'concluido', priority: 'alta' },
    { title: 'Criar wireframes das telas', status: 'concluido', priority: 'media' },
    { title: 'Configurar ambiente de desenvolvimento', status: 'em_andamento', priority: 'alta' },
    { title: 'Desenvolver módulo de autenticação', status: 'em_andamento', priority: 'urgente' },
    { title: 'Implementar CRUD de usuários', status: 'a_fazer', priority: 'alta' },
    { title: 'Criar relatórios de performance', status: 'a_fazer', priority: 'media' },
    { title: 'Testes de integração E2E', status: 'em_revisao', priority: 'alta' },
    { title: 'Revisão de código do time', status: 'em_revisao', priority: 'media' },
    { title: 'Aprovação do cliente para deploy', status: 'aguardando_cliente', priority: 'baixa' },
    { title: 'Documentação técnica da API', status: 'pendente', priority: 'baixa' },
    { title: 'Otimização de queries SQL', status: 'pendente', priority: 'media' },
    { title: 'Correção de bugs pós-lançamento', status: 'cancelado', priority: 'baixa' },
  ];

  let taskCount = 0;
  for (const projectId of projectIds) {
    // Get project users and occupations for this project
    const projUsers = await qr.query(
      'SELECT user_id FROM projects_users WHERE project_id = $1',
      [projectId],
    );
    const projOccs = await qr.query(
      'SELECT occupation_id FROM occupations_projects WHERE project_id = $1',
      [projectId],
    );

    const projUserIds = projUsers.map((r: any) => r.user_id);
    const projOccIds = projOccs.map((r: any) => r.occupation_id);

    for (let i = 0; i < taskTemplates.length; i++) {
      const template = taskTemplates[i];
      const assignee = projUserIds[i % projUserIds.length] || userIds[0];

      const insert = await qr.query(
        `INSERT INTO tasks (title, description, priority, status, project_id, "order", start_date, due_date, timer, has_detailed_fields, created_at, updated_at)
         VALUES ($1, $2, $3::tasks_priority_enum, $4::tasks_status_enum, $5, $6, NOW(), NOW() + INTERVAL '7 days', 0, false, NOW(), NOW())
         RETURNING id`,
        [
          `${template.title} - Projeto #${projectId}`,
          `Tarefa do projeto. Status: ${template.status}. Prioridade: ${template.priority}.`,
          template.priority,
          template.status,
          projectId,
          i + 1,
        ],
      );
      const tid = insert[0].id;
      taskCount++;

      // Associate user to task
      await qr.query(
        `INSERT INTO task_user (task_id, user_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [tid, assignee],
      );

      // Associate occupation to task
      if (projOccIds.length > 0) {
        const occ = projOccIds[i % projOccIds.length];
        await qr.query(
          `INSERT INTO occupations_tasks (occupation_id, task_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [occ, tid],
        );
      }
    }
  }
  console.log(`✅ ${taskCount} tasks seeded`);

  // ============================================
  // 7. SEED COMMENTS
  // ============================================
  console.log('💬 Seeding comments...');
  const commentTexts = [
    'Ótimo progresso! Continuem assim.',
    'Precisamos revisar essa implementação.',
    'Vou trabalhar nisso amanhã.',
    'Bug encontrado no ambiente de teste.',
    'Cliente aprovou o design.',
    'Falta adicionar validação de campos.',
    'Documentação atualizada no Confluence.',
    'Reunião de alinhamento agendada para sexta.',
  ];

  const allTasks = await qr.query('SELECT id, project_id FROM tasks ORDER BY RANDOM() LIMIT 40');
  for (const task of allTasks) {
    const commenters = await qr.query(
      'SELECT user_id FROM projects_users WHERE project_id = $1 ORDER BY RANDOM() LIMIT 2',
      [task.project_id],
    );
    for (const c of commenters) {
      await qr.query(
        `INSERT INTO comments (content, task_id, user_id, parent_id, likes_count, created_at, updated_at)
         VALUES ($1, $2, $3, NULL, 0, NOW(), NOW())`,
        [commentTexts[Math.floor(Math.random() * commentTexts.length)], task.id, c.user_id],
      );
    }
  }
  console.log('✅ Comments seeded');

  // ============================================
  // SUMMARY
  // ============================================
  const counts = await qr.query(`
    SELECT
      (SELECT COUNT(*) FROM roles) as roles,
      (SELECT COUNT(*) FROM users) as users,
      (SELECT COUNT(*) FROM occupations) as occupations,
      (SELECT COUNT(*) FROM projects) as projects,
      (SELECT COUNT(*) FROM tasks) as tasks,
      (SELECT COUNT(*) FROM comments) as comments
  `);

  const c = counts[0];
  console.log('\n🎉 SEED COMPLETED SUCCESSFULLY!\n');
  console.log(`   Roles:        ${c.roles}`);
  console.log(`   Users:        ${c.users}`);
  console.log(`   Occupations:  ${c.occupations}`);
  console.log(`   Projects:     ${c.projects}`);
  console.log(`   Tasks:        ${c.tasks}`);
  console.log(`   Comments:     ${c.comments}`);

  await dataSource.destroy();
  console.log('\n🔌 Disconnected from database');
}

seed().catch((err: any) => {
  console.error('❌ Seed failed:', err.message || err);
  dataSource.destroy().catch(() => {});
  process.exit(1);
});
