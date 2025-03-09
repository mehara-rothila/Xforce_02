using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SpiritX.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAdminFlag : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Wickets",
                table: "players",
                newName: "wickets");

            migrationBuilder.RenameColumn(
                name: "University",
                table: "players",
                newName: "university");

            migrationBuilder.RenameColumn(
                name: "Name",
                table: "players",
                newName: "name");

            migrationBuilder.RenameColumn(
                name: "Category",
                table: "players",
                newName: "category");

            migrationBuilder.RenameColumn(
                name: "TotalRuns",
                table: "players",
                newName: "total_runs");

            migrationBuilder.RenameColumn(
                name: "RunsConceded",
                table: "players",
                newName: "runs_conceded");

            migrationBuilder.RenameColumn(
                name: "OversBowled",
                table: "players",
                newName: "overs_bowled");

            migrationBuilder.RenameColumn(
                name: "InningsPlayed",
                table: "players",
                newName: "innings_played");

            migrationBuilder.RenameColumn(
                name: "BallsFaced",
                table: "players",
                newName: "balls_faced");

            migrationBuilder.RenameColumn(
                name: "PlayerId",
                table: "players",
                newName: "player_id");

            migrationBuilder.AlterColumn<string>(
                name: "Username",
                table: "users",
                type: "varchar(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "longtext")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<string>(
                name: "Password",
                table: "users",
                type: "varchar(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "longtext")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<bool>(
                name: "is_admin",
                table: "users",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AlterColumn<int>(
                name: "overs_bowled",
                table: "players",
                type: "int",
                nullable: false,
                oldClrType: typeof(float),
                oldType: "float");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "is_admin",
                table: "users");

            migrationBuilder.RenameColumn(
                name: "wickets",
                table: "players",
                newName: "Wickets");

            migrationBuilder.RenameColumn(
                name: "university",
                table: "players",
                newName: "University");

            migrationBuilder.RenameColumn(
                name: "name",
                table: "players",
                newName: "Name");

            migrationBuilder.RenameColumn(
                name: "category",
                table: "players",
                newName: "Category");

            migrationBuilder.RenameColumn(
                name: "total_runs",
                table: "players",
                newName: "TotalRuns");

            migrationBuilder.RenameColumn(
                name: "runs_conceded",
                table: "players",
                newName: "RunsConceded");

            migrationBuilder.RenameColumn(
                name: "overs_bowled",
                table: "players",
                newName: "OversBowled");

            migrationBuilder.RenameColumn(
                name: "innings_played",
                table: "players",
                newName: "InningsPlayed");

            migrationBuilder.RenameColumn(
                name: "balls_faced",
                table: "players",
                newName: "BallsFaced");

            migrationBuilder.RenameColumn(
                name: "player_id",
                table: "players",
                newName: "PlayerId");

            migrationBuilder.AlterColumn<string>(
                name: "Username",
                table: "users",
                type: "longtext",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(100)",
                oldMaxLength: 100)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<string>(
                name: "Password",
                table: "users",
                type: "longtext",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(255)",
                oldMaxLength: 255)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<float>(
                name: "OversBowled",
                table: "players",
                type: "float",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");
        }
    }
}
