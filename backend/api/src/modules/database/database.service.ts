import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import mysql, {
  Pool,
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    // Security warning for production
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.DB_PASSWORD) {
        throw new Error(
          'DB_PASSWORD is required in production environment. ' +
            'Empty database passwords are not allowed in production.',
        );
      }
      if (process.env.DB_USER === 'root') {
        console.warn(
          'WARNING: Using root database user in production is not recommended. ' +
            'Create a dedicated application user with limited privileges.',
        );
      }
    }

    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'xui_saas',
      connectionLimit: Number(process.env.DB_POOL_SIZE || '10'),
      charset: 'utf8mb4',
      timezone: 'Z',
    });
  }

  async onModuleInit(): Promise<void> {
    await this.ensureSchema();
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  getPool(): Pool {
    return this.pool;
  }

  async query<T = RowDataPacket[] | ResultSetHeader>(
    sql: string,
    params?: any[],
  ): Promise<T> {
    const [rows] = await this.pool.query(sql, params);
    return rows as T;
  }

  async withTransaction<T>(
    handler: (conn: PoolConnection) => Promise<T>,
  ): Promise<T> {
    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();
      const result = await handler(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  private async ensureSchema(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(32) NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_email (email),
        KEY idx_users_tenant (tenant_id),
        CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id)
          REFERENCES tenants(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        jti VARCHAR(64) NOT NULL,
        expires_at DATETIME NOT NULL,
        revoked_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_refresh_jti (jti),
        KEY idx_refresh_user (user_id),
        CONSTRAINT fk_refresh_user FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS playlists (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        source_url VARCHAR(2048) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_playlists_tenant (tenant_id),
        CONSTRAINT fk_playlists_tenant FOREIGN KEY (tenant_id)
          REFERENCES tenants(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        playlist_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_category (playlist_id, name),
        CONSTRAINT fk_categories_playlist FOREIGN KEY (playlist_id)
          REFERENCES playlists(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS channels (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        logo_url VARCHAR(2048) NULL,
        stream_url VARCHAR(2048) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_channel (category_id, stream_url),
        CONSTRAINT fk_channels_category FOREIGN KEY (category_id)
          REFERENCES categories(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS xui_instances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        host VARCHAR(255) NOT NULL,
        port INT NOT NULL,
        database_name VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL,
        password_encrypted TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        is_primary BOOLEAN DEFAULT FALSE,
        last_sync_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_xui_tenant (tenant_id),
        CONSTRAINT fk_xui_tenant FOREIGN KEY (tenant_id)
          REFERENCES tenants(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        user_id INT NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INT NULL,
        details JSON NULL,
        ip_address VARCHAR(45) NULL,
        user_agent VARCHAR(500) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_audit_tenant (tenant_id),
        KEY idx_audit_user (user_id),
        KEY idx_audit_created (created_at),
        CONSTRAINT fk_audit_tenant FOREIGN KEY (tenant_id)
          REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT fk_audit_user FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        price DECIMAL(10, 2) NOT NULL,
        duration_days INT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_plans_tenant (tenant_id),
        CONSTRAINT fk_plans_tenant FOREIGN KEY (tenant_id)
          REFERENCES tenants(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS payment_configs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        provider VARCHAR(50) NOT NULL,
        is_active BOOLEAN DEFAULT FALSE,
        config_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_tenant_provider (tenant_id, provider),
        CONSTRAINT fk_payment_configs_tenant FOREIGN KEY (tenant_id)
          REFERENCES tenants(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        user_id INT NOT NULL,
        plan_id INT NULL,
        seller_id INT NULL,
        external_id VARCHAR(255) NULL,
        provider VARCHAR(50) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        payment_method VARCHAR(50) NULL,
        paid_at TIMESTAMP NULL,
        metadata JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_payments_tenant (tenant_id),
        KEY idx_payments_user (user_id),
        KEY idx_payments_status (status),
        KEY idx_payments_external (external_id),
        CONSTRAINT fk_payments_tenant FOREIGN KEY (tenant_id)
          REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT fk_payments_user FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_payments_plan FOREIGN KEY (plan_id)
          REFERENCES plans(id) ON DELETE SET NULL,
        CONSTRAINT fk_payments_seller FOREIGN KEY (seller_id)
          REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS commissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        seller_id INT NOT NULL,
        payment_id INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        percentage DECIMAL(5, 2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        paid_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_commissions_tenant (tenant_id),
        KEY idx_commissions_seller (seller_id),
        KEY idx_commissions_status (status),
        CONSTRAINT fk_commissions_tenant FOREIGN KEY (tenant_id)
          REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT fk_commissions_seller FOREIGN KEY (seller_id)
          REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_commissions_payment FOREIGN KEY (payment_id)
          REFERENCES payments(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS seller_configs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        seller_id INT NOT NULL,
        commission_percentage DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_seller_config (tenant_id, seller_id),
        KEY idx_seller_config_tenant (tenant_id),
        KEY idx_seller_config_seller (seller_id),
        CONSTRAINT fk_seller_config_tenant FOREIGN KEY (tenant_id)
          REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT fk_seller_config_seller FOREIGN KEY (seller_id)
          REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_configs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        is_active BOOLEAN DEFAULT FALSE,
        evolution_api_url VARCHAR(500) NULL,
        evolution_api_key VARCHAR(255) NULL,
        instance_name VARCHAR(255) NULL,
        default_template TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_whatsapp_tenant (tenant_id),
        CONSTRAINT fk_whatsapp_tenant FOREIGN KEY (tenant_id)
          REFERENCES tenants(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        template TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_templates_tenant (tenant_id),
        KEY idx_templates_event (event_type),
        CONSTRAINT fk_templates_tenant FOREIGN KEY (tenant_id)
          REFERENCES tenants(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        template_id INT NULL,
        phone_number VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        error_message TEXT NULL,
        sent_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_whatsapp_logs_tenant (tenant_id),
        KEY idx_whatsapp_logs_status (status),
        CONSTRAINT fk_whatsapp_logs_tenant FOREIGN KEY (tenant_id)
          REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT fk_whatsapp_logs_template FOREIGN KEY (template_id)
          REFERENCES whatsapp_templates(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS telegram_configs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        bot_token VARCHAR(255) NULL,
        bot_username VARCHAR(255) NULL,
        is_active BOOLEAN DEFAULT FALSE,
        welcome_message TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_telegram_config_tenant (tenant_id),
        CONSTRAINT fk_telegram_config_tenant FOREIGN KEY (tenant_id)
          REFERENCES tenants(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS telegram_channels (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        channel_id VARCHAR(255) NOT NULL,
        channel_name VARCHAR(255) NOT NULL,
        channel_type VARCHAR(50) NOT NULL DEFAULT 'general',
        is_active BOOLEAN DEFAULT TRUE,
        requires_adult BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_channel (tenant_id, channel_id),
        KEY idx_telegram_channels_tenant (tenant_id),
        CONSTRAINT fk_telegram_channels_tenant FOREIGN KEY (tenant_id)
          REFERENCES tenants(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS telegram_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        channel_id INT NOT NULL,
        message_text TEXT NOT NULL,
        media_url VARCHAR(2048) NULL,
        media_type VARCHAR(50) NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        telegram_message_id VARCHAR(100) NULL,
        error_message TEXT NULL,
        sent_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_telegram_messages_tenant (tenant_id),
        KEY idx_telegram_messages_channel (channel_id),
        KEY idx_telegram_messages_status (status),
        CONSTRAINT fk_telegram_messages_tenant FOREIGN KEY (tenant_id)
          REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT fk_telegram_messages_channel FOREIGN KEY (channel_id)
          REFERENCES telegram_channels(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS vod_content (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        tmdb_id INT NULL,
        title VARCHAR(255) NOT NULL,
        original_title VARCHAR(255) NULL,
        description TEXT NULL,
        content_type VARCHAR(50) NOT NULL,
        poster_url VARCHAR(2048) NULL,
        backdrop_url VARCHAR(2048) NULL,
        release_date DATE NULL,
        duration_minutes INT NULL,
        rating VARCHAR(10) NULL,
        genre VARCHAR(255) NULL,
        cast TEXT NULL,
        director VARCHAR(255) NULL,
        stream_url VARCHAR(2048) NULL,
        is_active BOOLEAN DEFAULT TRUE,
        adult_content BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_vod_tenant (tenant_id),
        KEY idx_vod_tmdb (tmdb_id),
        KEY idx_vod_type (content_type),
        KEY idx_vod_active (is_active),
        CONSTRAINT fk_vod_tenant FOREIGN KEY (tenant_id)
          REFERENCES tenants(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS vod_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_vod_categories_tenant (tenant_id),
        CONSTRAINT fk_vod_categories_tenant FOREIGN KEY (tenant_id)
          REFERENCES tenants(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS vod_content_categories (
        content_id INT NOT NULL,
        category_id INT NOT NULL,
        PRIMARY KEY (content_id, category_id),
        CONSTRAINT fk_vod_content_cat_content FOREIGN KEY (content_id)
          REFERENCES vod_content(id) ON DELETE CASCADE,
        CONSTRAINT fk_vod_content_cat_category FOREIGN KEY (category_id)
          REFERENCES vod_categories(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS daily_games (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        game_date DATE NOT NULL,
        home_team VARCHAR(255) NOT NULL,
        away_team VARCHAR(255) NOT NULL,
        competition VARCHAR(255) NULL,
        game_time TIME NULL,
        channel_mapping VARCHAR(255) NULL,
        is_featured BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_games_tenant (tenant_id),
        KEY idx_games_date (game_date),
        KEY idx_games_featured (is_featured),
        CONSTRAINT fk_games_tenant FOREIGN KEY (tenant_id)
          REFERENCES tenants(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS marketing_posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        post_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NULL,
        media_url VARCHAR(2048) NULL,
        scheduled_for TIMESTAMP NULL,
        posted_at TIMESTAMP NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        telegram_channel_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_marketing_tenant (tenant_id),
        KEY idx_marketing_type (post_type),
        KEY idx_marketing_status (status),
        KEY idx_marketing_scheduled (scheduled_for),
        CONSTRAINT fk_marketing_tenant FOREIGN KEY (tenant_id)
          REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT fk_marketing_channel FOREIGN KEY (telegram_channel_id)
          REFERENCES telegram_channels(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS seller_profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        user_id INT NOT NULL,
        custom_code VARCHAR(50) NULL,
        commission_percentage DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
        monthly_goal DECIMAL(10, 2) NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_seller_user (tenant_id, user_id),
        UNIQUE KEY uniq_seller_code (tenant_id, custom_code),
        KEY idx_seller_profiles_tenant (tenant_id),
        KEY idx_seller_profiles_user (user_id),
        CONSTRAINT fk_seller_profiles_tenant FOREIGN KEY (tenant_id)
          REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT fk_seller_profiles_user FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS seller_customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        seller_id INT NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255) NULL,
        customer_phone VARCHAR(50) NULL,
        xui_username VARCHAR(255) NULL,
        xui_password VARCHAR(255) NULL,
        plan_id INT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        expires_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_seller_customers_tenant (tenant_id),
        KEY idx_seller_customers_seller (seller_id),
        KEY idx_seller_customers_status (status),
        CONSTRAINT fk_seller_customers_tenant FOREIGN KEY (tenant_id)
          REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT fk_seller_customers_seller FOREIGN KEY (seller_id)
          REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_seller_customers_plan FOREIGN KEY (plan_id)
          REFERENCES plans(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS backups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        backup_type VARCHAR(50) NOT NULL,
        file_path VARCHAR(2048) NOT NULL,
        file_size BIGINT NULL,
        checksum VARCHAR(255) NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        started_at TIMESTAMP NULL,
        completed_at TIMESTAMP NULL,
        error_message TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_backups_tenant (tenant_id),
        KEY idx_backups_type (backup_type),
        KEY idx_backups_status (status),
        CONSTRAINT fk_backups_tenant FOREIGN KEY (tenant_id)
          REFERENCES tenants(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS trials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        user_id INT NOT NULL,
        plan_id INT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        converted_to_paid BOOLEAN DEFAULT FALSE,
        converted_at TIMESTAMP NULL,
        payment_id INT NULL,
        reminder_sent_3days BOOLEAN DEFAULT FALSE,
        reminder_sent_1day BOOLEAN DEFAULT FALSE,
        reminder_sent_expired BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_trial_tenant_user (tenant_id, user_id),
        KEY idx_trials_tenant (tenant_id),
        KEY idx_trials_user (user_id),
        KEY idx_trials_status (status),
        KEY idx_trials_expires (expires_at),
        CONSTRAINT fk_trials_tenant FOREIGN KEY (tenant_id)
          REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT fk_trials_user FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_trials_plan FOREIGN KEY (plan_id)
          REFERENCES plans(id) ON DELETE CASCADE,
        CONSTRAINT fk_trials_payment FOREIGN KEY (payment_id)
          REFERENCES payments(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(255) NOT NULL,
        setting_value TEXT NULL,
        description VARCHAR(500) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_setting_key (setting_key),
        KEY idx_system_settings_key (setting_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS upsell_analytics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        user_id INT NOT NULL,
        event_type ENUM('view', 'click') NOT NULL,
        trigger_type VARCHAR(50) NOT NULL,
        variant VARCHAR(50) NOT NULL,
        page_url VARCHAR(500) NULL,
        session_id VARCHAR(255) NULL,
        clicked_plan_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_upsell_tenant_event (tenant_id, event_type),
        KEY idx_upsell_trigger_variant (trigger_type, variant),
        KEY idx_upsell_created (created_at),
        CONSTRAINT fk_upsell_analytics_tenant FOREIGN KEY (tenant_id)
          REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT fk_upsell_analytics_user FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS upsell_conversions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        user_id INT NOT NULL,
        from_plan_id INT NOT NULL,
        to_plan_id INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        converted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_conversions_tenant (tenant_id),
        KEY idx_converted_at (converted_at),
        CONSTRAINT fk_upsell_conversions_tenant FOREIGN KEY (tenant_id)
          REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT fk_upsell_conversions_user FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS upsell_banner_dismissals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        user_id INT NOT NULL,
        dismissed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_dismissal_tenant_user (tenant_id, user_id),
        KEY idx_dismissed_at (dismissed_at),
        CONSTRAINT fk_upsell_dismissals_tenant FOREIGN KEY (tenant_id)
          REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT fk_upsell_dismissals_user FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ab_test_metrics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        variant VARCHAR(50) NOT NULL,
        event_type ENUM('view', 'click', 'conversion') NOT NULL,
        count INT DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_variant_event (variant, event_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS promotions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        discount_percentage DECIMAL(5, 2) NOT NULL,
        valid_until DATETIME NOT NULL,
        applicable_plan_id INT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        max_uses INT NULL,
        uses_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_promotions_active (is_active),
        KEY idx_promotions_valid (valid_until),
        CONSTRAINT fk_promotions_plan FOREIGN KEY (applicable_plan_id)
          REFERENCES plans(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        plan_id INT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        billing_cycle VARCHAR(50) NOT NULL DEFAULT 'monthly',
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NULL,
        auto_renew BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_subscription_tenant (tenant_id),
        KEY idx_subscription_status (status),
        KEY idx_subscription_expires (expires_at),
        CONSTRAINT fk_subscription_tenant FOREIGN KEY (tenant_id)
          REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT fk_subscription_plan FOREIGN KEY (plan_id)
          REFERENCES plans(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }
}
