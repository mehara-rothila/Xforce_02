using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SpiritX.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAdminRoleToUsers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Check if the is_admin column exists in the users table
            migrationBuilder.Sql(
                @"SELECT COUNT(*) INTO @column_exists 
                FROM information_schema.columns 
                WHERE table_schema = DATABASE() 
                AND table_name = 'users' 
                AND column_name = 'is_admin';

                SET @sql = IF(@column_exists = 0, 
                    'ALTER TABLE users ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT FALSE', 
                    'SELECT 1');

                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;");

            // Set at least one user as admin - use correct column name (user_id instead of UserId)
            migrationBuilder.Sql("UPDATE users SET is_admin = TRUE ORDER BY user_id LIMIT 1;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // We don't want to drop the column in the down migration
            // to avoid potential data loss
        }
    }
}