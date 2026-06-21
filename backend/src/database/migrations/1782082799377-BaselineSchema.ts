import { MigrationInterface, QueryRunner } from 'typeorm';

export class BaselineSchema1782082799377 implements MigrationInterface {
  name = 'BaselineSchema1782082799377';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "task_locks" ("lockKey" character varying(255) NOT NULL, "instanceId" character varying(255) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f3c2cf9f7c47f3657ee64165bd6" PRIMARY KEY ("lockKey"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."projects_priority_enum" AS ENUM('baixa', 'media', 'alta', 'urgente')`,
    );
    await queryRunner.query(
      `CREATE TABLE "projects" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "description" text, "status" boolean NOT NULL, "priority" "public"."projects_priority_enum" NOT NULL, "start_date" TIMESTAMP NOT NULL, "end_date" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "occupations" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0bf09083dd897df1e8ebb96b5c1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "roles" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "comment_likes" ("id" SERIAL NOT NULL, "comment_id" integer NOT NULL, "user_id" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_660059072f131c773be5f37c475" UNIQUE ("comment_id", "user_id"), CONSTRAINT "PK_2c299aaf1f903c45ee7e6c7b419" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "comments" ("id" SERIAL NOT NULL, "content" text NOT NULL, "task_id" integer NOT NULL, "user_id" integer NOT NULL, "parent_id" integer, "likes_count" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8bf68bc960f2b69e818bdb90dcb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."structured_notifications_type_enum" AS ENUM('task.created', 'task.updated', 'task.status.changed', 'task.assigned', 'comment.created', 'timer.started', 'timer.paused', 'timer.completed', 'user.mentioned', 'project.updated')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."structured_notifications_priority_enum" AS ENUM('low', 'medium', 'high', 'urgent')`,
    );
    await queryRunner.query(
      `CREATE TABLE "structured_notifications" ("id" SERIAL NOT NULL, "type" "public"."structured_notifications_type_enum" NOT NULL, "priority" "public"."structured_notifications_priority_enum" NOT NULL, "data" jsonb NOT NULL, "metadata" jsonb NOT NULL, "user_id" integer NOT NULL, "is_read" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "expires_at" TIMESTAMP WITH TIME ZONE, "delivered_at" TIMESTAMP WITH TIME ZONE, "read_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_8d54d4e1765fc48f0a98458d890" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f798a60a91bb2557cd67a2258e" ON "structured_notifications" ("priority") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a538d428814e54b7e7dbea5cdd" ON "structured_notifications" ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bb877455cb9444e90004bb5814" ON "structured_notifications" ("user_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "is_active" boolean NOT NULL DEFAULT true, "whatsapp" character varying, "whatsapp_notifications_enabled" boolean NOT NULL DEFAULT false, "whatsapp_priority_threshold" character varying NOT NULL DEFAULT 'MEDIUM', "whatsapp_quiet_hours_start" character varying, "whatsapp_quiet_hours_end" character varying, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."recurring_tasks_schedule_type_enum" AS ENUM('interval', 'cron')`,
    );
    await queryRunner.query(
      `CREATE TABLE "recurring_tasks" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "template_data" jsonb NOT NULL, "next_due_date" TIMESTAMP NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "schedule_type" "public"."recurring_tasks_schedule_type_enum" NOT NULL, "frequency_interval" character varying, "frequency_cron" character varying, "user_id" integer NOT NULL, "project_id" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9a998c7a4854b2789d988bc9750" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "activity_logs" ("id" SERIAL NOT NULL, "user_id" integer, "task_id" integer, "action_type" character varying NOT NULL, "changed_field" character varying, "old_value" text, "new_value" text, "reference_id" integer, "details" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f25287b6140c5ba18d38776a796" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tasks_priority_enum" AS ENUM('baixa', 'media', 'alta', 'urgente')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tasks_status_enum" AS ENUM('pendente', 'a_fazer', 'em_andamento', 'em_revisao', 'aguardando_cliente', 'concluido', 'cancelado')`,
    );
    await queryRunner.query(
      `CREATE TABLE "tasks" ("id" SERIAL NOT NULL, "order" integer, "title" character varying(255) NOT NULL, "description" text, "priority" "public"."tasks_priority_enum" NOT NULL, "status" "public"."tasks_status_enum" NOT NULL, "start_date" TIMESTAMP, "due_date" TIMESTAMP, "timer" integer NOT NULL DEFAULT '0', "project_id" integer NOT NULL, "recurring_task_id" integer, "task_reviewer_id" integer, "video_url" character varying(500), "useful_links" jsonb, "observations" text, "has_detailed_fields" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "projects_users" ("project_id" integer NOT NULL, "user_id" integer NOT NULL, CONSTRAINT "PK_2bdf8b14b34ac191f9fa6c67672" PRIMARY KEY ("project_id", "user_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b7d782db86a3dc1bd3b7eaed1f" ON "projects_users" ("project_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_274bd757ae91379bf033a2dacc" ON "projects_users" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "users_occupations" ("occupation_id" integer NOT NULL, "user_id" integer NOT NULL, CONSTRAINT "PK_f8625d8b90995de73cc282f5582" PRIMARY KEY ("occupation_id", "user_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_60ecd28b9d06e9f64363e5b32d" ON "users_occupations" ("occupation_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c884d18b03e6220434c3c92b8f" ON "users_occupations" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "occupations_projects" ("occupation_id" integer NOT NULL, "project_id" integer NOT NULL, CONSTRAINT "PK_9d9f7a510200e8bc132f860e676" PRIMARY KEY ("occupation_id", "project_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e98b73da203ea9b316fee73ed7" ON "occupations_projects" ("occupation_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_378dacf4f13dd98e374497113f" ON "occupations_projects" ("project_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "occupations_tasks" ("occupation_id" integer NOT NULL, "task_id" integer NOT NULL, CONSTRAINT "PK_9556b1b66fd45d61646166ad7c0" PRIMARY KEY ("occupation_id", "task_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_86087d8ed5b57bc02240104eda" ON "occupations_tasks" ("occupation_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1b5e4c975551bbca99eadac342" ON "occupations_tasks" ("task_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "comment_user_mentions" ("comment_id" integer NOT NULL, "user_id" integer NOT NULL, CONSTRAINT "PK_c212db64c9141269ebdc1774ea3" PRIMARY KEY ("comment_id", "user_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_883fe3321241cddaa50d2c9bf7" ON "comment_user_mentions" ("comment_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_665eef9997b6ec910076844ae8" ON "comment_user_mentions" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "users_roles" ("user_id" integer NOT NULL, "role_id" integer NOT NULL, CONSTRAINT "PK_c525e9373d63035b9919e578a9c" PRIMARY KEY ("user_id", "role_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e4435209df12bc1f001e536017" ON "users_roles" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1cf664021f00b9cc1ff95e17de" ON "users_roles" ("role_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "task_user" ("task_id" integer NOT NULL, "user_id" integer NOT NULL, CONSTRAINT "PK_8565c55d174b63283fffc32e9ac" PRIMARY KEY ("task_id", "user_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_92c6c68c7c7254a79d875691b6" ON "task_user" ("task_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e03fae50af89456e1826536477" ON "task_user" ("user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "comment_likes" ADD CONSTRAINT "FK_2073bf518ef7017ec19319a65e5" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment_likes" ADD CONSTRAINT "FK_bdba9a10c64ff58d36b09e3ac45" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" ADD CONSTRAINT "FK_4c675567d2a58f0b07cef09c13d" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" ADD CONSTRAINT "FK_18c2493067c11f44efb35ca0e03" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" ADD CONSTRAINT "FK_d6f93329801a93536da4241e386" FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "structured_notifications" ADD CONSTRAINT "FK_0de7db1e5fd5034469ac8ca97ed" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "recurring_tasks" ADD CONSTRAINT "FK_20fe680a6177870834270505522" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "recurring_tasks" ADD CONSTRAINT "FK_51862962b842dba8f3356391aa7" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_logs" ADD CONSTRAINT "FK_d54f841fa5478e4734590d44036" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_logs" ADD CONSTRAINT "FK_300e98d0bf7b02d33e952ad0508" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_9eecdb5b1ed8c7c2a1b392c28d4" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_6b96ed6d23fbd594b069e704777" FOREIGN KEY ("recurring_task_id") REFERENCES "recurring_tasks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_a88fec819e632707636659e7d93" FOREIGN KEY ("task_reviewer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects_users" ADD CONSTRAINT "FK_b7d782db86a3dc1bd3b7eaed1fd" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects_users" ADD CONSTRAINT "FK_274bd757ae91379bf033a2daccd" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "users_occupations" ADD CONSTRAINT "FK_60ecd28b9d06e9f64363e5b32db" FOREIGN KEY ("occupation_id") REFERENCES "occupations"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "users_occupations" ADD CONSTRAINT "FK_c884d18b03e6220434c3c92b8f5" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "occupations_projects" ADD CONSTRAINT "FK_e98b73da203ea9b316fee73ed7a" FOREIGN KEY ("occupation_id") REFERENCES "occupations"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "occupations_projects" ADD CONSTRAINT "FK_378dacf4f13dd98e374497113f0" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "occupations_tasks" ADD CONSTRAINT "FK_86087d8ed5b57bc02240104eda4" FOREIGN KEY ("occupation_id") REFERENCES "occupations"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "occupations_tasks" ADD CONSTRAINT "FK_1b5e4c975551bbca99eadac3426" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment_user_mentions" ADD CONSTRAINT "FK_883fe3321241cddaa50d2c9bf74" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment_user_mentions" ADD CONSTRAINT "FK_665eef9997b6ec910076844ae8f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "users_roles" ADD CONSTRAINT "FK_e4435209df12bc1f001e5360174" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "users_roles" ADD CONSTRAINT "FK_1cf664021f00b9cc1ff95e17de4" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_user" ADD CONSTRAINT "FK_92c6c68c7c7254a79d875691b6a" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_user" ADD CONSTRAINT "FK_e03fae50af89456e18265364771" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `INSERT INTO "roles"("name", "description") VALUES ('ADMIN', 'System Administrator'), ('GERENTE', 'Manager'), ('USER', 'Standard User')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "task_user" DROP CONSTRAINT "FK_e03fae50af89456e18265364771"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_user" DROP CONSTRAINT "FK_92c6c68c7c7254a79d875691b6a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users_roles" DROP CONSTRAINT "FK_1cf664021f00b9cc1ff95e17de4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users_roles" DROP CONSTRAINT "FK_e4435209df12bc1f001e5360174"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment_user_mentions" DROP CONSTRAINT "FK_665eef9997b6ec910076844ae8f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment_user_mentions" DROP CONSTRAINT "FK_883fe3321241cddaa50d2c9bf74"`,
    );
    await queryRunner.query(
      `ALTER TABLE "occupations_tasks" DROP CONSTRAINT "FK_1b5e4c975551bbca99eadac3426"`,
    );
    await queryRunner.query(
      `ALTER TABLE "occupations_tasks" DROP CONSTRAINT "FK_86087d8ed5b57bc02240104eda4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "occupations_projects" DROP CONSTRAINT "FK_378dacf4f13dd98e374497113f0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "occupations_projects" DROP CONSTRAINT "FK_e98b73da203ea9b316fee73ed7a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users_occupations" DROP CONSTRAINT "FK_c884d18b03e6220434c3c92b8f5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users_occupations" DROP CONSTRAINT "FK_60ecd28b9d06e9f64363e5b32db"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects_users" DROP CONSTRAINT "FK_274bd757ae91379bf033a2daccd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects_users" DROP CONSTRAINT "FK_b7d782db86a3dc1bd3b7eaed1fd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT "FK_a88fec819e632707636659e7d93"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT "FK_6b96ed6d23fbd594b069e704777"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT "FK_9eecdb5b1ed8c7c2a1b392c28d4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_logs" DROP CONSTRAINT "FK_300e98d0bf7b02d33e952ad0508"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_logs" DROP CONSTRAINT "FK_d54f841fa5478e4734590d44036"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recurring_tasks" DROP CONSTRAINT "FK_51862962b842dba8f3356391aa7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recurring_tasks" DROP CONSTRAINT "FK_20fe680a6177870834270505522"`,
    );
    await queryRunner.query(
      `ALTER TABLE "structured_notifications" DROP CONSTRAINT "FK_0de7db1e5fd5034469ac8ca97ed"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" DROP CONSTRAINT "FK_d6f93329801a93536da4241e386"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" DROP CONSTRAINT "FK_18c2493067c11f44efb35ca0e03"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" DROP CONSTRAINT "FK_4c675567d2a58f0b07cef09c13d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment_likes" DROP CONSTRAINT "FK_bdba9a10c64ff58d36b09e3ac45"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment_likes" DROP CONSTRAINT "FK_2073bf518ef7017ec19319a65e5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e03fae50af89456e1826536477"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_92c6c68c7c7254a79d875691b6"`,
    );
    await queryRunner.query(`DROP TABLE "task_user"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1cf664021f00b9cc1ff95e17de"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e4435209df12bc1f001e536017"`,
    );
    await queryRunner.query(`DROP TABLE "users_roles"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_665eef9997b6ec910076844ae8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_883fe3321241cddaa50d2c9bf7"`,
    );
    await queryRunner.query(`DROP TABLE "comment_user_mentions"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1b5e4c975551bbca99eadac342"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_86087d8ed5b57bc02240104eda"`,
    );
    await queryRunner.query(`DROP TABLE "occupations_tasks"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_378dacf4f13dd98e374497113f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e98b73da203ea9b316fee73ed7"`,
    );
    await queryRunner.query(`DROP TABLE "occupations_projects"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c884d18b03e6220434c3c92b8f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_60ecd28b9d06e9f64363e5b32d"`,
    );
    await queryRunner.query(`DROP TABLE "users_occupations"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_274bd757ae91379bf033a2dacc"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b7d782db86a3dc1bd3b7eaed1f"`,
    );
    await queryRunner.query(`DROP TABLE "projects_users"`);
    await queryRunner.query(`DROP TABLE "tasks"`);
    await queryRunner.query(`DROP TYPE "public"."tasks_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."tasks_priority_enum"`);
    await queryRunner.query(`DROP TABLE "activity_logs"`);
    await queryRunner.query(`DROP TABLE "recurring_tasks"`);
    await queryRunner.query(
      `DROP TYPE "public"."recurring_tasks_schedule_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bb877455cb9444e90004bb5814"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a538d428814e54b7e7dbea5cdd"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f798a60a91bb2557cd67a2258e"`,
    );
    await queryRunner.query(`DROP TABLE "structured_notifications"`);
    await queryRunner.query(
      `DROP TYPE "public"."structured_notifications_priority_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."structured_notifications_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "comments"`);
    await queryRunner.query(`DROP TABLE "comment_likes"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP TABLE "occupations"`);
    await queryRunner.query(`DROP TABLE "projects"`);
    await queryRunner.query(`DROP TYPE "public"."projects_priority_enum"`);
    await queryRunner.query(`DROP TABLE "task_locks"`);
  }
}
