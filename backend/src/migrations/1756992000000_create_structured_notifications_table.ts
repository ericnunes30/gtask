import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStructuredNotificationsTable1756992000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE structured_notifications (
                id SERIAL PRIMARY KEY,
                type VARCHAR(50) NOT NULL,
                priority VARCHAR(20) NOT NULL,
                data JSONB NOT NULL,
                metadata JSONB NOT NULL,
                user_id INTEGER NOT NULL,
                is_read BOOLEAN DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                expires_at TIMESTAMP WITH TIME ZONE,
                delivered_at TIMESTAMP WITH TIME ZONE,
                read_at TIMESTAMP WITH TIME ZONE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            
            CREATE INDEX idx_structured_notifications_user_created 
                ON structured_notifications(user_id, created_at DESC);
            
            CREATE INDEX idx_structured_notifications_type 
                ON structured_notifications(type);
            
            CREATE INDEX idx_structured_notifications_priority 
                ON structured_notifications(priority);
            
            CREATE INDEX idx_structured_notifications_data_gin 
                ON structured_notifications USING GIN(data);
            
            CREATE INDEX idx_structured_notifications_metadata_gin 
                ON structured_notifications USING GIN(metadata);
            
            CREATE INDEX idx_structured_notifications_is_read 
                ON structured_notifications(is_read);
            
            CREATE INDEX idx_structured_notifications_created_at 
                ON structured_notifications(created_at);
            
            -- Adicionar restrição CHECK para valores válidos de type
            ALTER TABLE structured_notifications 
            ADD CONSTRAINT chk_structured_notifications_type 
            CHECK (type IN (
                'task.created',
                'task.updated',
                'task.status.changed',
                'task.assigned',
                'comment.created',
                'timer.started',
                'timer.paused',
                'timer.completed',
                'user.mentioned',
                'project.updated'
            ));
            
            -- Adicionar restrição CHECK para valores válidos de priority
            ALTER TABLE structured_notifications 
            ADD CONSTRAINT chk_structured_notifications_priority 
            CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE structured_notifications`);
    }
}