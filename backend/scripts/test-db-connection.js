#!/usr/bin/env node

// Script simples para testar conexão com PostgreSQL
const { Client } = require('pg');

console.log('🔍 Testando conexão com banco de dados...');

const client = new Client({
  host: process.env.DB_HOST || 'postgres-service.postgres.svc.cluster.local',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE || 'manager_group',
  connectionTimeoutMillis: 5000, // 5 segundos timeout
});

async function testConnection() {
  try {
    console.log(`📡 Conectando em: ${client.host}:${client.port}`);
    console.log(`📋 Database: ${client.database}`);
    console.log(`👤 User: ${client.user}`);
    
    await client.connect();
    
    // Testar consulta simples
    const result = await client.query('SELECT NOW() as current_time, VERSION() as version');
    
    console.log('✅ CONEXÃO BEM SUCEDIDA!');
    console.log(`⏰ Hora do servidor: ${result.rows[0].current_time}`);
    console.log(`🗄️  Versão PostgreSQL: ${result.rows[0].version}`);
    
    // Testar se migrations table existe
    const migrationsResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
      )
    `);
    
    if (migrationsResult.rows[0].exists) {
      console.log('✅ Tabela migrations existe');
      
      // Contar migrações
      const countResult = await client.query('SELECT COUNT(*) as total FROM migrations');
      console.log(`📊 Total de migrações: ${countResult.rows[0].total}`);
    } else {
      console.log('⚠️  Tabela migrations NÃO existe');
    }
    
  } catch (error) {
    console.error('❌ ERRO DE CONEXÃO:');
    console.error(`   Mensagem: ${error.message}`);
    console.error(`   Código: ${error.code}`);
    console.error(`   Host: ${error.host}:${error.port}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   💡 Verifique se o PostgreSQL está rodando e acessível');
    } else if (error.code === '28P01') {
      console.error('   💡 Verifique usuário e senha');
    } else if (error.code === '3D000') {
      console.error('   💡 Verifique se o database existe');
    }
    
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Conexão encerrada');
  }
}

testConnection();