"use client";

import { useState } from "react";
import Select from "./Select";

/**
 * فلترة حلقات شاشات المتابعة (الحضور والتسميع والسبر) بالفوج والمدرّس — قائمتان منسدلتان.
 * قائمة المدرّسين تتقلّص بحسب الفوج. لا أعداد على الخيارات — العدد الإجمالي للتقاطع يظهر في «عدد النتائج».
 */
export function useCohortTeacherFilter<T extends { cohortName: string; teacherName: string }>(blocks: T[]) {
  const [cohort, setCohort] = useState("all");
  const [teacher, setTeacher] = useState("all");
  const uniq = (xs: string[]) => [...new Set(xs)].sort((a, b) => a.localeCompare(b, "ar"));
  const inCohort = (b: T) => cohort === "all" || b.cohortName === cohort;
  const inTeacher = (b: T) => teacher === "all" || b.teacherName === teacher;

  const cohortOptions = [{ value: "all", label: "كل الأفواج" }, ...uniq(blocks.map((b) => b.cohortName)).map((n) => ({ value: n, label: `فوج ${n}` }))];
  const teacherOptions = [{ value: "all", label: "كل المدرّسين" }, ...uniq(blocks.filter(inCohort).map((b) => b.teacherName)).map((n) => ({ value: n, label: n }))];
  const shown = blocks.filter((b) => inCohort(b) && inTeacher(b));
  const selects = (
    <>
      <Select
        value={cohort}
        onChange={(v) => {
          setCohort(v);
          setTeacher("all");
        }}
        options={cohortOptions}
      />
      <Select value={teacher} onChange={setTeacher} options={teacherOptions} />
    </>
  );
  return { shown, selects };
}
