using SimKlinik.Data;

var builder = WebApplication.CreateBuilder(args);

// Enable Dapper snake_case to PascalCase automatic mapping
Dapper.DefaultTypeMap.MatchNamesWithUnderscores = true;

// Register DB Connection Factory
builder.Services.AddSingleton<IDbConnectionFactory, DbConnectionFactory>();

// Add Controllers with JSON formatting
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.WriteIndented = true;
    });

// OpenAPI / Swagger
builder.Services.AddOpenApi();

// CORS configuration for flexibility
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowAll");

// Enable serving static files from wwwroot (Landing page, AdminLTE, CSS, JS)
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthorization();

app.MapControllers();

// Fallback to landing page if root is requested
app.MapFallbackToFile("index.html");

app.Run();
