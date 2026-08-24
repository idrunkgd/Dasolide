-- Migration initiale — SQLite
-- Générée depuis prisma/schema.prisma.

PRAGMA foreign_keys=OFF;

CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "onboardedAt" DATETIME,
    "lastSeenAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refreshToken" TEXT,
    "accessToken" TEXT,
    "expiresAt" INTEGER,
    "tokenType" TEXT,
    "scope" TEXT,
    "idToken" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "sex" TEXT,
    "birthDate" DATETIME,
    "heightCm" REAL,
    "startWeightKg" REAL,
    "targetWeightKg" REAL,
    "level" TEXT NOT NULL DEFAULT 'intermediaire',
    "sessionsPerWeek" INTEGER NOT NULL DEFAULT 4,
    "sessionMinutes" INTEGER NOT NULL DEFAULT 60,
    "mainGoal" TEXT NOT NULL DEFAULT 'hypertrophie',
    "activityLevel" TEXT NOT NULL DEFAULT 'modere',
    "equipment" TEXT NOT NULL DEFAULT 'salle_complete',
    "availableDays" TEXT NOT NULL DEFAULT '1,2,4,5',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "weightUnit" TEXT NOT NULL DEFAULT 'kg',
    "lengthUnit" TEXT NOT NULL DEFAULT 'cm',
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "accentColor" TEXT NOT NULL DEFAULT 'lime',
    "defaultRestSeconds" INTEGER NOT NULL DEFAULT 120,
    "autoStartRestTimer" BOOLEAN NOT NULL DEFAULT true,
    "restTimerVibrate" BOOLEAN NOT NULL DEFAULT true,
    "restTimerSound" BOOLEAN NOT NULL DEFAULT true,
    "keepScreenAwake" BOOLEAN NOT NULL DEFAULT true,
    "showRpe" BOOLEAN NOT NULL DEFAULT true,
    "showRir" BOOLEAN NOT NULL DEFAULT false,
    "prefillLastSession" BOOLEAN NOT NULL DEFAULT true,
    "autoProgressionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "upperIncrementKg" REAL NOT NULL DEFAULT 2.5,
    "lowerIncrementKg" REAL NOT NULL DEFAULT 5,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "consistencyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "startOfWeek" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "MuscleGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bodyPart" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'avant',
    "color" TEXT NOT NULL DEFAULT '#a3e635',
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "primaryMuscleId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "equipment" TEXT NOT NULL,
    "movementType" TEXT NOT NULL DEFAULT 'polyarticulaire',
    "difficulty" TEXT NOT NULL DEFAULT 'intermediaire',
    "trackingType" TEXT NOT NULL DEFAULT 'weight_reps',
    "isCardio" BOOLEAN NOT NULL DEFAULT false,
    "isUnilateral" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Exercise_primaryMuscleId_fkey" FOREIGN KEY ("primaryMuscleId") REFERENCES "MuscleGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Exercise_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "ExerciseSecondaryMuscle" (
    "exerciseId" TEXT NOT NULL,
    "muscleGroupId" TEXT NOT NULL,
    CONSTRAINT "ExerciseSecondaryMuscle_pkey" PRIMARY KEY ("exerciseId", "muscleGroupId"),
    CONSTRAINT "ExerciseSecondaryMuscle_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExerciseSecondaryMuscle_muscleGroupId_fkey" FOREIGN KEY ("muscleGroupId") REFERENCES "MuscleGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "ExerciseFavorite" (
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExerciseFavorite_pkey" PRIMARY KEY ("userId", "exerciseId"),
    CONSTRAINT "ExerciseFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExerciseFavorite_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "ExerciseNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExerciseNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExerciseNote_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "WorkoutProgram" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'custom',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT NOT NULL DEFAULT '#a3e635',
    "cycleLength" INTEGER NOT NULL DEFAULT 7,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "archivedAt" DATETIME,
    CONSTRAINT "WorkoutProgram_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "WorkoutTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "dayOfWeek" INTEGER,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkoutTemplate_programId_fkey" FOREIGN KEY ("programId") REFERENCES "WorkoutProgram" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "WorkoutTemplateExercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "sets" INTEGER NOT NULL DEFAULT 3,
    "targetRepsMin" INTEGER DEFAULT 8,
    "targetRepsMax" INTEGER DEFAULT 12,
    "targetWeight" REAL,
    "targetRpe" REAL,
    "targetRir" INTEGER,
    "restSeconds" INTEGER NOT NULL DEFAULT 120,
    "tempo" TEXT,
    "notes" TEXT,
    "supersetGroup" TEXT,
    CONSTRAINT "WorkoutTemplateExercise_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkoutTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkoutTemplateExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "WorkoutSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "programId" TEXT,
    "templateId" TEXT,
    "name" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "notes" TEXT,
    "totalVolumeKg" REAL NOT NULL DEFAULT 0,
    "totalSets" INTEGER NOT NULL DEFAULT 0,
    "totalReps" INTEGER NOT NULL DEFAULT 0,
    "prCount" INTEGER NOT NULL DEFAULT 0,
    "feltEnergy" INTEGER,
    "feltMotivation" INTEGER,
    "sleepHours" REAL,
    "stressLevel" INTEGER,
    "soreness" INTEGER,
    "feedback" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkoutSession_programId_fkey" FOREIGN KEY ("programId") REFERENCES "WorkoutProgram" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WorkoutSession_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkoutTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "WorkoutExercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "restSeconds" INTEGER NOT NULL DEFAULT 120,
    "supersetGroup" TEXT,
    "notes" TEXT,
    "replacedFromExerciseId" TEXT,
    "targetRepsMin" INTEGER,
    "targetRepsMax" INTEGER,
    "targetRpe" REAL,
    CONSTRAINT "WorkoutExercise_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkoutExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "WorkoutSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workoutExerciseId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'N',
    "weightKg" REAL,
    "reps" INTEGER,
    "rpe" REAL,
    "rir" INTEGER,
    "durationSec" INTEGER,
    "distanceM" REAL,
    "avgHr" INTEGER,
    "calories" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    "isPr" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkoutSet_workoutExerciseId_fkey" FOREIGN KEY ("workoutExerciseId") REFERENCES "WorkoutExercise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "PersonalRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "previousValue" REAL,
    "weightKg" REAL,
    "reps" INTEGER,
    "achievedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT,
    "setId" TEXT,
    CONSTRAINT "PersonalRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PersonalRecord_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PersonalRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PersonalRecord_setId_fkey" FOREIGN KEY ("setId") REFERENCES "WorkoutSet" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "PlannedWorkout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "programId" TEXT,
    "templateId" TEXT,
    "sessionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlannedWorkout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlannedWorkout_programId_fkey" FOREIGN KEY ("programId") REFERENCES "WorkoutProgram" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlannedWorkout_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkoutTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlannedWorkout_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "BodyWeight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "weightKg" REAL NOT NULL,
    "bodyFatPct" REAL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BodyWeight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "BodyMeasurement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "neckCm" REAL,
    "shouldersCm" REAL,
    "chestCm" REAL,
    "waistCm" REAL,
    "hipsCm" REAL,
    "armLeftCm" REAL,
    "armRightCm" REAL,
    "thighLeftCm" REAL,
    "thighRightCm" REAL,
    "calfLeftCm" REAL,
    "calfRightCm" REAL,
    "bodyFatPct" REAL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BodyMeasurement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "ProgressPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "pose" TEXT NOT NULL DEFAULT 'face',
    "url" TEXT NOT NULL,
    "weightKg" REAL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProgressPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "Food" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "barcode" TEXT,
    "servingName" TEXT,
    "servingGrams" REAL,
    "kcal100" REAL NOT NULL,
    "protein100" REAL NOT NULL,
    "carbs100" REAL NOT NULL,
    "fat100" REAL NOT NULL,
    "fiber100" REAL,
    "sugar100" REAL,
    "salt100" REAL,
    "category" TEXT NOT NULL DEFAULT 'autre',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Food_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "FoodFavorite" (
    "userId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FoodFavorite_pkey" PRIMARY KEY ("userId", "foodId"),
    CONSTRAINT "FoodFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FoodFavorite_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "DiaryEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "mealType" TEXT NOT NULL,
    "foodId" TEXT,
    "recipeId" TEXT,
    "label" TEXT NOT NULL,
    "quantityGrams" REAL NOT NULL,
    "servings" REAL,
    "kcal" REAL NOT NULL,
    "protein" REAL NOT NULL,
    "carbs" REAL NOT NULL,
    "fat" REAL NOT NULL,
    "fiber" REAL NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiaryEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiaryEntry_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DiaryEntry_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "SavedMeal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultMealType" TEXT NOT NULL DEFAULT 'petit_dejeuner',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SavedMeal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "SavedMealItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "savedMealId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "quantityGrams" REAL NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SavedMealItem_savedMealId_fkey" FOREIGN KEY ("savedMealId") REFERENCES "SavedMeal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SavedMealItem_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "servings" INTEGER NOT NULL DEFAULT 1,
    "imageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Recipe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "RecipeIngredient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipeId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "quantityGrams" REAL NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecipeIngredient_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "NutritionGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "kcal" REAL NOT NULL,
    "protein" REAL NOT NULL,
    "carbs" REAL NOT NULL,
    "fat" REAL NOT NULL,
    "fiber" REAL,
    "waterMl" REAL,
    "source" TEXT NOT NULL DEFAULT 'mifflin_st_jeor',
    "activeFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NutritionGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "NutritionDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "waterMl" REAL NOT NULL DEFAULT 0,
    "note" TEXT,
    CONSTRAINT "NutritionDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "days" TEXT NOT NULL DEFAULT '1,2,3,4,5,6,7',
    "message" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastFiredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Reminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "exerciseId" TEXT,
    "measureKey" TEXT,
    "startValue" REAL NOT NULL,
    "targetValue" REAL NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "targetDate" DATETIME,
    "achievedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Goal_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "AppError" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "path" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppError_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE INDEX "Account_userId_idx" ON "Account"("userId");
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");
CREATE UNIQUE INDEX "MuscleGroup_slug_key" ON "MuscleGroup"("slug");
CREATE UNIQUE INDEX "Exercise_slug_key" ON "Exercise"("slug");
CREATE INDEX "Exercise_category_idx" ON "Exercise"("category");
CREATE INDEX "Exercise_equipment_idx" ON "Exercise"("equipment");
CREATE INDEX "Exercise_userId_idx" ON "Exercise"("userId");
CREATE UNIQUE INDEX "ExerciseNote_userId_exerciseId_key" ON "ExerciseNote"("userId", "exerciseId");
CREATE INDEX "WorkoutProgram_userId_idx" ON "WorkoutProgram"("userId");
CREATE INDEX "WorkoutTemplate_programId_idx" ON "WorkoutTemplate"("programId");
CREATE INDEX "WorkoutTemplateExercise_templateId_idx" ON "WorkoutTemplateExercise"("templateId");
CREATE INDEX "WorkoutSession_userId_startedAt_idx" ON "WorkoutSession"("userId", "startedAt");
CREATE INDEX "WorkoutSession_userId_status_idx" ON "WorkoutSession"("userId", "status");
CREATE INDEX "WorkoutExercise_sessionId_idx" ON "WorkoutExercise"("sessionId");
CREATE INDEX "WorkoutExercise_exerciseId_idx" ON "WorkoutExercise"("exerciseId");
CREATE INDEX "WorkoutSet_workoutExerciseId_idx" ON "WorkoutSet"("workoutExerciseId");
CREATE INDEX "PersonalRecord_userId_exerciseId_type_idx" ON "PersonalRecord"("userId", "exerciseId", "type");
CREATE INDEX "PersonalRecord_userId_achievedAt_idx" ON "PersonalRecord"("userId", "achievedAt");
CREATE INDEX "PlannedWorkout_userId_date_idx" ON "PlannedWorkout"("userId", "date");
CREATE UNIQUE INDEX "BodyWeight_userId_date_key" ON "BodyWeight"("userId", "date");
CREATE INDEX "BodyWeight_userId_date_idx" ON "BodyWeight"("userId", "date");
CREATE UNIQUE INDEX "BodyMeasurement_userId_date_key" ON "BodyMeasurement"("userId", "date");
CREATE INDEX "BodyMeasurement_userId_date_idx" ON "BodyMeasurement"("userId", "date");
CREATE INDEX "ProgressPhoto_userId_date_idx" ON "ProgressPhoto"("userId", "date");
CREATE INDEX "Food_name_idx" ON "Food"("name");
CREATE INDEX "Food_userId_idx" ON "Food"("userId");
CREATE INDEX "Food_barcode_idx" ON "Food"("barcode");
CREATE INDEX "DiaryEntry_userId_date_idx" ON "DiaryEntry"("userId", "date");
CREATE INDEX "SavedMeal_userId_idx" ON "SavedMeal"("userId");
CREATE INDEX "Recipe_userId_idx" ON "Recipe"("userId");
CREATE INDEX "NutritionGoal_userId_isActive_idx" ON "NutritionGoal"("userId", "isActive");
CREATE UNIQUE INDEX "NutritionDay_userId_date_key" ON "NutritionDay"("userId", "date");
CREATE INDEX "Reminder_userId_idx" ON "Reminder"("userId");
CREATE INDEX "Goal_userId_status_idx" ON "Goal"("userId", "status");
CREATE INDEX "AppError_createdAt_idx" ON "AppError"("createdAt");

PRAGMA foreign_keys=ON;
