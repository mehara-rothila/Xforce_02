﻿// <auto-generated />
using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using SpiritX.API.Data;

#nullable disable

namespace SpiritX.API.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20250309023454_AddIsAdminColumn")]
    partial class AddIsAdminColumn
    {
        /// <inheritdoc />
        protected override void BuildTargetModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder
                .HasAnnotation("ProductVersion", "8.0.2")
                .HasAnnotation("Relational:MaxIdentifierLength", 64);

            modelBuilder.Entity("SpiritX.API.Models.Player", b =>
                {
                    b.Property<int>("PlayerId")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("int")
                        .HasColumnName("player_id");

                    b.Property<int>("BallsFaced")
                        .HasColumnType("int")
                        .HasColumnName("balls_faced");

                    b.Property<string>("Category")
                        .IsRequired()
                        .HasColumnType("longtext")
                        .HasColumnName("category");

                    b.Property<int>("InningsPlayed")
                        .HasColumnType("int")
                        .HasColumnName("innings_played");

                    b.Property<string>("Name")
                        .IsRequired()
                        .HasColumnType("longtext")
                        .HasColumnName("name");

                    b.Property<int>("OversBowled")
                        .HasColumnType("int")
                        .HasColumnName("overs_bowled");

                    b.Property<int>("RunsConceded")
                        .HasColumnType("int")
                        .HasColumnName("runs_conceded");

                    b.Property<int>("TotalRuns")
                        .HasColumnType("int")
                        .HasColumnName("total_runs");

                    b.Property<string>("University")
                        .IsRequired()
                        .HasColumnType("longtext")
                        .HasColumnName("university");

                    b.Property<int>("Wickets")
                        .HasColumnType("int")
                        .HasColumnName("wickets");

                    b.HasKey("PlayerId");

                    b.ToTable("players", (string)null);
                });

            modelBuilder.Entity("SpiritX.API.Models.Team", b =>
                {
                    b.Property<int>("TeamId")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("int");

                    b.Property<string>("TeamName")
                        .IsRequired()
                        .HasColumnType("longtext");

                    b.Property<int>("TotalPoints")
                        .HasColumnType("int");

                    b.Property<int>("UserId")
                        .HasColumnType("int");

                    b.HasKey("TeamId");

                    b.HasIndex("UserId");

                    b.ToTable("teams", (string)null);
                });

            modelBuilder.Entity("SpiritX.API.Models.TeamPlayer", b =>
                {
                    b.Property<int>("TeamId")
                        .HasColumnType("int");

                    b.Property<int>("PlayerId")
                        .HasColumnType("int");

                    b.HasKey("TeamId", "PlayerId");

                    b.HasIndex("PlayerId");

                    b.ToTable("team_players", (string)null);
                });

            modelBuilder.Entity("SpiritX.API.Models.User", b =>
                {
                    b.Property<int>("UserId")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("int");

                    b.Property<int>("Budget")
                        .HasColumnType("int");

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("datetime(6)");

                    b.Property<bool>("IsAdmin")
                        .HasColumnType("tinyint(1)")
                        .HasColumnName("is_admin");

                    b.Property<string>("Password")
                        .IsRequired()
                        .HasMaxLength(255)
                        .HasColumnType("varchar(255)");

                    b.Property<string>("Username")
                        .IsRequired()
                        .HasMaxLength(100)
                        .HasColumnType("varchar(100)");

                    b.HasKey("UserId");

                    b.ToTable("users", (string)null);
                });

            modelBuilder.Entity("SpiritX.API.Models.Team", b =>
                {
                    b.HasOne("SpiritX.API.Models.User", "User")
                        .WithMany("Teams")
                        .HasForeignKey("UserId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("User");
                });

            modelBuilder.Entity("SpiritX.API.Models.TeamPlayer", b =>
                {
                    b.HasOne("SpiritX.API.Models.Player", "Player")
                        .WithMany()
                        .HasForeignKey("PlayerId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("SpiritX.API.Models.Team", "Team")
                        .WithMany("TeamPlayers")
                        .HasForeignKey("TeamId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Player");

                    b.Navigation("Team");
                });

            modelBuilder.Entity("SpiritX.API.Models.Team", b =>
                {
                    b.Navigation("TeamPlayers");
                });

            modelBuilder.Entity("SpiritX.API.Models.User", b =>
                {
                    b.Navigation("Teams");
                });
#pragma warning restore 612, 618
        }
    }
}
