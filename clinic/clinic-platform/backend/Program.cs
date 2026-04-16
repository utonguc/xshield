using System.Text;
using ClinicPlatform.Api.Data;
using ClinicPlatform.Api.Models;
using ClinicPlatform.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        // Always read/write DateTime as UTC so JSON has "Z" suffix.
        // Npgsql returns Kind=Unspecified for timestamp columns; this normalises them.
        opts.JsonSerializerOptions.Converters.Add(new UtcDateTimeConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "ClinicPlatform.Api",
        Version = "v1"
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Bearer token gir"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<AuditInterceptor>();
builder.Services.AddDbContext<AppDbContext>((sp, options) =>
    options
        .UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
        .AddInterceptors(sp.GetRequiredService<AuditInterceptor>()));

builder.Services.AddScoped<ITokenService, TokenService>();

// Email + rapor worker
builder.Services.Configure<SmtpSettings>(builder.Configuration.GetSection("Smtp"));
builder.Services.AddScoped<IEmailService, SmtpEmailService>();
builder.Services.AddHostedService<ReportEmailWorker>();
builder.Services.AddHostedService<ClinicAlertWorker>();
builder.Services.AddHostedService<AppointmentReminderWorker>();

// WhatsApp
builder.Services.AddHttpClient();
builder.Services.AddScoped<IWhatsAppService, WhatsAppService>();

// Audit log service (for manual/explicit logging)
builder.Services.AddScoped<IAuditService, AuditService>();

var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT key missing.");
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false; // sub, email vb. claim adlarını dönüştürme
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy =>
    {
        policy.AllowAnyHeader().AllowAnyMethod().AllowAnyOrigin();
    });
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("frontend");
app.UseAuthentication();
app.UseAuthorization();

// Serve uploads from /app/uploads (matches Docker volume uploads_data:/app/uploads)
var uploadsRoot = Path.Combine(app.Environment.ContentRootPath, "uploads");
Directory.CreateDirectory(uploadsRoot);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsRoot),
    RequestPath  = "/uploads",
});

app.MapControllers();

// DB hazır olana kadar bekle (restart durumları için)
using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var db     = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    for (var attempt = 1; attempt <= 10; attempt++)
    {
        try
        {
            // If EF Core Migrations exist (Data/Migrations folder), run them.
            // Otherwise fall back to EnsureCreated + SchemaUpdater for dev convenience.
            var migrationsAssembly = typeof(AppDbContext).Assembly;
            var hasMigrations      = migrationsAssembly.GetTypes()
                .Any(t => typeof(Microsoft.EntityFrameworkCore.Migrations.Migration).IsAssignableFrom(t));

            if (hasMigrations)
            {
                db.Database.Migrate();
                logger.LogInformation("EF Core migrations applied (attempt {A}).", attempt);
            }
            else
            {
                // EnsureCreated() only creates DB if it doesn't exist at all.
                // If a previous Migrate() run created __EFMigrationsHistory but no app tables,
                // EnsureCreated() does nothing and we end up with no tables.
                // Use RelationalDatabaseCreator.CreateTables() to handle that case.
                var creator = (RelationalDatabaseCreator)
                    db.GetService<IRelationalDatabaseCreator>();

                db.Database.EnsureCreated(); // creates DB if it doesn't exist

                if (!creator.HasTables())
                {
                    creator.CreateTables(); // creates all tables from the model
                }

                SchemaUpdater.ApplyMissingTables(db, logger);
                logger.LogInformation("Database schema ready via EnsureCreated (attempt {A}). " +
                    "Run './scripts/migrate.sh add InitialCreate' to switch to EF Migrations.", attempt);
            }
            break;
        }
        catch (Exception ex)
        {
            logger.LogWarning("DB not ready yet (attempt {A}): {Msg}", attempt, ex.Message);
            if (attempt == 10) throw;
            Thread.Sleep(3000);
        }
    }

    try
    {
        var requiredRoles = new[]
        {
            "SuperAdmin", "KlinikYonetici", "Doktor", "Teknisyen", "Resepsiyon", "Asistan"
        };

        foreach (var roleName in requiredRoles)
        {
            if (!db.Roles.Any(x => x.Name == roleName))
                db.Roles.Add(new Role { Name = roleName });
        }
        db.SaveChanges();

        Clinic clinic;
        if (!db.Clinics.Any())
        {
            clinic = new Clinic
            {
                Name = "Demo Klinik",
                City = "Antalya",
                Country = "Türkiye",
                IsActive = true
            };
            db.Clinics.Add(clinic);
            db.SaveChanges();
        }
        else
        {
            clinic = db.Clinics.First();
        }

        if (!db.Users.Any())
        {
            var adminRole = db.Roles.First(x => x.Name == "SuperAdmin");
            db.Users.Add(new User
            {
                ClinicId     = clinic.Id,
                FullName     = "Sistem Yöneticisi",
                UserName     = "admin",
                Email        = "admin@clinic.local",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!*"),
                IsActive     = true,
                RoleId       = adminRole.Id
            });
        }

        if (!db.Doctors.Any())
        {
            db.Doctors.AddRange(
                new Doctor { ClinicId = clinic.Id, FullName = "Dr. Ayşe Demir",  Branch = "Plastik Cerrahi",  IsActive = true },
                new Doctor { ClinicId = clinic.Id, FullName = "Dr. Mehmet Kaya", Branch = "Estetik Cerrahi", IsActive = true }
            );
        }

        if (!db.OrganizationSettings.Any())
        {
            db.OrganizationSettings.Add(new OrganizationSetting
            {
                ClinicId         = clinic.Id,
                CompanyName      = "Demo Klinik",
                ApplicationTitle = "EstetixOS",
                LogoUrl          = "",
                PrimaryColor     = "#1d4ed8"
            });
        }

        // Demo klinik için varsayılan tüm modül lisansları
        if (!db.ModuleLicenses.Any(x => x.ClinicId == clinic.Id))
        {
            var allModules = new[]
            {
                "crm","appointments","doctors","reports",
                "finance","inventory","assets","tasks",
                "notifications","documents","surveys","whatsapp"
            };
            foreach (var code in allModules)
                db.ModuleLicenses.Add(new ModuleLicense { ClinicId = clinic.Id, ModuleCode = code, IsActive = true });
        }

        // Demo faturalar
        if (!db.Invoices.Any(x => x.ClinicId == clinic.Id))
        {
            var patient = db.Patients.FirstOrDefault(x => x.ClinicId == clinic.Id);
            var doctor  = db.Doctors.FirstOrDefault(x => x.ClinicId == clinic.Id);
            if (patient != null)
            {
                var demoInvoices = new[]
                {
                    (Status: "Paid",  Days: -20, Items: new[]{("Rinoplasti", 1, 15000m), ("Anestezi", 1, 2000m)}, Tax: 20m),
                    (Status: "Sent",  Days: -5,  Items: new[]{("Botox Uygulaması", 3, 1500m)}, Tax: 10m),
                    (Status: "Draft", Days: 0,   Items: new[]{("Konsültasyon", 1, 500m)}, Tax: 0m),
                    (Status: "Overdue", Days: -35, Items: new[]{("Lazer Tedavisi", 2, 3000m)}, Tax: 20m),
                };

                int seq = 1;
                foreach (var (status, days, invoiceItems, tax) in demoInvoices)
                {
                    var items = invoiceItems.Select(i => new InvoiceItem
                    {
                        Description = i.Item1,
                        Quantity    = i.Item2,
                        UnitPrice   = i.Item3,
                        LineTotal   = i.Item2 * i.Item3,
                    }).ToList();
                    var sub = items.Sum(i => i.LineTotal);
                    var taxAmt = Math.Round(sub * tax / 100, 2);
                    db.Invoices.Add(new Invoice
                    {
                        ClinicId    = clinic.Id,
                        PatientId   = patient.Id,
                        DoctorId    = doctor?.Id,
                        InvoiceNo   = $"INV-{DateTime.UtcNow.Year}-{seq++:D4}",
                        IssuedAtUtc = DateTime.UtcNow.AddDays(days),
                        DueAtUtc    = DateTime.UtcNow.AddDays(days + 30),
                        Status      = status,
                        Currency    = "TRY",
                        TaxRate     = tax,
                        Subtotal    = sub,
                        TaxAmount   = taxAmt,
                        Total       = sub + taxAmt,
                        Items       = items,
                    });
                }
            }
        }

        // Demo görevler
        if (!db.Tasks.Any(x => x.ClinicId == clinic.Id))
        {
            var adminUser = db.Users.FirstOrDefault(x => x.ClinicId == clinic.Id);
            var demoTasks = new[]
            {
                ("Hasta dosyalarını güncelle", "Todo",       "High",   3),
                ("Haftalık randevu raporu hazırla", "Todo",  "Medium", 5),
                ("Yeni doktor onboarding",     "InProgress", "High",   1),
                ("Ekipman bakım planı",         "InProgress","Medium", 7),
                ("Mayıs faturaları gönder",     "Done",      "High",  -2),
                ("Personel toplantısı notları", "Done",      "Low",   -5),
            };
            foreach (var (title, status, priority, dueDays) in demoTasks)
            {
                db.Tasks.Add(new TaskItem
                {
                    ClinicId     = clinic.Id,
                    Title        = title,
                    Status       = status,
                    Priority     = priority,
                    AssignedToId = adminUser?.Id,
                    CreatedById  = adminUser?.Id,
                    DueAtUtc     = DateTime.UtcNow.AddDays(dueDays),
                });
            }
        }

        // Demo bildirimler
        var adminUser2 = db.Users.FirstOrDefault(x => x.ClinicId == clinic.Id);
        if (adminUser2 != null && !db.Notifications.Any(x => x.UserId == adminUser2.Id))
        {
            var demoNotifs = new[]
            {
                ("Yeni Hasta Kaydı", "Ahmet Yılmaz sisteme eklendi.",  "success", "/patients",     -2),
                ("Randevu İptal",    "Dr. Ayşe Demir'in randevusu iptal edildi.", "warning", "/appointments", -5),
                ("Fatura Ödendi",    "INV-2026-0001 numaralı fatura ödendi.",      "success", "/finance",      -10),
                ("Gecikmiş Görev",   "\"Hasta dosyalarını güncelle\" görevi gecikti.", "error", "/tasks",    -15),
                ("Sistem Mesajı",    "EstetixOS v2'ye hoş geldiniz!",               "info",    null,            -30),
            };
            foreach (var (title, message, type, link, minAgo) in demoNotifs)
            {
                db.Notifications.Add(new Notification
                {
                    ClinicId     = clinic.Id,
                    UserId       = adminUser2.Id,
                    Title        = title,
                    Message      = message,
                    Type         = type,
                    Link         = link,
                    IsRead       = minAgo < -10,
                    CreatedAtUtc = DateTime.UtcNow.AddMinutes(minAgo),
                });
            }
        }

        // Demo demirbaşlar
        if (!db.Assets.Any(x => x.ClinicId == clinic.Id))
        {
            db.Assets.AddRange(
                new Asset { ClinicId = clinic.Id, Name = "Lazer Cihazı",         Category = "Tıbbi Ekipman", Brand = "Alma Lasers", Model = "Soprano Ice", SerialNo = "ALP-2021-001", Status = "Active",      Location = "Tedavi Odası 1", PurchasePrice = 350000, PurchasedAt = DateTime.UtcNow.AddYears(-2), WarrantyUntil = DateTime.UtcNow.AddMonths(10), NextMaintenanceAt = DateTime.UtcNow.AddDays(15) },
                new Asset { ClinicId = clinic.Id, Name = "Ultrason Cihazı",      Category = "Tıbbi Ekipman", Brand = "GE",          Model = "LOGIQ E10",   SerialNo = "GE-2020-042",  Status = "Active",      Location = "Muayene Odası",  PurchasePrice = 280000, PurchasedAt = DateTime.UtcNow.AddYears(-3), WarrantyUntil = DateTime.UtcNow.AddDays(-30) },
                new Asset { ClinicId = clinic.Id, Name = "Klinik Sterilizatör",  Category = "Sarf Ekipmanı", Brand = "Tuttnauer",   Model = "2540EK",      SerialNo = "TUT-2022-007", Status = "Maintenance", Location = "Sterilizasyon",  PurchasePrice = 45000,  PurchasedAt = DateTime.UtcNow.AddYears(-1),  NextMaintenanceAt = DateTime.UtcNow.AddDays(-2) },
                new Asset { ClinicId = clinic.Id, Name = "Cerrahi Lamba",        Category = "Aydınlatma",    Brand = "Berchtold",   SerialNo = "BER-2019-3", Status = "Active",        Location = "OT",         PurchasePrice = 28000,  PurchasedAt = DateTime.UtcNow.AddYears(-4) },
                new Asset { ClinicId = clinic.Id, Name = "Hasta Koltuk (×3)",    Category = "Mobilya",       Brand = "Gharieni",    SerialNo = "GH-2023-01", Status = "Active",        Location = "Bekleme",    PurchasePrice = 90000,  PurchasedAt = DateTime.UtcNow.AddMonths(-8), WarrantyUntil = DateTime.UtcNow.AddYears(2) }
            );
        }

        // Demo stok kalemleri
        if (!db.StockItems.Any(x => x.ClinicId == clinic.Id))
        {
            var demoStock = new[]
            {
                ("Botoks (100u)", "Malzeme", "kutu",  "SUP-001", 850m,  12, 5,  30),
                ("Hyaluronik Asit Filler", "Malzeme", "adet", "SUP-002", 1200m, 8, 3, 60),
                ("Steril Enjektör 5ml", "Sarf", "adet", null, 2.5m, 200, 50, 0),
                ("Lateks Eldiven (S)", "Sarf", "kutu", null, 45m, 15, 5, 0),
                ("Anestezi Kremi", "İlaç", "tüp", "SUP-003", 120m, 3, 5, 90),
                ("Povidone Iodine", "Antiseptik", "şişe", null, 35m, 20, 10, 0),
            };
            foreach (var (name, cat, unit, barcode, cost, qty, minQty, expDays) in demoStock)
            {
                var item = new StockItem
                {
                    ClinicId     = clinic.Id,
                    Name         = name,
                    Category     = cat,
                    Unit         = unit,
                    Barcode      = barcode,
                    Supplier     = "Demo Tedarikçi",
                    UnitCost     = cost,
                    Quantity     = qty,
                    MinQuantity  = minQty,
                    ExpiresAtUtc = expDays > 0 ? DateTime.UtcNow.AddDays(expDays) : null,
                };
                db.StockItems.Add(item);
                db.StockMovements.Add(new StockMovement
                {
                    StockItemId = item.Id,
                    Type        = "in",
                    Quantity    = qty,
                    Note        = "İlk stok girişi",
                });
            }
        }

        // Demo anket + yanıtlar
        if (!db.Surveys.Any(x => x.ClinicId == clinic.Id))
        {
            var survey = new Survey
            {
                ClinicId    = clinic.Id,
                Title       = "Genel Hasta Memnuniyeti",
                Description = "Kliniğimizdeki deneyiminizi değerlendirmeniz için bu kısa anketi doldurmanızı rica ederiz.",
                Status      = "Active",
                Questions   = new List<SurveyQuestion>
                {
                    new() { SortOrder = 1, Text = "Genel memnuniyetinizi puanlayınız",         Type = "rating",  IsRequired = true },
                    new() { SortOrder = 2, Text = "Personelin ilgisi ve güleryüzü",             Type = "rating",  IsRequired = true },
                    new() { SortOrder = 3, Text = "Kliniği bir yakınınıza önerir misiniz?",     Type = "yesno",   IsRequired = true },
                    new() { SortOrder = 4, Text = "Randevu bekleme süresi nasıldı?",            Type = "choice",  IsRequired = false, Options = "Çok kısa,Uygun,Biraz uzun,Çok uzun" },
                    new() { SortOrder = 5, Text = "Ek görüş ve önerileriniz",                   Type = "text",    IsRequired = false },
                }
            };
            db.Surveys.Add(survey);
            db.SaveChanges(); // get IDs

            var demoResponses = new[]
            {
                ("Ahmet Yılmaz", "5", "5", "Evet", "Çok kısa",   null),
                ("Fatma Kaya",   "4", "5", "Evet", "Uygun",      "Genel olarak memnunum, teşekkürler."),
                ("Mehmet Demir", "3", "4", "Evet", "Biraz uzun", null),
                ("Zeynep Aydın", "5", "5", "Evet", "Uygun",      "Harika bir klinik!"),
                ("Ali Çelik",    "2", "3", "Hayır","Çok uzun",   "Bekleme süresi çok uzun oldu."),
            };
            var qs = survey.Questions.OrderBy(q => q.SortOrder).ToList();
            foreach (var (name, r1, r2, yn, choice, text) in demoResponses)
            {
                var answers = new List<SurveyAnswer>
                {
                    new() { QuestionId = qs[0].Id, Value = r1 },
                    new() { QuestionId = qs[1].Id, Value = r2 },
                    new() { QuestionId = qs[2].Id, Value = yn },
                    new() { QuestionId = qs[3].Id, Value = choice },
                };
                if (text != null) answers.Add(new() { QuestionId = qs[4].Id, Value = text });
                db.SurveyResponses.Add(new SurveyResponse
                {
                    SurveyId    = survey.Id,
                    PatientName = name,
                    Answers     = answers,
                    SubmittedAtUtc = DateTime.UtcNow.AddDays(-new Random().Next(1, 30)),
                });
            }
        }

        db.SaveChanges();
    }
    catch (Exception ex)
    {
        var logger2 = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger2.LogError(ex, "Seed data oluşturulurken hata oluştu. Uygulama devam ediyor.");
    }
}

app.Run();

/// <summary>
/// Ensures all DateTime values are serialised with "Z" (UTC) suffix regardless of Kind.
/// Npgsql reads timestamp columns back as Kind=Unspecified; without this converter the
/// JSON output lacks the "Z" suffix and browsers mis-parse times as local instead of UTC.
/// </summary>
public class UtcDateTimeConverter : System.Text.Json.Serialization.JsonConverter<DateTime>
{
    public override DateTime Read(ref System.Text.Json.Utf8JsonReader reader,
        Type typeToConvert, System.Text.Json.JsonSerializerOptions options)
        => DateTime.SpecifyKind(reader.GetDateTime(), DateTimeKind.Utc);

    public override void Write(System.Text.Json.Utf8JsonWriter writer,
        DateTime value, System.Text.Json.JsonSerializerOptions options)
        => writer.WriteStringValue(DateTime.SpecifyKind(value, DateTimeKind.Utc));
}
