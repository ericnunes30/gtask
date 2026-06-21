import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixIDOverflowBigInt1757936000005 implements MigrationInterface {
  name = 'FixIDOverflowBigInt1757936000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // PROJECTS TABLE - Convert id from integer to bigint
    // ============================================================

    // Drop foreign key constraints that reference projects
    await queryRunner.query(
      `ALTER TABLE occupations_projects DROP CONSTRAINT IF EXISTS occupations_projects_project_id_foreign`,
    );
    await queryRunner.query(
      `ALTER TABLE projects_users DROP CONSTRAINT IF EXISTS projects_users_project_id_foreign`,
    );
    await queryRunner.query(
      `ALTER TABLE recurring_tasks DROP CONSTRAINT IF EXISTS recurring_tasks_project_id_foreign`,
    );
    await queryRunner.query(
      `ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_project_id_foreign`,
    );

    // Drop primary key constraint
    await queryRunner.query(
      `ALTER TABLE projects DROP CONSTRAINT projects_pkey`,
    );

    // Change id column type from integer to bigint
    await queryRunner.query(
      `ALTER TABLE projects ALTER COLUMN id TYPE bigint USING id::bigint`,
    );

    // Recreate primary key constraint
    await queryRunner.query(
      `ALTER TABLE projects ADD CONSTRAINT projects_pkey PRIMARY KEY (id)`,
    );

    // Recreate foreign key constraints
    await queryRunner.query(
      `ALTER TABLE occupations_projects ADD CONSTRAINT occupations_projects_project_id_foreign FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE projects_users ADD CONSTRAINT projects_users_project_id_foreign FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE recurring_tasks ADD CONSTRAINT recurring_tasks_project_id_foreign FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE tasks ADD CONSTRAINT tasks_project_id_foreign FOREIGN KEY (project_id) REFERENCES projects(id)`,
    );

    // Update the sequence to use bigint
    await queryRunner.query(`ALTER SEQUENCE projects_id_seq AS bigint`);
    await queryRunner.query(
      `SELECT setval('projects_id_seq', (SELECT MAX(id) FROM projects))`,
    );

    // ============================================================
    // TASKS TABLE - Convert id from integer to bigint
    // ============================================================

    // Drop foreign key constraints that reference tasks
    await queryRunner.query(
      `ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_task_id_foreign`,
    );
    await queryRunner.query(
      `ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_task_id_foreign`,
    );
    await queryRunner.query(
      `ALTER TABLE occupations_tasks DROP CONSTRAINT IF EXISTS occupations_tasks_task_id_foreign`,
    );
    await queryRunner.query(
      `ALTER TABLE task_user DROP CONSTRAINT IF EXISTS task_user_task_id_foreign`,
    );

    // Drop foreign key constraints from tasks itself
    await queryRunner.query(
      `ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_project_id_foreign`,
    );
    await queryRunner.query(
      `ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_recurring_task_id_foreign`,
    );
    await queryRunner.query(
      `ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_task_reviewer_id_foreign`,
    );

    // Drop primary key constraint
    await queryRunner.query(`ALTER TABLE tasks DROP CONSTRAINT tasks_pkey`);

    // Change id column type from integer to bigint
    await queryRunner.query(
      `ALTER TABLE tasks ALTER COLUMN id TYPE bigint USING id::bigint`,
    );

    // Recreate primary key constraint
    await queryRunner.query(
      `ALTER TABLE tasks ADD CONSTRAINT tasks_pkey PRIMARY KEY (id)`,
    );

    // Recreate foreign key constraints
    await queryRunner.query(
      `ALTER TABLE tasks ADD CONSTRAINT tasks_project_id_foreign FOREIGN KEY (project_id) REFERENCES projects(id)`,
    );
    await queryRunner.query(
      `ALTER TABLE tasks ADD CONSTRAINT tasks_recurring_task_id_foreign FOREIGN KEY (recurring_task_id) REFERENCES recurring_tasks(id) ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE tasks ADD CONSTRAINT tasks_task_reviewer_id_foreign FOREIGN KEY (task_reviewer_id) REFERENCES users(id) ON DELETE SET NULL`,
    );

    // Recreate foreign key constraints that reference tasks
    await queryRunner.query(
      `ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_task_id_foreign FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE comments ADD CONSTRAINT comments_task_id_foreign FOREIGN KEY (task_id) REFERENCES tasks(id) ON UPDATE CASCADE ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE occupations_tasks ADD CONSTRAINT occupations_tasks_task_id_foreign FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE task_user ADD CONSTRAINT task_user_task_id_foreign FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE`,
    );

    // Update the sequence to use bigint
    await queryRunner.query(`ALTER SEQUENCE tasks_id_seq AS bigint`);
    await queryRunner.query(
      `SELECT setval('tasks_id_seq', (SELECT MAX(id) FROM tasks))`,
    );

    // ============================================================
    // RECURRING_TASKS TABLE - Convert id from integer to bigint
    // ============================================================

    // Drop foreign key constraints that reference recurring_tasks
    await queryRunner.query(
      `ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_recurring_task_id_foreign`,
    );

    // Drop primary key constraint
    await queryRunner.query(
      `ALTER TABLE recurring_tasks DROP CONSTRAINT recurring_tasks_pkey`,
    );

    // Change id column type from integer to bigint
    await queryRunner.query(
      `ALTER TABLE recurring_tasks ALTER COLUMN id TYPE bigint USING id::bigint`,
    );

    // Recreate primary key constraint
    await queryRunner.query(
      `ALTER TABLE recurring_tasks ADD CONSTRAINT recurring_tasks_pkey PRIMARY KEY (id)`,
    );

    // Recreate foreign key constraints
    await queryRunner.query(
      `ALTER TABLE tasks ADD CONSTRAINT tasks_recurring_task_id_foreign FOREIGN KEY (recurring_task_id) REFERENCES recurring_tasks(id) ON DELETE SET NULL`,
    );

    // Update the sequence to use bigint
    await queryRunner.query(`ALTER SEQUENCE recurring_tasks_id_seq AS bigint`);
    await queryRunner.query(
      `SELECT setval('recurring_tasks_id_seq', (SELECT MAX(id) FROM recurring_tasks))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse: Convert id from bigint back to integer

    // ============================================================
    // RECURRING_TASKS TABLE - Revert
    // ============================================================

    await queryRunner.query(
      `ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_recurring_task_id_foreign`,
    );
    await queryRunner.query(
      `ALTER TABLE recurring_tasks DROP CONSTRAINT recurring_tasks_pkey`,
    );
    await queryRunner.query(
      `ALTER TABLE recurring_tasks ALTER COLUMN id TYPE integer USING id::integer`,
    );
    await queryRunner.query(
      `ALTER TABLE recurring_tasks ADD CONSTRAINT recurring_tasks_pkey PRIMARY KEY (id)`,
    );
    await queryRunner.query(`ALTER SEQUENCE recurring_tasks_id_seq AS integer`);
    await queryRunner.query(
      `SELECT setval('recurring_tasks_id_seq', (SELECT MAX(id) FROM recurring_tasks))`,
    );
    await queryRunner.query(
      `ALTER TABLE tasks ADD CONSTRAINT tasks_recurring_task_id_foreign FOREIGN KEY (recurring_task_id) REFERENCES recurring_tasks(id) ON DELETE SET NULL`,
    );

    // ============================================================
    // TASKS TABLE - Revert
    // ============================================================

    await queryRunner.query(
      `ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_task_id_foreign`,
    );
    await queryRunner.query(
      `ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_task_id_foreign`,
    );
    await queryRunner.query(
      `ALTER TABLE occupations_tasks DROP CONSTRAINT IF EXISTS occupations_tasks_task_id_foreign`,
    );
    await queryRunner.query(
      `ALTER TABLE task_user DROP CONSTRAINT IF EXISTS task_user_task_id_foreign`,
    );
    await queryRunner.query(
      `ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_project_id_foreign`,
    );
    await queryRunner.query(
      `ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_recurring_task_id_foreign`,
    );
    await queryRunner.query(
      `ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_task_reviewer_id_foreign`,
    );
    await queryRunner.query(`ALTER TABLE tasks DROP CONSTRAINT tasks_pkey`);
    await queryRunner.query(
      `ALTER TABLE tasks ALTER COLUMN id TYPE integer USING id::integer`,
    );
    await queryRunner.query(
      `ALTER TABLE tasks ADD CONSTRAINT tasks_pkey PRIMARY KEY (id)`,
    );
    await queryRunner.query(
      `ALTER TABLE tasks ADD CONSTRAINT tasks_project_id_foreign FOREIGN KEY (project_id) REFERENCES projects(id)`,
    );
    await queryRunner.query(
      `ALTER TABLE tasks ADD CONSTRAINT tasks_recurring_task_id_foreign FOREIGN KEY (recurring_task_id) REFERENCES recurring_tasks(id) ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE tasks ADD CONSTRAINT tasks_task_reviewer_id_foreign FOREIGN KEY (task_reviewer_id) REFERENCES users(id) ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_task_id_foreign FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE comments ADD CONSTRAINT comments_task_id_foreign FOREIGN KEY (task_id) REFERENCES tasks(id) ON UPDATE CASCADE ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE occupations_tasks ADD CONSTRAINT occupations_tasks_task_id_foreign FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE task_user ADD CONSTRAINT task_user_task_id_foreign FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE`,
    );
    await queryRunner.query(`ALTER SEQUENCE tasks_id_seq AS integer`);
    await queryRunner.query(
      `SELECT setval('tasks_id_seq', (SELECT MAX(id) FROM tasks))`,
    );

    // ============================================================
    // PROJECTS TABLE - Revert
    // ============================================================

    await queryRunner.query(
      `ALTER TABLE occupations_projects DROP CONSTRAINT IF EXISTS occupations_projects_project_id_foreign`,
    );
    await queryRunner.query(
      `ALTER TABLE projects_users DROP CONSTRAINT IF EXISTS projects_users_project_id_foreign`,
    );
    await queryRunner.query(
      `ALTER TABLE recurring_tasks DROP CONSTRAINT IF EXISTS recurring_tasks_project_id_foreign`,
    );
    await queryRunner.query(
      `ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_project_id_foreign`,
    );
    await queryRunner.query(
      `ALTER TABLE projects DROP CONSTRAINT projects_pkey`,
    );
    await queryRunner.query(
      `ALTER TABLE projects ALTER COLUMN id TYPE integer USING id::integer`,
    );
    await queryRunner.query(
      `ALTER TABLE projects ADD CONSTRAINT projects_pkey PRIMARY KEY (id)`,
    );
    await queryRunner.query(
      `ALTER TABLE occupations_projects ADD CONSTRAINT occupations_projects_project_id_foreign FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE projects_users ADD CONSTRAINT projects_users_project_id_foreign FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE recurring_tasks ADD CONSTRAINT recurring_tasks_project_id_foreign FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE tasks ADD CONSTRAINT tasks_project_id_foreign FOREIGN KEY (project_id) REFERENCES projects(id)`,
    );
    await queryRunner.query(`ALTER SEQUENCE projects_id_seq AS integer`);
    await queryRunner.query(
      `SELECT setval('projects_id_seq', (SELECT MAX(id) FROM projects))`,
    );
  }
}
