-- الأفواج القلّابة تتناوب أسبوعًا بأسبوع دائمًا، فلا حاجة لحقل دورة التناوب.
ALTER TABLE "Cohort" DROP COLUMN IF EXISTS "cycle";
