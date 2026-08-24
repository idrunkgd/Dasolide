-- Migration initiale — PostgreSQL
-- Générée depuis prisma/schema.prisma.

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "onboardedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
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
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "sex" TEXT,
    "birthDate" TIMESTAMP(3),
    "heightCm" DOUBLE PRECISION,
    "startWeightKg" DOUBLE PRECISION,
    "targetWeightKg" DOUBLE PRECISION,
    "level" TEXT NOT NULL DEFAULT 'intermediaire',
    "sessionsPerWeek" INTEGER NOT NULL DEFAULT 4,
    "sessionMinutes" INTEGER NOT NULL DEFAULT 60,
    "mainGoal" TEXT NOT NULL DEFAULT 'hypertrophie',
    "activityLevel" TEXT NOT NULL DEFAULT 'modere',
    "equipment" TEXT NOT NULL DEFAULT 'salle_complete',
    "availableDays" TEXT NOT NULL DEFAULT '1,2,4,5',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
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
    "upperIncrementKg" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "lowerIncrementKg" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "consistencyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "startOfWeek" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MuscleGroup" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bodyPart" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'avant',
    "color" TEXT NOT NULL DEFAULT '#a3e635',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "MuscleGroup_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ExerciseSecondaryMuscle" (
    "exerciseId" TEXT NOT NULL,
    "muscleGroupId" TEXT NOT NULL,
    CONSTRAINT "ExerciseSecondaryMuscle_pkey" PRIMARY KEY ("exerciseId", "muscleGroupId")
);
CREATE TABLE "ExerciseFavorite" (
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExerciseFavorite_pkey" PRIMARY KEY ("userId", "exerciseId")
);
CREATE TABLE "ExerciseNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExerciseNote_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WorkoutProgram" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'custom',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT NOT NULL DEFAULT '#a3e635',
    "cycleLength" INTEGER NOT NULL DEFAULT 7,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    CONSTRAINT "WorkoutProgram_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WorkoutTemplate" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "dayOfWeek" INTEGER,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkoutTemplate_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WorkoutTemplateExercise" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "sets" INTEGER NOT NULL DEFAULT 3,
    "targetRepsMin" INTEGER DEFAULT 8,
    "targetRepsMax" INTEGER DEFAULT 12,
    "targetWeight" DOUBLE PRECISION,
    "targetRpe" DOUBLE PRECISION,
    "targetRir" INTEGER,
    "restSeconds" INTEGER NOT NULL DEFAULT 120,
    "tempo" TEXT,
    "notes" TEXT,
    "supersetGroup" TEXT,
    CONSTRAINT "WorkoutTemplateExercise_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WorkoutSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "programId" TEXT,
    "templateId" TEXT,
    "name" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "notes" TEXT,
    "totalVolumeKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSets" INTEGER NOT NULL DEFAULT 0,
    "totalReps" INTEGER NOT NULL DEFAULT 0,
    "prCount" INTEGER NOT NULL DEFAULT 0,
    "feltEnergy" INTEGER,
    "feltMotivation" INTEGER,
    "sleepHours" DOUBLE PRECISION,
    "stressLevel" INTEGER,
    "soreness" INTEGER,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkoutSession_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WorkoutExercise" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "restSeconds" INTEGER NOT NULL DEFAULT 120,
    "supersetGroup" TEXT,
    "notes" TEXT,
    "replacedFromExerciseId" TEXT,
    "targetRepsMin" INTEGER,
    "targetRepsMax" INTEGER,
    "targetRpe" DOUBLE PRECISION,
    CONSTRAINT "WorkoutExercise_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WorkoutSet" (
    "id" TEXT NOT NULL,
    "workoutExerciseId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'N',
    "weightKg" DOUBLE PRECISION,
    "reps" INTEGER,
    "rpe" DOUBLE PRECISION,
    "rir" INTEGER,
    "durationSec" INTEGER,
    "distanceM" DOUBLE PRECISION,
    "avgHr" INTEGER,
    "calories" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "isPr" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkoutSet_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PersonalRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "previousValue" DOUBLE PRECISION,
    "weightKg" DOUBLE PRECISION,
    "reps" INTEGER,
    "achievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT,
    "setId" TEXT,
    CONSTRAINT "PersonalRecord_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PlannedWorkout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "programId" TEXT,
    "templateId" TEXT,
    "sessionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlannedWorkout_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "BodyWeight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "bodyFatPct" DOUBLE PRECISION,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BodyWeight_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "BodyMeasurement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "neckCm" DOUBLE PRECISION,
    "shouldersCm" DOUBLE PRECISION,
    "chestCm" DOUBLE PRECISION,
    "waistCm" DOUBLE PRECISION,
    "hipsCm" DOUBLE PRECISION,
    "armLeftCm" DOUBLE PRECISION,
    "armRightCm" DOUBLE PRECISION,
    "thighLeftCm" DOUBLE PRECISION,
    "thighRightCm" DOUBLE PRECISION,
    "calfLeftCm" DOUBLE PRECISION,
    "calfRightCm" DOUBLE PRECISION,
    "bodyFatPct" DOUBLE PRECISION,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BodyMeasurement_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProgressPhoto" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "pose" TEXT NOT NULL DEFAULT 'face',
    "url" TEXT NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProgressPhoto_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Food" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "barcode" TEXT,
    "servingName" TEXT,
    "servingGrams" DOUBLE PRECISION,
    "kcal100" DOUBLE PRECISION NOT NULL,
    "protein100" DOUBLE PRECISION NOT NULL,
    "carbs100" DOUBLE PRECISION NOT NULL,
    "fat100" DOUBLE PRECISION NOT NULL,
    "fiber100" DOUBLE PRECISION,
    "sugar100" DOUBLE PRECISION,
    "salt100" DOUBLE PRECISION,
    "category" TEXT NOT NULL DEFAULT 'autre',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Food_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "FoodFavorite" (
    "userId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FoodFavorite_pkey" PRIMARY KEY ("userId", "foodId")
);
CREATE TABLE "DiaryEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "mealType" TEXT NOT NULL,
    "foodId" TEXT,
    "recipeId" TEXT,
    "label" TEXT NOT NULL,
    "quantityGrams" DOUBLE PRECISION NOT NULL,
    "servings" DOUBLE PRECISION,
    "kcal" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "fat" DOUBLE PRECISION NOT NULL,
    "fiber" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiaryEntry_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SavedMeal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultMealType" TEXT NOT NULL DEFAULT 'petit_dejeuner',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SavedMeal_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SavedMealItem" (
    "id" TEXT NOT NULL,
    "savedMealId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "quantityGrams" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SavedMealItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "servings" INTEGER NOT NULL DEFAULT 1,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RecipeIngredient" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "quantityGrams" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "NutritionGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kcal" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "fat" DOUBLE PRECISION NOT NULL,
    "fiber" DOUBLE PRECISION,
    "waterMl" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'mifflin_st_jeor',
    "activeFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NutritionGoal_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "NutritionDay" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "waterMl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "note" TEXT,
    CONSTRAINT "NutritionDay_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "days" TEXT NOT NULL DEFAULT '1,2,3,4,5,6,7',
    "message" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastFiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "exerciseId" TEXT,
    "measureKey" TEXT,
    "startValue" DOUBLE PRECISION NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "targetDate" TIMESTAMP(3),
    "achievedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AppError" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "path" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppError_pkey" PRIMARY KEY ("id")
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

ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_primaryMuscleId_fkey" FOREIGN KEY ("primaryMuscleId") REFERENCES "MuscleGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExerciseSecondaryMuscle" ADD CONSTRAINT "ExerciseSecondaryMuscle_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExerciseSecondaryMuscle" ADD CONSTRAINT "ExerciseSecondaryMuscle_muscleGroupId_fkey" FOREIGN KEY ("muscleGroupId") REFERENCES "MuscleGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExerciseFavorite" ADD CONSTRAINT "ExerciseFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExerciseFavorite" ADD CONSTRAINT "ExerciseFavorite_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExerciseNote" ADD CONSTRAINT "ExerciseNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExerciseNote" ADD CONSTRAINT "ExerciseNote_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutProgram" ADD CONSTRAINT "WorkoutProgram_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutTemplate" ADD CONSTRAINT "WorkoutTemplate_programId_fkey" FOREIGN KEY ("programId") REFERENCES "WorkoutProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutTemplateExercise" ADD CONSTRAINT "WorkoutTemplateExercise_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkoutTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutTemplateExercise" ADD CONSTRAINT "WorkoutTemplateExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_programId_fkey" FOREIGN KEY ("programId") REFERENCES "WorkoutProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkoutTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkoutSet" ADD CONSTRAINT "WorkoutSet_workoutExerciseId_fkey" FOREIGN KEY ("workoutExerciseId") REFERENCES "WorkoutExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonalRecord" ADD CONSTRAINT "PersonalRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonalRecord" ADD CONSTRAINT "PersonalRecord_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonalRecord" ADD CONSTRAINT "PersonalRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PersonalRecord" ADD CONSTRAINT "PersonalRecord_setId_fkey" FOREIGN KEY ("setId") REFERENCES "WorkoutSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlannedWorkout" ADD CONSTRAINT "PlannedWorkout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlannedWorkout" ADD CONSTRAINT "PlannedWorkout_programId_fkey" FOREIGN KEY ("programId") REFERENCES "WorkoutProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlannedWorkout" ADD CONSTRAINT "PlannedWorkout_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkoutTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlannedWorkout" ADD CONSTRAINT "PlannedWorkout_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BodyWeight" ADD CONSTRAINT "BodyWeight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BodyMeasurement" ADD CONSTRAINT "BodyMeasurement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProgressPhoto" ADD CONSTRAINT "ProgressPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Food" ADD CONSTRAINT "Food_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FoodFavorite" ADD CONSTRAINT "FoodFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FoodFavorite" ADD CONSTRAINT "FoodFavorite_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiaryEntry" ADD CONSTRAINT "DiaryEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiaryEntry" ADD CONSTRAINT "DiaryEntry_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DiaryEntry" ADD CONSTRAINT "DiaryEntry_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SavedMeal" ADD CONSTRAINT "SavedMeal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedMealItem" ADD CONSTRAINT "SavedMealItem_savedMealId_fkey" FOREIGN KEY ("savedMealId") REFERENCES "SavedMeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedMealItem" ADD CONSTRAINT "SavedMealItem_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NutritionGoal" ADD CONSTRAINT "NutritionGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NutritionDay" ADD CONSTRAINT "NutritionDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppError" ADD CONSTRAINT "AppError_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
